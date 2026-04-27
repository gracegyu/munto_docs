# 결제/환불 스케줄러 재구조화 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 22일 오후 2:58
최근 수정일: 2026년 4월 24일 오후 12:35
문서 상태: Active
생성 일시: 2026년 4월 22일 오후 2:58
최종 편집자: 김범진
관련 이슈: https://munto.atlassian.net/browse/WEBB-1326

참조 규칙 문서: [](https://www.notion.so/348e2bc7639d804a9f3beb144ddc6953?pvs=21) 

---

## Project Description

현재 결제/환불 영역 스케줄러는 세 가지 구조적 문제를 안고 있다.

1. `WAITING_PAYMENT` 처리 스케줄러 3개가 상호 전제 없이 동일 Order 후보군을 시차로 처리해 "Order=EXPIRED이지만 실제로는 환불 완료"류 불일치를 구조적으로 만든다.
2. WEBB-1325로 기록되는 `FAILED_CANCEL_PAYMENT`·`PARTIAL_REFUND_FAILED` 실패 상태에 대한 자동 복구 경로가 없어 Slack 기반 수동 처리에 의존한다(실측 미환불 3건 이상).
3. 일괄 취소 TX 커밋 후 환불 루프가 크래시하면 "멤버 종료 + Order=COMPLETED_PAYMENT" 조합이 재시도 루프에 진입조차 못한다.

본 작업은 주문 라이프사이클 전반의 자동 전이·실패 복구·시점 트리거·사가 크래시 복구 스케줄러를 **"하나의 예외 케이스 = 하나의 Job"** 단위로 분해하여 재구조화한다. 동시에 승인제(CHOICE) 도메인의 24시간 미승인 REQUEST 타임아웃 로직을 도메인 서비스에서 떼어내 Job 단위로 분리하고, WEBB-1325 `OrderRefundV3Service` 사가의 Stage 3↔4 간극(멤버 APPROVE 유지 + Order COMPLETED_PAYMENT 불일치)도 별도 복구 Job으로 메꾼다.

재구조화 목표는 다음과 같다.

1. 상태 불일치·환불 누락의 구조적 재발 차단
2. 각 Job을 개별 람다로 이관 가능한 단일 책임 구조 확보
3. WEBB-1325 V3 효과(실패 상태의 명확한 기록)를 자동 복구 경로로 연결하여 운영 부담 해소 

상세 케이스 목록·원칙·범위 경계는 Technical Description §2에서 다룬다.

---

## Business and Marketing Justification

- **실측 미환불 3건 이상 확인** — Slack 수동 처리 대기 중. 알림·CS 유입에 의존하며 자동 복구 경로 없음
- **상태 불일치의 구조적 원인 해소** — 3개 스케줄러가 서로의 중간 상태를 모른 채 동작하는 현 구조를 Case별 단일 책임 Job으로 재편. 감사·집계·CS 응대 신뢰성 회복 (구조적 문제 상세는 Technical Description §1 참조)
- **WEBB-1325 효과의 완결** — V3 재작성으로 실패 상태가 명확히 기록되기 시작. 재시도 스케줄러 부재 시 축적만 되고 복구 안 됨
- **WEBB-1268 후속 완결** — 스태프 환불 실패 자동 복구 경로 제공 (Case 4에 자연 포함)
- **람다 이관 대비** — 단일 책임 Job으로 분리하면 각 Job을 독립 람다로 이관 가능. 장애 격리·비용 최적화·스케일링 단위 세분화

---

## Risk Assessment

| 리스크 | 수준 | 대응 방안 |
| --- | --- | --- |
| 기존 3개 스케줄러를 Case 1~3으로 분해하면서 일부 주문이 Case 사이의 틈새로 빠짐 | 높음 | 기존 3개 실행 주기·WHERE 절·처리 상태 전이를 표로 정리 후 Case 1~3 WHERE 절과 **교집합 = 기존 전체 커버리지** 증명. 통합 직후 dry-run 로그로 교차 검증 후 실제 전이 |
| Case 1 실행 중 confirm 플로우와 race로 WAITING_PAYMENT Order가 EXPIRED로 잘못 마킹 (ASIS 재현 사례: Order 2938107, 0.55초 간극, 수동 보정 완료) | 높음 | §2.4 "원자적 check+update" 원칙으로 blind UPDATE 금지. Case 1 SQL은 `UPDATE ... WHERE id=$1 AND orderStatus='WAITING_PAYMENT' AND paymentId IS NULL AND bootpayReceiptId IS NULL` 가드 필수. PostgreSQL이 UPDATE 시점 최신 row에 WHERE를 재평가하므로 snapshot 이후 confirm 커밋 시 `affected rows = 0`으로 자동 차단. `SELECT FOR UPDATE SKIP LOCKED`는 중복 처리 방지 목적으로 병행. 근거: `webb-1328-findings-for-webb-1326.md` |
| PG 환불 재시도 시 이중 환불 (멱등성 위반) | 높음 | WEBB-1325 멱등성 키 규칙을 Executor 경유로만 사용. 재시도 Job은 `cancelId`를 직접 생성하지 않음. Bootpay가 기존 결과 반환. 추가로 `executeRefund`가 응답 불명 시 `getReceipt`로 재조회해 판정 (WEBB-1325 §5.3 불변식 5) |
| Case 2가 `getReceipt` 응답만으로 판정 시 PG 장애로 오판 | 중 | Bootpay 장애 시 건별 재시도 + 배치 전체 실패 시 Slack. 조회 실패는 스킵(다음 주기에 재시도). 상태 전이는 조회 성공 시에만 |
| WEBB-1325 Executor 계약 변경과 재시도 Job 호출부가 어긋남 | 중 | 본 작업은 WEBB-1325 완료 후 착수. 재시도 Job은 인터페이스 import만 참조, 내부 구현 미의존 |
| 재시도 대상 Order 급증 시 PG Rate Limit 초과 (WEBB-1272) | 중 | `BootpayService`의 Redis 기반 글로벌 rate limiter(25req/s)가 1차 방어. 스케줄러는 `runInChunks`로 자체 동시성 제한(concurrency 5 + chunk delay 300ms)하여 rate limiter `maxWaitMs` 초과(강제 진행 경로)를 예방(§2.4). `isRetryableError`가 자동 재시도 |
| Redis 장애 시 `BootpayService` rate limiter 우회 → 스케줄러가 PG 한도 초과 호출 | 중 | 스케줄러 자체 `runInChunks` 스로틀이 유일한 방어막으로 동작. concurrency 5 + chunk delay 300ms ≈ 16.7req/s로 고정되어 Bootpay 30/s 한도 내 수렴. Redis 장애는 인프라 알람으로 별도 인지 |
| 영구 실패 "좀비" Order 누적 (카드 만료·환불 불가 계좌 등) 매 주기 재시도 | 낮음 | 멱등 계약(WEBB-1325 §5.9.3)으로 Slack·OrderHistory 재기록 없음. §6 모니터링 "좀비 지표"(실패 상태 N일 이상 Order 건수 + 실패 이유 분포)로 장기 누적 식별. 운영자(BACK-202)가 수동 종결/재처리 판정. 스케줄러 스로틀 + 글로벌 rate limiter로 PG 부담 억제 |
| Sweeper(Case 6/7)가 PG 장애로 지연 중인 정상 환불 루프의 Order를 가로챔 (false positive) | 낮음 | `member.updatedAt <= NOW() - 10분` grace + `SELECT FOR UPDATE SKIP LOCKED`로 1차 방어. 그럼에도 PG 장애 장기화 시 false positive 탐지는 **허용한다** (Case 6·7 "False positive 허용" 선언). 탐지 후 Case 4가 다시 환불을 시도해도 Executor의 멱등 키 + `getReceipt` 재조회로 이중 환불 방지 (WEBB-1325 §5.3 불변식 5) |
| Sweeper(Case 6/7)가 APPROVE 유지 케이스(스태프·얼리버드)를 오탐 | 높음 | 조회 조건에 **멤버 종료 상태 필터** 명시. Invariant S3/S4·Ch4로 구조적 제외. APPROVE 유지 환불 크래시는 **Case 10/11이 별도 감지**로 처리 |
| Case 10/11이 정상 환불 루프가 진행 중인 Order를 가로채 이중 환불 시도 | 중 | `Socialing.finishDate + 30분` grace + `SELECT FOR UPDATE SKIP LOCKED` + Executor의 `getReceipt` 재조회로 실제 환불 여부 판정 (이미 환불됐으면 PG 재호출 안 함). 3중 보호 |
| Case 10/11 대상 식별 쿼리가 복잡 (JOIN 3~4단) 해서 성능·인덱스 이슈 | 중 | `Socialing.status`·`SocialingMember.status`·`Order.orderStatus` 복합 인덱스 검토. 정상 환경에서 대상 수렴 0건이라 성능 부담 낮음 |
| Job 하나 장애 시 다른 Case까지 영향 | 낮음 | Case 단위 Feature Flag + 독립 스케줄러 인스턴스. 공유 상태 없음 |
| 람다 이관 시 Prisma 커넥션 풀·Bootpay 토큰 초기화 병목 | 중 | Job 설계 시부터 bootstrap/handler 분리. 공통 초기화는 컨테이너/람다 layer로 추출 가능하게 |
| 자동 재시도(본 이슈 Case 4·5)와 [BACK-202](https://munto.atlassian.net/browse/BACK-202) 백오피스 수동 재환불이 동시에 같은 Order 처리 시 이중 환불 | 높음 | 수동 재환불 API도 `SELECT FOR UPDATE SKIP LOCKED` 락 정책 동일 적용. 운영자가 BACK-202에서 Order의 실패 상태·최근 `OrderHistory`를 보고 수동 개입 여부 판단(자동 재시도 한계 카운트 개념 없음 — 운영자 판단이 종결 기준). 설령 경합해도 WEBB-1325 Executor의 멱등 키 + `getReceipt` 재조회로 PG 레벨에서 이중 환불 방지 |

---

## Resource and Scheduling Details

- **필요 인력**: Backend 1명 (AI 지원 개발)
- **예상 일정**: 구현 2주
- **선행 조건**: WEBB-1325 `PaymentRefundExecutor` 계약 확정 및 소셜링 cancel/refund 프로덕션 안정화

### 마일스톤

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1주차 | 기존 스케줄러 WHERE·전이 전수 분석 / **Case 1·2·3 구현** (`getReceipt` 기반 SOT 판정 포함) + dry-run 검증 / **Case 8·9 미승인 타임아웃 Job 분리** | 분석 표, Case 1~3/8/9 코드 |
| 2주차 | **Case 4·5 재시도 Job 구현** / **Case 6·7 Sweeper 구현** / **Case 10·11 APPROVE 환불 크래시 복구 Job 구현** / 모니터링·Slack·Feature Flag 정비 | Case 4~7/10/11 코드 |

**롤아웃 순서**: Case 1~3 (WAITING_PAYMENT 통합) → Case 8·9 (미승인 타임아웃 Job 분리) → Case 4·5 (실패 재시도) → Case 6·7 (Sweeper) → Case 10·11 (APPROVE 환불 크래시 복구). 각 Case는 개별 Feature Flag로 단계 전환. 장애 시 해당 Case만 롤백. Case 10·11은 WEBB-1325의 `OrderRefundV3Service`가 프로덕션에서 안정화된 뒤 활성화.

---

## Technical Description

### 1. 현황: 기존 결제/환불 스케줄러의 구조적 문제

| 스케줄러 | 파일 | 역할 | 문제 |
| --- | --- | --- | --- |
| `ExpireAbandonedOrderScheduleJobService` | `apps/scheduler/src/scheduleJob/` | 일정 시간 경과한 `WAITING_PAYMENT` → `EXPIRED` | 웹훅 수신 + confirm 미호출 건도 `EXPIRED`로 처리 → 이후 환불 루프가 돌면 `EXPIRED` + 환불 완료 불일치 |
| `ConfirmMissedPaymentScheduleJobService` | `apps/scheduler/src/scheduleJob/` | 웹훅 수신 + confirm 미완료 주문을 뒤늦게 환불 | 환불 성공 시 `COMPLETED_CANCEL_PAYMENT`로 기록 (confirm 이력 없으므로 `FAILED_PAYMENT`가 정확) |
| `PaymentUpdateJob.refundExpiredPaymentRequests` | `apps/scheduler/src/scheduleJob/paymentUpdateJob.service.ts` | `EXPIRED` 처리분 중 실제 결제된 건 PG 환불 | Order 상태 미업데이트. `EXPIRED`(15분) ↔ 환불(30분) 타이밍 갭 |
| (없음) | — | `FAILED_CANCEL_PAYMENT` 자동 재시도 | 부재 → 수동 처리 |
| (없음) | — | `PARTIAL_REFUND_FAILED` 자동 재시도 | 부재 → 수동 처리 |
| (없음) | — | 일괄 취소 크래시로 남은 "멤버 종료 + Order=COMPLETED_PAYMENT" 복구 | 부재 → 재시도 루프 진입 불가 |

### 2. 재구조화 설계

### 2.1 재구조화 원칙

1. **단일 케이스, 단일 Job** — 한 Job은 하나의 진입 상태 조합과 하나의 전이만 담당한다. 분기 내 분기 금지.
2. **Job 간 직접 의존 금지** — 상태 전이의 산출물은 DB 상태로만 전파. Job이 Job을 호출하지 않는다.
3. **의존 범위를 계층별로 한정**:
    - **Order 상태 복구·재시도·Sweeper (Case 1~7)**: Bootpay·Slack·Prisma·WEBB-1325 `PaymentRefundExecutor`만 공유. 도메인 서비스 직접 참조 금지.
    - **도메인 취소 트리거 (Case 8~9)**: 해당 도메인의 `OrderCancelV3Service<TMember>` 하나만 추가 의존 허용. 여전히 다른 도메인 서비스 직접 참조 금지. 멤버 상태 전이·환불 처리는 전부 V3 서비스가 수행.
    - **APPROVE 유지 환불 복구 (Case 10~11)**: `OrderRefundV3Service<SocialingMember>` 하나만 추가 의존 허용. Executor의 멱등 계약(WEBB-1325 §5.3 불변식 5)에 위임하여 이중 환불 방지.
4. **SOT = PG** — 결제 상태의 진실원본은 Bootpay `getReceipt` 응답이다. 웹훅은 해피케이스용 이벤트 힌트로만 사용하고 SOT로 취급하지 않는다. `WAITING_PAYMENT` 복구 Case가 `getReceipt`로 PG에 직접 물어보는 이유.
5. **람다 이관 준비** — 각 Job은 `(Cron trigger) + (대상 조회 쿼리) + (처리 함수)` 3단 구조. Prisma 클라이언트·Bootpay 토큰 등 인프라 초기화는 핸들러 bootstrap에서 주입받도록 분리. 향후 각 Job을 개별 람다로 이관해도 코드 변경 최소화.
6. **Feature Flag 개별화** — Job 단위 on/off. 장애 격리 + 단계 롤아웃.
7. **외부 API 호출은 TX 외부** — PG/Bootpay 호출은 반드시 DB 트랜잭션 외부에서 실행. TX 내부는 상태 전이 + `OrderHistory` 기록만.

### 2.2 재구조화 범위 (스케줄러 11종)

| # | 범례 | Case | Job 이름 | 대체/신규 |
| --- | --- | --- | --- | --- |
| 1 | **Order 상태 복구** | 결제창 미진입 이탈 | `ExpireOrphanedOrderJob` | `ExpireAbandonedOrderScheduleJobService` 대체 |
| 2 | **Order 상태 복구** | 결제 완료 후 confirm 미완료 복구 | `RecoverUnconfirmedPaymentJob` | `ConfirmMissedPaymentScheduleJobService` + `PaymentUpdateJob.cancelPendingOrders` 대체 |
| 3 | **Order 상태 복구** | 미연결 `PaymentRequest` 정리 | `CleanupOrphanPaymentRequestJob` | `PaymentUpdateJob.refundExpiredPaymentRequests` 대체 |
| 4 | **환불 실패 재시도** | 전액 환불 실패 재시도 | `RetryFailedCancelPaymentJob` | 신규 |
| 5 | **환불 실패 재시도** | 부분 환불 실패 재시도 | `RetryPartialRefundFailedJob` | 신규 (WEBB-1220 흡수) |
| 6 | **일괄 취소 크래시 복구** | 상태 불일치 Sweeper — 소셜링 | `SweepSocialingStatusMismatchJob` | 신규 |
| 7 | **일괄 취소 크래시 복구** | 상태 불일치 Sweeper — 챌린지 | `SweepChallengeStatusMismatchJob` | 신규 |
| 8 | **승인제 미승인 타임아웃** | 소셜링 24h 미승인 자동 취소 | `ExpireSocialingUnapprovedRequestJob` | `socialingUpdateJob` 내 로직 대체 |
| 9 | **승인제 미승인 타임아웃** | 챌린지 24h 미승인 자동 취소 | `ExpireChallengeUnapprovedRequestJob` | `challenge.schedule-job` 내 로직 대체 |
| 10 | **APPROVE 유지 환불 크래시 복구** | 스태프 환불 크래시 복구 | `RecoverStaffRefundJob` | 신규 (WEBB-1325 `OrderRefundV3Service` Stage 3↔4 간극 보완) |
| 11 | **APPROVE 유지 환불 크래시 복구** | 얼리버드 환불 크래시 복구 | `RecoverEarlyBirdRefundJob` | 신규 (동일 간극 보완) |
| 12 | **현재 범위 제외 (클럽 — 후속 이슈)** | 상태 불일치 Sweeper — 클럽 | `SweepClubStatusMismatchJob` | **범위 제외** — Case 6/7의 클럽 대응. WEBB-1325 클럽 V3 Executor 준비 후 후속 이슈 |
| 13 | **현재 범위 제외 (클럽 — 후속 이슈)** | 클럽 24h 미승인 자동 취소 | `ExpireClubUnapprovedRequestJob` | **범위 제외** — Case 8/9의 클럽 대응. 동일 후속 이슈 |

**범위 외 상세**:

- **취소/환불 오케스트레이션 로직 자체** — WEBB-1325에서 구현
- **Case 12·13 (클럽 스케줄러)** — 위 표에 번호는 할당돼 있으나 **본 이슈에서 구현하지 않음**. 클럽은 빌링키 기반 구조라 `SubscriptionRefundExecutor`(WEBB-1325 후속)가 선행되어야 Case 12·13을 실질적으로 작성 가능. 그때까지 클럽 취소/환불은 ASIS V2 경로 그대로 유지. 구조적으로는 Case 6/7(Sweeper) + Case 8/9(24h 미승인) 패턴의 클럽 확장이며 본 이슈의 범위가 확정된 뒤 동일 템플릿으로 복제
- **클럽 구독 갱신 / GRACE_PERIOD 자동 만료** — `club-pseudocode.md §8-2`, `improvements.md §11`에 정리된 별도 과제. Case 12·13과는 다른 축
- **클럽 APPROVE 유지 환불 크래시 복구 (Case 10·11 패턴의 클럽 대응)** — 클럽은 구독 갱신 구조라 "COMPLETE 전이 시 일괄 환불" 같은 시점이 없으므로 Case 10·11 패턴이 현재 불필요. 향후 클럽에 도입되는 자동 환불 이벤트가 있으면 그때 신규 Case로 추가

### 레거시 데이터 cutoff 원칙

본 이슈는 **롤아웃 이후 생성되는 Order에 대해서만 일관성을 보장**한다. 기존 3개 `WAITING_PAYMENT` 스케줄러의 상호 전제 부재로 과거에 쌓인 **"`Order=EXPIRED`이지만 실제로는 PG 환불 완료"** 류 오분류 건은 본 이슈에서 정정하지 않는다.

- **근거**: 오분류 대상은 과거 고정 집합(1326 Case 1~3 롤아웃 이후 추가 생성되지 않음)이며, PG 측에서는 환불이 이미 완결돼 유저 손해·이중 환불 리스크가 없다. 반면 마이그레이션은 정산·통계·CS 이력·시계열 대시보드 전반에 파급이 있어 실행 비용이 크다.
- **잔존 영향 수용 범위**: 통계·정산 쿼리가 `EXPIRED`를 "결제 미완료"로 간주할 경우 롤아웃 이전 구간에서 소수의 오분류 건이 포함될 수 있다. 필요 시 해당 쿼리가 `createdAt >= (1326 롤아웃 시각)` 필터를 추가한다.
- **후속 처리**: `OrderStatus` enum 자체를 재설계하는 [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346)에서 `Order.status` / `Payment.status` 분리 작업과 함께 일회성 마이그레이션을 수행한다(해당 이슈에서 모델 분리 + 레거시 enum 값 정리 + `EXPIRED` 오분류 정정을 **한 번의 스키마 전환**으로 묶는 것이 파급을 최소화하는 방식).

### 2.3 케이스 열거 축

```
(Order 상태 또는 멤버-Order 조합) × (PG 실제 상태) × (대기 시간) × (도메인)
```

이 축으로 이탈 패턴을 열거하면 Case 1~11이 도출된다. 한 축의 값이 달라지면 별도 Job.

**"PG 실제 상태" 축**: Bootpay `getReceipt` 조회 결과. ASIS에서는 웹훅 수신 여부로 간접 추론했으나, 본 재구조화에서는 PG에 직접 물어보는 것을 원칙으로 한다(§2.4 SOT=PG 원칙).

### 2.4 공통 프리미티브

**공통 (Case 1~11 전체)**:

- `SlackNotifier` — Job 전체 실패·헬스체크 알림 (건당 실패 알림은 WEBB-1325 멱등 계약에 따라 최초 상태 전이에서만 발화)
- `PrismaService` + `OrderHistoryLogger`

**Order 상태 복구·재시도·Sweeper (Case 1~7 전용)**:

- `PaymentRefundExecutor` (WEBB-1325) — PG 환불 + Order 전이 + OrderHistory 원자적 기록. 응답 불명 시 `getReceipt` 재조회 포함 (WEBB-1325 §5.3 불변식 5)
- `BootpayGateway.getReceipt()` — 결제 상태 조회 (Case 2 핵심). PG가 SOT임을 전제
- `BootpayGateway.cancelReceipt()` 직접 호출 — 고아 레코드 정리 (Case 3 전용, Order 연결 없음)

**도메인 취소 트리거 (Case 8~9 전용)**:

- `OrderCancelV3Service<TMember>` (WEBB-1325) — 멤버 상태 전이 + 환불 정책 + PG 환불을 단일 사가로 수행
    - Case 8: `OrderCancelV3Service<SocialingMember>`
    - Case 9: `OrderCancelV3Service<ChallengeMember>`

**APPROVE 유지 환불 복구 (Case 10~11 전용)**:

- `OrderRefundV3Service<SocialingMember>` (WEBB-1325) — 멤버 상태 유지 + 환불 정책 + PG 환불. Executor의 `getReceipt` 재조회 + 멱등 키로 이중 환불 방지 (WEBB-1325 §5.3 불변식 5, §5.9.2)
    - Case 10: `SocialingStaffRefundPolicy` 사용 (정책 결과로 이미 환불된 상태면 Stage 3 스킵, Order만 전이)
    - Case 11: `SocialingEarlyBirdRefundPolicy` 사용 (동일)

각 Job 클래스는 위 계층별 의존만 생성자 주입. 다른 도메인 서비스(`SocialingService` 등) 직접 참조 **금지**.

### 2.5 Job 표준 인터페이스

```tsx
interface ScheduledPaymentJob {
  readonly name: string;                 // 로그/메트릭 키
  readonly cronExpression: string;       // e.g. '*/5 * * * *'
  readonly featureFlag: string;          // 개별 on/off

  execute(now: Date): Promise<JobResult>;  // 멱등. 실행당 한정된 배치 처리
}

interface JobResult {
  scanned: number;         // 조회된 대상 수
  processed: number;       // 실제 전이된 수 (성공)
  skipped: number;         // grace 또는 락 경합으로 스킵된 수
  failed: number;          // 예외 발생 수 (Case 4·5의 경우 다음 주기 자동 재시도)
}
```

람다 이관 시 `execute(now)`만 핸들러로 노출. Cron 트리거는 람다 외부(EventBridge).

### 2.6 공통 규칙

- **SOT = PG**: 결제 상태 판정은 Bootpay `getReceipt` 응답을 기준으로 한다. 웹훅 이벤트(`PaymentRequest` 존재·`bootpayReceiptId` 값)는 "이 Order를 한 번 확인해봐야 한다"는 힌트로만 사용. 환불 성공 여부 판정도 `executeRefund`(WEBB-1325 §5.3 불변식 5)가 `getReceipt` 재조회로 확정.
- **TX 분리**: DB 전이 + OrderHistory는 한 TX. PG 호출은 TX 외부. 두 단계 사이 크래시는 다음 주기에 자가 복구 (멱등 쿼리).
- **배치 상한**: 1회 `execute`당 최대 500건 (Case별 조정 가능).
- **락**: 대상 Order는 `SELECT ... FOR UPDATE SKIP LOCKED`로 잠가 중복 처리 방지.
- **원자적 check+update (blind UPDATE 금지)**: 상태 전이 Job의 `UPDATE` 구문은 **진입 필터 조건을 WHERE 가드로 반드시 포함**한다(예: Case 1이 `EXPIRED`로 전이할 때 `WHERE id=$1 AND orderStatus='WAITING_PAYMENT'`). PostgreSQL은 UPDATE의 WHERE를 snapshot이 아닌 **UPDATE 실행 시점의 최신 row**에 재평가하므로, SELECT snapshot과 UPDATE 사이에 다른 TX(예: confirm 플로우)가 상태를 전이시켰다면 `affected rows = 0`이 되어 덮어쓰기가 자동 차단된다. `affected rows = 0` 인 건은 스킵하고 `OrderHistory`도 기록하지 않는다. 본 규칙은 ASIS의 `blind UPDATE ... WHERE id=$1`류 패턴을 금지한다 — Order 2938107 race(WAITING_PAYMENT ↔ COMPLETED_PAYMENT, 0.55초 간극) 재발 방지의 핵심 방어선이다(`webb-1328-findings-for-webb-1326.md` 참조).
- **Rate Limit 대응**: Bootpay 30req/s 한도는 `BootpayService`의 Redis 기반 **글로벌 rate limiter**(25req/s, API 서버·스케줄러 모든 프로세스가 공유하는 sliding window)가 자동 처리하므로 **스케줄러가 직접 관리하지 않는다**. 다만 아래 세 가지 이유로 스케줄러 자체 동시성 스로틀은 여전히 필요하다:
    1. **`maxWaitMs` 초과 시 강제 진행**: rate limiter는 슬롯을 최대 `maxWaitMs` 동안만 기다리고(refund는 3초, getReceipt는 1초) 초과 시 카운터에 반영 후 호출을 그대로 진행한다(`bootpay.service.ts` `acquireSlot`). 스케줄러가 수백 건을 동시에 밀어넣으면 이 경로를 타서 실제 429를 맞을 수 있다.
    2. **API 서버 트래픽과 공유**: 유저 결제/환불 호출과 경합하므로 스케줄러는 유저 트래픽에 양보해야 한다.
    3. **Redis 장애 시 rate limiter 우회**: `BootpayService`는 Redis 장애 시 "서비스 중단보다 PG 한도 초과 리스크가 낫다"는 판단으로 rate limiter를 우회한다. 이때 스케줄러 자체 스로틀이 유일한 방어막.
    
    따라서 WEBB-1272의 `runInChunks`로 스케줄러 자체 동시성을 제한해 글로벌 rate limiter 한도 안으로 수렴시킨다 (예: concurrency 5 + chunk delay 300ms ≈ 16.7req/s, 기존 `EarlyBirdRefundService` 패턴과 동일). `BootpayService.isRetryableError`가 자동 재시도하므로 스케줄러는 최종 결과만 받는다. PG 호출이 있는 Case 2·3·4·5·10·11에 적용.
    
- **에러 처리**: 건당 예외는 삼키고 다음 Order로 진행. Job 전체 실패는 Slack.
- **암묵적 백오프 = 스케줄러 주기**: 실패 재시도 Job(Case 4·5)은 명시적 `retryCount`·지수 백오프 필드를 두지 않는다. 대상 Order는 실패 상태(`FAILED_CANCEL_PAYMENT`·`PARTIAL_REFUND_FAILED`)에 머물러 있는 한 매 주기 자동 재시도되며, 주기 자체가 호출 간격을 만드는 암묵적 백오프 역할을 한다. 이중 환불·Slack 스팸 방지는 WEBB-1325 §5.9.3 멱등 계약(동일 상태 재진입 시 이력·알림 미기록)과 §5.3 불변식 5(`getReceipt` 재조회로 실제 PG 상태 확정)가 담당. 한계 도달 판단(영구 실패 "좀비" 식별)은 [BACK-202](https://munto.atlassian.net/browse/BACK-202) 운영자가 수동 수행하고, 시스템은 §6 모니터링에 "좀비 지표"로만 노출한다.

---

### 3. 케이스별 스케줄러 정의

각 Case는 `[배경 / 대상 조건 / 처리 / 종료 상태 / 실행 주기 / Feature Flag / 람다 이관 시 고려]`로 기술한다. 상세에 들어가기 전에 §3.1로 전체 매트릭스를 먼저 보인다.

---

### 3.1 전체 케이스 매트릭스

각 Case가 어떤 Order/Member 상태 조합의 "예외"를 처리하는지 한눈에 본다. WEBB-1325 §5.4가 "사가가 일으키는 상태 전이"를 다룬다면, 본 표는 **"스케줄러가 일으키는 상태 전이"** 의 대응물이다. 개별 상세는 §3.2(Case 1) 이후.

### 3.1 전체 케이스 매트릭스

각 Case가 어떤 Order/Member 상태 조합의 "예외"를 처리하는지 한눈에 본다. WEBB-1325 §5.4가 "사가가 일으키는 상태 전이"를 다룬다면, 본 표는 **"스케줄러가 일으키는 상태 전이"** 의 대응물이다. 개별 상세는 §3.2(Case 1) 이후.

### 3.1.1 기능 그룹별 요약

> **컬럼 정의**:
> 
> - **대기 (grace)**: 한 대상이 특정 상태에 **최소 얼마나 머물러야** 스케줄러가 "이탈로 간주"하고 손댈 수 있는지의 임계. 기준 시점(reference time)은 Case마다 다르므로 "기준 필드" 컬럼 참조. 정상 흐름이 끝나기 전의 Order를 가로채지 않도록 두는 안전 여유.
> - **주기 (cron)**: 스케줄러 Job 자체가 **얼마나 자주 실행**되는지의 cron 주기. 대기보다 짧아도 무방 — `SELECT FOR UPDATE SKIP LOCKED` + WEBB-1325 멱등 계약(§5.9.3)이 중복 처리를 방지한다.
> - 둘이 같은 값인 Case(예: 10·11의 30분/30분)도 있지만 의미는 독립적.

**A. Order 상태 복구 — `WAITING_PAYMENT` 탈출**

| # | 진입 Order 상태 | 진입 조건 (비-시간) | 대기 (기준 필드) | 주기 | 예외 성격 | 종료 Order 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `WAITING_PAYMENT` | `bootpayReceiptId IS NULL` | 15분 (`Order.updatedAt`) | 5분 | 유저가 결제창 진입 전/후 이탈 (confirm API 미호출) | `EXPIRED` |
| 2 | `WAITING_PAYMENT` | `bootpayReceiptId IS NOT NULL` | 10분 (`Order.updatedAt`) | 5분 | confirm API가 시작됐으나 응답 끊김 — PG는 이미 결제 승인했을 가능성 | `FAILED_PAYMENT` (결제됐으면 환불 후) |
| 3 | (Order 무관) | `PaymentRequest` 존재 + `Payment` 없음 | 30분 (`PaymentRequest.createdAt`) | 15분 | 웹훅만 와서 영수증은 있는데 서버가 Order를 못 연결 (극한 케이스) | — (PR 삭제 또는 Case 2로 위임) |

**B. 환불 실패 재시도 — 실패 상태 해소**

| # | 진입 Order 상태 | 진입 조건 (grace 없음 — 매 주기 탐지) | 주기 | 예외 성격 | 성공 시 종료 | 실패 시 유지 |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | `FAILED_CANCEL_PAYMENT` | 상태만 일치하면 즉시 대상 | 5분 | 전액 환불(취소·스태프) PG 호출 실패 | `COMPLETED_CANCEL_PAYMENT` | `FAILED_CANCEL_PAYMENT` (매 주기 재시도, 좀비 수용) |
| 5 | `PARTIAL_REFUND_FAILED` | 동일 | 10분 | 얼리버드 부분환불 PG 호출 실패 (소셜링 전담) | `PARTIAL_REFUNDED` | `PARTIAL_REFUND_FAILED` (매 주기 재시도) |

> Case 4·5는 명시적 grace 없이 주기 자체가 호출 간격을 만든다(§2.4 "암묵적 백오프 = 스케줄러 주기").
> 

**C. 상태 불일치 Sweeper — 크래시 복구**

| # | 진입 Order 상태 | 동반 Member 상태 | 도메인 | 대기 (기준 필드) | 주기 | 예외 성격 | 종료 Order 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | `COMPLETED_PAYMENT` | `SocialingMember.status` ∈ {CANCEL, KICK, REJECT} | 소셜링 | 10분 (`SocialingMember.updatedAt`) | 5분 | 일괄 취소 TX 커밋 후 환불 루프 크래시 → 멤버는 종료, Order는 미전이 | `FAILED_CANCEL_PAYMENT` (Case 4 재시도 루프 진입 게이트) |
| 7 | `COMPLETED_PAYMENT` | `ChallengeMember.status` ∈ {CANCEL, REJECT} | 챌린지 | 10분 (`ChallengeMember.updatedAt`) | 5분 | 동일 | `FAILED_CANCEL_PAYMENT` |

> 클럽 대응(Case 12, `SweepClubStatusMismatchJob`)은 범위 외. §범위 외 상세 참조.
> 

*제외 대상 (Sweeper가 감지하지 않음)*: 멤버가 `APPROVE` 유지인 스태프 환불(Invariant S4)·얼리버드(Invariant S3/Ch4) 케이스. **그룹 E(Case 10/11)가 별도 감지 경로로 처리**.

**D. 승인제 미승인 타임아웃 — 시점 트리거**

| # | 진입 Order 상태 | Member 상태 | 도메인 | 대기 (기준 필드) | 주기 | 예외 성격 | Job 호출 대상 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | `COMPLETED_PAYMENT` | `SocialingMember.status = REQUEST` | 소셜링 | 24h (`SocialingMember.createdAt`) | 10분 | 호스트 승인/거절 없이 24h 경과 — 시스템 귀책 자동 취소 | `OrderCancelV3Service<SocialingMember>.cancel(SYSTEM)` |
| 9 | `COMPLETED_PAYMENT` | `ChallengeMember.status = REQUEST` | 챌린지 | 24h (`ChallengeMember.updatedAt`) | 10분 | 동일 | `OrderCancelV3Service<ChallengeMember>.cancel(SYSTEM)` |

> 클럽 대응(Case 13, `ExpireClubUnapprovedRequestJob`)은 범위 외. §범위 외 상세 참조.
> 

**E. APPROVE 유지 환불 크래시 복구 — `OrderRefundV3Service` Stage 3↔4 간극 보완**

`OrderRefundV3Service`(WEBB-1325 §5.7)는 멤버 상태를 변경하지 않는 3단계 사가라 멤버가 `APPROVE` 유지. Stage 3(PG 환불 완료) ~ Stage 4(Order 전이) 사이 크래시 시 **PG는 환불됐는데 Order는 `COMPLETED_PAYMENT`로 남는 금전·기록 불일치**가 발생한다. 이 조합은 멤버 상태 필터로 감지하는 Case 6/7이 잡지 못하므로 본 그룹이 별도 감지 조건으로 메꾼다.

| # | 진입 Order 상태 | Member 상태 | 동반 조건 | 도메인 | 대기 (기준 필드) | 주기 | 예외 성격 | Job 호출 대상 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `COMPLETED_PAYMENT` | `SocialingMember.grade = STAFF` + `status = APPROVE` | `Socialing.status = COMPLETE` AND `Order.orderKind ≠ FREE` | 소셜링 | 30분 (`Socialing.finishDate`) | 30분 | COMPLETE 전이 시 스태프 환불 루프가 크래시해서 Order 미전이 | `OrderRefundV3Service<SocialingMember>.refund(SYSTEM, "STAFF_REFUND_RECOVERY")` — Executor가 `getReceipt` 재조회로 실제 상태 판정, 이미 환불됐으면 Stage 3 스킵 + Order 전이만 |
| 11 | `COMPLETED_PAYMENT` | `SocialingMember.status = APPROVE` + 얼리버드 적용 | `Socialing.status = COMPLETE` AND `Order.refundPrice > 0` AND 얼리버드 할인 레코드 존재 | 소셜링 | 30분 (`Socialing.finishDate`) | 30분 | COMPLETE 전이 시 얼리버드 환불 루프가 크래시해서 Order 미전이 | `OrderRefundV3Service<SocialingMember>.refund(SYSTEM, "EARLY_BIRD_REFUND_RECOVERY")` — 동일 패턴 |

*Case 10/11이 Case 6/7과 다른 점*: 멤버는 `APPROVE` 유지 + Order는 `COMPLETED_PAYMENT` 그대로. Sweeper처럼 상태 전이만 하지 않고 **V3 Refund를 직접 재호출** (자체 복구). PG 이중 환불 방지는 멱등 키 + `getReceipt` 재조회에 의존.

### 3.1.2 Order 상태 전이 행렬 (1326이 일으키는 전이만)

| 진입 Order 상태 | 트리거 조건 | Case | PG 호출 | 종료 Order 상태 |
| --- | --- | --- | --- | --- |
| `WAITING_PAYMENT` | `bootpayReceiptId=NULL`, 15분+ | 1 | 없음 | `EXPIRED` |
| `WAITING_PAYMENT` | `bootpayReceiptId≠NULL`, 10분+, PG=결제됨 | 2 | `refund` 실행 | `FAILED_PAYMENT` |
| `WAITING_PAYMENT` | 동일, PG=미결제 | 2 | 스킵 | `FAILED_PAYMENT` |
| `FAILED_CANCEL_PAYMENT` | 재시도 조건 | 4 | `refund` 재시도 | 성공 `COMPLETED_CANCEL_PAYMENT` / 실패 유지 |
| `PARTIAL_REFUND_FAILED` | 재시도 조건 | 5 | `refund` 재시도 | 성공 `PARTIAL_REFUNDED` / 실패 유지 |
| `COMPLETED_PAYMENT` | 멤버 종료 상태 + 10분+ | 6·7 | 없음 | `FAILED_CANCEL_PAYMENT` (게이트) |
| `COMPLETED_PAYMENT` | 멤버 REQUEST + 24h+ | 8·9 | V3 사가 내부 | V3 사가가 결정 (`COMPLETED_CANCEL_PAYMENT` / `FAILED_CANCEL_PAYMENT`) |
| `COMPLETED_PAYMENT` | STAFF + APPROVE + `Socialing.COMPLETE` + 30분+ | 10 | `getReceipt` + (필요 시 `refund`) — 멱등 키 | `COMPLETED_CANCEL_PAYMENT` (환불 완료 확인) / `FAILED_CANCEL_PAYMENT` (재실패) |
| `COMPLETED_PAYMENT` | APPROVE + 얼리버드 + `Socialing.COMPLETE` + 30분+ | 11 | 동일 | `PARTIAL_REFUNDED` / `PARTIAL_REFUND_FAILED` |

### 3.1.3 대상·PG 호출·도메인 의존 요약

| # | Job 이름 | 대상 선별 | PG 호출 | 도메인 의존 | 주기 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ExpireOrphanedOrderJob` | Order만 | — | 없음 | 5분 |
| 2 | `RecoverUnconfirmedPaymentJob` | Order만 | `getReceipt` + `refund` | 없음 | 5분 |
| 3 | `CleanupOrphanPaymentRequestJob` | PaymentRequest | `getReceipt` + `cancelReceipt` | 없음 | 15분 |
| 4 | `RetryFailedCancelPaymentJob` | Order만 | `refund` (Executor 경유) | 없음 | 5분 |
| 5 | `RetryPartialRefundFailedJob` | Order만 (소셜링 얼리버드 전담) | `refund` (Executor 경유) | 없음 | 10분 |
| 6 | `SweepSocialingStatusMismatchJob` | Order + `SocialingMember` JOIN | — | 멤버 조회만 | 5분 |
| 7 | `SweepChallengeStatusMismatchJob` | Order + `ChallengeMember` JOIN | — | 멤버 조회만 | 5분 |
| 8 | `ExpireSocialingUnapprovedRequestJob` | `SocialingMember` | V3 사가 내부 | `OrderCancelV3Service<SocialingMember>` | 10분 |
| 9 | `ExpireChallengeUnapprovedRequestJob` | `ChallengeMember` | V3 사가 내부 | `OrderCancelV3Service<ChallengeMember>` | 10분 |
| 10 | `RecoverStaffRefundJob` | `SocialingMember` + Order JOIN | V3 사가 내부 (`getReceipt` + 필요 시 `refund`) | `OrderRefundV3Service<SocialingMember>` | 30분 |
| 11 | `RecoverEarlyBirdRefundJob` | `SocialingMember` + Order + 얼리버드 할인 JOIN | 동일 | `OrderRefundV3Service<SocialingMember>` | 30분 |

> Case 12 (`SweepClubStatusMismatchJob`) / Case 13 (`ExpireClubUnapprovedRequestJob`)는 범위 외. §범위 외 상세 참조.
> 

### 3.1.4 예외 성격 다이어그램

```
                    주문 라이프사이클
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   WAITING_PAYMENT   COMPLETED_PAYMENT   취소/환불 집행
        │                 │                 │
   ┌────┴────┐    ┌───────┼───────┐    ┌────┴────┐
   │         │    │       │       │    │         │
confirm    confirm 멤버 종료 멤버    APPROVE 유지 전액 환불  부분 환불
 미시작    중단   (크래시) REQUEST  환불 크래시    실패       실패
 (Case 1) (Case 2) (Case 6/7) 24h+  (Case 10/11)  (Case 4)  (Case 5)
                            (Case 8/9)

         + Order 무관: 웹훅 고아 PaymentRequest (Case 3)
         + 범위 제외 (클럽 후속): Case 12/13
```

---

### Case 1. 결제창 미진입 이탈 — `ExpireOrphanedOrderJob`

**대체**: `ExpireAbandonedOrderScheduleJobService`

**배경**: 유저가 Order를 생성했으나 결제창 진입 없이 이탈. PG 웹훅도 수신되지 않음. 결제 자체가 발생하지 않았으므로 환불 불필요.

**대상 조건**:

```sql
Order.orderStatus = 'WAITING_PAYMENT'
AND Order.bootpayReceiptId IS NULL
AND Order.paymentId IS NULL -- confirm 완료 여부 이중 체크
AND Order.updatedAt <= NOW() - INTERVAL '15 minutes'
```

**처리 (Tx 내, race-safe 패턴)**:

1. `SELECT ... FOR UPDATE SKIP LOCKED`로 후보 잠금 (§2.4 공통 규칙)
2. 후보별 **UPDATE에 진입 필터 WHERE 가드 포함** — blind UPDATE 금지:
    
    ```sql
    UPDATE "Order"
       SET "orderStatus" = 'EXPIRED', "updatedAt" = NOW()
     WHERE id = $1
       AND "orderStatus" = 'WAITING_PAYMENT'
       AND "bootpayReceiptId" IS NULL
       AND "paymentId" IS NULL;
    ```
    
    `affected rows = 0`이면 (SELECT snapshot과 UPDATE 사이에 confirm 플로우가 Order를 `COMPLETED_PAYMENT`로 전이시킨 경우) 해당 건은 **스킵하고 `OrderHistory`도 기록하지 않는다**. §2.4 "원자적 check+update" 원칙.
    
3. UPDATE 성공(affected rows = 1) 시 `OrderHistory` 기록 (`orderStatus = EXPIRED`, `memo = "expired by scheduler: webhook not received"`, `data.source = "Case1"`)
4. 도메인 후처리 없음 (참여 신청 전 이탈이라 멤버·정원 미생성)

> **Race 차단 근거**: ASIS `ExpireAbandonedOrderScheduleJobService`에서 WAITING_PAYMENT ↔ COMPLETED_PAYMENT race로 Order 2938107(2026-04-15 08:50:04, 0.55초 간극)이 잘못 EXPIRED 마킹된 사례 확인(`webb-1328-findings-for-webb-1326.md` §2 참조). PostgreSQL은 UPDATE의 WHERE를 **UPDATE 실행 시점의 최신 row**에 재평가하므로, WHERE 가드에 `orderStatus='WAITING_PAYMENT'`를 포함하면 snapshot 이후 confirm이 커밋됐더라도 덮어쓰기를 구조적으로 차단한다. 해당 단건은 수동 보정 완료.
> 

**실행 주기**: 5분

**Feature Flag**: `FEATURE_SCHED_EXPIRE_ORPHANED_ORDER`

**람다 이관 시**: 단일 테이블 쿼리. 배치 상한 500건. 예상 실행 시간 1초 내외 / 메모리 < 128MB (PG 호출 없음).

---

### Case 2. confirm 미완료 복구 (API 타임아웃 이후) — `RecoverUnconfirmedPaymentJob`

**대체**: `ConfirmMissedPaymentScheduleJobService` + `PaymentUpdateJob.cancelPendingOrders`

**배경**: V3 `confirmOrder` API가 Bootpay `confirmReceipt` 호출 중 타임아웃 등으로 멈춘 건. 이 경우 `Order.bootpayReceiptId`가 세팅된 채 `WAITING_PAYMENT`로 남는다 (ASIS V3 `OrderBaseV3Service`가 confirm 시작 시 세팅하고 성공·즉시실패 시 null clear). Case 2는 이 "confirm 시작했는데 끝이 안 난 Order"를 찾아 **Bootpay에 실제 상태를 직접 물어봐서(SOT=PG)** 복구한다.

**대상 조건**:

```sql
Order.orderStatus = 'WAITING_PAYMENT'
AND Order.bootpayReceiptId IS NOT NULL
AND Order.updatedAt <= NOW() - INTERVAL '10 minutes'
```

**처리** (§2.4 SOT=PG 원칙):

1. `Bootpay.getReceipt(bootpayReceiptId)` — **PG에 실제 결제 상태 직접 조회**. 웹훅·DB 중간 상태는 판정 근거 아님
2. 분기:
    - status ∈ {결제완료(1), 승인대기(2)} → 카드가 이미 승인됐으므로 환불 필요: `executeRefund(order, orderPrice, "cancel_unconfirmed_{orderId}", FULL, "UNCONFIRMED_PAYMENT")`
    - 그 외 (이미 취소됨·결제 실패 등) → 환불 스킵 (PG가 이미 미결제 상태)
3. Tx 내에서 `Order.orderStatus → FAILED_PAYMENT` + `OrderHistory` 기록
4. 도메인 후처리 없음 (confirm 미완료 → 멤버 미생성)

**종료 상태**: `FAILED_PAYMENT` (환불 완료·미필요 무관. confirm이 끝난 적 없으므로 `COMPLETED_CANCEL_PAYMENT`가 아니라 `FAILED_PAYMENT`가 정확)

**실행 주기**: 5분

**Feature Flag**: `FEATURE_SCHED_RECOVER_UNCONFIRMED_PAYMENT`

**람다 이관 시**: 건당 Bootpay 최대 2회 호출(`getReceipt` + `cancelReceipt`). 타임아웃 건당 20초 여유 확보. 배치 상한 50건. `runInChunks` 필수.

---

### Case 3. 미연결 PaymentRequest 정리 — `CleanupOrphanPaymentRequestJob`

**대체**: `PaymentUpdateJob.refundExpiredPaymentRequests`

**배경**: Bootpay 웹훅으로 `PaymentRequest`는 생성됐으나 `Payment`로 전환되지 않은 미연결 건을 정리하는 **보조 안전망**. 정상 경로에서는 Case 2가 이런 상황을 거의 다 흡수하므로 Case 3은 아래 두 가지만 책임진다:

1. **PaymentRequest 자체 정리**: 30분 이상 `Payment` 미연결로 남은 레코드를 PG 환불 후 삭제. Case 2의 대상이 되지 않는 "Order와 매칭 안 된 웹훅" 케이스 처리.
2. **Order 역매칭 안전망**: 혹시 `PaymentRequest`에는 receiptId가 있는데 서버가 `Order.bootpayReceiptId`를 세팅하지 못한 Order가 있다면 (confirm API가 DB 저장 직전에 죽은 극한 케이스), Bootpay 영수증의 `metadata.order_id`로 해당 Order를 찾아 Case 2 경로로 넘긴다. 이 경로는 "웹훅 수신 + confirm 미시작" 간극을 메꾸는 역할.

**대상 조건**:

```sql
PaymentRequest.createdAt <= NOW() - INTERVAL '30 minutes'
AND NOT EXISTS (
  SELECT 1 FROM "Payment" p WHERE p.receiptId = PaymentRequest.receiptId
)
```

**처리**:

1. `Bootpay.getReceipt(receiptId)`로 영수증 조회 → `metadata.order_id` 획득
2. 해당 `Order`가 `WAITING_PAYMENT`이고 `bootpayReceiptId IS NULL`이면:
    - `Order.bootpayReceiptId = receiptId` 세팅 (다음 주기 Case 2가 복구)
    - PaymentRequest는 이번 주기에 삭제하지 않음 (Case 2가 처리 후 정리)
3. 그 외 (Order 매칭 실패·이미 처리됨):
    - `Bootpay.cancelReceipt(receiptId, full)` — 실패해도 계속
    - PaymentRequest 삭제
    - 운영 로그만 기록 (Order 연결이 없으므로 `OrderHistory` 없음)

**종료 이벤트**: PaymentRequest 삭제 또는 Order 역매칭 완료

**실행 주기**: 15분 (Case 2가 대부분 흡수하므로 낮은 빈도로 충분)

**Feature Flag**: `FEATURE_SCHED_CLEANUP_ORPHAN_PAYMENT_REQUEST`

**람다 이관 시**: 정상 환경 대상 0건 수렴. 비용 부담 최소. 배치 상한 100건 (§8 결정표 일치).

---

### Case 4. 전액 환불 실패 재시도 — `RetryFailedCancelPaymentJob`

**신규**

**배경**: WEBB-1325 Executor가 PG 환불 실패 시 `FAILED_CANCEL_PAYMENT`로 기록. 스태프 환불 실패도 동일 상태로 귀결되어 이 Job이 자연 커버.

**재시도 정책 — 명시적 카운트·백오프 없음**

본 Case는 실패 Order를 **주기적으로 계속 재시도한다**. 명시적 `retryCount`나 지수 백오프를 두지 않는다. 그 이유:

- **스케줄러 주기(5분)가 곧 암묵적 백오프** 역할을 한다. Order가 실패 상태에 머무는 한 5분마다 한 번씩 자동 재시도.
- **멱등 계약으로 Slack·이력 스팸 자동 방지** — WEBB-1325 §5.9.3에 따라 이미 `FAILED_CANCEL_PAYMENT` 상태인 Order에 재시도가 실패해도 상태 전이 없음 → Slack 알림은 최초 전이(`COMPLETED_PAYMENT → FAILED_CANCEL_PAYMENT`)에서만 발화하고 `OrderHistory`도 재기록되지 않는다.
- **Rate Limit은 여유** — §2.4 공통 규칙의 `runInChunks`(concurrency 5 + chunk delay 300ms ≈ 16.7req/s) + `BootpayService` 글로벌 rate limiter(25req/s)가 2중 방어. 가상 1000건 누적돼도 5분 주기 × 스케줄러 스로틀로 Bootpay 한도의 13% 수준이라 여유.
- **한계 도달 판단은 BACK-202 운영자가 담당** — 시스템이 자동으로 "3회 실패 = 포기"를 판정하지 않고, 운영자가 BACK-202 화면에서 실패 지속 시간·이유를 보고 수동 종결/재처리.

**좀비 건에 대한 인지**: 카드 만료·환불 불가 계좌 등 **영구 실패 Order**("좀비")는 본 Case가 5분마다 무한 재시도한다. 이를 받아들이는 이유는 위 멱등 계약·Rate Limit 여유·BACK-202 운영 창구 세 가지 전제가 맞물려 있어서다. 다만 장기 누적 시 모니터링으로 식별할 필요가 있어 §6 모니터링에 "좀비 지표"를 둔다 (실패 상태 N일 이상 Order 건수 + 실패 이유 분포).

**대상 조건**:

```sql
Order.orderStatus = 'FAILED_CANCEL_PAYMENT'
```

별도 조건 없음. 실패 상태에 머물러 있는 Order 전부가 매 주기 대상.

**처리**:

1. `executeRefund(order, remainPrice, cancelId, FULL, reason)`
    - `cancelId`는 Executor가 진입 Order 상태 기반으로 자동 결정 (일반 취소: 원본 `cancel_{orderId}` 재사용 / 스태프 환불: `refund_staff_{orderId}` 재사용). Bootpay 멱등 키 재사용 + `getReceipt` 재조회로 이중 환불 방지
2. Tx 내 `finalizeOrder(order, outcome, tx)`
    - 성공: Order → `COMPLETED_CANCEL_PAYMENT` + `OrderHistory` 기록
    - 실패: `FAILED_CANCEL_PAYMENT` 그대로 유지. 멱등 계약에 따라 OrderHistory 재기록 없음

**종료 상태**: 성공 `COMPLETED_CANCEL_PAYMENT` / 실패 `FAILED_CANCEL_PAYMENT` 유지

**실행 주기**: 5분

**Feature Flag**: `FEATURE_SCHED_RETRY_FAILED_CANCEL_PAYMENT`

**람다 이관 시**: 건당 Bootpay 1회. `runInChunks` 적용. 배치 상한 100건. 좀비 누적으로 건수 증가 시에도 스로틀이 rate limit을 방어.

---

### Case 5. 부분 환불 실패 재시도 — `RetryPartialRefundFailedJob`

**대체**: `socialingUpdateJob.retryFailedEarlyBirdPartialRefundsForYesterdayFinishedSocialings` (WEBB-1220, 매일 15시 KST 1회, 전일 종료 소셜링 한정, 소셜링 단위 순차 처리)

**배경**: 얼리버드 부분 환불 실패 시 `PARTIAL_REFUND_FAILED`. 기존 WEBB-1220 스케줄러는 "전일 종료된 소셜링" 범위·일일 1회로 복구 속도가 느리고, Slack 알림 일관성이 Case 4와 제각각. 본 Case는 **Order 상태 기반 일반화**로 전환:

- 범위: `PARTIAL_REFUND_FAILED` 상태 Order 전체 (소셜링 얼리버드 한정이지만 Order 상태만으로 선별)
- 주기: 10분
- 재시도 정책: Case 4와 동일 (명시적 카운트·백오프 없음, 아래 참조)

Case 4와 **멱등성 키 규칙이 달라 별도 Job**:

- Case 4: 원본 키 재사용
- Case 5: `cancel_earlybird_retry_{failedHistoryId}` 신규 발급 (`order-challenge.md §5`, WEBB-1325 §7.1 멱등성 키 규칙)

**대상 범위**: **소셜링 얼리버드 부분환불 실패 전담** (챌린지는 얼리버드 기능이 기획된 적 없어 `PARTIAL_REFUND_FAILED` 진입 경로가 없음, WEBB-1325 §Project Description 전제 참조). Case 5는 Order 상태만으로 선별하므로 향후 다른 도메인에 부분환불 경로가 추가되면 재시도도 자동 커버.

**재시도 정책 — 명시적 카운트·백오프 없음**

Case 4와 동일한 철학. 본 Case도 `PARTIAL_REFUND_FAILED` Order를 **주기적으로 계속 재시도한다**. 명시적 `retryCount`나 지수 백오프를 두지 않는다. 그 이유:

- **스케줄러 주기(10분)가 곧 암묵적 백오프** 역할. Order가 실패 상태에 머무는 한 10분마다 한 번씩 자동 재시도.
- **멱등 계약으로 Slack·이력 스팸 자동 방지** — WEBB-1325 §5.9.3에 따라 이미 `PARTIAL_REFUND_FAILED` 상태인 Order에 재시도가 실패해도 상태 전이 없음 → Slack 알림은 최초 전이에서만 발화하고 `OrderHistory`도 재기록되지 않음.
- **Rate Limit 방어** — §2.4 공통 규칙의 `runInChunks`(concurrency 5 + chunk delay 300ms ≈ 16.7req/s) + `BootpayService` 글로벌 rate limiter(25req/s)가 2중 방어. 배치 실행 구간 호출률은 16.7req/s로 Bootpay 30req/s 한도의 56%, 10분 주기 평균으로는 훨씬 낮음(배치 상한 100건/600초 ≈ 0.17req/s).
- **한계 도달 판단은 BACK-202 운영자가 담당** — 시스템이 자동으로 "3회 실패 = 포기"를 판정하지 않고, 운영자가 실패 지속 시간·이유를 보고 수동 종결/재처리.

**좀비 건에 대한 인지**: 부분환불 대상 중에도 카드 만료·환불 불가 계좌 등으로 **영구 실패하는 Order**가 누적될 수 있다. Case 4와 동일하게 본 Case도 10분마다 무한 재시도하며, 멱등 계약·Rate Limit 여유·BACK-202 운영 창구 세 전제로 이를 수용한다. 장기 누적 식별은 §6 모니터링 "좀비 지표"로 공용 처리.

**대상 조건**:

```sql
Order.orderStatus = 'PARTIAL_REFUND_FAILED'
```

별도 조건 없음. 실패 상태에 머물러 있는 Order 전부가 매 주기 대상.

**처리**: Case 4와 동일한 구조, 단 `executeRefund(order, earlyBirdDiscount, cancelId, PARTIAL, "EARLY_BIRD_REFUND_RETRY")`. Executor가 직전 `PARTIAL_REFUND_FAILED` `OrderHistory.id`를 참조해 `cancelId` 자동 생성.

**종료 상태**: 성공 `PARTIAL_REFUNDED` / 실패 `PARTIAL_REFUND_FAILED` 유지

**실행 주기**: 10분

**Feature Flag**: `FEATURE_SCHED_RETRY_PARTIAL_REFUND_FAILED`

**람다 이관 시**: 건당 Bootpay 1회. `runInChunks` 적용. 배치 상한 100건. 좀비 누적으로 건수 증가 시에도 스로틀이 rate limit을 방어.

**기존 WEBB-1220 스케줄러 처리**: 본 Case 활성화 후 `retryFailedEarlyBirdPartialRefundsForYesterdayFinishedSocialings` + `EarlyBirdRefundService.retryFailedEarlyBirdRefunds` 호출 루프는 제거. 어드민 수동 재시도 API 2개(`POST /admin/early-bird-partial-refund/retry-batch`, `POST /admin/orders/:orderId/retry-earlybird-refund`)는 유지하되 내부 호출을 WEBB-1325 V3 경로로 교체 (WEBB-1325 §6.7 "V2 → V3 로직 이관 맵" 참조).

---

### Case 6. 상태 불일치 Sweeper — 소셜링 — `SweepSocialingStatusMismatchJob`

**신규**

**배경**: 소셜링 일괄 취소(`closeSocialingByHost`, `CLOSE_BY_SYSTEM`, `CONFIRM_PLAYING` 시 REQUEST 취소)는 DB 전이를 단일 TX로 원자화하지만(WEBB-1325 §8 주요 기술적 결정 "일괄 취소 TX 원자화" 행, `improvements.md §9` 해소) PG 환불은 TX 외부 루프. 크래시로 "멤버 종료 상태 + `Order=COMPLETED_PAYMENT`" 불일치 발생. Case 4는 `FAILED_CANCEL_PAYMENT`만 대상이므로 이 불일치는 재시도 루프에 진입조차 못한다. 본 Job은 **재시도 루프 진입 게이트** 역할 — TX 원자화가 아무리 완전해도 환불 루프는 외부이므로 이 간극을 메꾸는 안전망이 필요하다.

**대상 조건**:

```sql
Order.orderStatus = 'COMPLETED_PAYMENT'
AND EXISTS (
  SELECT 1 FROM "SocialingMember" sm
   WHERE sm.orderId = Order.id
     AND sm.status IN ('CANCEL', 'KICK', 'REJECT')
     AND sm."updatedAt" <= NOW() - INTERVAL '10 minutes'   -- 멤버 종료 전이 이후 환불 루프 정상 실행 시간 보장
)
```

> **grace 기준 필드**: `SocialingMember.updatedAt`. 일괄 취소 TX는 멤버 상태만 전이하고 Order 레코드는 건드리지 않으므로 `Order.updatedAt`은 결제 완료 시점에 머물러 있어 grace 판정 근거로 쓸 수 없다. 멤버 종료 전이 시점부터 환불 루프가 정상 실행될 수 있는 시간을 확보하는 것이 본 조건의 의도이므로 `member.updatedAt` 기준이 정확하다.
> 

**처리 (Tx 내)**:

1. `SELECT ... FOR UPDATE SKIP LOCKED`로 Order 락 (환불 루프와 경합 방지)
2. **`Order.orderPrice = 0` (무료 주문) 분기**:
    - 무료 주문은 PG 환불 대상이 아니므로 Sweeper에서 직접 `Order.orderStatus → COMPLETED_CANCEL_PAYMENT`로 전이(`order-socialing.md §3-1` 무료 취소 규칙과 동일 종착 상태). `OrderHistory` 기록(`memo = "socialing sweeper: free order, direct complete-cancel"`, `data.source = "Case6"`). Case 4 편입 없음
    - 무료 주문을 `FAILED_CANCEL_PAYMENT`로 보내면 Case 4가 PG 환불을 시도하다 실패하므로 반드시 분기해야 한다
3. **유료 주문 (`Order.orderPrice > 0`) 분기**:
    - `Order.orderStatus → FAILED_CANCEL_PAYMENT` + `OrderHistory`(`memo = "socialing sweeper: member terminated, order still completed_payment"`, `data.source = "Case6"`)
    - 다음 주기에 Case 4가 PG 환불 재시도 수행
4. **PG 호출 없음** (두 분기 공통)

**False positive 허용**: 10분 grace는 정상 환불 루프(수 초)보다 2자릿수 이상 큰 여유를 두지만, **PG 장애로 지연되고 있는 정상 "환불 진행 중" 건**이 탐지 대상에 포함될 수 있다. 이 경우 Case 6이 `FAILED_CANCEL_PAYMENT`로 전이시키고 Case 4가 다시 PG 환불을 시도하지만, WEBB-1325 Executor의 멱등 계약(§5.3 불변식 5: 응답 불명 시 `getReceipt` 재조회, §7.1 멱등 키 재사용으로 Bootpay가 기존 결과 반환)으로 **이중 환불은 발생하지 않는다**. 따라서 본 Sweeper는 PG 장애로 인한 false positive를 **허용 가능한 비용**으로 간주하고 별도 차단하지 않는다 (의도된 동작).

**제외 대상**: 멤버 상태 필터로 구조적 제외되는 APPROVE 유지 케이스

- 스태프 환불 (Invariant S4): `APPROVE`
- 얼리버드 환불 (Invariant S3): `APPROVE`

**실행 주기**: 5분

**Feature Flag**: `FEATURE_SCHED_SWEEP_SOCIALING`

**람다 이관 시**: `SocialingMember.orderId`는 unique 인덱스. JOIN 빠름. 정상 환경 대상 0건. 배치 상한 500건 (§8 결정표 일치).

---

### Case 7. 상태 불일치 Sweeper — 챌린지 — `SweepChallengeStatusMismatchJob`

**신규**

**배경**: 챌린지 `closeChallengeByHost`, 모집 마감 `CLOSE_BY_SYSTEM` 일괄 취소 크래시 복구. Case 6과 패턴 동일, 대상 도메인만 다름.

**대상 조건**:

```sql
Order.orderStatus = 'COMPLETED_PAYMENT'
AND EXISTS (
  SELECT 1 FROM "ChallengeMember" cm
   WHERE cm.orderId = Order.id
     AND cm.status IN ('CANCEL', 'REJECT')                -- 챌린지는 KICK 없음 (강퇴도 REJECT)
     AND cm."updatedAt" <= NOW() - INTERVAL '10 minutes'  -- 멤버 종료 전이 기준 grace
)
```

> **grace 기준 필드**: `ChallengeMember.updatedAt` — Case 6과 동일한 이유 (Order 레코드는 일괄 취소 TX에서 갱신되지 않음).
> 

**처리**: Case 6과 동일 패턴. 무료 주문(`orderPrice = 0`) 분기도 동일하게 직접 `COMPLETED_CANCEL_PAYMENT`로 전이, 유료 주문만 `FAILED_CANCEL_PAYMENT`로 보내 Case 4 편입 (`memo = "challenge sweeper: member terminated, order still completed_payment"`, `data.source = "Case7"`).

**False positive 허용**: Case 6과 동일. PG 장애로 지연 중인 정상 환불 건이 포함되더라도 Executor 멱등성으로 이중 환불 없음 — 허용 가능한 비용으로 간주.

**제외 대상**: 얼리버드 환불 후 (Invariant Ch4): `APPROVE`

**실행 주기**: 5분

**Feature Flag**: `FEATURE_SCHED_SWEEP_CHALLENGE`

**람다 이관 시**: Case 6과 동일.

---

### Case 8. 소셜링 24h 미승인 자동 취소 — `ExpireSocialingUnapprovedRequestJob`

**대체**: 현 `socialingUpdateJob` 내 24h 미승인 처리 로직 (WEBB-1325 전환과 함께 Job 단위로 분리)

**배경**: 승인제(CHOICE) 소셜링에서 REQUEST 상태로 24시간 이상 승인받지 못한 멤버를 자동 취소하고 전액 환불한다. 또한 소셜링이 이미 `CONFIRM_PLAYING`/`CLOSE`/`CLOSE_BY_SYSTEM`/`COMPLETE`로 전이됐는데 일괄 취소 루프에서 누락된 REQUEST 잔존분도 함께 처리 (Invariant Safety).

**대상 조건** (`socialing-pseudocode.md §8-4`):

```sql
-- A: 활성 소셜링에서 24시간 미승인
(SocialingMember.status = 'REQUEST'
 AND SocialingMember.createdAt < NOW() - INTERVAL '24 hours'
 AND Socialing.status = 'RECRUITING')
OR
-- B: 소셜링 전이 이후 REQUEST 잔존 (§8-1/§8-2 누락분 안전망)
(SocialingMember.status = 'REQUEST'
 AND Socialing.status NOT IN ('PLANNING', 'RECRUITING'))
```

**처리 (Per Member, Tx 외부 단위)**:

1. `OrderCancelV3Service<SocialingMember>.cancel(memberId, CancelActor.SYSTEM, "UNAPPROVED_TIMEOUT")`
    - 내부 (WEBB-1325): 멤버 상태 → CANCEL, `SocialingCancelRefundPolicy` 판정(시스템 귀책 → 유료는 전액 환불), PG 환불, Order → `COMPLETED_CANCEL_PAYMENT`, OrderHistory 기록을 한 사가로 처리
    - 환불 실패 시: Order → `FAILED_CANCEL_PAYMENT` → **Case 4**가 재시도
2. Push 발송은 V3 서비스의 `onAfterCancel`이 수행 (Job은 호출만)

**종료 상태**: 멤버 `CANCEL` + Order `COMPLETED_CANCEL_PAYMENT` (성공) / `FAILED_CANCEL_PAYMENT` (Case 4로 위임)

**실행 주기**: 10분

**Feature Flag**: `FEATURE_SCHED_EXPIRE_SOCIALING_UNAPPROVED`

**람다 이관 시**: 건당 V3 서비스 호출이 Bootpay 1회 + DB 2 Tx를 포함. 배치 상한 50건. 조건 B로 간헐 급증 가능 → `runInChunks` 적용.

---

### Case 9. 챌린지 24h 미승인 자동 취소 — `ExpireChallengeUnapprovedRequestJob`

**대체**: 현 `challenge.schedule-job` 내 10분 주기 미승인 처리 로직

**배경**: 챌린지 REQUEST 24시간 미승인 멤버 자동 취소 + 전액 환불. `CONFIRM_PLAYING` 이후 잔존 REQUEST는 본 Job이 아닌 `§7-2` 모집 마감 스케줄러에서 처리되므로 조건은 소셜링 Case 8보다 단순.

**대상 조건** (`challenge-pseudocode.md §7-1`):

```sql
ChallengeMember.status = 'REQUEST'
AND ChallengeMember.updatedAt < NOW() - INTERVAL '24 hours'
AND Challenge.status = 'RECRUITING'
```

**처리**: Case 8과 동일 패턴

```
OrderCancelV3Service<ChallengeMember>.cancel(memberId, SYSTEM, "UNAPPROVED_TIMEOUT")
```

- 내부 환불 정책: `ChallengeCancelRefundPolicy` (시스템 귀책 → 유료 전액 환불)

**실행 주기**: 10분

**Feature Flag**: `FEATURE_SCHED_EXPIRE_CHALLENGE_UNAPPROVED`

**람다 이관 시**: Case 8과 동일 (배치 상한 50건, §8 결정표 일치).

---

### Case 10. 스태프 환불 크래시 복구 — `RecoverStaffRefundJob`

**신규** (WEBB-1325 `OrderRefundV3Service` Stage 3↔4 간극 보완)

**배경**: WEBB-1325 §5.9.2에 정리된 `OrderRefundV3Service` 크래시 시나리오 중 "Stage 3(PG 환불 성공) ~ Stage 4(Order 전이) 사이 크래시"는 멤버가 `APPROVE` 유지라 Case 6(상태 불일치 Sweeper)이 감지 못한다. PG는 이미 환불됐는데 DB에는 `Order=COMPLETED_PAYMENT` 그대로 남아 **돈은 나갔는데 기록이 없는** 상태가 고착된다. 본 Job이 이 공백을 감지하여 `OrderRefundV3Service.refund`를 재호출한다.

Executor의 멱등 키(`refund_staff_{orderId}`) 재사용 + `getReceipt` 재조회 (WEBB-1325 §5.3 불변식 5) 덕에 **이미 환불된 건을 다시 환불하지 않고**, Bootpay 응답을 `SUCCESS`로 해석해 Stage 4(Order 전이)만 실행하는 결과가 된다.

**대상 조건**:

```sql
Socialing.status = 'COMPLETE'
AND Socialing.finishDate <= NOW() - INTERVAL '30 minutes'   -- 정상 환불 루프 완료 대기
AND SocialingMember.grade = 'STAFF'
AND SocialingMember.status = 'APPROVE'
AND Order.orderStatus = 'COMPLETED_PAYMENT'
AND Order.orderKind <> 'FREE'                                -- 무료 스태프는 환불 대상 아님
```

**처리**:

1. `SELECT ... FOR UPDATE SKIP LOCKED`로 멤버 행 잠금 (정상 환불 루프 경합 방지)
2. `OrderRefundV3Service<SocialingMember>.refund(memberId, SYSTEM, "STAFF_REFUND_RECOVERY")` 호출
    - V3 내부 Stage 1~4 수행 (§4.7)
    - Executor가 `getReceipt`로 PG 실제 상태 조회:
        - 이미 전액 환불됨 → `RefundResult.SUCCESS`로 Stage 4 실행 → Order `COMPLETED_CANCEL_PAYMENT`로 전이 + OrderHistory 기록 (memo: "STAFF_REFUND_RECOVERY")
        - 환불 안 됨 → 정상적으로 PG 환불 실행 후 Order 전이
        - PG 장애 지속 → `FAILED_CANCEL_PAYMENT` 기록 → **Case 4** 재시도에 편입
3. Slack 알림 (복구 이벤트는 운영 가시성 높이기 위해 건당 알림)

**종료 상태**: 성공 `COMPLETED_CANCEL_PAYMENT` / PG 실패 `FAILED_CANCEL_PAYMENT` (Case 4로 위임)

**실행 주기**: 30분 (희소 이벤트, 정상 환불 루프 grace 확보)

**Feature Flag**: `FEATURE_SCHED_RECOVER_STAFF_REFUND`

**람다 이관 시**: 건당 Bootpay `getReceipt` 1회 + 조건부 `cancelReceipt` 1회. 배치 상한 50건. 정상 환경에서는 0건 수렴이 목표.

**Case 4/6과의 차이**:

- Case 4는 이미 `FAILED_CANCEL_PAYMENT`로 기록된 Order가 대상. 본 Case는 기록조차 못 한 Order.
- Case 6은 멤버 종료 상태 필터. 본 Case는 `APPROVE` 유지라 Case 6이 잡지 못함.

---

### Case 11. 얼리버드 환불 크래시 복구 — `RecoverEarlyBirdRefundJob`

**신규** (WEBB-1325 `OrderRefundV3Service` Stage 3↔4 간극 보완, 얼리버드 버전)

**배경**: Case 10과 동일한 사유로 얼리버드 부분환불의 Stage 3↔4 간극 보완. 얼리버드 환불 후 정상 조합은 멤버 `APPROVE` + Order `PARTIAL_REFUNDED` (Invariant S3). 크래시 시 Order가 `COMPLETED_PAYMENT` 그대로 남는다.

**대상 조건**:

```sql
Socialing.status = 'COMPLETE'
AND Socialing.finishDate <= NOW() - INTERVAL '30 minutes'
AND SocialingMember.status = 'APPROVE'
AND Order.orderStatus = 'COMPLETED_PAYMENT'
AND Order.orderKind = 'CARD'
AND Order.refundPrice > 0                                    -- 얼리버드 할인액이 세팅된 Order
AND EXISTS (
  SELECT 1 FROM "DiscountAndSocialingMember" dasm
   WHERE dasm.socialingMemberId = SocialingMember.id
     AND dasm.discountType = 'EARLY_BIRD'
)
```

**처리**:

1. `SELECT ... FOR UPDATE SKIP LOCKED`로 멤버 잠금
2. `OrderRefundV3Service<SocialingMember>.refund(memberId, SYSTEM, "EARLY_BIRD_REFUND_RECOVERY")` 호출
    - Executor가 `cancel_earlybird_{orderId}` 멱등 키로 `getReceipt` 조회:
        - 이미 부분 환불됨 → `RefundResult.SUCCESS` + `scope=PARTIAL` → Order `PARTIAL_REFUNDED`
        - 환불 안 됨 → 정상 부분환불 실행
        - 실패 → `PARTIAL_REFUND_FAILED` → **Case 5** 재시도에 편입
3. Slack 알림

**종료 상태**: 성공 `PARTIAL_REFUNDED` / 실패 `PARTIAL_REFUND_FAILED` (Case 5로 위임)

**실행 주기**: 30분

**Feature Flag**: `FEATURE_SCHED_RECOVER_EARLY_BIRD_REFUND`

**람다 이관 시**: Case 10과 동일. JOIN 4단(`Socialing → SocialingMember → Order → DiscountAndSocialingMember`)이라 인덱스 검토 필요.

---

### Case 12. 상태 불일치 Sweeper — 클럽 *(현재 범위 제외)*

**현재 범위 제외** — Case 6/7의 클럽 대응. 클럽은 `Order ↔ ClubMember`가 `ClubMembership` 경유 2단계라 쿼리 구조가 다르고, 멤버 상태 복구 경로(`SubscriptionRefundExecutor`)도 WEBB-1325에서 미구현 상태. 본 이슈는 **구현하지 않음**.

**왜 번호만 할당해 두었나**: 클럽 V3 이관 후속 이슈에서 Case 6/7 템플릿을 그대로 복제해 추가하면 되므로, 미리 고정 번호를 예약해 두어 매트릭스와 매핑 표의 안정성을 확보.

**구현 시점**: WEBB-1325의 `ClubMemberCancellationHandler` + `SubscriptionRefundExecutor`(또는 클럽 V3 Executor)가 프로덕션에 안정화된 뒤 별도 이슈로 활성화.

**기존 동작 유지**: ASIS `club.schedule-job` + `club-membership.schedule-job` 그대로 운영. 클럽 일괄 취소(예: `deleteClub`) 크래시 복구는 현재 수동 대응.

---

### Case 13. 클럽 24h 미승인 자동 취소 *(현재 범위 제외)*

**현재 범위 제외** — Case 8/9의 클럽 대응. `OrderCancelV3Service<ClubMember>` 미구현 상태라 V3 사가 호출 경로가 없어 본 이슈에서 구현 불가.

**구현 시점**: 위 Case 12와 동일한 선행 조건. WEBB-1325 클럽 V3 완성 이후.

**기존 동작 유지**: ASIS `club.schedule-job.cancelRequestAfter24hr`를 그대로 운영한다.

---

### 4. 선행 작업 (없음)

본 재구조화는 ASIS 구조 위에서 바로 수행한다. 추가 선행 작업 없음.

- `Order.bootpayReceiptId`의 의미는 **ASIS 그대로 유지**: V3 `OrderBaseV3Service.confirmOrder`가 confirm 시작 시 세팅하고 성공·즉시실패 시 null clear하는 "confirm 시작 마커". Case 1/2 분기(`IS NULL` vs `IS NOT NULL`)는 이 의미 위에서 자연스럽게 성립 — Case 1은 "confirm을 시작조차 안 한 Order", Case 2는 "confirm 시작 후 응답 없이 멈춘 Order".
- 웹훅 수신부(`BootpayWebhookService.handleEvent`)도 ASIS 그대로: `PaymentRequest` 생성만 수행하고 `Order.bootpayReceiptId`는 건드리지 않는다. 결제 상태 판정의 진실원본은 `getReceipt`이지 웹훅이 아니다(§2.4 SOT=PG).
- 혹시 confirm API가 DB 저장 직전에 죽어 "웹훅은 왔는데 Order는 receiptId를 모르는" 간극이 발생하면 Case 3이 `metadata.order_id` 역매칭으로 복구한다.

---

### 5. WEBB-1325와의 계약 (Case별 사용 매핑)

| Case | 사용 API | 멱등성 키 |
| --- | --- | --- |
| 1 | (없음) | - |
| 2 | `Bootpay.getReceipt` + `executeRefund` + `finalizeOrder` | `cancel_unconfirmed_{orderId}` |
| 3 | `Bootpay.getReceipt` + `Bootpay.cancelReceipt` 직접 | (Order 연결 없음) |
| 4 | `executeRefund` + `finalizeOrder` | Executor 자동 결정 (일반 취소·스태프 환불 원본 키 재사용) |
| 5 | `executeRefund` + `finalizeOrder` | `cancel_earlybird_retry_{failedHistoryId}` |
| 6·7 | (PG 호출 없음, 상태 전이 + OrderHistory만) | - |
| 8 | `OrderCancelV3Service<SocialingMember>.cancel` | V3 내부에서 `cancel_{orderId}` 생성 |
| 9 | `OrderCancelV3Service<ChallengeMember>.cancel` | V3 내부에서 `cancel_{orderId}` 생성 |
| 10 | `OrderRefundV3Service<SocialingMember>.refund` + 내부 `PaymentRefundExecutor` (`getReceipt` 재조회) | `refund_staff_{orderId}` 재사용 |
| 11 | `OrderRefundV3Service<SocialingMember>.refund` + 내부 `PaymentRefundExecutor` | `cancel_earlybird_{orderId}` 재사용 |

**불변식**:

1. Case 2·3은 판정 시 **반드시 `getReceipt`로 PG 상태를 조회**한다 (SOT=PG, §2.4). 웹훅 존재·`bootpayReceiptId` 값은 힌트일 뿐 판정 근거 아님.
2. Case 4·5는 `cancelId`를 **직접 생성하지 않음**. Executor가 진입 Order 상태 기반으로 결정. Executor는 PG 응답 불명 시 `getReceipt` 재조회로 실제 상태 확정 (WEBB-1325 §5.3 불변식 5).
3. Case 6·7은 Bootpay·Executor 환불 API를 호출하지 않음. `COMPLETED_PAYMENT → FAILED_CANCEL_PAYMENT` 전이만 수행 (재시도 루프 진입 게이트).
4. **Case 1~7은 멤버 상태를 변경하지 않음**. 도메인 후처리는 원래 취소 경로에서 이미 수행됐거나 애초에 불필요(Case 1·2·3).
5. **Case 8·9은 멤버 상태 전이가 Job의 본질 목적**. 다만 Job은 전이를 직접 하지 않고 `OrderCancelV3Service`에 위임. Job 자체는 `FOR EACH member → cancel()` 루프만 담당.
6. Case 5 대상은 소셜링 얼리버드 전담. Order 상태 기반 선별이라 향후 다른 도메인에 부분환불 경로 추가 시 자동 커버.
7. **Case 10·11은 멤버 상태를 변경하지 않음**. V3 `OrderRefundV3Service`에 위임하므로 `RefundParamsLoader` 인터페이스 레벨에서 멤버 상태 변경 불가능 (WEBB-1325 §5.3 불변식 3). Executor 멱등 키(`refund_staff_{orderId}` / `cancel_earlybird_{orderId}`) 재사용으로 **이중 환불 방지가 구조적으로 성립**.

---

### 6. 모니터링

**Case별 지표** (Grafana):

| Case | 주요 지표 |
| --- | --- |
| 1 | 처리 건수 / 주기당 조회량 |
| 2 | `Bootpay.getReceipt` 응답 분포 / 환불 성공률 / `FAILED_PAYMENT` 전이 건수 |
| 3 | 대상 건수 (정상 = 0) / Order 역매칭 성공 건수 |
| 4 | 주기별 처리 건수 / 재시도 성공률 / **좀비 지표** — `FAILED_CANCEL_PAYMENT` 상태가 N일(기본 7일) 이상 지속된 Order 건수 + 실패 이유(`OrderHistory.data`) 분포. 지표 급증 시 BACK-202 수동 대응 큐에 쌓이는 속도 관찰 |
| 5 | 주기별 처리 건수 / 재시도 성공률 / **좀비 지표** — `PARTIAL_REFUND_FAILED` 동일. 대상은 소셜링 얼리버드 전담 |
| 6·7 | 탐지 건수 (정상 = 0). **비정상 증가 → 일괄 취소 TX + 환불 루프 장애 신호 → Slack** |
| 8·9 | 도메인별 자동 취소 처리 건수 / V3 서비스 호출 실패율 / 환불 실패 후 Case 4 유입 건수 (연계 추적) |
| 10·11 | 탐지 건수 (정상 = 0). **비정상 증가 → `OrderRefundV3Service` 사가 크래시 신호 → Slack**. `getReceipt` 재조회 결과별 분포(이미 환불됨 / 미환불) 추적 — 전자는 단순 DB 정합 복구, 후자는 기존 환불 루프가 PG 호출 전에 크래시했다는 신호 |

**공통**:

- 각 Job `execute` 최근 실행 시각 — 지연 시 Slack (헬스체크)
- WEBB-1272 Rate Limit 재시도 — 기존 대시보드 재사용
- Feature Flag 상태 — 대시보드로 일괄 조회

---

### 7. API / ERD

- **API 변경**: 없음. 웹훅 엔드포인트 시그니처·동작 모두 ASIS 유지 (§4 선행 작업 참조). 어드민 재시도 API 2개(`POST /admin/orders/:orderId/retry-earlybird-refund`, `POST /admin/early-bird-partial-refund/retry-batch`)도 경로 그대로 두고 내부만 WEBB-1325 V3 경로로 교체 (Case 5 참조)
- **ERD 변경**: 없음
    - 재시도 카운트·한계 컬럼 일체 신설 없음 — 명시적 재시도 카운트를 **두지 않는** 설계(§2.4 "암묵적 백오프 = 스케줄러 주기"). 재시도 상태는 `Order.orderStatus`와 기존 `OrderHistory`만으로 추적
    - Sweeper 탐지 이력·스케줄러 전이 이력은 기존 `OrderHistory` 레코드에 `memo`·`data` JSON 필드로 기록 (본 이슈 범위에서 `OrderHistory.type` 같은 신규 enum·컬럼을 추가하지 않음 — 현행 스키마상 `OrderHistory`에 별도 type 컬럼은 없고, 1346에서 모델 분리 시 재평가)

### 7.1 실패 로그 구조화 — BACK-202 백오피스 연계

[BACK-202](https://munto.atlassian.net/browse/BACK-202) 백오피스 결제 취소·환불 관리 페이지가 본 이슈의 실패 로그를 소비한다. CS 담당자가 개발자 개입 없이 실패 건을 조회·수동 재환불할 수 있도록, 본 이슈에서 생성되는 모든 실패 이력은 BACK-202가 읽기만 하면 되는 수준으로 **구조화**한다.

**1326이 BACK-202에 제공하는 인터페이스** (전부 `OrderHistory` + `Order.orderStatus` 기반, 신규 API·테이블 없음):

| BACK-202 요구 | 1326에서 제공하는 소스 |
| --- | --- |
| 실패 건 목록 조회 (filter by status) | `Order.orderStatus IN ('FAILED_CANCEL_PAYMENT', 'PARTIAL_REFUND_FAILED')` |
| 최초 실패 시각 (얼마나 오래 실패 상태인지) | `OrderHistory` 중 최초로 실패 상태로 전이한 레코드의 `createdAt`. 운영자가 BACK-202 화면에서 "N일째 실패 중" 판정 근거로 사용 |
| Sweeper로 편입된 건 구분 | `OrderHistory.memo` LIKE 패턴(`"member terminated, order still completed_payment"`) 또는 `data` JSON 내 flag. 현행 스키마상 type 컬럼이 없으므로 memo·data로 구분 |
| 실패 이유·PG 응답 상세 | `OrderHistory.data` JSON (PG 응답 전문, 에러 코드·메시지 저장) |
| 전체 이력 타임라인 | `OrderHistory` orderId 기준 시계열 조회 |
| 자동 재시도 중임을 화면에 표시할 근거 | Order가 `FAILED_CANCEL_PAYMENT`·`PARTIAL_REFUND_FAILED` 상태에 있으면 스케줄러가 매 주기 재시도 중임이 암묵적으로 보장됨(Case 4·5는 상태만 보고 선별). 별도 "진행 중" 플래그 없음 |

**1326에서 보장해야 할 사항**:

- `OrderHistory.data`에 **구조화된 실패 컨텍스트** 저장 (PG 응답 raw, 에러 코드, 시도 시점, 시도 주체 등). 현재 Slack 메시지 텍스트로만 떠도는 정보를 JSON으로 귀속
- 멱등 계약(WEBB-1325 §5.9.3): 동일 실패 상태에 머무는 동안 재시도가 또 실패해도 `OrderHistory` 재기록 **없음**. BACK-202가 timeline을 읽을 때 최초 실패 이력 1건 + (필요 시) 성공 전이 1건만 보이도록 간결하게 유지
- 수동 재환불 API와 스케줄러 Job의 동시 처리 방지: `SELECT FOR UPDATE SKIP LOCKED` 락 정책을 수동 재환불 API에도 동일 적용 (WEBB-1325 §5.9.4)
- 시스템은 "자동 재시도 한계 도달" 신호를 내지 않음. 운영자가 최초 실패 시각·실패 이유·데이터(`OrderHistory.data`)를 보고 종결·수동 재처리 여부를 판단

**1326이 제공하지 않는 것 (BACK-202 범위)**:

- 백오피스 화면·권한 관리·감사 로그(AuditLog)·수동 재환불 실행 API는 모두 BACK-202에서 구현
- "자동 재시도 중인 건은 수동 처리 막기" UI 표시도 BACK-202 화면 쪽 책임 (1326은 상태만 노출)

---

### 8. 주요 기술적 결정

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| 재구조화 단위 | **Case = Job 1:1** | 람다 이관 단위 최소화, 장애 격리, 단일 책임 |
| 진실원본 (SOT) | **Bootpay `getReceipt`** | 웹훅은 해피케이스 이벤트 힌트. 결제 상태 판정은 PG에 직접 조회. `Order.bootpayReceiptId`는 "V3 confirm 시작 마커"로 ASIS 유지 (Case 1/2 분기는 "confirm 시작 여부"로 성립) |
| Case 1·2·3 분기 근거 | **`Order.bootpayReceiptId` null 여부 + `getReceipt` PG 상태** | Case 1은 confirm 미시작, Case 2는 confirm 시작 후 미완료, Case 3은 PaymentRequest 고아·역매칭 |
| Case 4·5 분리 | **멱등성 키 규칙이 다름** | Case 4는 원본 키 재사용, Case 5는 `cancel_earlybird_retry_{failedHistoryId}` 신규 |
| Case 6·7 도메인 분리 | **멤버 테이블 구조·JOIN 차이 + 장애 격리** | 한 도메인 쿼리 장애가 다른 도메인에 전이되지 않음. 클럽(Case 12)은 범위 외 |
| Sweeper 처리 범위 | **상태 전이만, PG 호출 금지** | 재시도 루프 진입 게이트 역할로 한정. PG 환불은 Case 4가 수행 |
| Sweeper 대상 선별 | **멤버 종료 상태 필터** (`CANCEL`/`KICK`/`REJECT`) | APPROVE 유지 케이스(스태프·얼리버드) 오탐 구조적 차단 |
| Grace period | **10분** | 환불 루프 정상 실행 시간 보장. 짧으면 정상 Order 가로챌 위험 |
| 재시도 카운트·최대 재시도·백오프 필드 | **없음 (암묵적 백오프 = 스케줄러 주기)** | 명시적 `retryCount`·`lastRetryAt`·`maxRetries` 두지 않음. 실패 상태 Order는 매 주기 자동 재시도. 호출 간격은 주기가 만들고, 이중 환불·스팸 방지는 WEBB-1325 멱등 계약(§5.9.3)과 `getReceipt` 재조회(§5.3 불변식 5)가 담당 |
| 영구 실패 "좀비" 수용 | **시스템이 자동 종결하지 않음. BACK-202 운영자가 수동 판정** | "3회 실패 = 포기" 같은 자동 판정을 두면 정상 복구 가능한 일시 장애 건까지 끊길 위험. 장기 실패 식별은 §6 모니터링 "좀비 지표"로 노출하고 종결·수동 재처리는 운영자 책임 |
| Rate Limit 방어 | **`runInChunks` + Bootpay 글로벌 rate limiter 2중 방어** | Case 4·5가 매 주기 전체 실패 Order를 대상으로 잡아도, concurrency 5 + chunk delay 300ms(16.7req/s) 스로틀이 한도 내로 수렴시킴. 좀비 누적으로 건수가 늘어도 PG 부담 증가 없음 |
| 배치 상한 | **Case별 별도** (1·6·7: 500 / 3·4·5: 100 / 2·8·9·10·11: 50) | PG 호출 유무와 건당 소요 시간에 따라 차등. Case 12·13은 범위 외 |
| Case 8·9 의존 | **도메인 `OrderCancelV3Service`만 추가 의존 허용** | 멤버 상태 전이·환불은 전부 V3 사가에 위임. Job은 대상 조회 + 루프 호출만 |
| Case 10·11 필요성 | **`OrderRefundV3Service` 사가 Stage 3↔4 크래시 복구** | APPROVE 유지 환불 사가는 Case 6/7이 감지 못함. 멱등 키 + `getReceipt` 재조회로 이중 환불 없이 복구 (WEBB-1325 §5.9.2) |
| Case 10·11 주기 | **30분** | 희소 이벤트 + 정상 환불 루프 grace 확보. 너무 짧으면 정상 루프와 경합 |
| 클럽 관련 Case (12·13) | **범위 외 — WEBB-1325 클럽 V3 Executor 준비 후 후속 이슈** | 빌링키 기반이라 `SubscriptionRefundExecutor` 선행 필요. 본 이슈는 소셜링·챌린지만 |
| Case 5 대상 범위 | **소셜링 얼리버드 전담** | Order 상태 기반 선별이라 다른 도메인에 부분환불 경로 추가 시 자동 포함 (WEBB-1325 §Project Description 전제 참조) |
| 람다 이관 준비 | **`execute(now)` 핸들러 + Cron 외부화** | EventBridge 이행 시 코드 변경 최소 |
| Feature Flag 개별화 | **Case 단위** | 단계 롤아웃 + 장애 격리 |
| 레거시 EXPIRED 오분류 데이터 정정 | **본 이슈 범위 제외 — WEBB-1346으로 이관** | 롤아웃 이후 신규 발생은 Case 1~3이 원천 차단. 과거 고정 집합은 PG 금전적으로 이미 정합. 데이터 정정은 `OrderStatus` 모델 분리(WEBB-1346)와 묶어 **한 번의 스키마 전환**으로 수행 — 통계·정산·CS 파급을 1회로 집중 |

---

### 9. 후속 과제

- **클럽 스케줄러 V3 이관** — 본 이슈에서 제외한 Case 12(클럽 Sweeper) + Case 13(클럽 24h 미승인). WEBB-1325 클럽 V3 Executor(`SubscriptionRefundExecutor`) 준비 후 동일 패턴으로 추가. Case 12는 2단계 JOIN(`ClubMember ↔ ClubMembership ↔ Order`) 필요 — [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) 의 `ClubMember.orderId` 직접 연결 반영 시 Case 6/7과 쿼리 일관화
- [클럽 참여/취소 규칙 명세서](https://www.notion.so/348e2bc7639d801a82ded3c303309f97?pvs=21) **클럽 ONETIME/GRACE_PERIOD 취소 시 Order 미전이 해소** ([문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) ) — ASIS에서 `ClubMembership.status`가 SUBSCRIBED가 아니면 `cancelClubMembership()`이 Order를 `COMPLETED_PAYMENT`로 남겨둠. 규칙 문서는 이 경우에도 `COMPLETED_CANCEL_PAYMENT`로 전이하도록 TOBE 확정. 클럽 V3 이관 과제와 함께 처리 필요. 이 갭이 해소되기 전까지 본 이슈 Case 8(클럽 Sweeper)을 도입하면 정상 "취소 + 환불 없음" Order까지 오탐할 위험이 있어 클럽 이관 묶음의 선행 조건
- [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) **클럽 GRACE_PERIOD 자동 만료/재시도 스케줄러** — 갱신 실패 시 `GRACE_PERIOD`로 진입하지만 이후 자동 재결제 재시도/유예 만료 스케줄러 없음. `expireSubscription` 메서드는 TEMP 주석으로 비활성 상태. PM 확인 완료된 구현 필요 건 (운영상 유예 기간이 기능하지 않음). 클럽 V3 이관 뒤 고도화 단계
- **~~스태프 환불 루프 크래시 복구~~** — **본 이슈 Case 10으로 흡수됨** (소셜링). 클럽 스태프 환불은 클럽 V3 이관 과제에서 Case 10 패턴 확장으로 처리
- [문토 비즈니스 규칙 개선 목록](https://www.notion.so/349e2bc7639d8041bb1eeabf4d01f778?pvs=21) **정산 필터 정합성** () — 본 이슈로 `FAILED_CANCEL_PAYMENT`/`PARTIAL_REFUND_FAILED`가 실패 상태로 명확히 기록되기 시작하면, 정산 로직에서 이들을 제외하도록 필터를 교체해야 한다(Invariant SE6). 본 이슈 안정화 후 별도 정산 마이그레이션 과제로 진행
- **`OrderStatus` enum의 모델 분리 + 레거시 데이터 정정 — [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346)을 통해 해소 예정** — 본 이슈(1326) + WEBB-1325가 프로덕션에서 안정화된 뒤 WEBB-1346에서 ① `OrderStatus` 혼재 구조를 `Order.status`와 `Payment.status`로 분리, ② legacy enum 값(`NONE`·`REQUEST_CANCEL_PAYMENT`·`COMPLETE_PAYMENT`) 제거, ③ **레거시 `EXPIRED` 오분류(`Order=EXPIRED` + PG 환불 완료) 데이터 정정**을 한 번의 스키마 전환으로 함께 진행한다. 1326에서 별도 마이그레이션을 수행하지 않는 이유는 §Project Description "레거시 데이터 cutoff 원칙" 참조
- [**BACK-202](https://munto.atlassian.net/browse/BACK-202) 백오피스 결제 취소·환불 관리 페이지** — 본 이슈가 구조화한 실패 로그(`OrderHistory`)를 조회·CS 수동 재환불 UI로 노출. 본 이슈는 §7.1의 인터페이스 규약만 제공, 화면·권한·AuditLog·수동 환불 API는 BACK-202 범위. 장기 실패("좀비") Order의 수동 종결·재처리 UI도 이 이슈로 통합 (본 이슈는 자동 판정을 두지 않고 운영자 수동 판정에 위임)
- **람다 이관 실행** — 본 작업으로 준비된 구조를 EventBridge + Lambda로 이관 (인프라 과제로 별도)

---

### 10. 관련 이슈 및 문서

- [WEBB-1326](https://munto.atlassian.net/browse/WEBB-1326) — 본 이슈
- [WEBB-1325](https://munto.atlassian.net/browse/WEBB-1325) — V3 취소/환불 공통 서비스. `PaymentRefundExecutor` 공급자
- [WEBB-1321](https://munto.atlassian.net/browse/WEBB-1321) — 소셜링·챌린지·주문 규칙 문서화
- [WEBB-1272](https://munto.atlassian.net/browse/WEBB-1272) — PG API Rate Limit (`runInChunks`·`isRetryableError` 재사용)
- [WEBB-1268](https://munto.atlassian.net/browse/WEBB-1268) — 스태프 소셜링 환불 실패 (Case 4로 자동 복구)
- [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346) — `OrderStatus` enum을 주문 상태와 결제 상태로 분리 + legacy enum 값 제거 (본 이슈 안정화 후 해소 예정, §9 참조)
- [BACK-202](https://munto.atlassian.net/browse/BACK-202) — 백오피스 결제 취소·환불 관리 페이지. 본 이슈가 구조화한 `OrderHistory` 실패 로그를 소비 (§7.1 참조)

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.22 | 김범진 | 최초 작성 |
| v1.0.1 | 26.04.24 | 김범진 | case 1 레이스 컨디션 방지 |

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