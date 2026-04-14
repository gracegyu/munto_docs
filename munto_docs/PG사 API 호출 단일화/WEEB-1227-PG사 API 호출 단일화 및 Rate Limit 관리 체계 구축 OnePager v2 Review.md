# PG사 API 호출 단일화 및 Rate Limit 관리 체계 구축 OnePager v2 Review

- **대상 문서:** `WEEB-1227-PG사 API 호출 단일화 및 Rate Limit 관리 체계 구축 OnePager v2.md` (2026-04-13, 김범진)
- **리뷰 관점:** v1 대비 변경 사항 타당성, 아키텍처 결정 근거, 동시성 제어 정합성, 운영 안정성, 구현 세부사항 완결성
- **리뷰일:** 2026-04-13

---

## 1. 전체 평가

v1에서 Bull Queue 기반 중앙 큐 관리 방식을 제안했으나, v2에서는 Redis 글로벌 Rate Limiter (BootpayService 내장) 방식으로 전환했습니다. v1 리뷰에서 제기된 핵심 문제들(멀티 인스턴스 Bull limiter 검증 미비, 비동기 전환 후 결과 전달 방식 미정의, 트랜잭션 일관성 등)이 v2에서는 **구조적으로 해소**되었습니다. 기존 호출 코드 변경 없이 BootpayService 내부만 수정하는 접근이므로, 회귀 리스크가 크게 낮아졌고 공수도 1주로 단축된 점이 좋습니다.

특히 다음이 잘 개선되었습니다:

- v1의 P0-R01(멀티 인스턴스 limiter 검증 미비) → Redis INCR 기반 글로벌 카운터로 원자적 합산 제어가 보장되어 검증 불확실성이 제거됨
- v1의 P0-R02(비동기 전환 후 결과 전달 방식 미정의) → 동기 호출을 그대로 유지하므로 문제 자체가 소멸
- v1의 P0-R03(호출 지점 전수 목록 미비) → BootpayService 9개 메서드, 호출 지점 전체 맵(apps/api, apps/scheduler)을 상세히 정리
- v1의 P1-R04(트랜잭션 일관성) → 동기 흐름 유지로 기존 트랜잭션 구조 그대로 활용
- v1의 P1-R05(DLQ 구체성 부족) → DLQ 개념 자체가 제거되어 복잡도 감소

아래는 v2에서 새롭게 보완이 필요하다고 판단되는 항목입니다.

---

## 2. 주요 리뷰 의견

### R-01 (P0). 3초 대기 초과 후 "그래도 호출 진행"하는 정책의 안전성 검토

```
// 최대 대기 초과 — 그래도 호출 시도 (한도 초과보다 서비스 중단이 더 나쁨)
this.logger.warn('Rate limit wait timeout exceeded, proceeding anyway');
```

"Rate Limit보다 서비스 중단이 더 치명적"이라는 판단 자체는 합리적이나, 이 정책이 **Rate Limiter를 무력화시키는 탈출구**가 되는 시나리오를 고려해야 합니다.

**문제 시나리오:**

현재 `acquireSlot()`은 3초 동안 슬롯을 못 잡으면 "그래도 호출 진행"합니다. 정상 상황에서는 이런 일이 거의 없지만, 배치 잡이 몰리는 순간에는 여러 호출이 동시에 3초 대기 → 동시에 force proceed하는 상황이 발생할 수 있습니다.

예를 들어 10건의 호출이 동시에 슬롯을 못 잡고 대기에 들어갔다면, 3초 후 10건이 한꺼번에 PG API를 호출합니다. 이때 Rate Limiter 카운터를 거치지 않고 나가므로, 이 순간만큼은 Rate Limiter가 없는 것과 같습니다.

**근본 원인:** force proceed 시 `acquireSlot()`이 그냥 `return`하면서 Redis 카운터를 증가시키지 않기 때문에, 다른 프로세스들이 이 호출의 존재를 모릅니다.

**권장 사항:**

force proceed 시에도 `INCR`을 실행한 뒤 호출을 진행하면 됩니다. 이렇게 하면 force proceed된 호출도 카운터에 반영되어, 동시에 force proceed하는 건수가 늘어날수록 다른 프로세스들의 대기가 자연스럽게 길어지면서 부하가 분산됩니다.

```typescript
// 변경 전: 카운터 없이 그냥 통과
this.logger.warn('Rate limit wait timeout exceeded, proceeding anyway');
return;

// 변경 후: 카운터에 반영하고 통과
this.logger.warn('Rate limit wait timeout exceeded, proceeding anyway');
const key = `bootpay:rate:${Math.floor(Date.now() / 1000)}`;
await this.redis.incr(key);
return;
```

### R-02 (P1). 재시도 시 acquireSlot을 다시 호출하는데, 재시도 간 지연과 슬롯 대기가 중첩되는 문제

`executeWithRateLimit` 래퍼에서 Rate Limit 에러 발생 시:

```
await sleep(retryDelayMs);      // 500ms 고정 대기
await this.acquireSlot();        // 최대 3초 대기 가능
```

최악의 경우 재시도 1회당 500ms + 3000ms = 3.5초가 소요됩니다. 최대 2회 재시도 시 **초기 호출(3초) + 재시도 1(3.5초) + 재시도 2(3.5초) = 10초**까지 유저 응답이 지연될 수 있습니다. `confirmReceipt`처럼 유저가 결제 확정을 기다리는 상황에서 10초 지연은 UX에 심각한 영향을 줍니다.

**권장 사항:**

- 동기 호출(유저 대기) 유형에 대해 **전체 타임아웃**(예: 5초)을 설정하여, acquireSlot 대기 + 재시도 합산이 이 값을 넘지 않도록 제한
- 또는 유저 대기 유형은 재시도 횟수를 1회로 줄이거나, acquireSlot의 maxWaitMs를 더 짧게(예: 1초) 설정하는 차등 전략

### R-03 (P1). 스케줄러 배치 청크 패턴의 청크 크기/딜레이와 Rate Limiter의 상호작용 분석 보강 필요

문서에서 청크 패턴과 Rate Limiter의 "역할 분담"을 잘 설명하고 있으나, 두 계층이 동시에 작동할 때의 실제 throughput 분석이 부족합니다.

현재 설정:
- 청크: 5건 병렬 + 300ms 대기
- Rate Limiter: 초당 25건

청크 5건이 각각 `getReceipt` + `refund`를 호출하면 순간 10건의 PG 호출이 발생합니다. 300ms 대기 후 다음 청크에서 또 10건. 즉 1초 내에 약 3개 청크 = 30건의 PG 호출이 발생할 수 있습니다. Rate Limiter가 25건에서 차단하겠지만, **6개 배치 잡이 동시에 실행되는 cron 겹침 상황**에서는 어떻게 되는지 분석이 없습니다.

**권장 사항:**

- 스케줄러 배치 잡들의 cron 스케줄이 겹치는 최악의 시나리오(예: 10분 cron 3개가 동시 실행)에서의 예상 PG 호출량 추정
- 필요 시 배치 잡 간 cron 시간을 분산(stagger)하는 방안 언급
- 청크 크기를 동적으로 조절하는 것은 과도하더라도, cron 스케줄 겹침에 대한 인지를 문서에 남겨두면 운영 시 도움이 됨

### R-04 (P1). `getAccessToken`의 Rate Limit 카운팅 제외 근거가 "인스턴스당" 기준인데, 향후 스케일 아웃 시 재검토 필요

> `getAccessToken`은 이미 메모리 캐싱(25분 TTL)이 적용되어 있어 인스턴스당 시간당 최대 2~3회 수준이다. Rate Limit 카운팅에서 제외한다.

현재 3프로세스 기준 시간당 최대 6~9회로 무시 가능하지만, 메모리 캐싱이므로 **인스턴스 수가 늘어나면 비례하여 증가**합니다. 또한 배포 시 모든 인스턴스가 동시 재시작하면 캐시가 cold start되어 순간적으로 인스턴스 수만큼의 `getAccessToken` 호출이 동시 발생합니다.

**권장 사항:** 현재 규모에서는 문제없으나, 향후 인스턴스 증설이나 배포 시 cold start burst 가능성을 "주요 기술적 결정" 테이블의 비고란에 기재해두면 좋겠습니다.

### R-05 (P1). 재시도 대상 에러에 네트워크 타임아웃 포함 여부 미명시 (v1 리뷰 R-09 미반영)

v1 리뷰에서 제기했던 "네트워크 타임아웃(ETIMEDOUT, ECONNRESET 등)이나 PG 서버 무응답 상황의 재시도 대상 포함 여부"가 v2에서도 반영되지 않았습니다.

> 재시도 대상 에러: RC_CANCEL_SERVER_ERROR(9003), PG 서버 5xx

`isRateLimitError(error)` 메서드가 어떤 에러를 매칭하는지 명시가 필요합니다. 특히:

- Bootpay SDK/HTTP 클라이언트의 타임아웃 에러
- DNS resolution 실패
- Connection refused / reset

이런 네트워크 레벨 에러가 재시도 대상인지 아닌지에 따라 자동 복구 범위가 크게 달라집니다.

**권장 사항:** "호출 유형별 적용 전략" 테이블 또는 별도 항목으로 `isRateLimitError`가 매칭하는 에러 목록을 명시하고, 네트워크 에러 포함 여부를 확정

### R-06 (P1). 모니터링 항목에 "Rate Limiter 실효성 검증" 지표 추가 필요

모니터링 테이블에 대기 발생, 대기 초과, 재시도, 최종 실패에 대한 로그/알림이 잘 정리되어 있습니다. 그런데 Rate Limiter가 **실제로 PG Rate Limit 초과를 방지하고 있는지** 검증하는 지표가 없습니다.

**권장 사항:** 아래 지표를 모니터링 항목에 추가 검토

| 항목 | 구현 |
| --- | --- |
| 초당 실제 PG 호출 수 | Redis 카운터 값을 주기적으로 샘플링하여 초당 25건 근접 빈도 추적 |
| PG Rate Limit 에러(9003) 발생 빈도 | Rate Limiter 도입 전후 비교를 위한 기준선 지표 |

이 지표가 있어야 Rate Limiter 도입 효과를 정량적으로 검증할 수 있고, limiter 한도(25건) 조정이 필요한 시점을 판단할 수 있습니다.

---

## 3. 경미한 사항

### R-07 (P2). 관련 이슈 번호 불일치 (v1 리뷰 R-10과 동일)

v1에서도 지적했으나, v2에서도 동일하게 `WEBB-1272`로 기재되어 있습니다. Jira 티켓이 `WEEB-1227`인지 `WEBB-1272`인지 확인이 필요합니다.

### R-08 (P2). `executeWithRateLimit` 래퍼의 for 루프에서 명시적 return 누락

```typescript
for (let attempt = 0; attempt <= (retryable ? maxRetries : 0); attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      // ...
      throw error;
    }
  }
  // 여기 도달 시 return이 없음 → TypeScript에서 undefined 반환
}
```

모든 경로에서 `return` 또는 `throw`가 되긴 하지만, TypeScript strict 모드에서 경고가 발생할 수 있습니다. 루프 종료 후 unreachable 코드로 `throw new Error('Unexpected state')` 등을 추가하면 방어적입니다.

---

## 4. 액션 아이템 요약

| 우선순위 | # | 내용 | 비고 |
| --- | --- | --- | --- |
| **(P0)** | R-01 | 3초 대기 초과 후 force proceed 시 thundering herd 방지 전략 | 서킷 브레이커 또는 force proceed 시에도 카운터 반영 |
| **(P1)** | R-02 | 유저 대기 유형의 전체 타임아웃 설정 (acquireSlot + 재시도 합산 상한) | 최악 10초 응답 지연 가능 |
| **(P1)** | R-03 | 배치 잡 cron 겹침 시나리오에서의 PG 호출량 분석, cron 시간 분산 검토 | 6개 배치 잡 동시 실행 시 부하 |
| **(P1)** | R-04 | getAccessToken 제외 근거에 스케일 아웃/배포 cold start 시나리오 주석 추가 | 현재는 문제없으나 미래 참고용 |
| **(P1)** | R-05 | 재시도 대상 에러 범위 확정 — 네트워크 타임아웃 포함 여부 명시 | v1 리뷰 R-09 미반영 사항 |
| **(P1)** | R-06 | Rate Limiter 실효성 검증 지표 추가 (초당 실제 호출 수, 9003 에러 빈도) | 도입 효과 정량 검증용 |
| **(P2)** | R-07 | 관련 이슈 번호 확인 (WEBB-1272 vs WEEB-1227) | v1 리뷰 R-10과 동일 |
| **(P2)** | R-08 | executeWithRateLimit for 루프 종료 후 방어 코드 추가 | TypeScript strict 모드 대응 |

---

## 5. 결론

v1(Bull Queue 방식)에서 v2(Redis 글로벌 Rate Limiter 방식)로의 전환은 **올바른 방향**입니다. v1의 핵심 문제였던 비동기 전환에 따른 결과 전달, 트랜잭션 일관성, 멀티 인스턴스 limiter 검증 등이 v2에서는 구조적으로 해소되었습니다. "기존 호출 코드 변경 없음"이라는 점이 가장 큰 장점으로, 회귀 리스크를 최소화하면서 15개 이상의 호출 지점을 한번에 커버합니다.

v2의 P0 의견 1건(force proceed thundering herd)은 **구현 시 반드시 검토**가 필요하지만, 아키텍처 방향을 바꿀 수준은 아닙니다. P1 의견들도 설정값 조정이나 문서 보강 수준이므로, 전체적으로 **v1 대비 완성도가 크게 개선**되었으며, 위 피드백을 반영하면 개발 착수 가능한 수준입니다.
