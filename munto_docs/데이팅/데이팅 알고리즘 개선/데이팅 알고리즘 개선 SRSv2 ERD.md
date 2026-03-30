## 1. 신규 테이블

### 1.1 UserAlgorithmScore

유저별 알고리즘 점수를 저장한다. 기존 `ExploreUserScore` / `RecommendationUserScore`를 대체한다.

```sql
CREATE TABLE "UserAlgorithmScore" (
  "id"                SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL UNIQUE,
  "rawScore"          DECIMAL(5,4) NOT NULL DEFAULT 0.0000,   -- 베이지안 매력도 (0~1)
  "exposureScore"     DECIMAL(5,4) NOT NULL DEFAULT 0.0000,   -- 노출 점수. 남성=rawScore, 여성=W1*매력도+W2*좋아요비율+W3*접속빈도
  "bucketPercentile"  DECIMAL(4,3) NOT NULL DEFAULT 0.000,    -- 버킷 내 상대 위치 (0~1)
  "bucketId"          VARCHAR(20) NOT NULL,                   -- 소속 버킷 (예: M_20_METRO)
  "priorAlpha"        DECIMAL(4,2) NOT NULL,                  -- 현재 적용 중인 Prior α₀
  "priorBeta"         DECIMAL(4,2) NOT NULL,                  -- 현재 적용 중인 Prior β₀
  "positiveWeightSum" DECIMAL(10,2) NOT NULL DEFAULT 0.00,    -- 긍정 인터랙션 가중치 합 (k)
  "totalWeightSum"    DECIMAL(10,2) NOT NULL DEFAULT 0.00,    -- 전체 인터랙션 가중치 합 (n)
  "lastCalculatedAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "fk_algo_score_user" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_algo_score_bucket_exposure" ON "UserAlgorithmScore"("bucketId", "exposureScore" DESC);
CREATE INDEX "idx_algo_score_bucket_percentile" ON "UserAlgorithmScore"("bucketId", "bucketPercentile" DESC);
```

| 컬럼 | 타입 | 기본값 | nullable | 설명 |
| --- | --- | --- | --- | --- |
| `userId` | Int | - | NO | User 1:1 관계 |
| `rawScore` | Decimal(5,4) | 0.0000 | NO | 베이지안 매력도 (0~1) |
| `exposureScore` | Decimal(5,4) | 0.0000 | NO | 노출 점수. 남성=rawScore, 여성=W1×매력도+W2×좋아요비율+W3×접속빈도 |
| `bucketPercentile` | Decimal(4,3) | 0.000 | NO | 버킷 내 exposureScore 기준 상대 위치 (0~1) |
| `bucketId` | VarChar(20) | - | NO | 소속 버킷 (예: M_20_METRO) |
| `priorAlpha` | Decimal(4,2) | - | NO | 현재 적용 중인 Prior α₀ |
| `priorBeta` | Decimal(4,2) | - | NO | 현재 적용 중인 Prior β₀ |
| `positiveWeightSum` | Decimal(10,2) | 0.00 | NO | 긍정 인터랙션 가중치 합 (k) |
| `totalWeightSum` | Decimal(10,2) | 0.00 | NO | 전체 인터랙션 가중치 합 (n) |
| `lastCalculatedAt` | DateTime | NOW() | NO | 마지막 점수 계산 시점 |

### 1.2 UserAlgorithmState

알고리즘 관련 유저 상태를 별도 테이블로 관리한다. 분류, 노출 제한, 시그널 카운트 등은 유저의 본질적 속성이 아니라 알고리즘 상태이므로 `User` 테이블과 분리한다.

```sql
CREATE TYPE "Classification" AS ENUM ('NEW', 'SETTLING', 'ESTABLISHED');
CREATE TYPE "RestrictionTrigger" AS ENUM ('SCORE', 'FAST_PASS', 'FIRST_EXPOSURE', 'REPORT');

CREATE TABLE "UserAlgorithmState" (
  "id"                     SERIAL PRIMARY KEY,
  "userId"                 INTEGER NOT NULL UNIQUE,
  "classification"         "Classification" NOT NULL DEFAULT 'NEW',         -- 유저 분류 상태
  "isRestricted"           BOOLEAN NOT NULL DEFAULT false,                  -- 노출 제한 상태
  "restrictionTrigger"     "RestrictionTrigger",                            -- 제한 트리거 (null = 제한 아님)
  "fastPassCount"          INTEGER NOT NULL DEFAULT 0,                      -- 빠른 패스 누적. 프로필 변경 시 0 초기화
  "firstExposurePassCount" INTEGER NOT NULL DEFAULT 0,                      -- 첫 노출 미조회/패스 카운트
  "firstExposureTotal"     INTEGER NOT NULL DEFAULT 0,                      -- 첫 노출 전체 카운트
  "lastProfileChangedAt"   TIMESTAMP,                                       -- 프로필 변경 쿨다운 (7일) 판정용
  "interactionResetAt"     TIMESTAMP,                                       -- 인터랙션 소프트 삭제 기준 시점
  "createdAt"              TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "fk_algo_state_user" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_algo_state_classification" ON "UserAlgorithmState"("classification");
CREATE INDEX "idx_algo_state_restricted" ON "UserAlgorithmState"("isRestricted");
```

| 컬럼 | 타입 | 기본값 | nullable | 설명 |
| --- | --- | --- | --- | --- |
| `userId` | Int | - | NO | User 1:1 관계 |
| `classification` | Classification | NEW | NO | 유저 분류 상태 (SRS 7.1) |
| `isRestricted` | Boolean | false | NO | 노출 제한 상태 (SRS 7.4) |
| `restrictionTrigger` | RestrictionTrigger | - | YES | 제한 트리거 유형 (null = 제한 아님) |
| `fastPassCount` | Int | 0 | NO | 빠른 패스 누적 횟수. 프로필 변경 시 0 초기화 |
| `firstExposurePassCount` | Int | 0 | NO | 첫 노출 미조회/패스 카운트. 프로필 변경 시 0 초기화 |
| `firstExposureTotal` | Int | 0 | NO | 첫 노출 전체 카운트. 프로필 변경 시 0 초기화 |
| `lastProfileChangedAt` | DateTime | - | YES | 마지막 프로필 변경 시점. 7일 쿨다운 판정용 |
| `interactionResetAt` | DateTime | - | YES | 인터랙션 소프트 삭제 기준 시점. 이 시점 이전 인터랙션은 점수 계산에서 제외 |

### 1.3 CycleQueue

사이클별 추천/발견 큐를 저장한다. 기존 `RecommendationQueue` + `ExploreQueue` + `UserQueueRound`를 대체한다.

```sql
CREATE TYPE "TabType" AS ENUM ('RECOMMENDATION', 'DISCOVERY');

CREATE TABLE "CycleQueue" (
  "id"            SERIAL PRIMARY KEY,
  "userId"        INTEGER NOT NULL,               -- 뷰어
  "targetUserId"  INTEGER NOT NULL,               -- 후보
  "cycleNumber"   INTEGER NOT NULL,               -- 당일 사이클 번호 (1/2/3)
  "tabType"       "TabType" NOT NULL,             -- RECOMMENDATION / DISCOVERY
  "slotIndex"     INTEGER NOT NULL,               -- 탭 내 순서 (0~3)
  "viewerType"    INTEGER NOT NULL,               -- 뷰어 유형 (1~7, SRS 7.5.2 참조)
  "weight"        DECIMAL(8,4) NOT NULL,          -- 선택 시 사용된 가중치
  "impressionAt"  TIMESTAMP,                      -- impression 시점 (null = 미조회)
  "cycleDate"     DATE NOT NULL,                  -- 사이클 실행 날짜
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "fk_cycle_viewer" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_cycle_target" FOREIGN KEY ("targetUserId")
    REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "uq_cycle_queue" UNIQUE ("userId", "targetUserId", "cycleDate", "cycleNumber")
);

CREATE INDEX "idx_cycle_queue_viewer" ON "CycleQueue"("userId", "cycleDate", "cycleNumber", "tabType");
CREATE INDEX "idx_cycle_queue_impression" ON "CycleQueue"("targetUserId", "impressionAt");
```

| 컬럼 | 타입 | 기본값 | nullable | 설명 |
| --- | --- | --- | --- | --- |
| `userId` | Int | - | NO | 뷰어 유저 ID |
| `targetUserId` | Int | - | NO | 후보 유저 ID |
| `cycleNumber` | Int | - | NO | 당일 사이클 번호 (1/2/3) |
| `tabType` | TabType | - | NO | RECOMMENDATION / DISCOVERY |
| `slotIndex` | Int | - | NO | 탭 내 순서 (0~3) |
| `viewerType` | Int | - | NO | 뷰어 유형 (1~7, SRS 7.5.2 참조) |
| `weight` | Decimal(8,4) | - | NO | 선택 시 사용된 가중치 |
| `impressionAt` | DateTime | - | YES | impression 시점 (null = 미조회) |
| `cycleDate` | Date | - | NO | 사이클 실행 날짜 |

---

## 2. 폐기 예정 테이블

안정화 후 폐기. v1→v2 병행 운영 기간 동안 유지.

| 테이블 | 대체 | 폐기 시점 |
| --- | --- | --- |
| `ExploreUserScore` | `UserAlgorithmScore` | v2 안정화 후 |
| `RecommendationUserScore` | `UserAlgorithmScore` | v2 안정화 후 |
| `ExploreQueue` | `CycleQueue` | v2 안정화 후 |
| `RecommendationQueue` | `CycleQueue` | v2 안정화 후 |
| `RecommendationQueueHistory` | `CycleQueue` (impressionAt으로 이력 관리) | v2 안정화 후 |
| `UserQueueRound` | `CycleQueue` (cycleNumber로 대체) | v2 안정화 후 |
| `AlgorithmTestUser` | 범용 실험 테이블 (SRS 7.10 참조) | 실험 인프라 마이그레이션 후 |

---

## 3. 기존 유지 테이블 (변경 없음)

| 테이블 | 용도 |
| --- | --- |
| `ProfileImpression` | 노출 카운팅, 빠른 패스 판정, 중복 제외 기준 |
| `UserCrushExpression` | LIKE / SUPER_LIKE / DISLIKE 인터랙션 |
| `UserBlock` | 차단 유저 제외 |
| `UserProfile` | 하드 필터 + 소프트 필터 항목 |
| `UserKeyword` / `UserPreferredKeyword` | 소프트 필터 — 취향 키워드 매칭 |
| `UserProfileInterest` | 소프트 필터 — 관심사 매칭 |
| `UserPreferredAge` | 하드 필터 — 나이 구간 |
| `ActionLog` | AI 학습 로그 (metadata jsonb에 v2 항목 추가) |
| `UserSanction` / `UserSanctionHistory` | 제재 이력 |
|  |  |