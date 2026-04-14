# PG사 API 호출 단일화 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 9일 오전 11:26
최근 수정일: 2026년 4월 9일 오후 12:04
문서 상태: Active
생성 일시: 2026년 4월 9일 오전 11:26
최종 편집자: 김범진

**create by:** 김범진

**Project Name :** PG사 API 호출 단일화 및 Rate Limit 관리 체계 구축

**Date :** 2026-04-09

**Submitter Info :** 김범진 / Backend Team / [beomjin.kim@munto.kr](mailto:beomjin.kim@munto.kr)

**Project Description :**
현재 PG사(나이스페이먼츠) API 호출이 스케줄러, API 서비스, 관리자 서비스 등 15개 이상의 진입점에서 분산 호출되어 초당 30회 동시처리 한도를 예측·제어할 수 없다. 이로 인해 RC_CANCEL_SERVER_ERROR(에러코드 9003) 발생 시 환불이 실패하고 자동 복구 없이 수동 처리에 의존하는 구조적 취약점이 존재한다. PG API 호출 경로를 중앙에서 통제하고 실패 시 자동 재시도 체계를 갖추어 결제/환불 안정성을 확보한다.

**Business and Marketing Justification :**

- **CS 비용 절감**: 2026년 기준 동일 원인(Rate Limit 초과)으로 10건 이상의 환불 실패 발생. 건당 CS 대응 및 수동 환불 처리 공수 발생 중
- **유저 신뢰도**: 스태프 환불 실패(WEBB-1268), 얼리버드 대량 환불 실패(WEBB-1132) 등 결제 오류는 서비스 신뢰도에 직접적 영향
- **운영 안정성**: 자동 재시도 로직 없이 스케줄러·API·어드민 등 여러 경로에서 PG 호출이 동시 발생하는 구조는 트래픽 증가 시 장애 빈도가 선형 증가
- **확장성**: 정기결제(클럽 멤버십), 얼리버드 부분 환불 등 배치성 호출이 늘어날수록 Rate Limit 초과 리스크 증가

Risk Assessment :

| 리스크 | 수준 | 대응 방안 |
| --- | --- | --- |
| API 서버 2개 인스턴스 운영 중 — Bull Worker가 2개 뜰 경우 limiter가 인스턴스 합산으로 글로벌 적용되는지 확인 필요 | 높음 | Bull limiter는 Redis 기반으로 글로벌 적용되도록 설계되어 있으나, 프로덕션 환경에서 실제 동작 검증 필요. 확인 전까지 limiter 값을 보수적으로 설정(초당 15건)하거나 Worker를 단일 인스턴스 앱(스케줄러/라운지)으로 이동하는 대안 검토 |
| Bull Queue 도입 시 비동기 처리로 인한 환불 지연 | 중 | 환불 큐 처리 SLA를 5분 이내로 설정하고 Slack 알림으로 모니터링 |
| 재시도 시 중복 환불(이중 환불) 발생 | 높음 | Bootpay `cancel_id` 멱등성 키 활용. 이미 얼리버드 재시도에서 검증된 패턴(`cancel_earlybird_retry_{historyId}`) 동일 적용 |
| 즉시 응답이 필요한 PG 호출(confirm, 영수증 검증)에 큐 적용 불가 | 낮음 | 즉시 응답 필요 호출은 동기 유지, 환불/정기결제 등 비동기 가능 작업만 큐 적용 |
| 기존 스케줄러·API의 동기 호출 패턴 변경에 따른 회귀 | 중 | 호출부별 단계적 마이그레이션, 기존 동기 경로는 feature flag로 점진적 전환 |
| Redis(Bull 기반) 장애 시 결제 큐 중단 | 중 | DLQ(Dead Letter Queue) 설정, Redis 클러스터 구성, Bull 장애 시 fallback 동기 호출 경로 보존 |

**Resource and Scheduling Details :**

- **필요 인력**: Backend 1명
- **예상 일정**: TBD
- **마일스톤**:
    - Week 1: PG API 호출 지점 전수 목록화, Bull Queue 기반 환불 큐 설계 및 구현
    - Week 2: 환불/정기결제 호출을 큐 기반으로 전환, BootpayService에 Rate Limiter 내장, 재시도(exponential backoff) 로직 구현
    - Week 3: 기존 실패 건 수동 재처리 스크립트 작성, 모니터링/알림 체계 구축, 스테이징 검증 및 배포

**Technical Description :**

**기술 스택**

- NestJS (기존 모노레포 그대로)
- `@nestjs/bull ^10.2.0` + `bull ^4.12.0` — **이미 설치 및 사용 중** (신규 패키지 추가 불필요)
- Redis — Bull 큐 저장소. 기존 캐싱/세션용 Redis 인프라 재활용
- BootpayService (`libs/common/src/bootpay/bootpay.service.ts`) — 기존 PG 래퍼 (변경 없음)

---

**기존 Bull Queue 사용 현황**

이미 동일한 패턴으로 아래 큐들이 운영 중이며, 결제 큐는 이와 동일한 방식으로 추가한다.

| 큐 이름 | 용도 | 위치 |
| --- | --- | --- |
| `EMAIL_QUEUE` | 이메일 발송 | `apps/api/src/email-event/` |
| `PUSH_EVENT_QUEUE` | 푸시 알림 발송 | `libs/common/src/push-event/` |
| `USER_PUSH_QUEUE` | 유저 푸시 토큰 관리 | `apps/api/src/user-push/` |
| `SMS_QUEUE` | SMS 발송 | `libs/common/src/push-event/` |

> 참고: `user-push` 큐에서 이미 `attempts: 3, backoff: { type: 'exponential', delay: 1000 }` 패턴 사용 중
> 

---

**아키텍처 결정: B안 채택 (Bull Queue 기반 중앙 큐 관리)**

| 안 | 설명 | 기각/채택 이유 |
| --- | --- | --- |
| A안 | BootpayService 내 Rate Limiter 내장 | 기각 — API 서버·스케줄러 등 멀티 프로세스 환경에서 인스턴스별 rate limit은 전체 합산 제어 불가 |
| **B안** | **Bull Queue 기반 중앙 큐 관리** | **채택** — 이미 팀이 동일 패턴 운영 중(학습 비용 없음), 신규 패키지 불필요, Redis 단일 큐로 멀티 인스턴스 합산 제어 가능, retry/backoff 기능 즉시 활용 |
| C안 | 결제 마이크로서비스 분리 | 기각 — 현재 규모 대비 공수 과다, 트랜잭션 경계 분리 복잡도 높음 |

---

**Bull Worker 실행 앱 결정: A안 채택 (API 서버)**

| 안 | 설명 | 기각/채택 이유 |
| --- | --- | --- |
| **A안** | **API 서버(`apps/api`)에서 Worker 실행** | **채택** — 주 서버로서 결제 도메인 로직과 가장 밀접. 기존 BootpayService, OrderCommonService 등 의존성 바로 활용 가능. Bull `limiter`는 Redis 기반으로 글로벌하게 적용되므로 스케일 아웃 시에도 합산 제어됨 |
| B안 | 스케줄러(`apps/scheduler`)에서 Worker 실행 | 기각 — 스케줄러는 이미 Cron 기반 배치 처리 담당. 환불 큐 Worker까지 추가 시 역할 과중. 스케줄러 장애가 결제 큐에도 영향 |
| C안 | 라운지(`apps/lounge`)에서 Worker 실행 | 기각 — 이벤트 소비 전용 앱이나, 결제 도메인 의존성을 라운지에 추가해야 하는 부담. 주 서버와의 코드 공유 복잡도 증가 |

---

**처리 흐름**

```
[스케줄러 Cron / API 서비스 / 어드민 서비스]
        ↓ enqueue
[Redis - PAYMENT_REFUND_QUEUE]
        ↓ dequeue (초당 최대 25건)
[Bull Worker - BootpayRefundProcessor]
        ↓ 성공
  DB 상태 업데이트
        ↓ 실패 (RC_CANCEL_SERVER_ERROR 등)
  exponential backoff 재시도 (최대 3회)
        ↓ 3회 모두 실패
  DLQ 이관 + Slack 알림 + DB PARTIAL_REFUND_FAILED 기록
```

---

**적용 범위 (큐 대상 vs 동기 유지)**

| PG 호출 유형 | 처리 방식 | 이유 |
| --- | --- | --- |
| `refund` (환불) | **Bull Queue 비동기** | 즉시 응답 불필요, 배치 집중 발생 |
| `requestSubscribeCardPayment` (정기결제) | **Bull Queue 비동기** | 스케줄러 배치 처리 |
| `destroyBillingKey` (빌링키 삭제) | **Bull Queue 비동기** | 즉시 응답 불필요 |
| `confirmReceipt` (결제 확정) | 동기 유지 + **인라인 재시도** | 유저 대기 중, 즉시 응답 필수 |
| `validateReceipt` / `getReceipt` (검증/조회) | 동기 유지 + **인라인 재시도** | 결제 흐름 내 즉시 필요 |
| `certificate` (본인인증) | 동기 유지 (재시도 없음) | 본인인증은 멱등성 보장 불가, 실패 시 유저에게 즉시 안내 |

---

**주요 기술적 결정**

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| Bull Worker 실행 앱 | **A안 채택 — API 서버(`apps/api`)** (상단 별도 비교 참고) | 주 서버로서 결제 도메인 의존성 바로 활용 가능. Bull limiter는 Redis 글로벌 적용으로 스케일 아웃 시에도 합산 제어됨 |
| 큐 처리 속도 | 초당 최대 25건 (`limiter: { max: 25, duration: 1000 }`) | PG 한도 30건 대비 5건 버퍼 확보 |
| 재시도 횟수 | 최대 3회 (`attempts: 3`) | 기존 user-push 큐와 동일 패턴 |
| 재시도 전략 | exponential backoff (`delay: 1000` → 1초·2초·4초) | 일시적 PG 과부하 회복 대기 |
| 멱등성 | Bootpay `cancel_id` 고유 키 (`cancel_retry_{jobId}`) | 이중 환불 방지. 기존 얼리버드 패턴(`cancel_earlybird_retry_{historyId}`) 동일 적용 |
| 완료 후 큐 항목 | `removeOnComplete: true` | 기존 push/email 큐와 동일 |
| 실패 후 큐 항목 | `removeOnFail: false` (DLQ 보존) | 실패 이력 추적 필요 |
| DLQ | 3회 실패 시 별도 큐 이관 + Slack 알림 | 수동 재처리 대상 명확화 |
| 모니터링 | Bull 큐 적체량, 실패율, DLQ 건수 지표 추가 | 운영 가시성 확보 |

---

**동기 유지 유형의 인라인 재시도 전략**

큐 적용이 불가능한 동기 유형(`confirmReceipt`, `validateReceipt`/`getReceipt`)은 `BootpayService` 내부에서 RC_CANCEL_SERVER_ERROR(9003) 등 Rate Limit 에러 수신 시 인라인 재시도를 수행한다.

| 항목 | 결정 |
| --- | --- |
| 재시도 대상 에러 | RC_CANCEL_SERVER_ERROR(9003), PG 서버 5xx |
| 재시도 횟수 | 최대 2회 (초기 호출 포함 총 3회) |
| 재시도 간격 | fixed 500ms (유저 대기 시간 최소화) |
| 최종 실패 시 | HTTP 에러 그대로 상위로 전파 → 유저에게 "잠시 후 다시 시도해 주세요" 안내 |
| 본인인증(`certificate`) | 재시도 없음 — 중복 인증 요청 방지 |

> 인라인 재시도는 동기 흐름을 최대 1.0초 추가 지연시킬 수 있으나, Rate Limit 순간 과부하 상황에서 성공 가능성을 높이는 효과가 있다.
> 

---

**관련 이슈**

- [WEBB-1272](https://munto.atlassian.net/browse/WEBB-1272) — 본 이슈
- [WEBB-1132](https://munto.atlassian.net/browse/WEBB-1132) — 얼리버드 부분 환불 대량 실패 (종료)
- [WEBB-1268](https://munto.atlassian.net/browse/WEBB-1268) — 스태프 소셜링 취소 신청 실패 (진행 중)

**API / ERD**

- **API 변경 없음**: 외부 노출 엔드포인트는 그대로 유지. 기존 환불/결제 API의 내부 구현만 동기 직접 호출 → Bull Queue enqueue로 교체
- **ERD 변경 없음**: 신규 테이블 추가 없음. DLQ 실패 이력은 Bull 자체 실패 이력(`removeOnFail: false`) + Slack 알림으로 관리하며, 기존 DB 상태값(`PARTIAL_REFUND_FAILED` 등) 재활용