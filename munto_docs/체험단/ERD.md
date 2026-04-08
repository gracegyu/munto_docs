# ERD

## 신규 테이블

### TrialProduct (초대권 상품)

```sql
CREATE TYPE "TrialRecruitType" AS ENUM ('FIRST_COME', 'APPROVAL');

CREATE TABLE "TrialProduct" (
  "id"          SERIAL PRIMARY KEY,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  "deletedAt"   TIMESTAMPTZ,
  "name"        TEXT NOT NULL,                          -- 상품명 (스타터, 스탠다드, 프로, 프로맥스)
  "quantity"    INTEGER NOT NULL,                       -- 초대권 수량 (10, 30, 50, 100)
  "price"       INTEGER NOT NULL,                       -- 판매가 (원)
  "listPrice"   INTEGER,                                -- 정가 (원, 할인 없으면 NULL)
  "recruitType" "TrialRecruitType" NOT NULL,             -- FIRST_COME: 선착순, APPROVAL: 승인제
  "isActive"    BOOLEAN NOT NULL DEFAULT true            -- 판매 중 여부
);
```

### TrialTicket (초대권)

```sql
CREATE TABLE "TrialTicket" (
  "id"            SERIAL PRIMARY KEY,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  "deletedAt"     TIMESTAMPTZ,
  "hostId"        INTEGER NOT NULL REFERENCES "User"("id"),           -- 호스트
  "recruitType"   "TrialRecruitType" NOT NULL,                        -- FIRST_COME / APPROVAL
  "totalCount"    INTEGER NOT NULL DEFAULT 0,                         -- 총 보유 수량 (구매 시 누적)
  "usedCount"     INTEGER NOT NULL DEFAULT 0,                         -- 소진된 수량
  "expiredCount"  INTEGER NOT NULL DEFAULT 0                          -- 만료된 수량
);

CREATE UNIQUE INDEX "TrialTicket_hostId_recruitType_key" ON "TrialTicket"("hostId", "recruitType");
CREATE INDEX "TrialTicket_hostId_idx" ON "TrialTicket"("hostId");
```

### TrialRecruitment (체험단 모집 설정)

```sql
CREATE TYPE "TrialRecruitmentStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "TrialRecruitment" (
  "id"             SERIAL PRIMARY KEY,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  "deletedAt"      TIMESTAMPTZ,
  "socialingId"    INTEGER NOT NULL REFERENCES "Socialing"("id"),     -- 대상 소셜링
  "ticketId"       INTEGER NOT NULL REFERENCES "TrialTicket"("id"),   -- 사용 중인 초대권
  "hostId"         INTEGER NOT NULL REFERENCES "User"("id"),          -- 호스트
  "recruitType"    "TrialRecruitType" NOT NULL,                       -- 선착순 / 승인제
  "allocatedCount" INTEGER NOT NULL,                                  -- 배정한 초대권 수량
  "usedCount"      INTEGER NOT NULL DEFAULT 0,                        -- 소진된 수량 (멤버 확정 시 +1)
  "question"       TEXT,                                              -- 승인제 질문 (승인제일 때만)
  "maxAge"         INTEGER,                                           -- 나이 상한 (NULL = 제한 없음)
  "minAge"         INTEGER,                                           -- 나이 하한 (NULL = 제한 없음)
  "maleMaxCount"   INTEGER,                                           -- 남성 최대 인원 (NULL = 무관)
  "femaleMaxCount" INTEGER,                                           -- 여성 최대 인원 (NULL = 무관)
  "status"         "TrialRecruitmentStatus" NOT NULL DEFAULT 'OPEN'
);

CREATE UNIQUE INDEX "TrialRecruitment_socialingId_key" ON "TrialRecruitment"("socialingId");
CREATE INDEX "TrialRecruitment_hostId_idx" ON "TrialRecruitment"("hostId");
CREATE INDEX "TrialRecruitment_status_idx" ON "TrialRecruitment"("status");
```

### TrialRefund (체험단 환급 이력)

```sql
CREATE TYPE "TrialRefundStatus" AS ENUM (
  'PENDING',          -- 환급 대기 (리뷰 미작성)
  'REFUNDED',         -- 환급 완료 (리뷰 작성 → 즉시 부분환불)
  'EXPIRED',          -- 환급 불가 (기한 초과)
  'NOT_ATTENDED',     -- 환급 불가 (참여 미확인)
  'MANUAL_REFUNDED'   -- 수동 환급 (백오피스 CS 처리)
);

CREATE TABLE "TrialRefund" (
  "id"              SERIAL PRIMARY KEY,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  "recruitmentId"   INTEGER NOT NULL REFERENCES "TrialRecruitment"("id"),  -- 체험단 모집
  "memberId"        INTEGER NOT NULL REFERENCES "SocialingMember"("id"),   -- 체험단 멤버 (grade=TRIAL)
  "orderId"         INTEGER NOT NULL REFERENCES "Order"("id"),             -- 유저 결제 주문
  "userId"          INTEGER NOT NULL REFERENCES "User"("id"),              -- 유저
  "orderPrice"      INTEGER NOT NULL,                                      -- 원 결제 금액
  "refundAmount"    INTEGER NOT NULL,                                      -- 환급 금액 (orderPrice * 0.8)
  "refundedAt"      TIMESTAMPTZ,                                           -- 환급 처리 시각
  "status"          "TrialRefundStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE UNIQUE INDEX "TrialRefund_memberId_key" ON "TrialRefund"("memberId");
CREATE INDEX "TrialRefund_recruitmentId_idx" ON "TrialRefund"("recruitmentId");
CREATE INDEX "TrialRefund_status_idx" ON "TrialRefund"("status");
```

## 기존 테이블 변경

### SocialingMember — grade enum에 TRIAL 추가

```sql
ALTER TYPE "SocialingMemberGrade" ADD VALUE 'TRIAL';
```

- 기존 레코드에 영향 없음 (기본값 MEMBER 유지)
- 체험단 멤버 조회: `WHERE grade = 'TRIAL'`

### Order — orderType 필드 추가

```sql
ALTER TABLE "Order" ADD COLUMN "trialProductId" INTEGER REFERENCES "TrialProduct"("id");  -- 초대권 구매 시 상품 ID (NULL이면 일반 주문)
```

- non-breaking change (ALTER TABLE ADD COLUMN)
- 주문 유형 구분 방법
    - 초대권 구매 주문: `Order.trialProductId IS NOT NULL`
    - 체험단 유저 결제 주문: `Order.socialingId IS NOT NULL` + 해당 `SocialingMember.grade = 'TRIAL'`

## 관계도

```
User (호스트)
 ├── TrialTicket (1:2, recruitType별 1행씩)  -- 보유 재화
 │
 ├── Order (orderType = TRIAL_PACKAGE)       -- 구매 이력
 │    └── trialProductId → TrialProduct
 │
 └── Order (orderType = TRIAL)               -- 체험단 유저 결제
      └── TrialRefund (1:1)

TrialTicket
 └── TrialRecruitment (1:N) ── Socialing (1:1)
      └── TrialRefund (1:N)

Socialing
 ├── SocialingMember (grade = MEMBER)  -- 일반 멤버
 ├── SocialingMember (grade = TRIAL)   -- 체험단 멤버
 └── TrialRecruitment (0:1)            -- 체험단 모집 설정
```