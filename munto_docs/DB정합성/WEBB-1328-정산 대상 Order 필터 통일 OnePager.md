# 정산 대상 Order 필터 통일 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 22일 오후 4:41
최근 수정일: 2026년 4월 23일 오후 1:00
문서 상태: Active
생성 일시: 2026년 4월 22일 오후 4:41
최종 편집자: 김범진
관련 이슈: https://munto.atlassian.net/browse/WEBB-1328

## Project Description

정산 스케줄러가 도메인별로 Order 필터링 기준이 달라, 취소·환불 실패·이중결제 건이 호스트에게 잘못 정산되고 있다. WEBB-1321에서 정산 규칙을 정식 문서화([문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) Invariant SE6)했고, 본 작업은 그 규칙을 실 코드에 옮긴다.

### 이번 범위

1. **모든 도메인 Order 필터 통일** — Invariant SE6: `orderStatus IN (COMPLETED_PAYMENT, PARTIAL_REFUNDED, COMPLETED_CANCEL_PAYMENT) AND remainPrice > 0`
2. **Order-Payment-도메인 3자 정합성 가드** — Invariant SE7(신설 제안):
    - Order가 해당 도메인(Socialing/Challenge/Club)에 FK로 연결돼 있는지
    - `OrderKind = CARD` Order는 `Payment` 레코드가 실제로 존재하는지
    - 불충족 건은 정산에서 제외 + Slack 알림
3. **챌린지 계산식 소셜링 방식으로 변경** — `SUM(orderPrice)` → `remainPrice` / `refundPrice` 분리 집계
4. **클럽 정원 상한 적용** — `settlementTargetCount = MIN(totalCount, Club.maximumMembers)`
5. **소셜링 `PARTIAL_REFUND_FAILED` 분기 제거** — 실패 상태는 정산 제외

### 범위 외

- **코스(COURSE)** — 서비스 종료 예정. 본 작업에서 건드리지 않음
- **ONETIME/GRACE_PERIOD 취소 시 Order 전이** — 본 필터는 이미 `COMPLETED_CANCEL_PAYMENT`를 포함하도록 설계되어, §5 구현 후 자연스럽게 반영됨. 별도 이슈로 후속
- **환불 실패 재시도 · Sweeper 스케줄러** — WEBB-1326. 본 필터는 `FAILED_CANCEL_PAYMENT`·`PARTIAL_REFUND_FAILED`를 제외하며, 재시도로 해소된 Order는 다음 주기에 자연 복귀
- **소셜링 STAFF 유료 결제 정산 누락** — WEBB-1328 원문 ④항. 스태프 환불 타이밍이 원인이라 WEBB-1325 스코프. 본 작업 분리
- **기존 미정산·과정산 건 보정** — 과거 데이터 재점검은 배포 전/후 별도 운영 과제

---

## Business and Marketing Justification

- **실측 과정산 이력**: 클럽·챌린지 도메인에서 취소·환불 실패 건이 정산에 포함되어 호스트에게 선지급된 사례가 이미 발생. 이후 수동 환불 시 정산 차감 프로세스가 없어 금전 손실로 귀결
- **이중결제 중복 정산**: 이중결제로 Order 2건이 생성되면 클럽·코스 정산에서 둘 다 호스트에게 지급되는 구조적 결함. WEBB-967(소셜링 이중결제 CS)과 같은 유형이 정산 단계에서 반복 가능
- **얼리버드 환불 Order 누락**: 챌린지 정산이 `COMPLETED_PAYMENT` 단독 필터라 얼리버드 환불된 `PARTIAL_REFUNDED` Order가 정산에서 완전히 빠지고 있음. 호스트 과소 정산 유발
- **도메인별 기준 불일치**: 정산 규칙이 도메인마다 다르면 유지보수·감사·CS 응대 시 기준이 3개로 갈라지고 새로운 상태(예: `COMPLETED_CANCEL_PAYMENT + remainPrice > 0`) 반영 시 3곳을 모두 고쳐야 함
- **규칙 문서와 구현의 정렬**: WEBB-1321에서 `settlement.md`로 Invariant SE1~SE6이 정식 문서화됨. 현재 실 코드는 SE6 위반 상태로, 규칙 문서의 실효성 확보를 위해 정렬 필요
- **구조적 정합성 위반 방어 부재**: `order-common.md` Invariant 1(Order-Member 정합성), Invariant 2(Order-Payment 정합성)가 규칙상으론 보장되지만, 정산 쿼리는 그 불변식이 깨지지 않았다고 가정할 뿐 재검증하지 않음. Payment 저장 실패·도메인 FK 누락 같은 이상 데이터가 발생하면 그대로 호스트에게 정산됨. 방어 비용이 낮은 반면(쿼리 조건 1~2개 추가) 장애 시 금전 손실로 직결되므로 함께 반영

---

## Risk Assessment

| 리스크 | 수준 | 대응 방안 |
| --- | --- | --- |
| 필터 변경으로 정산 금액이 도메인별로 증감 — 호스트별 지급액 변동 발생 | 높음 | 배포 전 스테이징에서 직전 1주 정산 기간 재계산하여 `before/after` diff 확보 후 배포 의사결정. 영향 호스트·금액 규모를 이해관계자에 사전 공유 |
| `improvements.md` §5(ONETIME/GRACE_PERIOD 취소 Order 전이) 미선행 상태 배포 | 중 | 본 필터는 `COMPLETED_PAYMENT`를 이미 포함하므로 §5 미구현 상태에서 **기존 동작 유지**. §5 구현 후에는 `COMPLETED_CANCEL_PAYMENT + remainPrice > 0`로 전이되어 자동 포함됨 (필터 재수정 불필요) |
| 챌린지 계산식 전면 재작성으로 얼리버드 정산 회귀 | 중 | 소셜링 기존 방식(`remainPrice`/`refundPrice` 분리)을 그대로 차용하여 새 로직 최소화. 얼리버드 데이터셋으로 전용 테스트 케이스 |
| 클럽 정원 상한 신규 적용으로 일부 클럽 정산 감소 | 중 | 정원 초과 정산은 본래 SE3 위반이며 시정 대상. 영향 클럽·금액을 `before/after` diff로 확인 후 배포 |
| `FAILED_CANCEL_PAYMENT`/`PARTIAL_REFUND_FAILED` 제외로 일시적 정산 누락 | 낮음 | WEBB-1326 재시도 스케줄러 해소 시 다음 정산 주기에 `COMPLETED_CANCEL_PAYMENT`/`PARTIAL_REFUNDED`로 복귀하여 자연 반영. 재시도 미구현 기간에는 수동 환불 후 다음 주기 편입 |
| 테스트 데이터 누락으로 엣지 케이스 회귀 | 중 | SE6 조합표(orderStatus × remainPrice)를 테스트 매트릭스로 1:1 변환. 모든 도메인에 동일 매트릭스 적용 |
| 코스 정산 코드가 남아있어 규칙 불일치 혼재 | 낮음 | 본 작업은 코스 코드 미변경. 서비스 종료 시점의 코드 제거는 별도 과제 |
| Payment 조인 추가로 정산 쿼리 성능 저하 | 낮음 | `Payment.receiptId`·`Payment.orderId`(또는 `Order.bootpayReceiptId`) index 활용. 쿼리당 JOIN 1회 증가에 그침 |
| 정합성 위반 Order 감지 시 대응 프로세스 부재 | 중 | 정산 쿼리에서 제외 + Slack 알림 (WEBB-1326 Slack 채널 재사용). 주기적 감사 배치는 후속 과제 |
| Invariant SE7 위반 건이 실 DB에 존재하여 배포 직후 대량 알림 발생 | 중 | 배포 전 스테이징 재계산 시 SE7 위반 건수 사전 집계. 임계치 초과 시 배포 전 데이터 보정 |

---

## Resource and Scheduling Details

- **필요 인력**: Backend 1명 (AI 지원 개발)
- **예상 일정**: 구현 1주

### 마일스톤

| 일차 | 작업 | 산출물 |
| --- | --- | --- |
| Day 1 | `ChallengeSettlementService` / `ClubSettlementService` 추출 — 본 Technical Description §2 참조 (순수 이동, 동작 변경 없음) | 도메인별 서비스 파일 |
| Day 2 | 테스트 매트릭스 작성 (SE6/SE7 조합 × 3 도메인), 기존 동작 baseline 확정 | 케이스 테이블, 테스트 스켈레톤 |
| Day 3 | 클럽 필터(SE6+SE7) + 정원 상한 적용 | 코드, 유닛 테스트 |
| Day 4 | 챌린지 필터(SE6+SE7) + 계산식 소셜링 방식으로 재작성 | 코드, 유닛 테스트 |
| Day 5 | 소셜링 필터(SE6+SE7) + `PARTIAL_REFUND_FAILED` 분기 제거 + 스테이징 재계산 diff 검증 + PR 리뷰 | diff 리포트, 본 PR |

**롤아웃**: 3 도메인 동시 배포. 정산 스케줄러는 주 1회(화 04시) 실행이므로 배포 주의 화요일 이전 주 금요일 기준으로 스테이징 검증 → 익주 화요일 첫 실행 관찰

---

## Technical Description

### 1. 현 코드 상태 맵

| 도메인 | 파일:라인 | 현 Order 필터 | 현 계산식 | 정원 상한 |
| --- | --- | --- | --- | --- |
| 챌린지 | [settlement.schedule-job.service.ts:144-158](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L144-L158) | `orderStatus = COMPLETED_PAYMENT` | `SUM(orderPrice)` ([:79-82](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L79-L82)) | `price × maximumMembers` |
| 클럽 | [settlement.schedule-job.service.ts:207-260](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L207-L260) | `remainPrice > 0` (orderStatus 무시) | `SUM(remainPrice)` ([:171-173](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L171-L173)) | **없음** ([:175-176](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L175-L176)) |
| 소셜링 | [socialing-settlement.read.repository.ts:41-63](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement/repository/socialing-settlement.read.repository.ts#L41-L63) (repo 필터 없음) + [socialing-settlement.service.ts:30-58](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement/service/socialing-settlement.service.ts#L30-L58) (service 분기) | `PARTIAL_REFUNDED` / `PARTIAL_REFUND_FAILED` / `remainPrice > 0` 분기 | `remainPrice` / `discountAmount` 분리 (이미 TOBE에 가까움) | `maximumPerson - staffCount` |

### 2. 서비스 분리 구조

정산 로직을 도메인별 서비스로 분리하고, `SettlementScheduleJobService`는 Cron 등록과 도메인 서비스 호출만 담당하는 얇은 오케스트레이터로 남긴다. 각 서비스가 자기 도메인의 필터·집계·정합성 검증을 소유한다.

### 2.1 현 구조

| 도메인 | 현 위치 | 상태 |
| --- | --- | --- |
| 소셜링 | `SocialingSettlementService` (별도 클래스) | 분리됨 |
| 챌린지 | `settlement.schedule-job.service.ts` 인라인 메서드 | 분리 필요 |
| 클럽 | `settlement.schedule-job.service.ts` 인라인 메서드 | 분리 필요 |

### 2.2 TOBE 구조

- `ChallengeSettlementService`, `ClubSettlementService`를 소셜링과 동일 패턴으로 신규 추출
- 각 서비스 내부에 Repository / Service 구성 (`SocialingSettlementReadRepository` / `SocialingSettlementService` 구조 모방)
- `SettlementScheduleJobService`는 Cron 데코레이터와 도메인 서비스 호출만 담당 (집계·계산 로직 0)
- 이번 이슈의 필터·계산식 변경은 서비스 분리 이후 **각 서비스 내부에서** 수행해 diff 경계를 분리

이 리팩터는 **순수 이동**이며 동작을 바꾸지 않는다. 이후 규칙 변경이 각 서비스 단일 파일 안에서 완결되도록 하는 것이 목적이다.

### 2.3 향후 방향 — 공통 인터페이스

도메인 서비스 3개가 자리잡은 뒤 공통 인터페이스로 수렴하는 것이 다음 단계다. **본 이슈의 범위가 아니며, 별도 PR로 추진한다.** 구현체가 3개 모두 확보되기 전에 섣불리 추상화하면 잘못된 공통분모를 굳히는 위험이 있어 Rule of Three 기준으로 분리한다.

```tsx
interface DomainSettlementService<TItem> {
  // 정산 대상 아이템 조회 (SE6 + SE7 필터 내장)
  findTargets(lastId?: number): Promise<TItem[]>;

  // 아이템당 Settlement 입력 생성 (도메인별 집계·정원 상한 포함)
  buildSettlementInput(
    item: TItem,
    userSettlement: UserSettlement | undefined,
  ): Prisma.SettlementCreateManyInput;
}

// 스케줄러는 각 구현체를 순회 호출
// for (const service of [socialing, challenge, club]) await run(service);
```

WEBB-1325 `OrderCancelV3Service`의 "얇은 오케스트레이터 + 도메인별 전략 주입" 패턴과 동일 방향.

---

### 3. 각 도메인별 갭

### 3.1 챌린지

- **ASIS**: `orderStatus = COMPLETED_PAYMENT` 단독 + `SUM(orderPrice)` 기반.
    - `COMPLETED_CANCEL_PAYMENT + remainPrice > 0` (환불 없는 취소) 건 누락 → 호스트 과소 정산
    - `FAILED_CANCEL_PAYMENT`는 `COMPLETED_PAYMENT` 단독 필터로 이미 제외 중 (구조상 안전)
- **TOBE**: 필터에 `COMPLETED_CANCEL_PAYMENT` 추가. 계산은 `remainPrice` 단순 합산으로 변경.
- **`PARTIAL_REFUNDED`는 챌린지 스코프 아님** — 챌린지는 얼리버드·부분환불이 없는 도메인이므로 SE6 공통 필터 중 `PARTIAL_REFUNDED`를 제외한 `{COMPLETED_PAYMENT, COMPLETED_CANCEL_PAYMENT}`만 적용. 관련 분기·`discountAmount`·`refundPrice` 집계 없음.

### 3.2 클럽

- **ASIS**: `remainPrice > 0`만 체크. `orderStatus`에 무관하게 모든 Order가 집계됨
    - `FAILED_CANCEL_PAYMENT` Order가 `remainPrice` 복구된 채 남아 있으면 정산 포함 (**과정산**)
    - 이중결제 Order 2건이면 둘 다 `remainPrice > 0`로 정산 (**이중 정산**)
    - `WAITING_PAYMENT`·`FAILED_PAYMENT`·`EXPIRED` 잔여 건도 조건 만족 시 포함 가능
- **TOBE**: 필터에 `orderStatus IN (COMPLETED_PAYMENT, PARTIAL_REFUNDED, COMPLETED_CANCEL_PAYMENT)` 추가 + `settlementTargetCount = MIN(totalCount, Club.maximumMembers)` 적용 + `settlementTargetAmount = MIN(totalPaymentAmount, Club.price × settlementTargetCount)`

### 3.3 소셜링

- **ASIS**: Repository에서는 필터 없이 전체 Order를 로드하고 Service에서 상태별 분기. `PARTIAL_REFUND_FAILED`(실패 상태)가 정산에 포함됨. `remainPrice > 0` 조건 분기도 `WAITING_PAYMENT`/`FAILED_PAYMENT` 등을 구조적으로 배제하지 못함
- **TOBE**: Repository에서 `orderStatus IN (COMPLETED_PAYMENT, PARTIAL_REFUNDED, COMPLETED_CANCEL_PAYMENT) AND remainPrice > 0` 필터 적용 → Service 분기 단순화 (`PARTIAL_REFUND_FAILED` 분기 삭제). 기존 `PARTIAL_REFUNDED` / 그 외 2분기로 정리

### 4. TOBE 공통 필터

### 4.1 상태·금액 필터 (Invariant SE6)

```tsx
{
  orderStatus: {
    in: [
      OrderStatus.COMPLETED_PAYMENT,
      OrderStatus.PARTIAL_REFUNDED,
      OrderStatus.COMPLETED_CANCEL_PAYMENT,
    ],
  },
  remainPrice: { gt: 0 },
}
```

의미:

- **결제가 확정되었고 유저가 실지불한 금액(`remainPrice > 0`)이 있는 Order** (Invariant SE6)
- 실패 상태(`FAILED_CANCEL_PAYMENT`, `PARTIAL_REFUND_FAILED`)는 **재시도 스케줄러 해소 후 다음 주기에 자연 복귀**
- 결제 미완료(`WAITING_PAYMENT`, `FAILED_PAYMENT`, `EXPIRED`)는 대상 아님
- 환불 없는 취소(`COMPLETED_CANCEL_PAYMENT + remainPrice > 0`, 예: 소셜링 당일/3일 이내 취소, 클럽 ONETIME/GRACE_PERIOD 취소)도 포함 — [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) **5 구현 전까지는 실제 데이터가 거의 없음**. §5 이후 자연 반영
- **도메인별 부분집합**: 챌린지는 얼리버드·부분환불이 없는 도메인이므로 `PARTIAL_REFUNDED`를 제외한 `{COMPLETED_PAYMENT, COMPLETED_CANCEL_PAYMENT}`만 적용. 소셜링·클럽만 3종 전체 적용.

### 4.2 구조적 정합성 필터 (Invariant SE7 — 신설 제안)

`order-common.md` Invariant 1·2가 규칙상으론 보장하는 내용을 정산 쿼리에서 **재검증**한다. 규칙이 깨진 이상 데이터가 호스트에게 정산되지 않도록 하는 안전망.

```
정산 대상 Order는 아래 조건을 추가로 충족한다:

(a) Order-도메인 연결
    정산 경로에 해당하는 FK가 NOT NULL:
      소셜링 정산: Order.socialingId IS NOT NULL
      챌린지 정산: Order.challengeId IS NOT NULL
      클럽 정산:   Order.clubId IS NOT NULL
    ※ 현재 조회 구조(Domain → include(Order))로 대부분 보장되지만,
      명시적 WHERE 조건으로 중복 방어

(b) Order-Payment 연결 (CARD 결제 한정)
    Order.orderKind = CARD  →  Payment 레코드가 존재
    receiptId 기준으로 1:1 매칭
    (order-common.md Invariant 2를 정산 쿼리가 재검증)

위반 건 처리:
  정산 쿼리에서 제외 + Slack 알림 (receiptId / orderId / 도메인 ID 포함)
```

**근거 스키마**

- `Order.socialingId` / `Order.challengeId` / `Order.clubId` — 도메인별 FK
- `Order.bootpayReceiptId` ↔ `Payment.receiptId` — Order-Payment 매칭 키
- Prisma relation 조건(`Payment: { isNot: null }` 또는 `bootpayReceiptId`로 역조회) 중 스키마 실제 정의에 맞춰 PR 구현 시 확정

**무료 Order 처리**

- 현 정산 조건(`price >= 10000` 또는 `price > 0`)으로 무료 Order는 이미 대상에서 배제됨 → 실질적으로 정산 대상은 모두 `OrderKind = CARD`
- 따라서 "Payment 존재"는 강한 조건으로 적용 가능 (FREE Order 예외 분기 불필요)

### 5. TOBE 집계 규칙 (3 도메인 통일)

### 5.1 챌린지 — `remainPrice` 단순 합산

챌린지는 부분환불 없음 → `PARTIAL_REFUNDED` 분기와 `discountAmount` 집계 없음.

```
totalCount         = count(filtered Order)
totalPaymentAmount = SUM(remainPrice)

settlementTargetCount  = MIN(totalCount, Challenge.maximumMembers)                        (Invariant SE3)
settlementTargetAmount = MIN(totalPaymentAmount, Challenge.price × settlementTargetCount)
paidOutAmount          = settlementTargetAmount × 0.8                                      (Invariant SE2)
```

※ 기존 `SUM(orderPrice)` → `SUM(remainPrice)`로 변경한 것은 "원래 주문가" 대신 "실지불 금액" 의미로 일관. 챌린지는 부분환불 없어 값은 동일하지만 의미 정렬.

### 5.2 클럽 — 정원 상한 신규 적용

```
totalCount         = count(filtered Order)
totalPaymentAmount = SUM(remainPrice)

settlementTargetCount  = MIN(totalCount, Club.maximumMembers)                              (Invariant SE3)
settlementTargetAmount = MIN(totalPaymentAmount, Club.price × settlementTargetCount)
paidOutAmount          = settlementTargetAmount × 0.8                                      (Invariant SE2)
```

### 5.3 소셜링 — Repository 필터 이동 + 분기 단순화

```
(Repository) 필터: SE6 공통 필터 + 기존 Socialing 조건

(Service) FOR EACH filtered Order:
  CASE orderStatus = PARTIAL_REFUNDED:
    paymentAmount  += remainPrice
    discountAmount += refundPrice
    count          += 1
  그 외:
    paymentAmount  += remainPrice
    count          += 1

(정원/금액 계산은 현 로직 유지)
staffCount             = STAFF × APPROVE
settlementTargetCount  = MIN(count, maximumPerson − staffCount)
settlementTargetAmount = MIN(paymentAmount, price × settlementTargetCount − discountAmount)
paidOutAmount          = FLOOR(settlementTargetAmount × 0.8)                               (FLOOR 유지, Invariant SE2)
```

### 6. 테스트 매트릭스

### 6.1 상태·금액 필터 (SE6)

| orderStatus | remainPrice | 포함 여부 | 비고 |
| --- | --- | --- | --- |
| `COMPLETED_PAYMENT` | > 0 | ✅ | 정상 결제 |
| `COMPLETED_PAYMENT` | 0 | ❌ | 무료 주문(`price = 0`, 정상)은 상단 `price >= 10000` / `price > 0` 필터로 이미 제외
유료 주문이 전액 환불됐는데 `COMPLETED_CANCEL_PAYMENT` 전이 미완이면 이상 데이터. 어느 쪽이든 `remainPrice > 0` 조건에 걸려 배제 |
| `PARTIAL_REFUNDED` | > 0 | ✅ | 얼리버드 — `remainPrice`/`refundPrice` 분리 |
| `COMPLETED_CANCEL_PAYMENT` | > 0 | ✅ | 환불 없는 취소 (`improvements.md` §5) |
| `COMPLETED_CANCEL_PAYMENT` | 0 | ❌ | 전액 환불 완료 — 정상 제외 |
| `FAILED_CANCEL_PAYMENT` | > 0 | ❌ | 환불 실패 — 재시도 해소 후 다음 주기 |
| `PARTIAL_REFUND_FAILED` | > 0 | ❌ | 부분 환불 실패 — 재시도 해소 후 다음 주기 |
| `WAITING_PAYMENT` | > 0 | ❌ | 결제 미완료 |
| `FAILED_PAYMENT` / `EXPIRED` | * | ❌ | 결제 미완료 |

### 6.2 구조적 정합성 필터 (SE7)

| 도메인 FK | Payment 레코드 (CARD 전제) | 포함 여부 | 비고 |
| --- | --- | --- | --- |
| 존재 | 존재 | ✅ | 정상 |
| 존재 | 누락 | ❌ | Invariant 2 위반 → 제외 + Slack 알림 |
| NULL | * | ❌ | orphan Order — 현 구조상 애초에 조회되지 않음. 명시적 WHERE 가드 |
| 존재하지만 도메인 엔티티가 soft-deleted | * | ❌ | `Socialing.status = COMPLETE` 등 기존 도메인 필터로 이미 배제됨. 가드 재확인만 |
- **챌린지**: `PARTIAL_REFUNDED` Order가 `count=1`로 잡히는지 + `paymentAmount = remainPrice`, `discountAmount = refundPrice`인지
- **클럽**: 이중결제 2건 → `totalCount = 2`지만 `settlementTargetCount = MIN(2, maximumMembers)` / 정원 초과분 제외 / `GRACE_PERIOD` 이전 결제 Order의 정산 포함 여부
- **소셜링**: `PARTIAL_REFUND_FAILED` 분기 제거 후 `PARTIAL_REFUNDED`로 일원화된 처리
- **SE7 경계**: Payment 레코드가 없는 CARD Order 주입 → 제외됨 + Slack 알림 fixture 검증

### 7. 배포 전 검증 (스테이징 재계산)

```
1. 직전 1주(월~일) 정산 데이터를 스테이징에 복제
2. 현 코드로 정산 실행 → baseline 스냅샷
3. 본 PR 적용 후 동일 기간 재실행 → new 스냅샷
4. `before/after` diff:
   - 호스트별 `paidOutAmount` 증감
   - 도메인별 총 지급액 증감
   - 신규 포함/제외 Order 목록
5. 이해관계자(운영·재무) 리뷰 후 배포 승인
```

### 8. 주요 기술적 결정

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| Order 필터 | `orderStatus IN (COMPLETED_PAYMENT, PARTIAL_REFUNDED, COMPLETED_CANCEL_PAYMENT) AND remainPrice > 0` | [정산 비즈니스 규칙 명세서](https://www.notion.so/348e2bc7639d80098f3bca59ea26c7a4?pvs=21)  Invariant SE6 |
| 구조적 정합성 필터 (신설) | Order-도메인 FK 존재 + (CARD 전제) Payment 레코드 존재 | [정산 비즈니스 규칙 명세서](https://www.notion.so/348e2bc7639d80098f3bca59ea26c7a4?pvs=21)  Invariant SE7 신설 제안. [주문/결제 공통 규칙 명세서](https://www.notion.so/348e2bc7639d80b9b9efcec0a73ffc69?pvs=21)  Invariant 1·2를 정산 쿼리가 재검증 |
| 정합성 위반 Order 처리 | 정산 제외 + Slack 알림 | 호스트 잘못 지급 방지. 일시적 위반은 수동 보정 후 다음 주기 복귀 |
| 챌린지 계산 전환 | `SUM(orderPrice)` → `remainPrice` / `refundPrice` 분리 | 필터에 `PARTIAL_REFUNDED` 포함과 세트. 소셜링 기존 방식 차용 |
| 클럽 정원 상한 | `MIN(totalCount, maximumMembers)` 신규 적용 | Invariant SE3. 소셜링과 일관성 |
| 소셜링 필터 위치 | Repository 레벨로 이동 | DB에서 필터링하여 불필요한 로드 방지 + Service 분기 단순화 |
| `PARTIAL_REFUND_FAILED` 처리 | 정산에서 제외 | 실패 상태는 재시도 해소 후 복귀 (WEBB-1326) |
| 코스 | 본 PR에서 미변경 | 서비스 종료 예정. 별도 과제 |
| [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) §5 선행 | 불필요 | 필터가 `COMPLETED_CANCEL_PAYMENT`를 이미 포함하여 §5 구현 후 자동 반영 |
| 과거 데이터 보정 | 본 PR 범위 외 | 배포 전/후 운영 과제로 분리 |

### 9. 모니터링 및 알림

| 항목 | 구현 |
| --- | --- |
| 정산 주 단위 총 지급액 비교 | 메타베이스 대시보드 (배포 전 vs 배포 후 4주간 관찰) |
| 정산 대상 Order 수 (필터 통과율) | 도메인별 대시보드 |
| 정원 초과로 제외된 Order 수 (클럽) | 주간 리포트 |
| SE6 위반 Order 존재 여부 | 주기 배치로 `FAILED_CANCEL_PAYMENT + remainPrice > 0` 건수 추이 관찰 — WEBB-1326 재시도 스케줄러 효과성 검증과 연계 |
| SE7 위반 Order 감지 | 정산 쿼리에서 제외될 때마다 Slack 알림 (receiptId / orderId / 도메인 ID). 주간 위반 건수 추이 대시보드 |

### 10. API / ERD

- **API 변경**: 없음 (스케줄러 내부 로직만 변경)
- **ERD 변경**: 없음 (기존 필드 활용)

### 11. 후속 과제

- **[정산 비즈니스 규칙 명세서](https://www.notion.so/348e2bc7639d80098f3bca59ea26c7a4?pvs=21) Invariant SE7 정식 반영** — 본 PR 머지와 동시에 규칙 문서에 SE7 추가 PR (Order-도메인 FK + Payment 존재 가드). 본 작업 산출물 중 가장 먼저 머지
- **[문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21)  §5** — ONETIME/GRACE_PERIOD 취소 시 Order `COMPLETED_CANCEL_PAYMENT` 전이. 본 필터는 이미 이 전이 상태를 포함하도록 설계되어 구현 시점에 자연 반영
- **WEBB-1326** — 환불 실패 재시도 + Sweeper 스케줄러. 본 PR의 `FAILED_CANCEL_PAYMENT`/`PARTIAL_REFUND_FAILED` 제외 동작의 실효성을 담보
- **WEBB-1328 원문 ④ STAFF 유료 결제 정산 누락** — WEBB-1325 범위에서 스태프 환불 타이밍과 함께 해소
- **구조적 정합성 감사 배치** — 정산 외 경로에서도 SE7 위반을 주기적으로 감지하는 독립 배치. 본 PR의 Slack 알림이 lagging indicator라면 감사 배치는 leading indicator 역할
- **Settlement 서비스 공통 인터페이스 추상화** — 본 작업에서 3개 도메인 서비스를 분리한 뒤, 별도 PR로 공통 인터페이스(`DomainSettlementService<TItem>`)를 도출. 설계 방향과 스케치는 §2.3 참조
- **코스 정산 코드 제거** — 서비스 종료 시점 별도 과제
- **과거 미정산·과정산 건 재점검** — 배포 후 1~2주 내 운영 과제로 분리

---

### 12. 관련 이슈 및 문서

- [WEBB-1328](https://munto.atlassian.net/browse/WEBB-1328) — 본 이슈
- [WEBB-1321](https://munto.atlassian.net/browse/WEBB-1321) — 정산·주문 규칙 문서화 (본 작업의 근거)
- [WEBB-1325](https://munto.atlassian.net/browse/WEBB-1325) — 소셜링·챌린지 취소/환불 V3 (STAFF 환불 타이밍 해소 포함)
- [WEBB-1326](https://munto.atlassian.net/browse/WEBB-1326) — 스케줄러 통합 · 환불 실패 자동 재시도 · Sweeper (본 필터의 실패 상태 제외 정책을 담보)
- [WEBB-967](https://munto.atlassian.net/browse/WEBB-967) — 소셜링 이중결제 CS (이중결제 중복 정산의 선행 사례)
- [정산 비즈니스 규칙 명세서](https://www.notion.so/348e2bc7639d80098f3bca59ea26c7a4?pvs=21) — 정산 규칙 (Invariant SE1~SE6)
- [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) §12 — 본 작업의 마이그레이션 추적 항목

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.22 | 김범진 | 최초 작성 |

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