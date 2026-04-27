# 소셜링·챌린지 취소/환불 로직 V3 공통화 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 22일 오전 10:51
최근 수정일: 2026년 4월 22일 오후 2:44
담당자: 김범진
문서 상태: Active
생성 일시: 2026년 4월 22일 오전 10:51
최종 편집자: 김범진
관련 이슈: https://munto.atlassian.net/browse/WEBB-1325

참조 규칙 문서 (WEBB-1321 산출물):

- [소셜링 참여/취소 규칙 명세서](https://www.notion.so/348e2bc7639d80aca1d6c2360653cb42?pvs=21)
- [챌린지 참여/취소 규칙 명세서](https://www.notion.so/348e2bc7639d8059ae21c196e89af124?pvs=21)
- [주문/결제 공통 규칙 명세서](https://www.notion.so/348e2bc7639d80b9b9efcec0a73ffc69?pvs=21)
- [소셜링 결제/환불 규칙 명세서](https://www.notion.so/348e2bc7639d8076854ac458d47f8fd3?pvs=21)
- [챌린지 결제/환불 규칙 명세서](https://www.notion.so/348e2bc7639d807ebd9cf3e13a29258f?pvs=21)

---

## Project Description

소셜링·챌린지의 취소/환불 로직이 각 도메인 서비스에 산재되어 **"참여는 취소됐는데 결제는 안 된" 유형의 정합성 장애**가 반복 발생하고 있다. WEBB-1307에서 단일 분기에 걸친 문제 8건을 개별 수정했지만 동일 패턴은 다른 진입점에도 남아 있다.

본 작업은 WEBB-1321에서 정식 문서화된 주문 상태 머신과 환불 정책 규칙을, **모든 도메인 트리거가 공통으로 수렴하는 V3 취소/환불 서비스**로 구현해 이 정합성 장애를 구조적으로 제거한다. 이후의 스케줄러 기반 실패 복구·재시도는 WEBB-1326에서 분담한다.

### 이번 범위

1. **소셜링 취소/환불** — 본인·호스트·스케줄러 주도 취소 전부 (단건 결제·무료)
2. **챌린지 취소/환불** — 본인·호스트·스케줄러 주도 취소 전부 (단건 결제·무료)
3. **소셜링 스태프 환불** — `Socialing.status = COMPLETE` 전이 시 STAFF 멤버 전액 환불 (멤버는 APPROVE 유지)
4. **소셜링 얼리버드 부분환불** — 소셜링 완료 후 할인금만큼 부분환불 (기존 `EarlyBirdRefundService`를 V3로 흡수)

즉 규칙 문서(order-common, order-socialing, order-challenge)에 명시된 **모든 취소/환불 흐름이 V3로 수렴**한다.

### 범위 외

- **클럽** — 빌링키 기반 정기결제 구조로 결제-Order 관계와 "취소" 의미가 다름. 같은 인터페이스 패턴을 재사용하여 후속 과제화

---

## Business and Marketing Justification

- **실측 데이터 오염 규모**: 소셜링 V4의 "멤버 상태 변경 → `cancelOrder`" 순서 버그로 **REQUEST 멤버가 `APPROVED_NON_REFUNDABLE`로 기록된 건이 prod에 450건** 누적됐다. 실제 환불은 집행되었으나 DB 상태가 실상과 불일치하여 감사·CS 응대·집계 쿼리의 신뢰성이 훼손된 상태
- **정합성 장애 유형**: 챌린지 `afterDeleteChallenge`처럼 멤버 상태를 먼저 `DELETE`로 바꾼 뒤 취소 대상을 조회해 0건이 나와 PG 환불이 실행되지 않은 사례 등 **구조적으로 금전 손실로 이어지는 경로가 이미 코드에 존재한다**. WEBB-1307에서 8건을 개별 수정했으나 같은 패턴이 다른 진입점에 남아 있음
- **스태프 환불 CS**: WEBB-1268 "스태프 소셜링 환불 실패" — COMPLETE 전이 배치와 취소 경로가 혼재되어 스태프 환불 누락·실패 케이스가 반복 접수됨
- **규칙 문서와 구현의 일치**: WEBB-1321로 상태 머신·환불 정책이 공식 문서화된 만큼, 구현을 규칙에 정렬시키지 않으면 규칙 문서의 실효성이 떨어지고 개발자가 코드와 문서 양쪽을 의심하게 됨
- **구조적 필연성**: WEBB-1307에서 한 번에 8건이 발견된 것은 우연이 아니라 **공통 구조 부재에서 비롯된 누적형 결함**이다. 지금 재설계하지 않으면 유사한 긴급 개별 수정이 반복된다
- **기대효과 (정량)**: 본 작업 이후 **이 유형의 추가 오분류·환불 누락을 0건으로 수렴**시킨다. 기존 450건 오분류는 별도 데이터 마이그레이션 과제로 정리하며(§11 후속), 신규 450건과 같은 사고가 다시 생기지 않도록 구조적으로 차단하는 것이 본 이슈의 목표 지표

---

## Risk Assessment

| 리스크 | 수준 | 대응 방안 |
| --- | --- | --- |
| V3 재작성 범위가 소셜링·챌린지 2개 도메인과 취소·스태프 환불·얼리버드 부분환불 3개 흐름에 걸쳐 있어 일정 초과 가능 | 중 | §6.4 4개 flag(소셜링 cancel, 챌린지 cancel, 소셜링 스태프 refund, 소셜링 얼리버드 refund)로 단계 전환. 문제 발생 단위만 V2 경로로 임시 롤백 |
| AI 어시스트 개발의 규칙 오해·누락으로 정책 오적용 | 중 | 규칙 문서의 환불 정책 표를 케이스 테스트로 1:1 변환 (작성자 검토 필수). 구현보다 테스트 규칙 합의에 비중 |
| 얼리버드 기존 로직을 V3로 흡수하다 기존 성공 경로 회귀 | 높음 | 기존 `EarlyBirdRefundService` 코드를 **삭제하지 않고 래퍼로 대체** (`OrderRefundV3` 호출). `cancel_earlybird_*` 네임스페이스 유지로 PG 레벨 멱등성 보존. 스테이징에서 재시도·부분환불 성공/실패 모두 검증 후 프로덕션 |
| V3 전환 직후 V2·V3 코드 공존 기간 동안 두 경로가 동시에 유지됨 | 중 | 모든 취소/환불은 V3 서비스로 단일 수렴(§6.2). V2 Order 잔존분도 V3가 스키마 호환 범위에서 처리. Feature flag(§6.4)는 V3 오케스트레이션 진입점에서만 분기하는 롤백 스위치로만 사용. 안정화 2주 후 V2 코드 제거(§6.5) |
| PG 환불 성공 후 DB 업데이트 실패 시 금전/상태 불일치 | 높음 | `cancel_id = "cancel_{orderId}"` 결정적 포맷으로 멱등성 보장. PG 성공+DB 실패 시 Slack 알림 + 수동 조치 (order-common 3장 원칙 준수) |
| PG 호출 중 타임아웃·네트워크 에러로 응답 불명 → DB에 `FAILED_CANCEL_PAYMENT`로 기록됐으나 실제로는 환불된 상태 | 높음 | `executeRefund`가 응답 불명 시 `getReceipt` 재조회로 실제 상태 판정 (§5.3 불변식 5). 이중 환불·이중 실패 기록 방지. 멱등성 키가 결정적 포맷이므로 재조회 없이 Case 4 재시도해도 PG가 기존 결과 반환해 안전, 단 로컬 DB 상태를 즉시 정확히 기록하기 위해 재조회 선호 |
| `OrderRefundV3Service` Stage 3↔4 사이 크래시 → 멤버 `APPROVE` 유지 + Order `COMPLETED_PAYMENT` + PG 환불 완료 (스태프·얼리버드) | 높음 | Case 6/7 Sweeper는 멤버 종료 상태 필터라 감지 불가. **WEBB-1326 Case 12(스태프 복구) / Case 13(얼리버드 복구)** 이 `Socialing.COMPLETE` + 30분 grace + 조합 감지로 `refund` 재호출. Executor 멱등 키 재사용으로 이중 환불 방지 (§5.9.2). 본 이슈 스코프에서 Stage 4를 최소 지연으로 유지 + Stage 3 완료 직후 OrderHistory 선기록 (가능한 경우) |
| PG 환불 실패 시 상태가 "취소됐으나 환불 실패"로 남음 | 중 | 규칙 문서대로 `FAILED_CANCEL_PAYMENT` 전이 + `OrderHistory` 기록 + 스케줄러 재시도 (order-common 4-2). 멤버는 이미 CANCEL 확정이므로 추가 도메인 후처리 없음 |
| 도메인별 환불 정책 차이 | 낮음 | `RefundPolicy` 전략 주입. 소셜링/챌린지 각각 규칙 문서의 정책 표를 그대로 구현 |
| 스태프 환불이 취소 플로우로 잘못 구현되어 멤버가 CANCEL 처리됨 | 높음 | 취소/환불 오케스트레이터 분리 (`OrderCancelV3Service` vs `OrderRefundV3Service`). `OrderRefundV3Service`는 멤버 상태 변경을 **할 수 없음** (인터페이스 레벨 강제) |
| 도메인 고유 규칙(availCount 복구, ChallengeRank 삭제 등)이 공통화 과정에서 누락 | 중 | `MemberCancellationHandler`에 `onAfterCancel` 훅을 두고 availCount·Sendbird·Rank 등 도메인 후처리를 주입 |
| 규칙 문서와 코드 구현 간 규칙 해석 차이 | 중 | 구현 PR마다 참조하는 규칙 문서 섹션 번호 명시. 정책 테스트는 규칙 문서의 표를 그대로 케이스화 |
| 본 구조가 클럽(빌링키)과 얼리버드에 그대로 적용 불가 | 낮음 | `PaymentRefundExecutor`를 단건 결제 전제로 분리. 클럽은 `SubscriptionRefundExecutor`, 얼리버드는 후속 흡수로 확장 |

---

## Resource and Scheduling Details

- **필요 인력**: Backend 1명 (AI 지원 개발)
- **예상 일정**: 2026-04-22 ~ 2026-05-19 (구현 4주) + 2026-05-19 ~ 2026-06-02 (프로덕션 안정화 2주). 총 6주
- **일정 산정 전제**: AI 어시스트 기반으로 인터페이스·정책·테스트 코드를 규칙 문서에서 기계적으로 생성. 설계자는 규칙 해석·경계 검증·멱등성 가드·크래시 시나리오 설계에 집중. 범위 확대분(§5.9 사가 원자성·멱등성, §6.4 feature flag 4종, §6.7 이관 맵, `getReceipt` 재조회, 컨트롤러·어드민 진입점 전환, CHOICE→COMMON 전환 흡수, 멱등성·크래시 테스트)을 반영하여 초기 3주에서 4주 구현 + 2주 안정화로 재산정

### 마일스톤

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| **1주차** | 공통 인터페이스(`MemberCancellationHandler`·`RefundParamsLoader`·`RefundPolicy`·`PaymentRefundExecutor`) / 조립자(`OrderCancelV3Service`·`OrderRefundV3Service`) + 재진입 멱등 가드 + 동시성 가드(§5.9.3·§5.9.4) / `BootpayRefundExecutor` 구현(`getReceipt` 재조회 분기 포함, §5.3 불변식 5) / 소셜링 cancel 구현(`SocialingMemberCancellationHandler` + `SocialingCancelRefundPolicy`) | 공통 프레임워크, 소셜링 cancel 코드 |
| **2주차** | 챌린지 cancel 구현(`ChallengeMemberCancellationHandler` + `ChallengeCancelRefundPolicy`) + CHOICE→COMMON 전환 경로 흡수(improvements §7·§8 해소) / 소셜링 refund 구현(`SocialingStaffRefundPolicy`·`SocialingEarlyBirdRefundPolicy`) + 기존 `EarlyBirdRefundService` 내부를 V3 호출 래퍼로 전환 | 챌린지 cancel 코드, 소셜링 refund 코드 |
| **3주차** | 진입점 전환 (각 도메인 컨트롤러 / `socialingUpdateJob` CONFIRM_PLAYING·CLOSE_BY_SYSTEM·COMPLETE 스태프 환불·얼리버드 부분환불·24h 미승인 / `challenge.schedule-job` 마감 전이·24h 미승인 / 어드민 재시도 API 2개 내부) / Feature flag 4종 도입 + 도메인·트리거별 `if (flag) V3 else V2` 분기 배치 + V2 경로 fallback 유지 확인 | 진입점 전환, flag 인프라, V2/V3 이중 경로 |
| **4주차** | Policy 규칙 테스트(규칙 문서 표 → 케이스 1:1) / 재진입 멱등성 테스트 / 크래시 시나리오 테스트(§5.9.1·§5.9.2 크래시 지점 × 복구 경로) / 모니터링 대시보드·Slack 알림 정비 / 스테이징 종합 검증 / 프로덕션 배포 + 첫 flag(`FEATURE_ORDER_CANCEL_V3_SOCIALING`) ON | 테스트 스위트, 모니터링, 첫 flag 활성화 배포 |
| **5~6주차** (안정화) | 나머지 flag 순차 활성화 — 챌린지 cancel → 소셜링 스태프 refund → 소셜링 얼리버드 refund (§6.4 권장 순서) / 실측 모니터링 + 이상 시 해당 flag 단위 롤백 / 각 flag 안정 기간 경과 후 별도 PR로 V2 코드 일괄 제거(§6.5) — `OrderCommonService.refundOrder`·V2 도메인 서비스 cancel/refund 호출부·`EarlyBirdRefundService` V2 직접 호출 로직 | V3 전체 활성화, V2 코드 제거 |

**롤아웃 단위**: 4개 feature flag(소셜링 cancel / 챌린지 cancel / 소셜링 스태프 refund / 소셜링 얼리버드 refund)를 §6.4 권장 순서대로 단계 전환 — 장애 시 해당 단위만 V2 경로로 즉시 롤백.

---

## Technical Description

### 1. 용어 정의

본 이슈에서 반복되는 용어를 아래 정의로 고정한다. 문서 전반과 WEBB-1326에서 동일 의미로 사용한다.

### 1.1 참여 도메인 레이어

- **취소 (Cancellation)** — 멤버가 종료 상태(`CANCEL`/`KICK`/`REJECT`)로 전이되는 흐름. 유료 Order라면 PG 환불이 동반되지만, 핵심은 **멤버 상태 전이**. 본 이슈의 오케스트레이터는 `OrderCancelV3Service` (§5.6).
- **환불 (Refund)** — 멤버 상태가 `APPROVE`로 유지되고 **PG 금액만 돌려주는 흐름**. 참여는 계속됨. 본 이슈 범위에서는 **소셜링만 해당** (스태프 환불 + 얼리버드 부분환불). 오케스트레이터는 `OrderRefundV3Service` (§5.7).
- **부분환불 (Partial Refund)** — 환불의 하위 유형. `Order.orderPrice`의 일부(얼리버드 할인액)만 돌려줌. Order는 `PARTIAL_REFUNDED`로 전이. 본 이슈에서는 **소셜링 얼리버드만 해당**.

### 1.2 결제 도메인 레이어

- **PG 환불 (PG cancelReceipt)** — Bootpay `cancelReceipt` API 호출로 실제 돈을 되돌리는 행위. **취소/환불 두 상위 개념의 하위 단계**로, 둘 다 이 호출을 사용한다. 실행자: `PaymentRefundExecutor.executeRefund` (§5.3).
- **멱등 키 (cancel_id)** — PG 호출 시 이중 환불 방지를 위한 결정적 식별자. 취소는 `cancel_{orderId}`, 스태프 환불은 `refund_staff_{orderId}`, 얼리버드는 `cancel_earlybird_{orderId}` (재시도는 `cancel_earlybird_retry_{failedHistoryId}`).

### 1.3 Order 상태 레이어

- `*COMPLETED_CANCEL_PAYMENT`* — 이름은 "취소 결제 완료"지만 정확히는 **Order가 종료 상태로 전이 완료**를 의미한다. 환불 있는 취소(유료)·환불 없는 취소(무료·환불 불가)·스태프 환불·잔액 환불까지 모두 이 상태로 수렴. 즉 "취소"와 "환불"이 이 enum 이름에 함께 담겨 있어 다른 용어들과 범주가 다르다. 이는 **Order 레이어와 Payment 레이어가 한 enum에 섞여 있는 레거시 네이밍 부채**이며, 본 이슈와 WEBB-1326 안정화 이후 [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346)을 통해 `Order.status`와 `Payment.status` 분리로 해소할 예정이다.
- `*FAILED_CANCEL_PAYMENT`* — 전액 환불(취소·스태프 환불) PG 호출 실패 상태. 재시도 대기. WEBB-1326 Case 4가 처리.
- `*PARTIAL_REFUND_FAILED**` — 부분환불 PG 호출 실패 상태. WEBB-1326 Case 5가 처리.

### 1.4 본 이슈 범위 — 개념 × 트리거 대응

| 트리거 | 상위 개념 | 오케스트레이터 | 멤버 상태 | PG 레이어 호출 |
| --- | --- | --- | --- | --- |
| 본인 취소 / 호스트 거절·킥 / 호스트 폐강 / CLOSE_BY_SYSTEM / CONFIRM_PLAYING 전이 REQUEST 취소 / 24h 미승인 (SYSTEM) / CHOICE→COMMON 전환 REQUEST 취소 | **취소** | `OrderCancelV3Service` | 종료 전이 | `PaymentRefundExecutor.executeRefund` (유료 시) |
| 소셜링 COMPLETE 시 스태프 환불 | **환불** | `OrderRefundV3Service` | APPROVE 유지 | `PaymentRefundExecutor.executeRefund` |
| 소셜링 COMPLETE 시 얼리버드 부분환불 | **부분환불** | `OrderRefundV3Service` | APPROVE 유지 | `PaymentRefundExecutor.executeRefund` (`scope=PARTIAL`) |

### 1.5 표기 규칙

- 본문에서 **"취소"**는 위 §1.1 정의의 취소(멤버 상태 전이 있음) 의미로 사용. 일반 구어체의 "결제 취소"가 아님.
- 본문에서 **"환불"**은 §1.1의 환불(멤버 상태 유지) 의미로 사용. PG 호출 자체를 지칭할 때는 **"PG 환불"**로 명시.
- **"취소/환불"** — 취소와 환불 두 흐름을 모두 포함하는 맥락에서 사용.
- 클래스·enum·타입 이름에 포함된 `Cancel`·`Refund`·`CANCEL`은 컨텍스트에 따라 다르게 해석:
    - `OrderCancelV3Service`의 `Cancel` = §1.1 취소
    - `OrderRefundV3Service`의 `Refund` = §1.1 환불
    - `PaymentRefundExecutor`의 `Refund` = §1.2 PG 환불 (상·하위 개념 구분 없이 PG 호출 자체)
    - `RefundPolicy`·`RefundScope`·`RefundDecision`·`RefundResult`의 `Refund` = §1.2 PG 환불 (취소/환불 두 흐름이 공유하는 PG 금액 결정·스코프·결과 타입군. 이름만 보면 §1.1 환불 전용처럼 보이지만 `decideForCancel`·`decideForRefund` 두 메서드가 같은 정책 인터페이스에 공존)
    - `CancelParams`·`CancelDecision`·`MemberCancellationHandler`·`CancelActor`의 `Cancel` = §1.1 취소 흐름에서 사용하는 파라미터·결정·핸들러·액터 타입군. 단 `CancelActor`(USER/HOST/ADMIN/SYSTEM)는 환불 흐름(`RefundParams`)에서도 재사용
    - `COMPLETED_CANCEL_PAYMENT` / `Order.cancelledPrice` 등 Order 상태·필드의 `CANCEL` = §1.3 Order 종료 상태를 의미하며, 환불 없는 무료 취소도 포함

---

### 2. 취소/환불 트리거 전수 맵

규칙 문서 기준 모든 트리거를 V3 어느 서비스가 처리하는지 명시. 모든 행은 해당 도메인의 `MemberCancellationHandler.loadParams()` 또는 `RefundParamsLoader.load()`로 진입한다.

### 2.1 소셜링

| 트리거 | 근거 문서 | actor | 호출 서비스 | 환불 정책 | 멤버 상태 전이 |
| --- | --- | --- | --- | --- | --- |
| 본인 취소 | socialing 6-1, order-socialing 3-1 | USER | `OrderCancelV3` | **본인 취소 환불 공식** (당일/30분/REQUEST/APPROVE+4일 규칙, §2.3) | → CANCEL |
| 호스트 거절 (REQUEST→REJECT) | socialing 5-2 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | → REJECT |
| 킥 (APPROVE→KICK) | socialing 5-4 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | → KICK |
| 호스트 폐강 (CLOSE) | socialing 6-2 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | REQUEST/APPROVE → CANCEL |
| CONFIRM_PLAYING 전이 시 REQUEST 일괄 취소 | socialing 8-1 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | REQUEST → CANCEL |
| CLOSE_BY_SYSTEM (인원 미달 자동 폐강) | socialing 8-2 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | REQUEST/APPROVE → CANCEL |
| 24h 미승인 자동 취소 | socialing 8-4 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | REQUEST → CANCEL |
| **COMPLETE 전이 시 스태프 환불** | socialing 8-3, order-socialing 3-3 | SYSTEM | `OrderRefundV3` | 유료: 전액 (cancelReason = `SYSTEM_REFUND_BY_STAFF`) · 무료: 환불 없음 | **변경 없음 (APPROVE 유지)** |
| **얼리버드 부분환불 (소셜링 완료 후 자동)** | order-socialing 3-2 | SYSTEM | `OrderRefundV3` | 할인액만 부분환불 → `PARTIAL_REFUNDED` | **변경 없음** |

### 2.2 챌린지

| 트리거 | 근거 문서 | actor | 호출 서비스 | 환불 정책 | 멤버 상태 전이 |
| --- | --- | --- | --- | --- | --- |
| 본인 취소 (RECRUITING 한정) | challenge 6, order-challenge 3-1 | USER | `OrderCancelV3` | **본인 취소 환불 공식** (소셜링과 동일, §2.3) | REQUEST/APPROVE → CANCEL |
| 호스트 거절 (REQUEST→REJECT) | challenge 5-2 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | → REJECT |
| 호스트 강퇴 (APPROVE→REJECT) | challenge 5-2 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 | → REJECT |
| 호스트 폐강 (CLOSE) | challenge 5-3, order-challenge 3-4 | HOST | `OrderCancelV3` | 유료: 전액 · 무료: 없음 (호스트 귀책, OrderClaim=COMPLETED_CANCEL_HOST) | REQUEST/APPROVE → CANCEL |
| CONFIRM_PLAYING 전이 시 REQUEST 자동 취소 | challenge 7-2 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 (시스템 귀책) | REQUEST → CANCEL |
| CLOSE_BY_SYSTEM (인원 미달) | challenge 7-2 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 (시스템 귀책) | REQUEST/APPROVE → CANCEL |
| 24h 미승인 자동 취소 | challenge 7-1 | SYSTEM | `OrderCancelV3` | 유료: 전액 · 무료: 없음 (시스템 귀책) | REQUEST → CANCEL |

### 2.3 본인 취소 환불 금액 결정 공식 (소셜링·챌린지 공통)

규칙 문서 근거: `order-socialing.md` 3-1, `order-challenge.md` 3-1 (두 도메인 동일 공식)

```
IF 무료 (price = 0)                              → 환불 없음
IF Challenge.status != RECRUITING (챌린지 한정)    → 환불 없음 (본인 취소 불가 구간)
IF 모임 진행 당일 (startDate와 같은 날)           → 환불 없음 (최우선)
IF 결제 후 30분 이내                              → 전액 환불
IF 원본 member.status = REQUEST                   → 전액 환불
IF 원본 member.status = APPROVE:
   IF 진행일까지 4일 이상 남음                    → 전액 환불
   그 외 (3일 이하)                              → 환불 없음
```

**우선순위**: "당일" 규칙이 "30분 이내"보다 우선. 당일에 결제하고 즉시 취소해도 환불되지 않는다.

**호스트/스케줄러 주도 취소는 위 공식을 우회하여 유료라면 항상 전액 환불** (무료 제외). 호스트 폐강 시 챌린지도 전액 환불이며, `OrderClaim = COMPLETED_CANCEL_HOST`로 귀책만 기록.

---

### 3. 주문 취소/환불 현황과 구조적 문제

### 3.1 진입점 맵

| 도메인 | 진입점 | 파일:라인 | 문제 |
| --- | --- | --- | --- |
| 소셜링 V4 | `socialing-member.command.service.cancelOrder` | `apps/api/src/socialing/v4/socialing-member.command.service.ts:70` | 멤버 상태 변경 → cancelOrder 순서 역전 |
| 소셜링 V4 | `socialing-member.command.service.kick` | `.../socialing-member.command.service.ts:324` | 동일 순서 버그 |
| 챌린지 V2 | `challenge.service.cancelChallengeMember` | `apps/api/src/challenge/challenge.service.ts:1196` | Order 취소 → 별도 Tx 멤버 변경 (트랜잭션 분리) |
| 챌린지 V2 | `challenge.service.updateMemberStatusByOwner` | `.../challenge.service.ts:786` | 호스트 거절 시 동일 분리 |
| 챌린지 V2 | `challenge.service.afterDeleteChallenge` | `.../challenge.service.ts:1169` | `deleteChallengeMembersStatus` 이중 호출, 멤버 DELETE 선행으로 취소 대상 0건 |
| 소셜링 스태프 환불 | `socialingUpdateJob.afterCompleteSocialing` | `apps/scheduler/src/scheduleJob/socialingUpdateJob.service.ts` | 취소 경로와 분리되어 있으나 `OrderCommonService.refundOrder` 직호출, 실패 기록/재시도 일관성 부족 |

### 3.2 공통 구조 문제

| 문제 | 소셜링 취소 | 챌린지 취소 | 스태프 환불 |
| --- | --- | --- | --- |
| 멤버 상태 변경이 cancelOrder보다 먼저 실행되어 정책 결정이 변경 후 상태 기준 | ✓ | ✓ | N/A |
| PG 호출과 DB 전이가 분리되어 `FAILED_CANCEL_PAYMENT` 표준 미준수 | ✓ | ✓ | ✓ |
| PG 환불 실패 시 후속 처리 누락 (Slack/재시도 없이 삼킴) | ✓ | ✓ | ✓ |
| 이중 호출 방어 체계 부재 |  | ✓ | ✓ |
| `remainPrice` 기준 환불 금액 산정 미흡 (얼리버드 선행 시 오류) | ✓ | - | - |

---

### 4. V3 주문 서비스 현황 및 갭

- `OrderBaseV3Service`는 주문 생성/확정과 `cancelPendingOrder`(WAITING_PAYMENT만)만 제공
- 도메인별 V3 서비스에 **취소/환불 로직이 전혀 없음**
- 현재 V3 Order로 생성된 주문도 취소 시점에는 V2 경로(`OrderCommonService.refundOrder`)로 내려감
- V3의 "Tx 외부 API 호출 + 콜백으로 DB 변경" 패턴이 취소 흐름에 그대로 적용 가능

---

### 5. 설계: V3 공통 서비스

### 5.1 아키텍처 대안 비교

V2의 본질적 문제는 **참여 도메인 규칙과 결제 도메인 규칙이 한 서비스에 강하게 결합**되어 있다는 점이다. 같은 결합 구조를 V3로 옮기면 이름만 바뀐 회귀가 반복될 수 있으므로, 세 가지 대안을 비교한다.

| 대안 | 구조 요약 | 장점 | 단점 |
| --- | --- | --- | --- |
| **A안. 완전 분리** | 참여 도메인이 결제 도메인의 `PaymentRefundExecutor` 기본 연산만 호출해 스스로 saga 수행 | 도메인 경계 물리 분리 · 의존성 방향 정상 | saga 오케스트레이션이 도메인마다 중복 · 초기 비용 최대 |
| **B안. 단일 오케스트레이터** | `OrderCancelV3Service`가 멤버 상태, 환불 정책, PG 환불, Order 전이를 한 서비스에서 주관 | 구현 단순 · 전체 흐름 단일 파일 | V2 결합 구조의 V3 재현 · 도메인 규칙 추가 시 비대화 |
| **C안. 인터페이스 분리 (채택)** | 얇은 조립자(2종: `OrderCancelV3Service`, `OrderRefundV3Service`) + 공통 인터페이스 3종에 위임. 도메인별 구현체 배치 | B의 단순성 + A의 경계 · 향후 A안 이행이 리팩토링 규모 · 클럽/얼리버드 확장 시 `PaymentRefundExecutor`만 교체 | 인터페이스 보일러플레이트 · 경계 이탈 방지에 리뷰 규율 필요 |

**채택: C안**

- 조립자를 **두 개로 분리** (`OrderCancelV3Service` = 취소+환불 / `OrderRefundV3Service` = 환불만)하여 스태프 환불이 취소 플로우로 잘못 구현될 여지를 컴파일 레벨에서 차단
- 인터페이스 경계 물리 분리 + 코드 리뷰 체크리스트에 "`PaymentRefundExecutor` ↔ 도메인 핸들러 우회 참조 금지" 추가

### 5.2 두 개의 오케스트레이터 — 멤버 상태 전이 유무로 분리

V3 취소/환불 흐름은 **멤버 상태 전이가 있는지**를 기준으로 두 조립자로 나뉜다.

- **§5.6 `OrderCancelV3Service`** — 멤버 상태 전이가 **있는** 취소 (유저·호스트·스케줄러 주도 취소)
- **§5.7 `OrderRefundV3Service`** — 멤버 상태 전이가 **없는** 환불 (스태프 환불, 얼리버드 부분환불)

멤버 상태를 바꾸지 않는 환불 경로가 실수로 멤버를 CANCEL 처리하지 못하도록, `OrderRefundV3Service`의 의존성에는 **멤버 상태 변경 메서드 자체가 없음** (컴파일 레벨 차단).

```
── 취소 조립자 (멤버 상태 전이 있음) ─────────
OrderCancelV3Service<TMember>
  ├─ 의존: MemberCancellationHandler<TMember>   ← applyMemberStatusChange 포함
  ├─ 의존: RefundPolicy<TMember>
  └─ 의존: PaymentRefundExecutor

── 환불 조립자 (멤버 상태 전이 없음) ─────────
OrderRefundV3Service<TMember>
  ├─ 의존: RefundParamsLoader<TMember>          ← 파라미터만 로드, 상태 변경 메서드 없음
  ├─ 의존: RefundPolicy<TMember>
  └─ 의존: PaymentRefundExecutor

── 도메인 핸들러 (참여 도메인) ────────────────
MemberCancellationHandler<TMember>
  ├─ SocialingMemberCancellationHandler
  └─ ChallengeMemberCancellationHandler

RefundPolicy<TMember>
  ├─ SocialingCancelRefundPolicy      (일반 취소)
  ├─ SocialingStaffRefundPolicy       (COMPLETE 시 스태프 전액)
  ├─ SocialingEarlyBirdRefundPolicy   (소셜링 완료 후 할인액 부분환불)
  └─ ChallengeCancelRefundPolicy      (본인 취소 공식 + 호스트/시스템 전액 분기)

── 결제 프리미티브 (도메인 무관, 단건 결제) ────
PaymentRefundExecutor
  └─ BootpayRefundExecutor
        (executeRefund / finalizeOrder)
```

**클럽 확장 시**: `SubscriptionRefundExecutor`를 `PaymentRefundExecutor` 대체 구현체로 추가. 조립자는 동일.

### 5.3 공통 인터페이스

```tsx
// ── 공통 타입 ─────────────────────────────────────
export enum CancelActor { USER, HOST, ADMIN, SYSTEM }

export interface CancelParams<TMember> {
  member: TMember;
  order: Order;            // bootpayReceiptId, remainPrice, orderKind 포함
  domain: DomainSnapshot;  // Socialing.status / Challenge.status 등 정책 결정에 필요한 값
  actor: CancelActor;
  reason: string;
}

export interface RefundParams<TMember> {
  member: TMember;
  order: Order;
  domain: DomainSnapshot;
  actor: CancelActor;
  reason: string;
}

export type RefundScope = 'FULL' | 'PARTIAL';  // FULL: 잔액 전액 / PARTIAL: 일부만 (얼리버드)

export interface CancelDecision {
  cancelStatus: MemberCancelStatus;   // 도메인별 (CANCEL/KICK/REJECT)
  refundAmount: number;               // 0 → PG 호출 스킵, Order 바로 COMPLETED_CANCEL
  refundScope: RefundScope;           // 취소는 기본 FULL
  refundReason: string;               // OrderHistory.memo에 기록
  cancelIdPrefix: string;             // 기본 "cancel_" — 얼리버드는 "cancel_earlybird_" 등
}

export interface RefundDecision {
  refundAmount: number;
  refundScope: RefundScope;           // 스태프=FULL, 얼리버드=PARTIAL
  refundReason: string;
  cancelIdPrefix: string;
}

export interface RefundResult {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  scope: RefundScope;                 // FULL or PARTIAL — finalizeOrder의 상태 전이 결정에 사용
  errorCode?: string;
  pgResponse?: unknown;               // OrderHistory.data에 저장
}

// ── 1) 참여 도메인: 멤버 상태 전이 + 도메인 후처리 ──
export interface MemberCancellationHandler<TMember> {
  loadParams(memberId: number, actor: CancelActor, reason: string): Promise<CancelParams<TMember>>;

  // Tx1: 멤버 상태 변경 + 도메인 후처리 (availCount, ChallengeRank, Sendbird 퇴장 등)
  applyMemberStatusChange(params: CancelParams<TMember>, decision: CancelDecision, tx: Prisma.TransactionClient): Promise<void>;

  // Tx2 완료 후 비트랜잭션 후처리 (Push, 이메일, 외부 시스템 동기화)
  onAfterCancel(params: CancelParams<TMember>, decision: CancelDecision, outcome: RefundResult): Promise<void>;
}

// ── 2) 참여 도메인: 환불 전용 파라미터 로더 (멤버 상태 변경 메서드 없음) ──
export interface RefundParamsLoader<TMember> {
  load(memberId: number, actor: CancelActor, reason: string): Promise<RefundParams<TMember>>;
}

// ── 3) 참여 도메인: PG 환불 금액 결정 정책 (취소/환불 두 흐름 공용) ──
// 이름에 "Refund"가 들어가지만 §1.1 "환불" 전용이 아니라 §1.2 "PG 환불"
// 금액을 계산하는 정책이다. decideForCancel은 §1.1 취소 흐름(§5.6)에서,
// decideForRefund는 §1.1 환불 흐름(§5.7)에서 호출한다.
export interface RefundPolicy<TMember> {
  decideForCancel?(params: CancelParams<TMember>): CancelDecision;
  decideForRefund?(params: RefundParams<TMember>): RefundDecision;
}

// ── 4) 결제 도메인: PG·Order 기본 연산 (단건 결제) ──
export interface PaymentRefundExecutor {
  // 유료 CARD: Bootpay cancelReceipt 실행 → RefundResult 반환
  // 무료 FREE 또는 amount = 0: PG 스킵, { status: SKIPPED, scope } 반환
  //
  // 타임아웃·네트워크 에러 등으로 Bootpay 응답이 불명인 경우:
  //   → Bootpay.getReceipt(receiptId)로 실제 상태를 재조회하여 판정
  //   → 실제 환불 완료 상태면 SUCCESS, 아니면 FAILED
  //   (SOT = PG. 웹훅 이벤트는 판정 근거로 사용하지 않음)
  executeRefund(
    order: Order,
    amount: number,
    cancelId: string,           // Policy가 결정한 prefix + orderId (예: "cancel_earlybird_123")
    scope: RefundScope,
    reason: string,
  ): Promise<RefundResult>;

  // Order 상태 전이 + OrderHistory 기록을 Tx 내에서 원자적으로 (§5.4 상태 전이 행렬)
  finalizeOrder(order: Order, outcome: RefundResult, tx: Prisma.TransactionClient): Promise<void>;
}
```

**경계 불변식**:

1. `PaymentRefundExecutor`는 멤버/참여 타입을 참조하지 않음
2. `MemberCancellationHandler` / `RefundPolicy` 구현체는 `BootpayService`를 직접 호출하지 않음
3. `OrderRefundV3Service`는 `MemberCancellationHandler`를 **의존할 수 없음** (환불 전용 오케스트레이터가 멤버 상태를 건드리지 못하도록)
4. 조립자는 비즈니스 로직을 포함하지 않고 인터페이스 호출 순서와 트랜잭션 경계만 관리
5. **SOT = PG**: `executeRefund`의 `RefundResult` 판정은 PG 응답 또는 `getReceipt` 재조회 결과만 사용한다. 웹훅 이벤트·DB 중간 상태는 판정 근거가 아님. 이 덕에 WEBB-1326 Case 4/5 재시도가 이중 환불 없이 안전하게 돈다

### 5.4 Order 상태 머신

규칙 문서(order-common 1-3, 2장)를 그대로 따른다. `REQUEST_CANCEL_PAYMENT`는 사용하지 않는다.

| 상태 | V3 서비스에서의 의미 |
| --- | --- |
| `COMPLETED_PAYMENT` | 취소 전. Stage 1·2 시점에 유지 |
| `PARTIAL_REFUNDED` | 얼리버드 부분환불 완료. 이 상태에서 **V3 취소/환불 재진입 허용** (이후 전액 환불 또는 재부분환불) |
| `PARTIAL_REFUND_FAILED` | 얼리버드 부분환불 실패. 재시도 스케줄러 대상 (order-common 4-3) |
| `COMPLETED_CANCEL_PAYMENT` | 전액 환불 완료 (취소/스태프 환불/무료) |
| `FAILED_CANCEL_PAYMENT` | 전액 환불 실패. 재시도 스케줄러 대상 (order-common 4-2) |

**상태 전이 표** (`PaymentRefundExecutor.finalizeOrder`가 적용):

| 진입 Order 상태 | 환불 종류 | PG 결과 | 종료 Order 상태 |
| --- | --- | --- | --- |
| `COMPLETED_PAYMENT` | 전액 환불 | 성공 | `COMPLETED_CANCEL_PAYMENT` |
| `COMPLETED_PAYMENT` | 전액 환불 | 실패 | `FAILED_CANCEL_PAYMENT` + Slack |
| `COMPLETED_PAYMENT` | 전액 환불 | 스킵 (무료/환불 0원) | `COMPLETED_CANCEL_PAYMENT` |
| `COMPLETED_PAYMENT` | 부분 환불 (얼리버드) | 성공 | `PARTIAL_REFUNDED` |
| `COMPLETED_PAYMENT` | 부분 환불 (얼리버드) | 실패 | `PARTIAL_REFUND_FAILED` + Slack |
| `PARTIAL_REFUNDED` | 전액 환불 (잔액) | 성공 | `COMPLETED_CANCEL_PAYMENT` |
| `PARTIAL_REFUNDED` | 전액 환불 (잔액) | 실패 | `FAILED_CANCEL_PAYMENT` + Slack |
| `FAILED_CANCEL_PAYMENT` | 전액 환불 | 성공 (재시도) | `COMPLETED_CANCEL_PAYMENT` |
| `PARTIAL_REFUND_FAILED` | 부분 환불 (얼리버드) | 성공 (재시도) | `PARTIAL_REFUNDED` |

> "환불 종류"는 내부 구현에서 `RefundScope` 값(`FULL`/`PARTIAL`)에 대응, "PG 결과"는 `RefundResult.status`(`SUCCESS`/`FAILED`/`SKIPPED`)에 대응. 상세 타입은 §5.3 참조.
> 

**V3 취소/환불 진입 조건**: `orderStatus ∈ {COMPLETED_PAYMENT, PARTIAL_REFUNDED, FAILED_CANCEL_PAYMENT, PARTIAL_REFUND_FAILED}` 그리고 `remainPrice ≥ refundAmount`

- `*OrderHistory` 기록 의무**: `finalizeOrder`의 Order 상태 전이와 동일 Tx에 반드시 생성. `data` 필드에 PG 응답/에러 저장 (order-common 3장).

### 5.5 도메인별 `RefundPolicy` 규칙

규칙 문서의 환불 정책을 각 `RefundPolicy` 구현체가 담당한다. 아래 의사코드는 규칙 문서와 1:1 대응되며, 코드 작성 시 테스트 케이스로 그대로 변환한다.

### SocialingCancelRefundPolicy (OrderCancelV3 전용)

```
IF actor ∈ {HOST, SYSTEM}:
  IF 무료                                        → refundAmount = 0
  그 외                                          → refundAmount = order.remainPrice, scope = FULL  (호스트/시스템 귀책은 항상 전액)
IF actor = USER:
  IF 무료                                        → refundAmount = 0
  IF 모임 진행 당일 (startDate와 같은 날)         → refundAmount = 0   (최우선)
  IF 결제 후 30분 이내                            → refundAmount = order.remainPrice, scope = FULL
  IF 원본 member.status = REQUEST                → refundAmount = order.remainPrice, scope = FULL
  IF 원본 member.status = APPROVE:
     IF 진행일까지 4일 이상 남음                  → refundAmount = order.remainPrice, scope = FULL
     그 외 (3일 이하)                            → refundAmount = 0
refundReason    = actor + "_CANCEL_SOCIALING"
cancelIdPrefix  = "cancel_"
```

### SocialingStaffRefundPolicy (OrderRefundV3 전용)

```
grade = STAFF AND status = APPROVE AND 유료         → refundAmount = order.remainPrice, scope = FULL
무료                                               → refundAmount = 0
refundReason    = "SYSTEM_REFUND_BY_STAFF"
cancelIdPrefix  = "refund_staff_"
```

### SocialingEarlyBirdRefundPolicy (OrderRefundV3 전용)

```
status = APPROVE AND 유료 AND 얼리버드 할인 적용      → refundAmount = order.refundPrice (할인액만), scope = PARTIAL
그 외                                              → refundAmount = 0
refundReason    = "EARLY_BIRD_REFUND"
cancelIdPrefix  = "cancel_earlybird_"
```

### ChallengeCancelRefundPolicy (OrderCancelV3 전용, 소셜링과 동일 규칙)

```
# HOST·SYSTEM 주도 취소는 Challenge.status와 무관하게 항상 전액 환불.
# 본인 취소 불가 구간(CONFIRM_PLAYING 이후 등)은 USER 경로에만 적용.

IF actor ∈ {HOST, SYSTEM}:
  IF 무료                                        → refundAmount = 0
  그 외                                          → refundAmount = order.remainPrice, scope = FULL
                                                   (호스트 폐강 CLOSE도 전액 환불, OrderClaim=COMPLETED_CANCEL_HOST로 귀책 기록)
IF actor = USER:
  IF 무료                                        → refundAmount = 0
  IF Challenge.status != RECRUITING              → refundAmount = 0   (본인 취소 불가 구간, USER 한정)
  IF 모임 진행 당일 (startDate와 같은 날)         → refundAmount = 0   (최우선)
  IF 결제 후 30분 이내                            → refundAmount = order.remainPrice, scope = FULL
  IF 원본 member.status = REQUEST                → refundAmount = order.remainPrice, scope = FULL
  IF 원본 member.status = APPROVE:
     IF 진행일까지 4일 이상 남음                  → refundAmount = order.remainPrice, scope = FULL
     그 외 (3일 이하)                            → refundAmount = 0
refundReason    = actor + "_CANCEL_CHALLENGE"
cancelIdPrefix  = "cancel_"
```

### 5.6 멤버 상태 전이가 있는 취소 (`OrderCancelV3Service`)

`cancel(memberId, actor, reason)` 호출 시 아래 순서로 실행된다. 규칙 문서 order-common 3장(환불 처리 원칙)과 4-2장(FAILED_CANCEL 재처리)을 직접 구현한다.

**Stage 1 — Read** *(Tx 외부)*

- `loadParams` 실행, **원본 멤버 상태 기준** `cancelStatus`와 `refundAmount` 결정 (§5.5 policy)
- `refundAmount`는 `*Order.remainPrice` 상한** (얼리버드 선행 Order 대응)
- Gate: `remainPrice < refundAmount` → 예외 throw

**Stage 2 — Tx1** *(DB 전용)*

- `applyMemberStatusChange` 호출
    - 멤버 상태 → `cancelStatus`
    - 도메인 후처리: availCount 복구, `ChallengeRank` 삭제, Sendbird 퇴장 마킹, 얼리버드 혜택 이전 등
- Order 상태는 **그대로 `COMPLETED_PAYMENT` 유지**. 중간 상태 없음.

**Stage 3 — PG** *(Tx 외부)*

- `executeRefund(order, refundAmount, "cancel_{orderId}", FULL, reason)`
- 유료: Bootpay `cancelReceipt` 호출 → `RefundResult.SUCCESS` / `RefundResult.FAILED`
- 무료(`refundAmount = 0` 또는 `OrderKind.FREE`): PG 스킵 → `RefundResult.SKIPPED`
- **응답 불명 시 (타임아웃·네트워크 에러)**: `Bootpay.getReceipt(receiptId)`로 실제 상태 재조회하여 `RefundResult` 확정. PG가 진실원본 (§5.3 경계 불변식 5)

**Stage 4 — Tx2** *(DB 전용)*

- `finalizeOrder(order, outcome, tx)` — §5.4 상태 전이 행렬에 따라 Order 전이 + `OrderHistory` 기록
- `onAfterCancel` 호출 (Push, 이메일 등 비트랜잭션 후처리는 Tx 밖에서)

```tsx
export class OrderCancelV3Service<TMember> {
  constructor(
    private readonly memberHandler: MemberCancellationHandler<TMember>,
    private readonly refundPolicy: RefundPolicy<TMember>,
    private readonly paymentExecutor: PaymentRefundExecutor,
    private readonly prisma: PrismaService,
  ) {}

  async cancel(memberId: number, actor: CancelActor, reason: string): Promise<void> {
    const params = await this.memberHandler.loadParams(memberId, actor, reason);
    const decision = this.refundPolicy.decideForCancel!(params);
    this.assertRefundable(params, decision);

    await this.prisma.$transaction(async (tx) => {
      await this.memberHandler.applyMemberStatusChange(params, decision, tx);
    });

    const outcome = await this.paymentExecutor.executeRefund(
      params.order,
      decision.refundAmount,
      `${decision.cancelIdPrefix}${params.order.id}`,
      decision.refundScope,
      decision.refundReason,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.paymentExecutor.finalizeOrder(params.order, outcome, tx);
    });

    await this.memberHandler.onAfterCancel(params, decision, outcome);
  }
}
```

**핵심 불변식**:

1. `cancelStatus`·`refundAmount`는 반드시 Stage 1(원본 상태)에서 결정 → 소셜링 450건 유형의 버그 원천 차단
2. 환불 금액은 `Order.remainPrice` 상한 (얼리버드 선행 대응)
3. PG 호출은 Tx 외부에서만 이루어짐 (장기 락 방지)
4. PG 실패는 Order를 `FAILED_CANCEL_PAYMENT`로 기록. **멤버는 이미 CANCEL/KICK/REJECT로 확정됨** — 재시도 스케줄러(WEBB-1326)가 Order만 재처리하면 복구됨 (order-common 5-2). 일괄 취소(폐강 등) TX 커밋 후 환불 루프 크래시로 발생하는 "멤버 종료 상태 + Order=COMPLETED_PAYMENT" 불일치는 **Sweeper 스케줄러(WEBB-1326, order-common 5-4)**가 감지하여 `FAILED_CANCEL_PAYMENT`로 전환 후 동일 재시도 루프에 편입
5. 무료 Order는 Stage 3를 스킵하고 Stage 4에서 바로 `COMPLETED_CANCEL_PAYMENT`

### 5.7 멤버 상태 전이가 없는 환불 (`OrderRefundV3Service`)

참여는 유지되고 결제만 돌려주는 흐름. 아래 **두 가지 트리거**가 이 흐름으로 수렴한다. (멤버 상태 변경을 동반하는 취소는 §5.6이 담당)

| 트리거 | RefundPolicy | RefundScope | cancelIdPrefix | 종료 Order 상태 |
| --- | --- | --- | --- | --- |
| 소셜링 스태프 환불 (COMPLETE 전이) | `SocialingStaffRefundPolicy` | `FULL` | `refund_staff_` | `COMPLETED_CANCEL_PAYMENT` |
| 소셜링 얼리버드 (소셜링 완료 후) | `SocialingEarlyBirdRefundPolicy` | `PARTIAL` | `cancel_earlybird_` | `PARTIAL_REFUNDED` |

**공통 4단계** (§5.6과 달리 멤버 상태 변경 단계가 없음):

**Stage 1 — Read** *(Tx 외부)*

- `RefundParamsLoader.load(memberId, actor, reason)`로 멤버·Order 조회
- 읽기 전용. **이 오케스트레이터는 멤버 상태를 변경하지 않음** — `OrderRefundV3Service`가 의존하는 `RefundParamsLoader` 인터페이스에 `applyMemberStatusChange` 같은 메서드가 존재하지 않아, 실수로 스태프를 CANCEL 처리하는 코드가 컴파일되지 않음

**Stage 2 — Decide** *(Tx 외부)*

- `RefundPolicy.decideForRefund(params)` 호출로 `RefundDecision` 생성 (§5.5 policy)
    - `refundAmount` — 스태프: `order.remainPrice` / 얼리버드: `order.refundPrice`(할인액만)
    - `refundScope` — 스태프: `FULL` / 얼리버드: `PARTIAL`
    - `cancelIdPrefix` — 위 표의 prefix
    - `refundReason` — `OrderHistory.memo`에 기록될 사유
- `refundAmount = 0`(예: 무료 Order의 스태프 환불)이면 Stage 3을 스킵하고 Stage 4에서 바로 `COMPLETED_CANCEL_PAYMENT`로 전이

**Stage 3 — PG** *(Tx 외부)*

- `PaymentRefundExecutor.executeRefund(order, refundAmount, prefix + orderId, scope, reason)` 호출
- 유료: Bootpay `cancelReceipt` → `RefundResult.SUCCESS` / `RefundResult.FAILED`
- 무료 또는 `refundAmount = 0`: PG 스킵 → `RefundResult.SKIPPED`
- **응답 불명 시**: `getReceipt` 재조회로 판정 (§5.3 경계 불변식 5)

**Stage 4 — Tx** *(DB 전용)*

- `PaymentRefundExecutor.finalizeOrder(order, outcome, tx)` 호출
- §5.4 상태 전이 행렬에 따라 `COMPLETED_CANCEL_PAYMENT` / `PARTIAL_REFUNDED` / `FAILED_CANCEL_PAYMENT` / `PARTIAL_REFUND_FAILED` 중 하나로 전이
- `remainPrice` / `refundPrice` / `cancelledPrice` 갱신, `OrderHistory` 기록 (성공·실패 모두, PG 응답 포함)

**얼리버드 cancel_id 포맷 (재시도는 WEBB-1326)**:

- 첫 시도 cancel_id: `cancel_earlybird_{orderId}`
- 재시도 cancel_id: `cancel_earlybird_retry_{failedHistoryId}` (order-challenge 4장 규칙)
- `PaymentRefundExecutor.executeRefund`는 진입 Order 상태에 따라 자동으로 첫 시도/재시도 prefix 결정. **실제 재시도 호출 주기·백오프·실패 한도는 WEBB-1326 스케줄러가 관리**

**멤버 ↔ Order 조합의 정합성**:

- 스태프 환불 후: 멤버 `APPROVE` + Order `COMPLETED_CANCEL_PAYMENT` — 정식 조합 (order-socialing 정합성 표 보강 필요)
- 얼리버드 환불 후: 멤버 `APPROVE` + Order `PARTIAL_REFUNDED` — 이미 규칙 문서에 명시

**크래시 복구 공백과 대응**:

`OrderRefundV3Service`의 3단계 사가는 Stage 3↔4 사이 크래시 시 "멤버 APPROVE 유지 + Order `COMPLETED_PAYMENT`" 조합이 남는다 (PG는 환불 완료, DB는 미전이). Case 6/7 Sweeper는 멤버 종료 상태로만 필터링하므로 **이 조합을 감지하지 못한다**. 따라서 **WEBB-1326 Case 10(스태프)/Case 11(얼리버드)** 이 별도 감지 조건으로 메운다 — `Socialing.status = COMPLETE` + `Socialing.finishDate ≥ 30분 전` + 해당 조합을 주기적으로 스캔하여 `OrderRefundV3Service.refund`를 재호출. Executor의 `getReceipt` 재조회와 멱등 키로 이중 환불은 자동 방지 (§5.9.2). 상세는 WEBB-1326 참조.

### 5.8 무료 Order와 OrderClaim 귀책

- **무료** (`price = 0` 또는 `OrderKind.FREE`): Stage 3 PG 호출 스킵, `RefundResult.SKIPPED`로 Stage 4는 `COMPLETED_CANCEL_PAYMENT` 전이. 이 흐름은 트랜잭션 하나로 합칠 수도 있으나 **일관성을 위해 동일한 4단계 골격 유지** (코드 분기 최소화)
- **호스트 폐강 CLOSE** (소셜링·챌린지 공통): 유료라면 **전액 환불** 실행. `OrderClaim = COMPLETED_CANCEL_HOST`로 귀책만 기록 (challenge 5-3, socialing 6-2, order-socialing 3-1, order-challenge 3-4). `RefundPolicy`는 일반 전액 환불 경로와 동일하게 동작
- **CLOSE_BY_SYSTEM** (시스템 귀책): 전액 환불 + `OrderClaim = COMPLETED_CANCEL_SYSTEM`

### 5.9 사가 원자성·멱등성 계약

`OrderCancelV3Service`·`OrderRefundV3Service`는 각각 2개·2개의 로컬 트랜잭션과 1개의 외부 PG 호출로 구성된 사가다. ACID 원자성은 불가. 대신 **크래시 지점별 복구 경로를 설계로 고정**하고, 재진입 시 같은 결과가 나오도록 **각 단계를 멱등**하게 만든다.

### 5.9.1 크래시 지점 × 복구 경로 (`OrderCancelV3Service`, §5.6)

| 크래시 지점 | DB 상태 | PG 상태 | 복구 경로 |
| --- | --- | --- | --- |
| Stage 1 중 | 무변경 | 무변경 | 재호출 (read-only) |
| Stage 2 Tx 커밋 전 | 무변경 | 무변경 | 재호출 |
| **Stage 2 커밋 후 ~ Stage 3 호출 전** | 멤버 종료, Order `COMPLETED_PAYMENT` | 무변경 | **WEBB-1326 Case 6/7** Sweeper → `FAILED_CANCEL_PAYMENT`로 전환 → **Case 4** 재시도가 PG 환불 실행 |
| **Stage 3 중 PG 타임아웃/네트워크 에러** | 멤버 종료, Order `COMPLETED_PAYMENT` | 불명 | `executeRefund`가 `getReceipt` 재조회로 실제 상태 판정 (§5.3 불변식 5). 조회 성공 시 `RefundResult` 확정 후 Stage 4로 진행 |
| `**getReceipt` 재조회 실패 또는 프로세스 크래시** | 동일 | 동일 | Sweeper(Case 6/7) → Case 4. Case 4가 동일 `cancel_{orderId}`로 재호출하면 Bootpay가 기존 결과 반환 → Order 정상 전이 |
| **Stage 3 완료 ~ Stage 4 커밋 전** | 멤버 종료, Order 미전이 | **환불 완료** | Sweeper → Case 4. `cancel_{orderId}` 재사용으로 Bootpay가 기존 환불 결과 반환 → Order `COMPLETED_CANCEL_PAYMENT` 전이 |
| Stage 4 커밋 후 | 확정 | 확정 | 정상 종료 |

### 5.9.2 크래시 지점 × 복구 경로 (`OrderRefundV3Service`, §5.7)

`OrderRefundV3Service`는 Stage 2(멤버 상태 변경)가 없는 3단계 사가. 멤버가 `APPROVE`를 유지하므로 Case 6/7 Sweeper(멤버 종료 상태 필터)가 **감지할 수 없다**. 이 공백을 **WEBB-1326 Case 10/11**이 메운다 (APPROVE 유지 멤버 + `COMPLETED_PAYMENT` Order + `Socialing.status = COMPLETE` 조합 감지).

| 크래시 지점 | DB 상태 | PG 상태 | 복구 경로 |
| --- | --- | --- | --- |
| Stage 1 중 | 무변경 | 무변경 | 재호출 |
| Stage 3 중 PG 타임아웃 | 무변경 | 불명 | `getReceipt` 재조회로 판정 |
| `getReceipt` 재조회 실패·크래시 | 무변경 | 불명 | **WEBB-1326 Case 10(스태프)/Case 11(얼리버드)** 30분 후 감지 → `OrderRefundV3Service.refund` 재호출. 멱등 키(`refund_staff_{orderId}` / `cancel_earlybird_{orderId}`) 재사용으로 Bootpay가 기존 결과 반환 → Order 정상 전이 |
| **Stage 3 완료 ~ Stage 4 커밋 전** | Order 미전이 | 환불 완료 | 동일 — Case 10/11이 `refund` 재호출 → Executor가 `getReceipt`로 환불 완료 확인 후 Order 전이 |
| Stage 4 커밋 후 | 확정 | 확정 | 정상 종료 |

### 5.9.3 각 단계의 멱등 계약

사가 재진입(스케줄러·사용자 더블클릭·Case 10/11 재호출 등)이 안전하게 돌도록 각 단계가 **같은 입력에 대해 같은 최종 상태를 만드는** 규약을 가진다.

| 단계 | 멱등 계약 |
| --- | --- |
| Stage 1 (read) | Side-effect 없음. 호출 횟수 무관 |
| Stage 2 (`applyMemberStatusChange`) | **재진입 가드**: Stage 1에서 멤버가 이미 terminal 상태(CANCEL/KICK/REJECT)이면 사가를 **스킵**하고 Order 상태만 점검. `applyMemberStatusChange` 구현체는 "이미 terminal이면 no-op"을 보장해야 한다 |
| Stage 3 (`executeRefund`) | **결정적 멱등 키** (`cancel_{orderId}` 등) + `**getReceipt` 재조회**로 실제 PG 상태 기반 판정. Bootpay가 같은 키에 기존 결과 반환하므로 이중 환불 없음 (§5.3 불변식 5) |
| Stage 4 (`finalizeOrder`) | **진입 Order 상태 기반 전이**. 이미 종료 상태(`COMPLETED_CANCEL_PAYMENT`·`PARTIAL_REFUNDED`·`FAILED_CANCEL_PAYMENT`·`PARTIAL_REFUND_FAILED`)이고 목표 전이가 **같은 상태**로 가는 경우 **no-op** (OrderHistory도 재기록하지 않음). 목표 전이가 다른 상태일 때만 §5.4 전이 행렬에 따라 갱신 |
| 사가 전체 | 재호출 시 Stage 1~4 결과가 같아야 함. DB·PG 양쪽의 종료 상태가 한 번의 성공적 사가와 동일해야 함 |

### 5.9.4 동시성 가드

- **사용자 측 재진입**: 컨트롤러·어드민 API에서 동일 member에 대한 사가 동시 호출은 `SELECT FOR UPDATE`로 멤버 행 잠금
- **스케줄러 측 재진입**: WEBB-1326 모든 Job이 `SELECT FOR UPDATE SKIP LOCKED`로 대상 Order 잠금
- **사가 간 경합**: 정상 사가 실행 중인 Order를 Case 6/7/10/11이 가로채지 않도록 **grace period** — Case 6/7은 10분, Case 10/11은 30분

---

### 6. V3 전환 전략

### 6.1 도메인/주문 책임 경계

V3 Order 서비스(`OrderCancelV3Service`·`OrderRefundV3Service`)가 담당하는 범위는 **멤버 상태 전이(Stage 2, handler에 위임) + Order 상태 전이 + PG 환불**까지. 도메인 aggregate 상태(`Socialing.status`, `Challenge.status` 등)의 전이는 **도메인 서비스의 책임**이며 V3 Order 서비스 밖에서 처리한다.

| 레이어 | 담당 상태 | 책임 주체 |
| --- | --- | --- |
| 도메인 aggregate | `Socialing.status`, `Challenge.status` | 도메인 서비스 (`socialing.service`, `challenge.service`, 스케줄러) |
| 멤버 | `SocialingMember.status`, `ChallengeMember.status`, `availCount`, `ChallengeRank`, Sendbird 등 | V3 `MemberCancellationHandler.applyMemberStatusChange` (도메인별 구현체, 사가 Stage 2) |
| Order | `Order.orderStatus`, `remainPrice`, `refundPrice` | V3 `PaymentRefundExecutor.finalizeOrder` |
| PG | Bootpay `cancelReceipt` 호출 | V3 `PaymentRefundExecutor.executeRefund` |

**개별 취소 (유저 본인 취소·호스트 단건 거절/킥)**: 도메인 aggregate 전이 없음. 진입점이 V3 `OrderCancelV3Service.cancel(memberId, ...)`를 호출하면 사가가 멤버·PG·Order를 일괄 처리.

**일괄 취소 (호스트 폐강·CLOSE_BY_SYSTEM·CONFIRM_PLAYING 전이 시 REQUEST 취소 등)** — `improvements.md §9` 해소:

1. 도메인 서비스가 **단일 TX**로 도메인 aggregate 상태 + 전체 멤버 상태를 원자적으로 bulk 전이
2. TX 커밋 후, 도메인 서비스가 멤버별로 V3 `OrderCancelV3Service.cancel` 호출 루프 (PG 환불 + Order 전이 수행)
3. V3 `applyMemberStatusChange`는 멤버가 이미 terminal 상태면 no-op (§5.9.3 멱등 계약). 이중 전이 없음
4. TX 커밋과 환불 루프 사이 크래시는 WEBB-1326 Case 6/7 Sweeper가 감지 → `FAILED_CANCEL_PAYMENT` → Case 4 재시도 편입

### 6.2 V3 경로 단일화

ASIS는 이미 대부분의 Order가 V3로 생성되는 상태. V2/V3 Order 공존을 전제로 한 버전 라우팅이 불필요.

- **모든 취소/환불은 V3 서비스로 수렴**. Order 생성 버전 기반 분기 라우팅 없음. 컨트롤러·스케줄러는 단일 경로로 V3 서비스 호출
- **V2 Order 잔존분 처리**: V3 서비스가 Order 스키마 호환 범위 내에서 동일하게 처리 (신규 V3 필드는 기존 Order에서 null 허용). 호환 안 되는 예외 건이 배포 전 발견되면 별도 스크립트로 마이그레이션 또는 수동 정리

### 6.3 진입점 전환

- **도메인 스케줄러**: `socialingUpdateJob`(CONFIRM_PLAYING/CLOSE_BY_SYSTEM/COMPLETE 스태프 환불·얼리버드 부분환불/24h 미승인), `challenge.schedule-job`(마감 전이/24h 미승인)의 취소·환불 호출부를 V3 서비스 호출로 교체. 스케줄러 자체 구조는 유지
- **컨트롤러**: 각 도메인의 본인 취소·호스트 킥·호스트 거절 등 API 컨트롤러도 V3 서비스 호출로 교체
- **어드민**: 어드민 개별 재시도 API(`POST /admin/orders/:orderId/retry-earlybird-refund`, `POST /admin/early-bird-partial-refund/retry-batch`) 내부 구현을 V3 경로로 교체
- **챌린지 CHOICE→COMMON 전환 경로 흡수** (`improvements.md §7` 해소): 현재 CHOICE→COMMON 전환 시 REQUEST 상태 `ChallengeMember`를 `DELETE`로만 바꾸고 Order 취소/환불이 누락돼 있음. 본 이슈로 해당 경로의 REQUEST 멤버 처리도 `OrderCancelV3Service<ChallengeMember>.cancel(SYSTEM, "CHOICE_TO_COMMON")` 호출로 교체하여 환불 + OrderHistory + Push까지 정합하게 처리

### 6.4 Feature flag 롤아웃

**원칙**: 한 번의 trigger 실행은 한 경로 end-to-end로 돈다 (V2 경로 또는 V3 경로 택일). 한 플로우 내부에서 V2·V3 로직을 부분적으로 섞지 않는다 — 구조적 가정(cancelStatus 결정 시점·재진입 멱등성·Tx 경계)이 달라 오히려 V2의 450건 오분류 유형 버그를 유발한다. Flag는 **오케스트레이션 진입점**에서만 분기하며, V2/V3 Order 분기 용도는 아니다.

**Granularity 설계 대안 비교**

| 옵션 | Flag 구성 | 롤백 단위 | 코드 중복 기간 | 장점 | 단점 |
| --- | --- | --- | --- | --- | --- |
| **A (채택)** | 4개 — 소셜링 cancel · 챌린지 cancel · 소셜링 스태프 refund · 소셜링 얼리버드 refund | 도메인 × 흐름 조합 | ~2주 | 특정 흐름만 정밀 롤백 가능 (예: 얼리버드만 V2로) | 분기 4곳 유지, flag 상태 조합이 16가지라 테스트 표면 커짐 |
| B | 2개 — 소셜링 cancel+refund 전체 / 챌린지 cancel | 도메인 단위 | ~2주 | 도메인 내부가 단일 경로로 일관, 분기 최소 | 도메인 내 한 흐름 장애 시 그 도메인 전체 롤백 |
| C | 1개 — 전체 V3 스위치 | 전체 | ~2주 | 가장 단순 | 장애 시 전체 롤백, 도메인 간 격리 없음 |

**채택 근거 (A)**: 스태프 환불·얼리버드 부분환불은 신규 도입 로직 비중이 상대적으로 크고(정책 계산·`getReceipt` 재조회·재진입 가드 등), 장애 발견 시 해당 흐름만 V2 `EarlyBirdRefundService` / `refundSocialingStaff` 경로로 되돌릴 수 있어야 운영 부담이 작음. 소셜링 일반 취소·챌린지 취소는 규모가 크므로 별도 flag로 분리해 순차 전환 가능. 조합 테스트 표면은 PR 단위 체크리스트로 커버.

**Flag 목록**

- `FEATURE_ORDER_CANCEL_V3_SOCIALING` — 소셜링 일반 취소 (본인·호스트 킥/거절·폐강·CONFIRM_PLAYING 전이 REQUEST 취소·CLOSE_BY_SYSTEM·24h 미승인·CHOICE→COMMON)
- `FEATURE_ORDER_CANCEL_V3_CHALLENGE` — 챌린지 일반 취소 (본인·호스트 거절/강퇴·폐강·CONFIRM_PLAYING 전이·CLOSE_BY_SYSTEM·24h 미승인)
- `FEATURE_ORDER_REFUND_V3_SOCIALING_STAFF` — COMPLETE 전이 시 스태프 환불
- `FEATURE_ORDER_REFUND_V3_SOCIALING_EARLYBIRD` — COMPLETE 전이 시 얼리버드 부분환불 + 어드민 수동 재시도 API

**롤아웃 순서 권장**: 소셜링 cancel → 챌린지 cancel → 소셜링 스태프 refund → 소셜링 얼리버드 refund. 앞 단계 안정화 후 다음 flag 활성화.

**롤백**: 각 flag OFF 시 기존 V2 경로(`OrderCommonService.refundOrder`, `EarlyBirdRefundService`, `refundSocialingStaff` 등)로 임시 복귀. 장애 발생 단위만 롤백하고 나머지는 V3 유지.

### 6.5 V2 코드 제거

V3 프로덕션 안정화 **약 2주** (각 feature flag ON 상태로 운영 모니터링) 후 **별도 PR로 일괄 제거**:

- `OrderCommonService.refundOrder`
- V2 도메인 서비스의 cancel/refund 호출부 (`socialing-member.command.service`, `challenge.service` 등)
- `EarlyBirdRefundService`의 V2 직접 호출 로직 (V3 래퍼로 교체된 이후의 래퍼도 함께 제거)

V2 Order 잔존분이 남아 있어도 V3 서비스가 처리하므로 소진 대기 없음.

### 6.6 WEBB-1326과의 관계

환불 실패 재시도 스케줄러(`FAILED_CANCEL_PAYMENT` / `PARTIAL_REFUND_FAILED`) 신규 구현은 WEBB-1326 범위. 본 이슈는 재시도 스케줄러가 호출할 서비스 계약(`PaymentRefundExecutor` 인터페이스 + 멱등 키 규칙)만 제공. 상세 계약은 §7 참조.

### 6.7 V2 → V3 로직 이관 맵

규칙 자체는 규칙 문서(`order-*.md`, `*-pseudocode.md`)가 단일 출처이며, V3 코드는 이 매핑대로 구현체에 옮긴다. 규칙이 바뀌면 **규칙 문서 먼저 수정 → 영향 받는 V3 구현체 갱신** 순서를 유지한다.

"소속" 컬럼은 해당 로직이 §5.6(멤버 상태 전이 있음 — 취소) / §5.7(멤버 상태 전이 없음 — 환불) / 공통(두 흐름 모두) / 신규(V2에 없던 영역) 중 어디에 속하는지 표시한다.

**이관 (V2 로직을 V3 위치로 옮김, 대부분 복사·정돈 수준)**

| 소속 | 로직 | V2 출처 (ASIS) | V3 구현 위치 | 규칙 근거 |
| --- | --- | --- | --- | --- |
| §5.6 | 소셜링 멤버 상태 전이 + `availCount` 복구 + 얼리버드 혜택 이전 | `socialing-member.command.service.cancelOrder` / `kick` | `SocialingMemberCancellationHandler.applyMemberStatusChange` (Tx1) | socialing 5·6·9 |
| §5.6 | 챌린지 멤버 상태 전이 + `ChallengeRank`·`ChallengeHistory` 삭제 | `challenge.service.cancelChallengeMember` / `updateMemberStatusByOwner` / `afterDeleteChallenge` | `ChallengeMemberCancellationHandler.applyMemberStatusChange` (Tx1) | challenge 5·6·7 |
| §5.6 | Sendbird 채널 퇴장 | 각 도메인 cancel 흐름 후처리 | 각 Handler `onAfterCancel` (Tx 외부) | socialing 5-4, challenge 5-2·6 |
| §5.6 | 본인 취소 환불 금액 결정 공식 | 소셜링 `OrderMemberService`·`calculateRefundPrice` / 챌린지 `challenge-order.service.calculateRefundPrice` | `SocialingCancelRefundPolicy` / `ChallengeCancelRefundPolicy`의 `decideForCancel` | order-socialing 3-1, order-challenge 3-1 |
| §5.7 | 스태프 환불 대상 선정 및 금액 | `socialingUpdateJob.refundSocialingStaff` | `SocialingStaffRefundPolicy.decideForRefund` | order-socialing 3-3, socialing 8-3 |
| §5.7 | 얼리버드 부분환불 대상·할인액·`cancel_id` 포맷 | `EarlyBirdRefundService.refundEarlyBirds` / `retryFailedEarlyBirdRefunds` | `SocialingEarlyBirdRefundPolicy.decideForRefund` + `OrderRefundV3Service` 호출 | order-socialing 3-2 |
| 공통 | PG 환불 호출 + Order 상태 전이 + OrderHistory 기록 | `OrderCommonService.refundOrder` + `BootpayService.refund` | `BootpayRefundExecutor` (`PaymentRefundExecutor` 구현체) | order-common 2·3 |
| 공통 | Push / 이메일 / 외부 시스템 알림 (비TX 후처리) | 각 도메인 cancel 흐름 후처리 | §5.6: Handler `onAfterCancel` / §5.7: `OrderRefundV3Service` 호출 지점 후속 hook | 각 규칙 문서 5·6·7·8장 |
| 공통 | 일괄 취소 **도메인 TX** (도메인 상태 + 전체 멤버 bulk 전이) | `closeSocialingByHost` / `closeChallenge` / `updateSocialingStatusConfirm` 내 bulk 전이 | **도메인 서비스 그대로 유지**. per-member refund 루프만 `OrderCommonService.refundOrder` → `OrderCancelV3Service.cancel`로 교체 | improvements §9, §6.1 |
| 공통 | 스케줄러 주도 취소 트리거 (24h 미승인·CONFIRM_PLAYING 전이·CLOSE_BY_SYSTEM·COMPLETE 스태프 환불·얼리버드 부분환불) | `socialingUpdateJob` / `challenge.schedule-job` 각 메서드 | 트리거 메서드 유지, 호출부만 V3 서비스로 교체. WEBB-1326에서 일부(24h 미승인 등)는 Job으로 분리 | socialing 8, challenge 7, §6.3 |
| 공통 | 어드민 재시도 API | `POST /admin/orders/:orderId/retry-earlybird-refund` / `POST /admin/early-bird-partial-refund/retry-batch` | API 유지, 내부를 V3 `OrderRefundV3Service.refund` 호출로 교체 | §6.3 |
| §5.6 | 챌린지 CHOICE→COMMON 전환 REQUEST 멤버 처리 | `challenge-member.service.deleteChallengeMembersStatus` (await 누락 버그 포함) | 전환 로직에서 REQUEST 멤버에 `OrderCancelV3Service.cancel(SYSTEM, "CHOICE_TO_COMMON")` 호출. V3 `Handler`가 `await` 단일 TX로 처리하므로 improvements §8 자연 해소 | improvements §7·§8 |

**신규 (V2에 없던 영역, 본 이슈에서 새로 작성)**

| 로직 | V3 위치 | 설명 | 규칙 근거 |
| --- | --- | --- | --- |
| 조립자 + 인터페이스 + DI 스캐폴딩 | `OrderCancelV3Service` / `OrderRefundV3Service` + 4개 인터페이스 (`MemberCancellationHandler`·`RefundParamsLoader`·`RefundPolicy`·`PaymentRefundExecutor`) | V2는 도메인 서비스가 직접 Order·PG를 호출. V3는 조립자·인터페이스로 경계 분리 | §5.2·§5.3 |
| 각 domain handler의 `loadParams()` | `SocialingMemberCancellationHandler.loadParams` / `ChallengeMemberCancellationHandler.loadParams` 등 | memberId → `CancelParams`(멤버·Order·도메인 스냅샷). 기존 repo 재사용 | §5.3 |
| 재진입 멱등 가드 | `applyMemberStatusChange`·`finalizeOrder` 내부에 "이미 terminal이면 no-op" 분기 | 일괄 취소 루프와 개별 사가 호출이 겹쳐도 이중 전이 방지 | §5.9.3 |
| PG 응답 불명 시 `getReceipt` 재조회 | `BootpayRefundExecutor.executeRefund` 내부 | V2는 응답 에러 시 바로 실패 처리. V3는 실제 PG 상태 재조회로 판정 | §5.3 불변식 5 |
| `cancelStatus` / `refundAmount` 결정 시점 고정 | `OrderCancelV3Service.cancel` Stage 1에서 원본 멤버 상태 기준 결정 | 소셜링 V4의 "멤버 변경 → cancelOrder" 순서 버그(450건 오분류) 원천 차단 | §5.6 핵심 불변식 1 |
| 도메인·트리거 조합 feature flag 4종 | Feature flag 인프라 | 단계 롤아웃·개별 롤백 | §6.4 |

**WEBB-1326으로 넘어가는 영역 (본 이슈는 계약만 제공)**

| 로직 | 담당 | 근거 |
| --- | --- | --- |
| 환불 실패 자동 재시도 (`FAILED_CANCEL_PAYMENT` / `PARTIAL_REFUND_FAILED`) | WEBB-1326 Case 4·5 | order-common 5-2·5-3 |
| 일괄 취소 크래시 복구 Sweeper (멤버 종료 + Order `COMPLETED_PAYMENT` 불일치) | WEBB-1326 Case 6·7 | order-common 5-4 |
| APPROVE 유지 환불 크래시 복구 (스태프·얼리버드 Stage 3↔4 간극) | WEBB-1326 Case 10·11 | §5.9.2 |
| 24h 미승인 타임아웃 Job 분해 | WEBB-1326 Case 8·9 | socialing 8-4, challenge 7-1 |

---

### 7. WEBB-1326과의 계약

본 이슈(WEBB-1325)는 WEBB-1326이 소비할 **서비스 계약**을 제공한다. WEBB-1326의 각 Case가 1325의 어떤 계약을 어떻게 소비하는지는 아래 표로 고정한다.

### 7.1 WEBB-1325가 제공하는 계약

- **서비스 엔트리포인트**:
    - `OrderCancelV3Service<TMember>.cancel(memberId, actor, reason)` — 멤버 상태 전이가 있는 취소 (§5.6)
    - `OrderRefundV3Service<TMember>.refund(memberId, actor, reason)` — 멤버 상태 전이가 없는 환불 (§5.7)
- **결제 프리미티브**:
    - `PaymentRefundExecutor.executeRefund(order, amount, cancelId, scope, reason)` / `finalizeOrder(order, outcome, tx)` — 도메인 무관 PG 호출 + Order 전이 (§5.3)
- **상태 머신 재진입 허용**: `orderStatus ∈ {FAILED_CANCEL_PAYMENT, PARTIAL_REFUND_FAILED}` Order도 `executeRefund` 재호출 가능 (§5.4)
- **멱등성 키 규칙**:
    - 일반 취소 재시도: 원본 `cancel_{orderId}` 재사용 (Bootpay가 기존 결과 반환)
    - 스태프 환불 재시도: `refund_staff_{orderId}` 재사용
    - 얼리버드 부분환불 재시도: `cancel_earlybird_retry_{failedHistoryId}` (order-challenge 4장)
- **네임스페이스 분리**: `cancel_*` / `refund_staff_*` / `cancel_earlybird_*` — 같은 Order에 시차 호출돼도 PG 충돌 없음
- **PG 결과 판정 원칙 (SOT = PG)**: `executeRefund`는 Bootpay 응답이 타임아웃·네트워크 에러로 불명일 경우 `Bootpay.getReceipt(receiptId)`로 실제 상태를 **재조회**해서 `RefundResult`을 확정한다. 웹훅 이벤트는 판정 근거로 사용하지 않는다. 이 원칙 덕에 Case 4/5 재시도가 이중 환불 없이 안전하게 돈다 (§5.3 경계 불변식 5).

### 7.2 WEBB-1326 Case별 소비 매핑

| WEBB-1326 Case | 소비 대상 (1325 계약) | 역할 |
| --- | --- | --- |
| Case 4 — 전액 환불 실패 재시도 | `PaymentRefundExecutor.executeRefund` + `finalizeOrder` | `FAILED_CANCEL_PAYMENT` Order를 주기적으로 재시도 |
| Case 5 — 부분 환불 실패 재시도 | 동일 | `PARTIAL_REFUND_FAILED` Order를 재시도 |
| Case 6 — 소셜링 상태 불일치 Sweeper | (계약 미사용, DB 상태 전이만) | `COMPLETED_PAYMENT → FAILED_CANCEL_PAYMENT` 전이로 Case 4 재시도 루프에 편입 |
| Case 7 — 챌린지 상태 불일치 Sweeper | 동일 | 동일 |
| Case 8 — 소셜링 24h 미승인 Job | `OrderCancelV3Service<SocialingMember>.cancel(SYSTEM)` | Job이 대상 조회 후 V3 사가 호출 |
| Case 9 — 챌린지 24h 미승인 Job | `OrderCancelV3Service<ChallengeMember>.cancel(SYSTEM)` | 동일 |
| Case 10 — 스태프 환불 크래시 복구 | `OrderRefundV3Service<SocialingMember>.refund(SYSTEM)` | `OrderRefundV3Service` Stage 3↔4 크래시로 Order 미전이된 스태프 환불 건을 감지·재호출. 멱등 키 재사용으로 이중 환불 방지 |
| Case 11 — 얼리버드 환불 크래시 복구 | `OrderRefundV3Service<SocialingMember>.refund(SYSTEM)` | 동일 — 얼리버드 대상. `Socialing.COMPLETE` + 얼리버드 적용 조합 감지 |

### 7.3 WEBB-1326 범위 (본 이슈에서 다루지 않음)

- `FAILED_CANCEL_PAYMENT` / `PARTIAL_REFUND_FAILED` 재시도 스케줄러 신규 구현 (Case 4/5)
- **상태 불일치 Sweeper** (Case 6/7) — 일괄 취소 TX 커밋 후 환불 루프 크래시로 발생한 "멤버 종료 상태(CANCEL/KICK/REJECT) + Order=COMPLETED_PAYMENT" 불일치를 감지하여 `FAILED_CANCEL_PAYMENT`로 전환 후 재시도 루프에 편입 (order-common §5-4)
- **APPROVE 유지 환불 크래시 복구** (Case 10/11) — 스태프 환불·얼리버드 환불 사가의 Stage 3↔4 사이 크래시로 발생한 "멤버 APPROVE + Order COMPLETED_PAYMENT" 불일치를 감지하여 `OrderRefundV3Service.refund` 재호출 (§5.9.2)
- **24h 미승인 타임아웃의 Job 단위 분해** (Case 8/9) — 기존 `socialingUpdateJob` / `challenge.schedule-job` 내부 로직을 독립 Job으로 분리하면서 호출부를 V3 서비스로 교체
- `WAITING_PAYMENT` 처리 스케줄러 3개 통합 (Case 1/2/3)
- 지수 백오프, 최대 재시도 횟수, Slack 알림
- 기존 EXPIRED 불일치 데이터 마이그레이션

### 7.4 V3 ↔ WEBB-1326 관계

V3 취소 흐름은 개별 멤버 취소 시 자체 Saga(Tx1 → PG → Tx2)로 원자성을 보장한다. 일괄 취소(호스트 폐강·CLOSE_BY_SYSTEM 등)는 도메인 서비스가 단일 TX로 멤버 상태를 벌크 전이한 뒤 멤버별로 PG 환불 루프를 도는 패턴이라 **TX 커밋과 환불 루프 사이 크래시가 상태 불일치를 만들 수 있는 유일한 경로**. 이 간극을 Sweeper(Case 6/7)가 메꾼다.

---

### 8. 주요 기술적 결정

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| Order 중간 상태 | `REQUEST_CANCEL_PAYMENT` 사용 안 함 | 규칙 문서(order-common 1-3)에 제거 예정 값으로 명시. 대신 `FAILED_CANCEL_PAYMENT`를 실패 경로 상태로 활용 |
| 진실원본 (SOT) | **PG (`getReceipt`)**. 웹훅은 해피케이스 이벤트 힌트로만 사용 | PG 응답 불명 시 `executeRefund`가 `getReceipt`로 재조회하여 `RefundResult` 확정. 이 원칙 덕에 WEBB-1326 재시도 Case가 이중 환불 없이 안전. `Order.bootpayReceiptId`는 ASIS 그대로 "confirm 시작 마커" — 본 이슈에서 의미 전환 불필요 |
| Saga 구조 | **멤버 확정 Tx → PG → Order 전이 Tx** | 규칙 문서 3장(환불 처리 원칙). 정상 경로는 중간 상태 없이 `COMPLETED_PAYMENT → COMPLETED_CANCEL_PAYMENT` 직접 전이 |
| 일괄 취소 TX 원자화 | **도메인 상태 + 멤버 상태 bulk 전이를 단일 TX에서** (`improvements.md §9` 해소) | 호스트 폐강·CLOSE_BY_SYSTEM 등. PG 환불 루프는 TX 외부. TX 커밋과 환불 루프 사이 크래시는 WEBB-1326 Sweeper(Case 6/7)가 감지 후 `FAILED_CANCEL_PAYMENT`로 전이하여 재시도 루프 편입 |
| 취소 vs 환불 조립자 분리 | **`OrderCancelV3` + `OrderRefundV3` 2종** | 스태프 환불을 취소로 잘못 구현할 여지를 컴파일 레벨 차단. `OrderRefundV3`는 `MemberCancellationHandler` 의존 불가 |
| 환불 금액 산정 기준 | **`Order.remainPrice`** | 얼리버드 등 선행 부분환불 대응. 얼리버드 없는 Order는 `remainPrice == orderPrice` |
| cancelStatus 결정 시점 | **멤버 상태 변경 전, 원본 상태 기준** | 소셜링 V4 450건 버그 직접 원인 제거 |
| 오케스트레이션 구조 | **얇은 조립자 + 3개 인터페이스 분리** | §5.1 대안 비교 참조 |
| 환불 정책 | **`RefundPolicy` 전략 주입 + 규칙 문서 기반 구현** | 도메인별 규칙 차이 수용. 정책 테스트는 규칙 문서 표를 케이스로 |
| 멱등성 키 | **`cancel_{orderId}`** | V3 취소는 Order당 1회. 얼리버드와 네임스페이스 분리 |
| `OrderHistory` 기록 | **`PaymentRefundExecutor.finalizeOrder` 책임** | 모든 상태 전이에 OrderHistory 필수 (order-common 2장) |
| 무료 Order 처리 | **Stage 3 스킵, 동일 4단계 골격 유지** | 분기 최소화. 코드 일관성 |
| V2 Order 처리 | **V3 경로 단일화** — 버전 라우팅 분기 없음 | 대부분의 신규 Order가 V3 주문 서비스로 생성된 상태라 V2·V3 Order 공존 전제가 무의미. V3 서비스가 스키마 호환 범위에서 V2 Order 잔존분까지 동일 경로로 처리 (§6.2) |
| 얼리버드 V3 흡수 | **`OrderRefundV3Service`로 수렴 (소셜링 전용)** | 소셜링 `EarlyBirdRefundService`는 V3 호출 래퍼로 전환. 네임스페이스 `cancel_earlybird` 유지 |
| 클럽 확장 | **`PaymentRefundExecutor` 대체 구현체로 후속 수용** | 동일 조립자 재사용 |

---

### 9. 모니터링 및 알림

| 항목 | 구현 |
| --- | --- |
| 도메인별 취소/환불 성공률·평균 소요 | 메타베이스 대시보드 |
| Stage 3 첫 호출 PG 실패율 | V3 서비스 첫 시도 기준 — 재시도 효과와 분리하여 추적 (재시도 지표는 WEBB-1326) |
| V2 cancel 경로 호출 횟수 | feature flag 롤아웃 추적용 |
| 스태프 환불 첫 시도 실패 | Slack 알림 (WEBB-1268 후속 관찰). 재시도 자동화는 WEBB-1326 |
| 얼리버드 부분환불 첫 시도 실패율 | 소셜링 `PARTIAL_REFUND_FAILED` 진입률 대시보드 |
| 규칙 문서 Invariant 위반 검출 | 주기 배치로 `availCount` 불일치, `member ↔ Order` 상태 조합 위반 탐지 |

---

### 10. API / ERD

- **API 변경**: 외부 노출 엔드포인트 동일 (컨트롤러 내부 라우팅만 변경)
- **ERD 변경**:
    - **신규 필드 없음** (규칙 문서와 기존 스키마 그대로 사용)
    - `OrderStatus.REQUEST_CANCEL_PAYMENT` 제거는 별도 마이그레이션 과제 (규칙 문서의 legacy 정리)
    - `OrderStatus.FAILED_CANCEL_PAYMENT` / `PARTIAL_REFUND_FAILED` 실사용
    - `OrderClaim.COMPLETED_CANCEL_HOST`는 기존 값 활용

---

### 11. 후속 과제

- **클럽(빌링키 기반) 취소/환불 V3 전환** — `SubscriptionRefundExecutor` + `ClubMemberCancellationHandler`/`ClubRefundPolicy`. 본 작업에서 정립한 조립자 재사용. `improvements.md §4` (`ClubMember.orderId` 직접 연결로 구조 단순화) 선행 또는 병행하면 Order 연결이 소셜링·챌린지와 동형이 되어 Handler 구현이 얇아짐
- `*OrderStatus` enum의 모델 분리 — [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346)을 통해 해소 예정** — 현 `OrderStatus`는 Order 라이프사이클과 Payment 결제 상태를 한 enum에 섞어 놓은 레거시 구조이며, `COMPLETED_CANCEL_PAYMENT` 같은 모호한 네이밍이 본 스펙의 독자 혼란 원인이 된다(§1.3 참조). 본 이슈(WEBB-1325) + WEBB-1326이 프로덕션에서 안정화된 뒤 WEBB-1346에서 `Order.status`와 `Payment.status`로 분리하고 legacy enum 값(`NONE`·`REQUEST_CANCEL_PAYMENT`·`COMPLETE_PAYMENT`) 제거를 함께 진행한다
- **V2 cancel 코드 제거** — V2 Order 소진 후
- `*deleteChallengeMembersStatus` await 누락 해소** (`improvements.md §8`) — 본 이슈에서 챌린지 V3 `Handler`로 호출부가 교체되면서 자연 해소 예정. V3 `Handler.applyMemberStatusChange`는 `await tx.challengeMember.updateMany(...)`를 단일 TX로 실행하므로 fire-and-forget 패턴 제거
- **기존 `EarlyBirdRefundService` 래퍼 제거** — 모든 호출자가 V3 경로에 안정화된 이후
- **규칙 문서의 member ↔ Order 정합성 표 보강** — 스태프 환불(APPROVE + COMPLETED_CANCEL_PAYMENT) 조합 명시

---

### 12. 관련 이슈 및 문서

- [WEBB-1325](https://munto.atlassian.net/browse/WEBB-1325) — 본 이슈
- [WEBB-1326](https://munto.atlassian.net/browse/WEBB-1326) — **스케줄러 통합 · 환불 실패 자동 재시도 · 상태 불일치 Sweeper** (본 이슈의 서비스 계약을 소비). 별도 원페이저
- [WEBB-1321](https://munto.atlassian.net/browse/WEBB-1321) — 소셜링·챌린지·주문 규칙 문서화 (본 작업의 근거)
- [WEBB-1307](https://munto.atlassian.net/browse/WEBB-1307) — 취소/환불 정합성 8건 개별 수정 (선행)
- [WEBB-1346](https://munto.atlassian.net/browse/WEBB-1346) — `OrderStatus` enum을 주문 상태와 결제 상태로 분리 + legacy enum 값 제거 (본 이슈 안정화 후 해소 예정, §1.3·§11 참조)
- [WEBB-1272](https://munto.atlassian.net/browse/WEBB-1272) — PG API Rate Limit (`runInChunks`, `isRetryableError` 등 WEBB-1326에서 재사용)
- [WEBB-1268](https://munto.atlassian.net/browse/WEBB-1268) — 스태프 소셜링 환불 실패 (본 작업으로 오케스트레이션 해소, 재시도 자동화는 WEBB-1326)
- [WEBB-1292](https://munto.atlassian.net/browse/WEBB-1292) — 클럽 취소 CS (범위 외, 후속)
- [WEBB-967](https://munto.atlassian.net/browse/WEBB-967) — 소셜링 이중결제 CS
- [db-integrity-onepager.md](https://www.notion.so/db-integrity-onepager.md) — 전체 정합성 보고서

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