# MSK 메시징 지연 발생 현황 파악 분석 보고서

분류: 보고서
작성자: 홍진영
최초 작성일: 2026년 4월 9일 오전 10:04
최근 수정일: 2026년 4월 9일 오전 10:27
문서 상태: Active
생성 일시: 2026년 4월 9일 오전 10:04
최종 편집자: 홍진영

## **MSK 메시징 지연 현황 파악**

[https://munto.atlassian.net/browse/WEBB-1212](https://munto.atlassian.net/browse/WEBB-1212)

---

## **1. 인프라 현황**

| **항목** | **값** |
| --- | --- |
| MSK 클러스터 | `production-kafka` (ap-northeast-2) |
| 브로커 | kafka.t3.small × 3 |
| Kafka 버전 | 3.9.x |
| ECS 서비스 | `munto_notification-prod` — Fargate 1 vCPU / 2GB, **현재 2인스턴스** |
| 브로커 로그 | CloudWatch `msk-production` (365일 보존) |

---

## **2. 브로커 자체 상태 — 정상**

| **지표** | **평균** | **최대** | **판정** |
| --- | --- | --- | --- |
| ProduceTotalTimeMsMean | ~2.5ms | 6.84ms | ✅ 정상 |
| UnderReplicatedPartitions | 0 | 0 | ✅ 정상 |
| OfflinePartitionsCount | 0 | 0 | ✅ 정상 |
| KafkaDataLogsDiskUsed | 5.8% | 7.1% | ✅ 여유 (50GB 중 ~3.5GB) |
| CpuUser | 3~4% | **64.2%** | ⚠️ 피크 시 스파이크 |
| MessagesInPerSec | 1~11 msg/s | **129 msg/s** | ⚠️ 피크 시 최대 60-100배 급증 |

> ***브로커 자체 지연은 없음** — 문제는 전적으로 컨슈머 쪽*
> 

---

## **3. 토픽별 파티션 현황 (핵심)**

| **토픽** | **파티션 수** | **RF** | **ISR** |
| --- | --- | --- | --- |
| pushEvent | **3** | 3 | 1,2,3 ✅ |
| pushEventMulticast | **3** | 3 | 1,2,3 ✅ |
| smsEvent | **1** 🚨 | 3 | 1,2,3 ✅ |
| emailEvent | 1 | 3 | 1,2,3 ✅ |
| ACTION_HISTORY | **1** ⚠️ | 3 | 1,2,3 ✅ |
| user-delete-event | 3 | 3 | 1,2,3 ✅ |

> *모든 파티션의 ISR = 3 → 복제 지연 없음. 문제는 파티션 수 자체*
> 

---

## **4. 컨슈머 그룹별 지연 현황 (7일 분석)**

| **컨슈머 그룹** | **토픽** | **7일 평균 TimeLag** | **7일 최대 TimeLag** | **MaxOffsetLag** | **판정** |
| --- | --- | --- | --- | --- | --- |
| notification-server | **pushEvent** | 17.1s | **35,260s (9.8시간)** | 3,410건 | 🚨 심각 |
| notification-server | **smsEvent** | 4.7s | **21,900s (6.1시간)** | 461건 | 🚨 심각 |
| notification-server | **pushEventMulticast** | 4.9s | 1,027s | **65,396건** | ⚠️ 주의 |
| notification-server | emailEvent | 0s | 0s | 0건 | ✅ 정상 |
| munto-log-streaming-server | ACTION_HISTORY | **7.0s (상시)** | 36s | 145건 | ⚠️ 경미 |
| dating-user-delete-consumer-group | user-delete-event | 0s | 0s | 0건 | ✅ 정상 |
| lounge | ACTION_HISTORY | 0s | 4s | - | ✅ 정상 |

---

## **5. 스파이크 패턴 분석**

```sql
pushEvent 지연 > 60s 구간: 7일간 44회 발생 (거의 매일)

주요 대형 스파이크:

2026-04-04 20:16 KST  →  16,020s (4.5시간)

2026-04-07 08:16 KST  →  35,260s (9.8시간) ← 최악

2026-04-08 20:16 KST  →   6,452s (1.8시간)

smsEvent 대형 스파이크:

2026-04-07 08:19 KST  →  21,900s (6.1시간) ← pushEvent와 동시 발생

2026-04-03 08:19 KST  →  13,830s (3.8시간)

트래픽 급증 시점: KST 12:16 (점심), 20:16 (저녁 사용자 피크)
```

→ MessagesInPerSec: 평소 1-11 msg/s → 피크 129 msg/s (최대 100배 급증)

---

## **6. 근본 원인**

### **원인 1 (주원인) — smsEvent 파티션 1개**

파티션 1개 = ECS 인스턴스가 몇 개든 1개만 소비

→ ECS 2개, 10개 전부 무의미 (나머지는 idle)

→ 단일 컨슈머가 순차 처리 중 외부 API(알리고 SMS) 지연 시 적체

### **원인 2 (주원인) — pushEvent/pushEventMulticast 파티션 3개 < 처리 부하**

파티션 3개 → ECS 2개가 각각 담당 (인스턴스1: 파티션 0,1 / 인스턴스2: 파티션 2)

피크 시 메시지 급증 → 파티션당 처리 속도가 수신 속도 못 따라감

### **원인 3 (코드) — Kafka consumer가 처리를 await로 블로킹**

*// push-message.consumer.ts*

@EventPattern('pushEvent')

async pushMessageEventKafkaConsumerHandler(data: any) {

await this.pushMessageService.pushEventHandler(data.value);

*// ↑ 이 처리가 완료될 때까지 해당 파티션의 다음 메시지 처리 안 됨*

}

`pushEventHandler` 내부에서 MongoDB insertMany + Redis 조회가 발생하고, `pushEventMulticastHandler`는 **FCM 전송까지 await** → 수천 명 수신자 시 수십 초 블로킹

### **원인 4 (보조) — t3.small 브로커 CPU 버스트 한계**

피크 시 CPU 64%까지 상승 (평소 3~4%)

t3.small은 CPU 크레딧 기반 → 지속적 부하 시 버스트 한계 도달 가능

---

## **7. 개선 조치 (우선순위 순)**

### **1. smsEvent 파티션 수 3으로 증가 — 운영 중단 없이 가능**

> *파티션 증가는 운영 중 무중단으로 가능. ECS 재시작 없이 자동 리밸런싱됨. **효과**: smsEvent 지연 즉시 해소, ECS 인스턴스별 1파티션 담당 가능*
> 

### **2. CloudWatch 알람 설정 — 현재 알람 없음**

대상 지표: EstimatedMaxTimeLag

pushEvent > 300s → 즉시 알림 (SNS → Slack)

smsEvent  > 300s → 즉시 알림

조치 전까지 지연 발생을 인지하지 못하고 있었음

### **3. ECS 인스턴스 2 → 3으로 증가**

현재: 파티션 3개 / ECS 2개 → 인스턴스당 최대 2파티션 담당

개선: 파티션 3개 / ECS 3개 → 인스턴스당 정확히 1파티션 담당 (최적)

효과: pushEvent, pushEventMulticast 처리 병렬성 향상

주의: ECS 4개 이상은 현재 파티션 구성에서 무의미 (idle 발생)

### **4. pushEventMulticast FCM 호출 비동기화**

```sql
*// 현재: await로 FCM 전송 완료까지 파티션 블로킹*

const results = await Promise.all(promises);  *// ← 문제*

*// 개선안 A: fire-and-forget으로 변경*

Promise.all(promises).catch(err => this.logger.error(err));

*// 개선안 B: Kafka consumer → Bull Queue 즉시 적재*

*// consumer에서 처리 로직 대신 Bull Queue에 job만 추가*

*// → consumer lag 즉시 0으로 수렴, 실제 처리는 queue worker가 담당*
```

### **📋 [중기] MSK 브로커 인스턴스 업그레이드 검토**

현재: kafka.t3.small (CPU 버스트 한계, 피크 64%)

개선: kafka.t3.medium (연계: AWSI-55)

시점: 파티션/코드 개선 후에도 CPU 스파이크 지속 시 진행

---

## **8. 조치 효과 예측**

| **조치** | **예상 효과** | **난이도** |
| --- | --- | --- |
| smsEvent 파티션 1→3 | smsEvent 지연 90% 이상 감소 | 낮음 (CLI 1줄) |
| CloudWatch 알람 설정 | 즉시 인지 가능 | 낮음 |
| ECS 2→3 인스턴스 | pushEvent 처리량 1.5배 향상 | 낮음 |
| ACTION_HISTORY 파티션 1→3 | log-streaming 7s 지연 해소 | 낮음 |
| pushEventMulticast 비동기화 | 멀티캐스트 렉 스파이크 제거 | 중간 |
| t3.medium 업그레이드 | CPU 버스트 여유 확보 | 중간 (유지보수 필요) |

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.09 | 홍진영 | 최초 작성 |
| v1.0.1 |  |  |  |

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