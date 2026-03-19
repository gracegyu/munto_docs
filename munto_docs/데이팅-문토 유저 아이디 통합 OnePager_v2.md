# 데이팅-문토 유저 아이디 통합 OnePager

분류: SRS
작성자: 홍진영
최근 수정일: 2026년 3월 10일 오후 4:33
최초 작성일: 2026년 3월 4일 오후 5:08
문서 상태: Active
생성 일시: 2026년 3월 4일 오후 5:08
최종 편집자: 홍진영

## Project Name

문토 데이팅 서비스 User ID 통합 (Dating User ID Unification)

[https://munto.atlassian.net/browse/WEBB-1110](https://munto.atlassian.net/browse/WEBB-1110)

---

## Date

- 작성일: 2026-03-09

---

## Submitter Info

- 작성자: 홍진영

---

## Project Description

### 배경

문토 서비스와 문토 데이팅 서비스가 **서로 다른 유저 ID 체계**를 가지고 있다.
현재 데이팅 서비스는 문토 서비스에 종속적인 관계이나, 향후 별개의 독립 앱으로 분리될 가능성이 있고 추가 서비스도 생길 수 있다.

### 현재 구조

[DBML](https://www.notion.so/OnePager-319e2bc7639d801cb899fc17a74ae600?pvs=21) `v1.0.2`

```
문토 서비스                     데이팅 서비스
──────────────────             ──────────────────────────────────────────

User                           User
├── id: 100 (PK, auto)         ├── id: 47 (PK, auto, 별도 채번)
├── email                      ├── status
├── ...                        ├── name
                               ├── phoneNumber
                               └── ...

                               UserOauthProvider (매핑 테이블)
                               ├── provider: MUNTO
                               ├── providerUserId: "100"  ← 문토 User.id
                               └── userId: 47             ← 데이팅 User.id (FK)

같은 사람이지만: 문토 id=100 ≠ 데이팅 id=47
조회하려면: UserOauthProvider를 반드시 경유해야 함
```

### 현재 인증 흐름

```
클라이언트
  │  문토 JWT 전달
  ▼
OAuthValidationService.validateMuntoToken()
  │  문토 JWT Secret으로 검증 → muntoUser.userId 추출
  ▼
UserOauthProvider 조회
  │  WHERE provider = 'MUNTO' AND providerUserId = muntoUser.userId
  ▼
Dating User 조회 (userId FK)
  ▼
데이팅 서비스 JWT 발급 (sub: Dating User.id)
```

### 현재 구조의 핵심 문제점

| 문제 | 설명 |
| --- | --- |
| 이중 ID 관리 | 문토 ID ≠ 데이팅 ID, 항상 변환 필요 |
| 조인 필수 | `UserOauthProvider` 없이는 두 서비스 연결 불가 |
| 확장성 결여 | 미래 서비스 추가 시 각자 매핑 테이블 따로 관리 |
| 명칭 불일치 | `UserOauthProvider`라고 하지만 실제로는 OAuth 2.0이 아닌 JWT Secret 공유 방식 |
| 타입 불일치 | 문토 `User.id`는 `Int`이나 `providerUserId`는 `String`으로 저장 |
| 외부 연동 복잡성 | Sendbird, Push 알림에서 문토 ID 사용 → 매번 변환 필요 |

### 결정: 방안 2 채택 (User PK = 문토 userId)

검토한 방안 중 **방안 2(문토 userId 직접 사용)**를 통해 마이그레이션을 진행한다.

| 항목 | 결정 |
| --- | --- |
| ID 통합 방식 | 데이팅 `User.id` = 문토 `User.id` (Int 유지) |
| autoincrement | 제거 → 문토 userId를 직접 할당 |
| 타입 변경 | 안 함 (Int → Int, 향후 Central IdP 전환 시 검토) |
| 삭제 방식 | Soft delete 유지 (User 레코드 hard delete 안 함) |
| 재가입 처리 | User는 update/upsert로 재활성화, 추천/큐 운영 데이터는 deleteMany |

> 검토한 방안 비교는 [부록: 방안 비교](https://www.notion.so/OnePager-319e2bc7639d801cb899fc17a74ae600?pvs=21) 참조
> 

---

## Business and Marketing Justification

### 비즈니스 필요성

1. **서비스 확장 대비**: 문토 생태계에 새로운 서비스 추가 시, 통합된 유저 ID 체계 없이는 서비스마다 매핑 테이블이 기하급수적으로 증가
2. **운영 효율성**: 현재 이중 ID 체계로 인해 CS 대응, 로그 추적, 데이터 분석 시 항상 ID 변환 과정이 필요하여 운영 비용 증가
3. **데이터 일관성**: 서비스 간 "같은 사람"임을 확인하기 위해 조인이 필수적이며, 이로 인한 잠재적 데이터 불일치 리스크 존재
4. **독립 앱 전환 준비**: 데이팅 서비스의 독립 앱 전환을 대비한 아키텍처 정비

### 기대 효과

- 서비스 간 유저 조회 시 조인 제거 → 쿼리 단순화 및 성능 향상
- Sendbird, Push 등 외부 서비스 연동 시 ID 변환 로직 제거 → 코드 복잡도 감소
- 새로운 서비스 추가 시 추가 매핑 불필요 → 확장 비용 절감
- CS/운영팀의 유저 추적 효율 향상

---

## Risk Assessment

### 리스크 항목

| 리스크 | 심각도 | 완화 전략 |
| --- | --- | --- |
| FK 무결성 파손 | 🔴 | 30+ 테이블 FK를 트랜잭션 내에서 일괄 변경, 음수 임시 ID 전략으로 PK 충돌 방지 |
| 마이그레이션 실패 | 🔴 | 전체 DB 백업 후 실행, 스테이징 사전 검증 |
| 서비스 다운타임 | 🟡 | 다운타임 중 실행하여 동시성 이슈 제거 (30분~1시간) |
| PK 충돌 | 🟡 | `migrate-user-id-check.sql`로 사전 검증, 충돌 케이스 0건 확인 후 진행 |
| 외부 서비스 영향 | 🟡 | Sendbird `user_id`가 이미 문토 ID 기반 → 영향 없음 확인 필요 |
| 문토 ID 체계 종속 | 🟡 | 향후 Central IdP 전환 시 해소 가능 (Int → UUID) |
| 롤백 복잡도 | 🟡 | 실패 시 전체 DB 복원, 다운타임 연장 가능 |
| 매핑 없는 DELETED 유저 | 🟢 | 음수 ID로 잔류시켜 데이터 보존, 양수 문토 userId와 충돌 방지 |

---

## Resource and Scheduling Details

### 상세 일정

| 단계 | 작업 | 예상 소요 |
| --- | --- | --- |
| 1. 스키마 변경 | `User.id`에서 `@default(autoincrement())` 제거, `old_dating_id` 컬럼 추가 | 0.5일 |
| 2. 인증 로직 변경 | `AuthService` 로그인/회원가입/재활성화 로직 변경, 이중 인증 미들웨어 적용 | 1~2일 |
| 3. 외부 연동 단순화 | Sendbird, Push 서비스의 `providerUserId` 변환 로직 제거 | 1일 |
| 4. Unique 제약 변경 | Match, ChatRoom partial unique index 적용 | 0.5일 |
| 5. 테스트 코드 수정 | Factory, E2E, Unit 테스트 업데이트 | 1~2일 |
| 6. 롤백 스크립트 | `rollback-user-id-migration.sql` 작성 및 검증 | 0.5일 |
| 7. 스테이징 검증 | 이관 → 검증 → 롤백 → 원복 확인 전 과정 시뮬레이션 및 리포트 | 1~2일 |
| 8. 프로덕션 배포 | 서비스 다운타임 → DB 마이그레이션 → 서비스 재시작 | 1시간 |
| **합계** |  | **1~2주** |

### 선행 조건

- [ ]  스테이징 DB에서 마이그레이션 스크립트 검증 완료
- [ ]  PK 충돌 케이스 0건 확인 (`migrate-user-id-check.sql`)
- [ ]  `old_dating_id` 백업 컬럼 추가 및 롤백 스크립트 검증 완료
- [ ]  스테이징에서 [이관 → 롤백 → 원복 확인] 전 과정 시뮬레이션 완료
- [ ]  프론트엔드 팀과 JWT payload 변경 사항 공유
- [ ]  Sendbird 측 데이터 영향 확인
- [ ]  이중 인증 유지 기간 결정 (Refresh Token TTL 기준)

---

## Technical Description

### 1. 스키마 변경

```
model User {
  id     Int        @id  // autoincrement 제거, 문토 userId 직접 할당
  status UserStatus @default(INITIAL)
  // ...
}
```

---

### 2. 인증 흐름 변경

```
변경 전:
  문토 JWT → UserOauthProvider 조회 (조인) → Dating User 조회 → 데이팅 JWT 발급

변경 후:
  문토 JWT → muntoUserId 추출 → User 직접 조회 (WHERE id = muntoUserId) → 데이팅 JWT 발급
```

---

### 3. 기존 데이터 마이그레이션

```
STEP 0: 사전 검증 (migrate-user-id-check.sql)
  - 전체 유저 수 및 매핑 현황
  - providerUserId 정수 변환 불가 케이스
  - PK 충돌 케이스 확인

STEP 0.5: old_dating_id 백업 컬럼 추가 (데이터 가역성 확보)
  - User 테이블에만 old_dating_id 컬럼 추가 (기존 id 백업)
  - 마이그레이션 직전 기존 ID 값을 백업
  - 목적: 롤백 시 User.old_dating_id를 기준으로 연관 테이블 FK를 JOIN하여 복원 가능

STEP 1: 모든 ID를 음수로 이동 (PK/Unique 충돌 방지)
  User.id = 47 → User.id = -47
  + FK 참조하는 30+ 테이블 모두 음수로 이동

STEP 2: 매핑 기반 변환
  매핑 있는 유저:      User.id = -47 → User.id = 100 (문토 ID)
  매핑 없는 DELETED 유저: 음수 ID로 잔류 (데이터 보존)

STEP 3: autoincrement 시퀀스 제거

STEP 4: 검증
  - 음수 잔여 = 매핑 없는 DELETED 유저 수와 일치해야 정상
  - 활성 유저는 모두 양수 문토 userId를 가져야 함
```

**매핑 없는 DELETED 유저**: 탈퇴 시 `UserOauthProvider`가 hard delete되어 문토 userId를 알 수 없음.
음수 ID로 잔류시켜 안전/CS 데이터를 보존하되 양수 문토 userId와의 PK 충돌을 방지한다.

---

### 4. Unique 제약 변경

재가입 시 `Match`, `ChatRoom`의 Unique 제약이 충돌하므로 partial unique index로 변경한다.

| 테이블 | 현재 | 변경 후 |
| --- | --- | --- |
| `Match` | `@@unique([fromUserId, toUserId])` | partial unique: `WHERE "deletedAt" IS NULL` |
| `ChatRoom` | `@@unique([fromUserId, toUserId])` | partial unique: `WHERE "expiredAt" IS NULL` |

```sql
DROP INDEX IF EXISTS "Match_fromUserId_toUserId_key";
CREATE UNIQUE INDEX "Match_fromUserId_toUserId_active"
ON "Match" ("fromUserId", "toUserId")
WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "ChatRoom_fromUserId_toUserId_key";
CREATE UNIQUE INDEX "ChatRoom_fromUserId_toUserId_active"
ON "ChatRoom" ("fromUserId", "toUserId")
WHERE "expiredAt" IS NULL;
```

`UserCrushExpression`, `FriendRequest`는 이미 `deletedAt`을 가지고 있으며 탈퇴 시 soft delete 처리된다.

---

### 5. 회원가입 플로우 (register)

```
register(registerDto):
  │
  문토 JWT 검증 → muntoUserId 추출
  │
  ▼
  User 조회: WHERE id = muntoUserId
  │
  ├── [없음] ──────────── 신규 가입
  │     User.create({ id: muntoUserId, status: INITIAL })
  │     + UserOauthProvider create
  │     + TermsAgreements create
  │     + UserProfileDraft create
  │     + NotificationSettings create
  │     + UserCurrency create
  │     + RecommendationUserScore create
  │     + ExploreUserScore create
  │
  ├── [status = DELETED] ── 재활성화 (탈퇴 후 재가입)
  │     → 아래 "탈퇴 재가입 플로우" 참조
  │
  └── [그 외 status] ────── 에러
        throw BadRequestException('User already exists')
```

---

### 6. 로그인 플로우 (login)

```
login(loginDto):
  │
  문토 JWT 검증 → muntoUserId 추출
  │
  ▼
  User 조회: WHERE id = muntoUserId
  │
  ├── [없음] ──────────── 404 → 앱에서 register 호출
  │
  ├── [status = DELETED] ── 404 → 앱에서 register 호출 (재활성화 유도)
  │
  ├── [status = SUSPENDED] ── 에러 (정지된 계정)
  │
  └── [ACTIVE / INITIAL / PENDING / DEACTIVATED] ── JWT 발급 → 정상 진입
```

DELETED 유저는 login에서 404를 반환하여 기존 앱 플로우(404 → register 호출)를 그대로 유지한다.
register에서 재활성화를 처리하므로 **클라이언트 변경이 불필요**하다.

---

### 7. 탈퇴 재가입 플로우

### 전체 라이프사이클

```
[신규 가입]  User.id = 100 (문토 userId), status = INITIAL
     ↓
[서비스 이용]  status = ACTIVE
     ↓
[탈퇴]  status = DELETED, deletedAt = now()
        개인정보 null, 프로필 익명화
        UserOauthProvider 삭제
        매칭/채팅 비활성화 (기존 탈퇴 로직 그대로)
        User 레코드 유지 (soft delete)
     ↓
[재가입]  같은 문토 userId = 100으로 돌아옴
        login → 404 → register 호출
        register → DELETED 감지 → 재활성화 트랜잭션
     ↓
[서비스 이용]  status = INITIAL → 프로필 등록 플로우 진입 (새 출발)
```

### 재활성화 트랜잭션

```
트랜잭션 {

  // ─── 1. User 상태 초기화 ───
  User.update({
    where: { id: muntoUserId },
    data: { status: INITIAL, deletedAt: null }
  })

  // ─── 2. 인증 데이터 재생성 (탈퇴 시 삭제됨) ───
  UserOauthProvider.create({ userId, provider: MUNTO, ... })
  TermsAgreements.create({ userId, ... })

  // ─── 3. 1:1 서비스 데이터 초기화 (upsert) ───
  UserProfileDraft.upsert({ update: { 전부 null }, create: { userId } })
  UserCurrency.upsert({ update: { currentBalance: 0, totalPurchased: 0, totalSpent: 0, totalBonus: 0 }, ... })
  NotificationSettings.upsert({ update: { 모든 알림: true }, ... })
  RecommendationUserScore.upsert({ update: { 모든 점수: 기본값(0.50) }, ... })
  ExploreUserScore.upsert({ update: { 모든 점수: 기본값(0.50) }, ... })

  // ─── 4. 매칭 데이터 soft delete (CS 보존 + Unique 해제) ───
  Match.updateMany({ where: { fromUserId OR toUserId }, data: { deletedAt: now(), isActive: false } })
  ChatRoom.updateMany({ where: { fromUserId OR toUserId }, data: { expiredAt: now(), roomStatus: EXPIRED } })

  // ─── 5. 추천/큐 운영 데이터 삭제 (CS 불필요, 재적재됨) ───
  RecommendationQueue.deleteMany({ where: { userId OR targetUserId } })
  ExploreQueue.deleteMany({ where: { userId OR targetUserId } })
  UserQueueRound.deleteMany({ where: { userId } })
  RecommendationQueueHistory.deleteMany({ where: { userId OR targetUserId } })
  UserMissionProgress.deleteMany({ where: { userId } })

  // ─── 6. 건드리지 않음 (자동 보존) ───
  // UserBlock, Report, UserSanction, ContactBlock → 안전
  // AccountDeletion → 탈퇴 이력
  // CurrencyTransaction → 법적 보존
  // ActionLog, UserScoreHistory → 이력
  // UserCrushExpression, FriendRequest → 탈퇴 시 이미 soft delete 처리됨
}
```

### 데이터 보존 분류

| 구분 | 테이블 | 처리 | 이유 |
| --- | --- | --- | --- |
| **안전** | UserBlock, Report, UserSanction, ContactBlock | 보존 | 차단 우회 방지, 제재 이력 |
| **이력** | AccountDeletion, CurrencyTransaction, ActionLog, UserScoreHistory | 보존 | CS 대응, 법적 보존 |
| **매칭 (CS)** | Match, ChatRoom | soft delete (updateMany) | CS 이력 보존 + Unique 해제 |
| **매칭 (탈퇴 시 처리됨)** | UserCrushExpression, FriendRequest | 건드리지 않음 | 탈퇴 시 이미 soft delete |
| **운영** | RecommendationQueue, ExploreQueue, UserQueueRound, RecommendationQueueHistory, UserMissionProgress | deleteMany | CS 불필요, 재적재됨 |
| **1:1 서비스** | UserProfileDraft, UserCurrency, NotificationSettings, RecommendationUserScore, ExploreUserScore | upsert (초기값) | 새 출발 |
| **인증** | UserOauthProvider, TermsAgreements | create | 탈퇴 시 삭제됨 → 재생성 |

### 재가입 후 유저 경험

| 항목 | 상태 |
| --- | --- |
| 프로필 | 빈 상태 → INITIAL이므로 프로필 등록 플로우 진입 |
| 재화 | 0개 |
| 추천 | 새로 적재됨 |
| 매칭/채팅 | 없음 (과거 건은 soft delete) |
| 알림 설정 | 기본값 (전부 ON) |
| 차단 목록 | 유지됨 |

---

### 8. 롤백 시나리오 자동화 및 검증 `v1.0.1`

**원칙**: "테스트되지 않은 롤백은 계획이 아니다"

| 항목 | 내용 |
| --- | --- |
| 롤백 스크립트 | 마이그레이션과 쌍을 이루는 자동화된 롤백 스크립트(`rollback-user-id-migration.sql`)를 사전 작성 |
| 롤백 로직 | `old_dating_id` 값을 기반으로 User 및 연관 테이블의 id/FK를 원복 |
| 스테이징 시뮬레이션 | 운영 복제 환경에서 **[이관 수행 → 정합성 검증 → 롤백 실행 → 원복 데이터 확인]** 전 과정 시뮬레이션 |
| 산출물 | 롤백 소요 시간 및 정확도 리포트 (검증 완료 후 프로덕션 진행) |

---

### 9. 이중 인증 및 JWT 하위 호환성

서버 배포 후 일정 기간 **이중 검증(Dual Validation)**을 적용하여 기존 유저의 강제 로그아웃을 방지한다.

| 항목 | 내용 |
| --- | --- |
| 검증 대상 | '문토 Secret'과 '기존 데이팅 Secret'을 **모두** 수용 |
| 적용 위치 | 인증 미들웨어 (JWT Guard / Passport Strategy) |
| 검증 기간 | **Refresh Token TTL보다 충분히 길게** 설정 (예: TTL 7d → 최소 14d, 권장 30d) |
| 목적 | 기존 유저가 토큰 갱신 주기 내에 강제 로그아웃되지 않고 자연스럽게 새 토큰(sub: 문토 userId)으로 전환 |

> 현재 설정: `DATING_JWT_REFRESH_EXPIRES_IN` 기본값 7d → 이중 인증 유지 기간 **최소 14일, 권장 30일**
> 

---

### 10. 음수 ID 정책 및 데이터 정제

| 항목 | 내용 |
| --- | --- |
| 음수 ID 용도 | **마이그레이션 과정에서의 PK 충돌 회피를 위한 임시 상태로만 활용** |
| 영구 보존 비권장 | `old_dating_id`가 존재하므로 매핑 없는 유저를 음수로 영구 보존하기보다, **별도의 정제 정책**을 수립 |
| Hard Delete 분리 | 개인정보 보호 차원의 Hard Delete는 서비스의 중요 정책이므로, **이번 통합 마이그레이션과 별도의 후속 프로젝트**로 분리하여 안전하게 추진 |
| 데이터 구조 | 이번 작업이 향후 Hard Delete 수행에 걸림돌이 되지 않도록 데이터 구조를 정교하게 유지 |

---

## 부록: 방안 비교

### 검토한 방안

| 방안 | 개요 |
| --- | --- |
| 방안 1 | 현재 구조 유지 (Federated, `UserOauthProvider` 패턴) |
| 방안 2 | User PK autoincrement 제거 + 문토 userId 직접 사용 |
| 방안 3 | 별도 Central Identity Service 구축 (UUID 기반) |

### 비교표

| 기준 | 방안 1 (유지) | 방안 2 (채택) | 방안 3 (Central IdP) |
| --- | --- | --- | --- |
| 마이그레이션 비용 | 🟢 없음 | 🟡 높음 | 🔴 매우 높음 |
| 서비스 간 ID 일치 | ❌ | ✅ | ✅ |
| 코드 복잡도 감소 | ❌ | ✅ | ✅ |
| 문토 종속성 | 🟡 인증만 | 🔴 ID 완전 종속 | 🟢 없음 |
| 데이팅 독립 앱 전환 | ✅ 쉬움 | ❌ 재설계 필요 | ✅ |
| 새 서비스 추가 | ❌ 매핑 추가 | 🟡 문토 종속 | ✅ |
| 실현 난이도 | 🟢 | 🟡 | 🔴 |

### 방안 2를 채택한 이유

1. 문토의 User.id가 **Int**이므로 타입 변경 없이 값만 맞추면 됨 (마이그레이션 범위 최소화)
2. 이미 마이그레이션 SQL이 준비되어 있어 **1~2주 내 실현 가능**
3. 방안 3(Central IdP)은 이상적이나 **Identity Service 구축 비용이 과대** (4~6주)
4. 장기 기술부채를 방치하면 서비스 확장 시마다 복잡도가 기하급수적으로 증가

---

### DBML `v1.0.2`

[dating-dbml-260310.pdf](%EB%8D%B0%EC%9D%B4%ED%8C%85-%EB%AC%B8%ED%86%A0%20%EC%9C%A0%EC%A0%80%20%EC%95%84%EC%9D%B4%EB%94%94%20%ED%86%B5%ED%95%A9%20OnePager/dating-dbml-260310.pdf)

```bash
// ============================================
// Dating Backend - Database Schema (DBML)
// Generated from prisma/schema.prisma
// ============================================

Project dating_backend {
  database_type: 'PostgreSQL'
  Note: '데이팅 앱 백엔드 데이터베이스 스키마'
}

// ============================================
// [공통] 마스터 데이터 (다른 테이블에서 참조)
// ============================================

Table Region {
  id int [pk, increment]
  name varchar(100) [not null]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (name)
  }
}

Table SubRegion {
  id int [pk, increment]
  regionId int [not null, ref: > Region.id]
  name varchar(100) [not null]
  isAllRegion boolean [default: false]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (regionId, name)
    (name)
  }
}

Table CurrencyMission {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime
  missionType varchar [not null]
  missionCode varchar [not null]
  name varchar [not null]
  description varchar(200)
  targetGender varchar [not null]
  iconUrl varchar [not null]
  rewardAmount int [not null]
  targetCount int [not null]

  indexes {
    (missionType)
    (missionCode, targetGender) [unique]
  }
}

// ============================================
// [1] User - 사용자
// ============================================

Table User {
  id int [pk, note: 'PK']
  status varchar [note: 'INITIAL, PENDING, ACTIVE, SUSPENDED, DEACTIVATED, DELETED']
  createdAt datetime [default: `now()`]
  updatedAt datetime [note: '자동 업데이트']
  lastLoginAt datetime
  deletedAt datetime
  name varchar
  phoneNumber varchar [note: '암호화된 전화번호']
  birthDate datetime
  gender varchar [note: 'MALE, FEMALE']
  sendbirdToken varchar [note: 'Sendbird 채팅 액세스 토큰']
  oldDatingId int [note: '마이그레이션 롤백용 백업']

  indexes {
    (status, createdAt)
    (gender, status)
    (createdAt, status)
  }
}

Table UserOauthProvider {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  provider varchar [not null, note: 'MUNTO']
  providerUserId varchar [not null]
  email varchar
  providerData json
  createdAt datetime [default: `now()`]
  updatedAt datetime
  lastUsedAt datetime

  indexes {
    (userId)
    (provider, email)
    (userId, provider) [unique]
  }
}

Table RefreshToken {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  token varchar [unique]
  expiresAt datetime [not null]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (userId)
    (expiresAt)
  }
}

Table TermsAgreements {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  version int [not null]
  serviceTermsAgreed boolean [not null]
  privacyTermsAgreed boolean [not null]
  marketingAgreed boolean [default: false]
  ageAgreed boolean [default: false]
  termsProvisionsAgreed boolean [default: false]
  sensitiveInfoAgreed boolean [default: false]
  agreedAt datetime [not null]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (userId, marketingAgreed)
  }
}

Table IdentityVerification {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  userId int [unique, not null, ref: > User.id]
  hashedCI varchar [unique]

  indexes {
    (hashedCI)
    (userId)
  }
}

Table UserRegion {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  subRegionId int [not null, ref: > SubRegion.id]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (subRegionId)
  }
}

Table UserPreferredLocation {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  subRegionId int [not null, ref: > SubRegion.id]
  createdAt datetime [default: `now()`]

  indexes {
    (userId)
    (userId, subRegionId) [unique]
  }
}

Table UserPreferredAge {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  minAge int [not null]
  maxAge int [not null]
  createdAt datetime [default: `now()`]
  updatedAt datetime
}

Table UserBlock {
  id int [pk, increment]
  blockerId int [not null, ref: > User.id]
  blockedId int [not null, ref: > User.id]
  blockReason varchar [default: 'OTHER']
  unblockedAt datetime
  blockCount int [default: 1]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (blockerId, unblockedAt)
    (blockedId)
    (blockedId, unblockedAt)
    (blockerId, blockedId) [unique]
  }
}

Table ContactBlock {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  phoneNumber varchar(255) [not null]
  createdAt datetime [default: `now()`]

  indexes {
    (userId)
    (phoneNumber)
    (userId, phoneNumber) [unique]
  }
}

Table AccountDeletion {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  reason varchar
  feedback varchar
  createdAt datetime [default: `now()`]
  updatedAt datetime
  beforeStatus varchar [not null]

  indexes {
    (userId)
    (createdAt)
  }
}

Table AccountDeactivation {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  reason varchar
  reactivatedAt datetime
  createdAt datetime [default: `now()`]
  updatedAt datetime
  beforeStatus varchar [not null]

  indexes {
    (userId, createdAt)
    (createdAt)
  }
}

Table UserCurrency {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  currentBalance int [default: 0]
  totalPurchased int [default: 0]
  totalSpent int [default: 0]
  totalBonus int [default: 0]
  lastTransactionAt datetime
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (userId)
  }
}

Table NotificationSettings {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  pushRecommendation boolean [default: true]
  pushExplore boolean [default: true]
  pushLike boolean [default: true]
  pushFriendRequest boolean [default: true]
  pushChat boolean [default: true]
  pushProfileJudgment boolean [default: true]
  pushNotification boolean [default: true]
  pushMarketing boolean [default: true]
  updatedAt datetime

  indexes {
    (userId)
  }
}

Table PushNotificationQueue {
  id int [pk, increment]
  targetUserId int [not null, ref: > User.id]
  status varchar [default: 'PENDING']
  data json [not null]
  scheduledAt datetime [not null]
  sentAt datetime
  errorMessage text
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (status, scheduledAt)
    (targetUserId)
  }
}

Table UserQueueRound {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  queueType varchar [not null]
  currentRound int [default: 1]
  isExhausted boolean [default: false]
  lastExhaustedAt datetime
  totalShown int [default: 0]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (isExhausted, queueType)
    (userId, queueType, currentRound) [unique]
  }
}

Table RecommendationUserScore {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  total decimal(5,4) [default: 0.50]
  attractiveness decimal(5,4) [default: 0.50]
  activity decimal(5,4) [default: 0.50]
  revenueTrigger decimal(5,4) [default: 0.50]
  spending decimal(5,4) [default: 0.50]
  newcomerBonus decimal(5,4) [default: 0.00]
  adminOffset decimal(5,4) [default: 0.00]
  lastCalculatedAt datetime
  createdAt datetime [default: `now()`]

  indexes {
    (total)
    (attractiveness)
    (lastCalculatedAt)
  }
}

Table ExploreUserScore {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  total decimal(5,4) [default: 0.50]
  attractiveness decimal(5,4) [default: 0.50]
  activity decimal(5,4) [default: 0.50]
  revenueTrigger decimal(5,4) [default: 0.50]
  spending decimal(5,4) [default: 0.50]
  newcomerBonus decimal(5,4) [default: 0.00]
  adminOffset decimal(5,4) [default: 0.00]
  lastCalculatedAt datetime
  createdAt datetime [default: `now()`]

  indexes {
    (total)
    (attractiveness)
    (lastCalculatedAt)
  }
}

Table UserScoreHistory {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  queueType varchar [not null]
  total decimal(5,2) [default: 0.50]
  attractiveness decimal(5,2) [default: 0.50]
  activity decimal(5,2) [default: 0.50]
  revenueTrigger decimal(5,2) [default: 0.50]
  spending decimal(5,2) [default: 0.50]
  newcomerBonus decimal(5,2) [default: 0.00]
  calculatedAt datetime

  indexes {
    (userId, queueType, calculatedAt)
  }
}

Table ActionLog {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  targetUserId int [ref: > User.id]
  actionType varchar [not null]
  deviceType varchar [default: 'UNKNOWN']
  deviceInfo varchar(255)
  appVersion varchar(20)
  osVersion varchar(20)
  metadata json
  createdAt datetime [default: `now()`]

  indexes {
    (actionType)
    (userId)
    (createdAt)
  }
}

Table UserMissionProgress {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  userId int [not null, ref: > User.id]
  missionId int [not null, ref: > CurrencyMission.id]
  currentCount int [default: 0]
  isCompleted boolean [default: false]
  isClaimed boolean [default: false]
  completedAt datetime
  claimedAt datetime

  indexes {
    (userId, missionId) [unique]
    (userId, isCompleted, isClaimed)
  }
}

Table UserDeleteEventLog {
  id int [pk, increment]
  eventId varchar [unique, not null]
  muntoUserId int [not null]
  datingUserId int
  status varchar [not null]
  processedAt datetime [default: `now()`]
  errorMessage varchar

  indexes {
    (eventId)
    (muntoUserId)
    (status)
  }
}

// ============================================
// [2] Admin User - 관리자
// ============================================

Table AdminUser {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  lastLoginAt datetime
  email varchar [unique]
  password varchar [not null]
  name varchar [not null]

  indexes {
    (email)
  }
}

Table AdminPermission {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime
  permissionCode varchar [not null]

  indexes {
    (permissionCode)
  }
}

Table AdminUserPermission {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  adminId int [not null, ref: > AdminUser.id]
  permissionId int [not null, ref: > AdminPermission.id]

  indexes {
    (adminId)
    (permissionId)
    (adminId, permissionId) [unique]
  }
}

Table ProfileReview {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  reviewedAt datetime
  revieweeId int [unique, not null, ref: > User.id]
  reviewerId int [ref: > AdminUser.id]
  reviewType varchar [not null]
  reviewStatus varchar [not null]
  rejectReason varchar

  indexes {
    (createdAt)
    (revieweeId)
  }
}

Table ProfileReviewHistory {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  profileReviewId int [not null, ref: > ProfileReview.id]
  action varchar [not null]
  data json

  indexes {
    (profileReviewId)
    (action)
    (createdAt)
  }
}

Table Report {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  reviewedAt datetime
  reviewedBy int [ref: > AdminUser.id]
  reporterId int [ref: > User.id]
  adminReporterId int [ref: > AdminUser.id]
  reportedUserId int [not null, ref: > User.id]
  reportType varchar [not null]
  reportReason varchar
  reportStatus varchar [default: 'PENDING']
  evidenceUrls json
  isNoAction boolean [default: false]
  memo varchar

  indexes {
    (reportedUserId)
    (adminReporterId)
  }
}

Table UserSanction {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime
  userId int [not null, ref: > User.id]
  reportId int [unique, not null, ref: > Report.id]
  sanctionType varchar [not null]
  startDate datetime [default: `now()`]
  endDate datetime

  indexes {
    (userId)
    (reportId)
    (startDate)
  }
}

Table UserSanctionHistory {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  createdBy int [not null, ref: > AdminUser.id]
  updatedAt datetime
  userSanctionId int [not null, ref: > UserSanction.id]
  sanctionType varchar [not null]
  memo varchar

  indexes {
    (userSanctionId)
  }
}

Table CurrencyOrderHistory {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime
  orderId int [not null, ref: > CurrencyOrder.id]
  status varchar [not null]
  amountChange int
  refundedBy int [ref: > AdminUser.id]
  data json
  memo varchar

  indexes {
    (orderId)
    (createdAt)
    (refundedBy)
  }
}

// ============================================
// [3] Profile - 프로필
// ============================================

Table JobCategory {
  id int [pk, increment]
  title varchar(50) [not null]
  description varchar
  sortOrder int [default: 0]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime

  indexes {
    (deletedAt, sortOrder)
  }
}

Table UserProfile {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  nickname varchar(30) [not null]
  height int [not null]
  education varchar [not null]
  schoolName varchar(100)
  religion varchar [not null]
  drinking varchar [not null]
  smoking varchar [not null]
  mbti varchar [not null]
  togetherActivity varchar [not null]
  introduction text
  updatedAt datetime
  job varchar [not null]
  jobCategoryId int [not null, ref: > JobCategory.id]

  indexes {
    (nickname)
    (userId)
  }
}

Table UserProfileDraft {
  id int [pk, increment]
  userId int [unique, not null, ref: > User.id]
  nickname varchar(30)
  height int
  education varchar
  schoolName varchar(100)
  religion varchar
  drinking varchar
  smoking varchar
  mbti varchar
  togetherActivity varchar
  introduction text
  job varchar
  jobCategoryId int [ref: > JobCategory.id]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (nickname)
    (userId)
  }
}

Table File {
  id int [pk, increment]
  fileKey varchar(255) [unique]
  url varchar(500)
  isUploaded boolean [default: false]
  fileType varchar [default: 'ETC']
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (fileKey)
    (fileType, isUploaded)
  }
}

Table UserProfilePhoto {
  id int [pk, increment]
  profileId int [ref: > UserProfile.id]
  profileDraftId int [ref: > UserProfileDraft.id]
  fileId int [not null, ref: > File.id]
  photoOrder int
  approvalStatus varchar [default: 'PENDING']
  rejectedReason varchar(200)
  createdAt datetime [default: `now()`]
  approvedAt datetime
  deletedAt datetime

  indexes {
    (profileId, approvalStatus)
    (profileDraftId, approvalStatus)
    (fileId)
    (profileId, photoOrder) [unique]
    (profileDraftId, photoOrder) [unique]
    (profileId, fileId) [unique]
    (profileDraftId, fileId) [unique]
  }
}

Table PhotoAiValidation {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  fileId int [not null, ref: > File.id]
  result varchar [not null]
  reason varchar
  confidence float
  metadata json

  indexes {
    (fileId)
    (result)
    (reason)
    (createdAt)
  }
}

Table InterestCategory {
  id int [pk, increment]
  name varchar(30) [unique]
  description varchar
  sortOrder int [default: 0]
  deletedAt datetime
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (deletedAt, sortOrder)
  }
}

Table Interest {
  id int [pk, increment]
  name varchar(50) [unique]
  categoryId int [not null, ref: > InterestCategory.id]
  sortOrder int [default: 0]
  createdAt datetime [default: `now()`]
  deletedAt datetime

  indexes {
    (categoryId, sortOrder)
  }
}

Table UserProfileInterest {
  id int [pk, increment]
  userProfileId int [ref: > UserProfile.id]
  userProfileDraftId int [ref: > UserProfileDraft.id]
  interestId int [not null, ref: > Interest.id]
  createdAt datetime [default: `now()`]

  indexes {
    (userProfileId)
    (userProfileDraftId)
    (interestId)
    (userProfileId, interestId) [unique]
    (userProfileDraftId, interestId) [unique]
  }
}

Table KeywordCategory {
  id int [pk, increment]
  name varchar(30) [unique]
  sortOrder int [default: 0]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime

  indexes {
    (createdAt)
  }
}

Table Keyword {
  id int [pk, increment]
  keywordCategoryId int [not null, ref: > KeywordCategory.id]
  name varchar(20) [unique]
  sortOrder int [default: 0]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime

  indexes {
    (keywordCategoryId)
  }
}

Table UserKeyword {
  id int [pk, increment]
  userProfileId int [ref: > UserProfile.id]
  userProfileDraftId int [ref: > UserProfileDraft.id]
  keywordId int [not null, ref: > Keyword.id]
  createdAt datetime [default: `now()`]

  indexes {
    (userProfileId)
    (userProfileDraftId)
    (keywordId)
    (userProfileId, keywordId) [unique]
    (userProfileDraftId, keywordId) [unique]
  }
}

Table UserPreferredKeyword {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  userProfileId int [ref: > UserProfile.id]
  userProfileDraftId int [ref: > UserProfileDraft.id]
  keywordId int [not null, ref: > Keyword.id]

  indexes {
    (userProfileId)
    (userProfileDraftId)
    (keywordId)
    (userProfileId, keywordId) [unique]
    (userProfileDraftId, keywordId) [unique]
  }
}

Table UserPreferredRegion {
  id int [pk, increment]
  profileId int [ref: > UserProfile.id]
  profileDraftId int [ref: > UserProfileDraft.id]
  subRegionId int [not null, ref: > SubRegion.id]
  createdAt datetime [default: `now()`]

  indexes {
    (profileId)
    (profileDraftId)
    (profileId, subRegionId) [unique]
    (profileDraftId, subRegionId) [unique]
  }
}

Table preferenceQuestionCategories {
  id int [pk, increment]
  name varchar(20) [not null]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime

  indexes {
    (deletedAt)
  }
}

Table preferenceQuestions {
  id int [pk, increment]
  questionText varchar(200) [not null]
  exampleText varchar(300)
  categoryId int [not null, ref: > preferenceQuestionCategories.id]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime

  indexes {
    (categoryId)
  }
}

Table userPreferenceAnswers {
  id int [pk, increment]
  profileId int [ref: > UserProfile.id]
  profileDraftId int [ref: > UserProfileDraft.id]
  questionId int [not null, ref: > preferenceQuestions.id]
  answerText varchar(500) [not null]
  createdAt datetime [default: `now()`]

  indexes {
    (profileId)
    (profileDraftId)
    (questionId)
    (profileId, questionId) [unique]
    (profileDraftId, questionId) [unique]
  }
}

// ============================================
// [4] Matching - 매칭
// ============================================

Table UserCrushExpression {
  id int [pk, increment]
  fromUserId int [not null, ref: > User.id]
  toUserId int [not null, ref: > User.id]
  expressionType varchar [not null]
  requestCurrencyUsed int [default: 0]
  requiredProfileOpenCurrency int [default: 0]
  profileOpenCurrencyUsed int [default: 0]
  profileViewed boolean [default: false]
  createdAt datetime [default: `now()`]
  deletedAt datetime
  roundNumber int [default: 1]

  indexes {
    (toUserId, expressionType)
    (fromUserId, expressionType)
    (createdAt)
    (deletedAt)
    (fromUserId, toUserId, roundNumber) [unique]
  }
}

Table ChatRoom {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  activatedAt datetime
  expiredAt datetime
  lastMessageAt datetime
  fromUserId int [not null, ref: > User.id]
  toUserId int [not null, ref: > User.id]
  roomStatus varchar [default: 'CREATED']
  sendbirdChannelUrl varchar [unique]
  activatedByUserId int
  hasReceivedReply boolean [default: false]
  activationCurrencyUsed int
  lastMessageSentByUserId int

  indexes {
    (sendbirdChannelUrl)
    (activatedAt, roomStatus)
  }
}

Table Match {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  deletedAt datetime
  fromUserId int [not null, ref: > User.id]
  toUserId int [not null, ref: > User.id]
  chatRoomId int [unique, ref: > ChatRoom.id]
  isActive boolean [default: true]
  chatExpiresAt datetime [not null]
  endedAt datetime
  endedBy int
  endReason varchar

  indexes {
    (fromUserId, isActive)
    (toUserId, isActive)
    (chatExpiresAt, isActive)
  }
}

Table FriendRequest {
  id int [pk, increment]
  fromUserId int [not null, ref: > User.id]
  toUserId int [not null, ref: > User.id]
  message text
  status varchar [default: 'PENDING']
  requestCurrencyUsed int [default: 15]
  requiredProfileOpenCurrency int [default: 0]
  profileOpenCurrencyUsed int [default: 0]
  profileViewed boolean [default: false]
  createdAt datetime [default: `now()`]
  respondedAt datetime
  expiredAt datetime
  refundStatus varchar [default: 'NONE']
  refundedAt datetime
  deletedAt datetime

  indexes {
    (fromUserId, status)
    (toUserId, status)
    (createdAt)
    (expiredAt, refundStatus)
    (deletedAt)
  }
}

Table RecommendationQueue {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  targetUserId int [not null, ref: > User.id]
  category varchar [not null]
  showAt datetime [not null]
  seenAt datetime
  expiresAt datetime [not null]
  roundNumber int [default: 1]
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (userId, category, showAt, expiresAt)
    (userId, roundNumber)
    (userId, targetUserId, category, roundNumber) [unique]
  }
}

Table RecommendationQueueHistory {
  id int [pk, increment]
  userId int [not null]
  targetUserId int [not null]
  category varchar [not null]
  createdAt datetime [default: `now()`]
  seenAt datetime [not null]
  userRoundNumber int [not null]

  indexes {
    (userId, targetUserId, userRoundNumber) [unique]
  }
}

Table ExploreQueue {
  id int [pk, increment]
  userId int [not null, ref: > User.id]
  targetUserId int [not null, ref: > User.id]
  showAt datetime [not null]
  roundNumber int [default: 1]
  createdAt datetime [default: `now()`]
  updatedAt datetime
  crushExpressionId int [ref: > UserCrushExpression.id]

  indexes {
    (userId, showAt)
    (userId, roundNumber)
    (userId, targetUserId, roundNumber) [unique]
  }
}

Table AlgorithmTestUser {
  id int [pk, increment]
  versionId varchar(50) [not null]
  gender varchar [not null]
  userId int [not null, ref: > User.id]
  createdAt datetime [default: `now()`]

  indexes {
    (versionId, gender, userId) [unique]
    (versionId, gender, id)
    (gender, createdAt)
  }
}

// ============================================
// [5] 기타 - 재화, 결제, 미션, 시스템
// ============================================

Table CurrencyPackage {
  id int [pk, increment]
  title varchar(50) [default: '']
  image varchar(255) [default: '']
  packageId varchar [unique]
  packagePlatform varchar [not null]
  quantity int [not null]
  price int [not null]
  discountRate decimal(5,2) [default: 0]
  finalPrice int [not null]
  isPopular boolean [default: false]
  badgeTitle varchar(50)
  hasBackgroundColor boolean [default: false]
  isActive boolean [default: true]
  displayOrder int
  createdAt datetime [default: `now()`]
  updatedAt datetime
}

Table CurrencyOrder {
  id int [pk, increment]
  receiptId varchar [unique]
  userCurrencyId int [not null, ref: > UserCurrency.id]
  packageId int [not null, ref: > CurrencyPackage.id]
  paymentMethod varchar [not null]
  paymentChannel varchar [not null]
  orderStatus varchar [not null]
  receiptData text
  storeTransactionId varchar
  purchaseToken varchar
  orderAmount int [not null]
  refundedAmount int [default: 0]
  expiresAt datetime [not null]
  completedAt datetime
  refundRequestedAt datetime
  createdAt datetime [default: `now()`]
  updatedAt datetime
  bootpayReceiptId varchar
  confirmFailedAt datetime

  indexes {
    (userCurrencyId)
    (orderStatus)
    (expiresAt)
    (receiptId)
    (orderStatus, bootpayReceiptId)
  }
}

Table CurrencyTransaction {
  id int [pk, increment]
  userCurrencyId int [not null, ref: > UserCurrency.id]
  transactionType varchar [not null]
  amount int [not null]
  balanceBefore int [not null]
  balanceAfter int [not null]
  orderId int [ref: > CurrencyOrder.id]
  orderHistoryId int [unique, ref: > CurrencyOrderHistory.id]
  actionType varchar
  targetUserId int [ref: > User.id]
  description varchar
  metadata json
  status varchar [default: 'COMPLETED']
  createdAt datetime [default: `now()`]

  indexes {
    (userCurrencyId, createdAt)
    (transactionType)
    (orderId)
  }
}

Table PaymentRequest {
  id int [pk, increment]
  createdAt datetime [default: `now()`]
  receiptId varchar [unique]
}

Table SystemConfig {
  id int [pk, increment]
  key varchar(255) [unique, not null]
  value json [not null]
  description text
  createdAt datetime [default: `now()`]
  updatedAt datetime

  indexes {
    (key)
  }
}

// ============================================
// TableGroup (dbdiagram.io 시각화용)
// ============================================

TableGroup User {
  User
  UserOauthProvider
  RefreshToken
  TermsAgreements
  UserRegion
  UserPreferredLocation
  UserPreferredAge
  UserBlock
  ContactBlock
  AccountDeletion
  AccountDeactivation
  UserCurrency
  NotificationSettings
  PushNotificationQueue
  UserQueueRound
  RecommendationUserScore
  ExploreUserScore
  UserScoreHistory
  ActionLog
  UserMissionProgress
  UserDeleteEventLog
  IdentityVerification
}

TableGroup AdminUser {
  AdminUser
  AdminPermission
  AdminUserPermission
  ProfileReview
  ProfileReviewHistory
  Report
  UserSanction
  UserSanctionHistory
  CurrencyOrderHistory
}

TableGroup Profile {
  JobCategory
  UserProfile
  UserProfileDraft
  File
  UserProfilePhoto
  PhotoAiValidation
  InterestCategory
  Interest
  UserProfileInterest
  KeywordCategory
  Keyword
  UserKeyword
  UserPreferredKeyword
  Region
  SubRegion
  UserPreferredRegion
  preferenceQuestionCategories
  preferenceQuestions
  userPreferenceAnswers
}

TableGroup Matching {
  UserCrushExpression
  ChatRoom
  Match
  FriendRequest
  RecommendationQueue
  RecommendationQueueHistory
  ExploreQueue
  AlgorithmTestUser
}

```

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 25.03.09 | 홍진영 | 최초 작성 |
| v1.0.1 | 25.03.10 | 홍진영 | 피드백 반영 |
| v1.0.2 | 25.03.10 | 홍진영 | DBML 추가 |

---

<aside>
🧾

## **문서 작성 규칙**

</aside>

1. **항목마다 작성자/작성일을 명시**
2. **모든 변경은 ‘변경 이력’ 테이블에 기록**
3. **문서 버전은 Semantic Versioning(v1.0.0)을 따름**
4. **기여자는 실질적인 내용 추가/수정에 참여한 사람만 포함**
5. 변경 사항이 발생하거나 리뷰 요청이 필요한 문서의 경우, 관련 수정 내용을 변경 이력과 함께 명시하고, 해당 부분 끝에 버전을 표기하여 혼동을 방지한다. 
    - 변경 내용 `(v1.0.1)`