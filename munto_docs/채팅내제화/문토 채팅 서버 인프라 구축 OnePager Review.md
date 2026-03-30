# 문토 채팅 서버 인프라 구축 OnePager 리뷰

**리뷰 대상**: 문토 채팅 서버 인프라 구축 OnePager v1.0.0 (김범진)  
**리뷰 작성일**: 2026-03-30  

---

## Comment 1: CDK 구축 전략이 빠져 있습니다

인프라를 어떻게 프로비저닝할 것인지 언급이 없습니다. 우리 표준은 CDK이고, 현재 `aws-cdk-infra/cdk` 레포에 이미 구축 패턴이 있으므로 이를 따라야 합니다.

현재 CDK 구조상 채팅 서비스는 다음과 같이 배치될 수 있습니다:

- **ECS + ALB + ECR**: `munto-service/` 아래에 채팅 서비스 설정 추가 — `context/{env}/services/` 에 `munto-chat.json` 추가하면 기존 `EcsEcrServiceBuilder`로 ECS Service, ALB, ECR을 일괄 생성 가능
- **Redis**: `munto-service/` 의 `context/{env}/environment.json` 의 `elasticache` 배열에 채팅 전용 Redis 항목 추가 → `MuntoServiceStack.createRedisCluster`로 생성
- **RDS**: Aurora 클러스터 공유이므로 `shared-resources/`의 기존 클러스터 참조, DB 생성은 Prisma migration으로 처리
- **S3**: `shared-resources/` 또는 `munto-service/` 내에서 채팅 이미지 버킷 추가

이 부분은 홍진영님과 협의하여 CDK 스택 구성을 확정해 주세요. OnePager에 CDK 구축 계획(어디에 어떤 리소스를 추가할 것인지)을 명시해야 합니다.

---

## Comment 2: 마이그레이션 1순위가 SRS와 다릅니다

SRS에서는 **데이팅 DM**이 1순위(확정)로 되어 있는데, OnePager에서는 **문토 DM**이 1순위로 변경되어 있습니다. userId 통합 불필요라는 기술적 근거는 이해하지만, SRS에서 데이팅 DM을 확정한 이유(별도 패키지 분리, 30일 만료 자연 소멸, 이중 유지 부담 최소)와 상충합니다.

우선순위 변경 시 SRS 업데이트를 병행해야 하고, 문토 DM 우선 시 SRS 7.6.8의 DM 어뷰징 방지 정책(현재 TBD)을 먼저 확정해야 합니다.

---

## Comment 3: S3 버킷 구성이 누락되어 있습니다

SRS와 swagger에서 이미지 Presigned URL 발급(`POST /upload/presigned-url`)을 정의하고 있는데, 인프라 구성표에 S3 버킷이 빠져 있습니다. 버킷 이름, 라이프사이클 정책(SRS 6.5.6: 30일 사용자 조회 → 90일 백오피스 → 1년 Cold Storage) 등을 추가해 주세요.

---

## Comment 4: Push Worker 배포 전략을 명시해 주세요

SRS에서 Push Worker는 채팅 서버와 같은 레포에서 별도 프로세스로 실행한다고 되어 있습니다. ECS 관점에서 동일 Task Definition 내 sidecar 컨테이너로 넣을 것인지, 별도 ECS Service로 구성할 것인지 명시해 주세요. 독립 스케일링이 필요하므로 별도 Service가 권장됩니다.

---

## Comment 5: 전환 순서에 위험이 있습니다

현재 순서:

> 3. 기존 `munto-be-chat-prod` 종료 → 4. Route53 레코드 교체

이렇게 하면 3~4번 사이에 `chat.munto.kr` 요청이 실패합니다. 실사용 트래픽이 없더라도 순서를 바꿔야 안전합니다:

> Route53 레코드를 신규 ALB로 교체 → 정상 동작 확인 → 기존 서비스 종료

---

## Comment 6: ALB Sticky Session이 꼭 필요한지 확인해 주세요

Socket.IO v4는 클라이언트에서 `transports: ['websocket']`으로 설정하면 HTTP Long Polling 단계를 건너뛰므로 Sticky Session이 불필요합니다. 클라이언트 SDK(`munto_chat_sdk`)에서 WebSocket Only로 설정할 계획이라면 Sticky Session 없이도 동작 가능하므로, 어떤 방식을 채택할 것인지 확인이 필요합니다.

---

## Comment 7: ALB WebSocket Idle Timeout 설정

ALB 기본 Idle Timeout은 60초인데, Socket.IO `pingInterval`이 25초이므로 정상적인 경우 끊기지 않지만, 네트워크 지연 등을 고려하면 **300초 이상**으로 설정하는 것이 안전합니다. 인프라 구성 시 반영해 주세요.

---

## Comment 8: Redis 구성 상세가 필요합니다

`cache.t4g.small × 2`가 Primary-Replica(Cluster Mode Disabled)인지, Cluster Mode Enabled인지 명시해 주세요. Socket.IO Redis Adapter는 일반적으로 Cluster Mode Disabled에서 동작합니다. 기존 CDK에서 `CfnCacheCluster`로 생성하는 패턴을 따르되, 채팅용 설정(Pub/Sub + Streams)에 맞는 구성을 확인해야 합니다.

---

## Comment 9: 비용 예측을 추가하면 좋겠습니다

Sendbird 비용 절감이 주요 목적 중 하나인데, 자체 인프라 월 비용 예측이 없습니다. 대략적으로:

- ECS Fargate (2vCPU/4GB × 2) ~$120, Redis ~$40, ALB ~$25, S3/CloudWatch 등 ~$30
- **합계 약 $200~230/월** 수준

Sendbird 월 비용 대비 절감액을 보여주면 설득력이 있을 것 같습니다.
