# 채팅 SRS — Kafka → Redis Streams 변경 요청

**대상**: 채팅 서비스 내재화 SRS (김범진)  
**작성일**: 2026-03-30  

---

## Comment: 푸시 파이프라인을 Kafka → Redis Streams + Push Worker로 변경해 주세요

현재 SRS에서는 오프라인 사용자 푸시 발송에 **기존 Kafka 인프라를 재사용**하는 구조로 되어 있습니다 (2.1 시스템 아키텍처, 2.2 전체 시스템 구성, 3.1.1 하드웨어 환경, 6.1.3 Kafka 선택 근거 등 문서 전반에 걸쳐 Kafka 기반으로 작성됨).

인프라 구축 OnePager에서는 **Redis Streams + Push Worker** 방식으로 되어 있는데, 이 구조가 채팅 서비스에 더 적합하므로 SRS도 이에 맞게 수정해 주세요.

**변경 이유:**

1. **Kafka는 이 규모에서 과잉입니다.** 채팅 푸시는 1:1 또는 소규모 그룹 대상으로 발생 빈도가 낮습니다. Kafka의 대용량 파티셔닝, Consumer Group 리밸런싱 같은 기능은 필요 없습니다.

2. **이미 채팅 전용 Redis를 띄웁니다.** OnePager에서 Socket.IO Redis Adapter용으로 채팅 전용 Redis를 신규 생성하기로 했으므로, 그 Redis 안에 Streams를 함께 사용하면 추가 인프라 비용 없이 푸시 파이프라인이 구성됩니다.

3. **MSA 독립성이 높아집니다.** Kafka를 사용하면 채팅 서비스가 기존 Kafka 인프라에 의존하게 되는데, Redis Streams로 가면 채팅 서비스가 자체 Redis만으로 완결되어 독립적인 MSA가 됩니다.

4. **Redis Streams도 기능적으로 충분합니다.** Consumer Group, ACK, 재시도 등 Kafka에서 필요했던 기능을 모두 지원합니다.

**수정이 필요한 SRS 위치:**

- **2.1 시스템 아키텍처 다이어그램**: Kafka → Redis Streams, Push Server → Push Worker로 변경
- **2.2 전체 시스템 구성**: "Kafka: 푸시 알림 이벤트 발행" → "Redis Streams: 푸시 알림 이벤트 발행"
- **3.1.1 하드웨어 환경**: "AWS MSK 또는 기존 Kafka 인프라 활용" 항목 삭제
- **3.1.2 소프트웨어 환경**: "Kafka / kafkajs" 항목 삭제
- **6.1.3 Kafka 선택 근거 섹션**: Redis Streams 선택 근거로 전면 교체
- **그 외 Kafka/Push Server 언급 전체**: Redis Streams/Push Worker로 용어 통일

**용어 통일:** "Push Server"는 외부 요청을 받는 서버에 가까운 표현이고, 메시지 큐에서 소비하여 처리하는 프로세스는 **"Push Worker"**가 더 적절합니다. SRS 전체에서 Push Worker로 통일해 주세요.
