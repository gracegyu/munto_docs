# 문토 채팅 서버 인프라 구축 OnePager v1.0.1 리뷰

**리뷰 대상**: 문토 채팅 서버 인프라 구축 OnePager v1.0.1 (김범진)
**리뷰 작성일**: 2026-04-07

---

## 1. 이전 리뷰 의견 반영 확인

| # | 요청 사항 | 반영 여부 |
| --- | --- | --- |
| Comment 4 | SRS를 Redis Streams로 수정 | ✅ SRS에서 반영 완료 |
| Comment 5 | 전환 순서 변경 (Route53 교체 → 기존 종료) | ✅ v1.0.1에서 순서 수정됨 |
| Comment 6 | Sticky Session 필요 여부 확인 | ✅ "불필요 (WebSocket Only)" 명시 |
| Comment 7 | ALB Idle Timeout 300초 설정 | ✅ 명시됨 |
| Comment 8 | Redis 구성 상세 | ✅ "Primary-Replica, Cluster Mode Disabled, 노드 2개" 명시 |
| Comment 1 | CDK 구축 전략 추가 | ❌ 미반영 |
| Comment 2 | 마이그레이션 1순위 SRS와 통일 | ✅ "데이팅 DM을 1순위로 전환" 명시 |
| Comment 3 | S3 버킷 구성 추가 | ❌ 미반영 |
| Comment 9 | 비용 예측 추가 | ❌ 미반영 |

**반영 6건 / 미반영 3건**

---

## 2. 미반영 사항 리뷰

### Comment 1 (P0): CDK 구축 전략

인프라를 어떻게 프로비저닝할 것인지가 누락되어 있습니다. 우리 표준은 CDK이고 `aws-cdk-infra` 레포에 기존 패턴이 있으므로, OnePager에 다음을 명시해야 합니다:

- ECS + ALB + ECR: `munto-service/context/{env}/services/`에 `munto-chat.json` 추가
- Redis: `environment.json`의 `elasticache` 배열에 채팅 전용 Redis 항목 추가
- RDS: 기존 Aurora 클러스터 참조, DB 생성은 Prisma migration 처리
- S3: 채팅 이미지 버킷 추가

홍진영님과 협의하여 CDK 스택 구성을 확정해 주세요.

### Comment 3 (P0): S3 버킷 구성

SRS에서 이미지 Presigned URL 발급(`POST /upload/presigned-url`)과 데이터 보관 규칙(30일 → 90일 → 1년 Cold Storage)이 정의되어 있는데, 인프라 구성표에 S3 버킷이 빠져 있습니다.

- S3: `munto-chat-images` (가칭), 신규, 라이프사이클 정책 적용

### Comment 9 (P2): 비용 예측

비용 절감이 프로젝트의 주요 근거인데 자체 인프라 월 비용 예측이 없습니다. 대략적인 추정:

- ECS Fargate (2 Task): ~$120
- Redis (t4g.small × 2): ~$40
- ALB: ~$25
- 기타 (CloudWatch, S3 등): ~$30
- **합계: ~$200~230**

Sendbird 현재 MAU 기준 월 비용과 비교를 추가하면 의사결정자에게 설득력이 높아집니다.

---

## 3. 추가 리뷰 의견

### Comment 10 (P1): Push Worker ECS 배포 방식

SRS 6.1.4에서 "채팅 서버와 같은 레포에 Push Worker를 포함하고, 별도 프로세스로 실행"이라고 되어 있는데, ECS에서 어떻게 배포할 것인지가 OnePager에 없습니다:

- **옵션 A**: 같은 ECS Service 내 Task에서 두 프로세스 실행 (sidecar 패턴)
- **옵션 B**: 별도 ECS Service로 Push Worker 배포 (독립 스케일링 가능)

어느 방식인지 인프라 구성표에 명시해 주세요.

### Comment 11 (P2): 변경 이력 가독성

v1.0.1 변경 이력에 변경 내용이 줄바꿈 없이 한 줄로 되어 있어 가독성이 떨어집니다. 각 항목을 구분해서 기재하면 좋겠습니다.

---

## 4. 액션 아이템 요약

| 우선순위 | 내용 | 비고 |
| --- | --- | --- |
| **(P0)** | CDK 구축 전략 추가 | 홍진영님 협의 필요 |
| **(P0)** | S3 버킷 인프라 구성표에 추가 | SRS와 정합성 |
| **(P1)** | Push Worker ECS 배포 방식 명시 | 옵션 A or B |
| **(P2)** | 비용 예측 추가 | Sendbird 비교 |
| **(P2)** | 변경 이력 가독성 개선 | 포맷팅 |
