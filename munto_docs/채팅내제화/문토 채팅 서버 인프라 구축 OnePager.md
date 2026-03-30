# 문토 채팅 서버 인프라 구축 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 3월 30일 오전 11:53
최근 수정일: 2026년 3월 30일 오후 1:01
문서 상태: Active
생성 일시: 2026년 3월 30일 오전 11:53
최종 편집자: 김범진

create by: 김범진

Project Name : 문토 채팅 서버 인프라 구축 (CHAT001~CHAT005)

Date : 2026-03-30

Submitter Info : 김범진 / 개발팀

Project Description : 기존 Sendbird 기반 채팅 서비스를 자체 구축 채팅 서버(NestJS + Socket.IO + PostgreSQL + Redis)로 전환하기 위한 인프라를 신규 구성한다. 문토 DM을 1순위로 전환하고, 이후 소셜링/클럽/챌린지/데이팅 DM까지 단계적으로 마이그레이션하여 Sendbird 계약을 완전 해지한다. 채팅 서버는 문토 백엔드의 사용자 ID 체계(문토 userId)를 기반으로 인증을 처리하며, AWS ECS Fargate 위에서 독립 MSA로 운영한다.

Business and Marketing Justification :

- **비용 절감**: Sendbird는 MAU 기반 과금으로, 사용자 증가 시 비용이 선형으로 증가한다. 자체 서버 전환 시 Sendbird 월정액을 완전 절감할 수 있다.
- **커스터마이징 자유도**: Sendbird API 제약으로 구현하지 못했던 기능(읽음 처리 고도화, 금칙어 모니터링, 채팅방별 알림 설정 등)을 자체 서버에서 자유롭게 구현한다.
- **문토 DM 우선 전환**: 문토 DM은 문토 백엔드와 동일한 userId 체계를 사용하므로 별도 사용자 식별 통합 없이 전환이 가능하다. 파일럿 효과로 자체 채팅 시스템의 안정성을 검증한 뒤 소셜링/클럽/챌린지/데이팅 DM을 순차 전환한다.
- **데이팅 서비스 확장 대비**: 데이팅 DM 채팅방 전환은 2순위로 진행하되, 데이팅 서비스 확장 전 선제적 전환으로 Sendbird 비용 증가를 방지한다.

Risk Assessment :

| 리스크 | 영향도 | 대응 방안 |
| --- | --- | --- |
| **기존 `munto-be-chat-prod` 종료** | 낮음 | 앱 코드 분석 결과 소켓 호출은 존재하나 실질적인 동작이 없음을 확인. 신규 서비스 준비 완료 후 기존 인스턴스를 즉시 종료하고 신규 ALB로 Route53 레코드를 교체한다. |
| **Aurora DB 공유 시 쿼리 간섭** | 중간 | 채팅 전용 DB를 Aurora 클러스터 내 별도 생성. Connection Pool 상한을 설정하여 기존 문토 API에 영향 없도록 제한. |
| **Redis 신규 구성 시 초기 안정화 지연** | 낮음 | `cache.t4g.small` 수준으로 시작 후 Socket.IO Adapter 연결 수와 Redis Streams 처리량을 CloudWatch로 모니터링하며 스케일업. |
| **CI/CD 파이프라인 미비 시 배포 지연** | 중간 | GitHub Actions → ECR → ECS 배포 파이프라인을 인프라 구성 단계에서 선행 구성. 배포 자동화 없이 수동 배포 금지. |
| **문토 DM 마이그레이션 실패** | 높음 | Sendbird Export API로 메시지 추출 후 자체 DB 이관. 이관 검증 완료 후 트래픽 전환. 문제 발생 시 앱 롤백(v1.x) + Sendbird 복귀. |

Resource and Scheduling Details : N/A

Technical Description :

**기술 스택:**

- 채팅 서버: NestJS (Node.js 20+) + Socket.IO v4 + Prisma ORM
- DB: PostgreSQL (Aurora) + Redis (ElastiCache)
- 인프라: AWS ECS Fargate + ECR + ALB + SSM Parameter Store + CloudWatch
- CI/CD: GitHub Actions → ECR → ECS
- Mobile SDK: Flutter (`munto_chat_sdk`)

**아키텍처:**

- MSA 아키텍처로, `munto-chat-backend` 레포지토리로 독립 운영한다.
- 문토 백엔드의 JWT(`JWT_KEY` 공유)를 그대로 검증하여 인증을 처리하며, 사용자 식별은 문토 userId를 SSOT(Single Source of Truth)로 사용한다.
- Socket.IO Redis Adapter로 다중 서버 간 메시지를 동기화하고, Redis Streams + Push Worker로 오프라인 사용자에게 FCM/APNs 푸시를 발송한다.

**API**

- Swagger: https://github.com/Munto-dev/chat-document/blob/development/api/swagger.yaml

**ERD**

- PostgreSQL DDL: https://github.com/Munto-dev/chat-document/blob/development/database/erd.md

---

**인프라 구성 결정 사항:**

### RDS (PostgreSQL)

|  | **1안: Aurora 클러스터 공유 (신규 DB 추가) (추천**✅**)** | 2안: RDS 신규 인스턴스 생성 |
| --- | --- | --- |
| **방식** | 기존 `munto-prod-api-db-aurora` 클러스터 내 채팅 전용 DB 생성 | 채팅 서버 전용 RDS PostgreSQL 인스턴스 신규 생성 |
| **비용** | 추가 비용 없음 (클러스터 공유) | 인스턴스 비용 추가 발생 |
| **격리** | DB 수준 격리. Connection Pool 상한 관리 필요 | 완전 격리. 기존 서비스 쿼리 간섭 없음 |
| **운영** | 기존 RDS 운영 절차 재사용 가능 | 별도 백업/모니터링 설정 필요 |
- 1안 추천
    - Aurora 클러스터가 이미 r6g.large × 2로 운영 중이며 여유가 있다.
    - 채팅 초기 트래픽 규모에서 별도 인스턴스 비용은 불필요하다.
    - 트래픽 급증 시 2안으로 분리한다.

### Redis (ElastiCache)

|  | 1안: 기존 Redis 재사용 | 2안: 채팅 전용 Redis 신규 생성(추천✅) |
| --- | --- | --- |
| **방식** | `prod-munto-redis-2` 재사용 | 채팅 전용 ElastiCache Redis 클러스터 신규 생성 (cache.t4g.small × 2) |
| **비용** | 추가 비용 없음 | 약 $30~50/월 추가 |
| **격리** | 키 접두사(prefix)로 논리적 격리. 메모리/연결 수 공유로 간섭 가능 | 완전 격리. Socket.IO Adapter + Redis Streams를 채팅 전용으로 운용 |
| **안정성** | 채팅 트래픽 증가 시 기존 문토 서비스 Redis에 영향 줄 수 있음 | 채팅 장애가 기존 서비스에 전파되지 않음 |
- 2안 추천
    - Socket.IO Adapter의 Pub/Sub과 Redis Streams는 채팅 특화 패턴
    - 기존 문토 Redis와 혼재 시 키 충돌 및 메모리 관리가 복잡해진다.

### ECS (서비스/태스크)

|  | 1안: 기존 `munto-be-chat-prod` 서비스 재사용 | 2안: ECS 서비스 신규 생성 (추천✅) |
| --- | --- | --- |
| **방식** | 기존 운영 중인 ECS 서비스에 신규 이미지 배포 | `MUNTO-PROD` 클러스터 내 `munto-chat-prod` 서비스 신규 생성 |
| **소스코드** | 없음 (레포 삭제 추정). 코드 수정 불가 | `munto-chat-backend` 레포 기반. CI/CD 완전 통제 가능 |
| **현재 트래픽** | 앱 코드 분석 결과 소켓 호출은 존재하나 실질적인 동작 없음 확인. 실사용 트래픽 없음 | 신규 서비스이므로 트래픽 없음. 준비 완료 후 기존 인스턴스 즉시 종료 |
| **마이그레이션** | 소스코드가 없어 코드 수정·디버깅 불가 | 병행 운영 불필요. 기존 인스턴스 종료 → 신규 ALB 생성 → Route53 레코드 교체 순으로 진행 |
| **스펙** | 불명 (소스 없음) | 2 vCPU / 4 GB RAM / Fargate, Task 2개 운영 (SRS 3.1.1 · 5.2 기준) |
- 2안 추천
    - 기존 서버의 소스코드가 없어 코드 수정·디버깅이 불가능하다.
    - 앱 코드 분석으로 기존 서버에 실사용 트래픽이 없음을 확인하였으므로 병행 운영 없이 기존 인스턴스를 종료하고 신규 서비스를 바로 투입한다.
    - Fargate 클러스터(`MUNTO-PROD`)는 기존 것을 재사용하고, ALB는 신규로 생성하여 Route53 레코드(`chat.munto.kr`)만 교체한다.

### Route53 / ALB

|  | 기존 구성 | 변경 후 |
| --- | --- | --- |
| **Route53 레코드** | `chat.munto.kr` → 기존 `munto-be-chat-prod` ALB | `chat.munto.kr` → 신규 `munto-chat-prod-alb` |
| **ALB** | 기존 ALB (기존 서버에 묶임) | 신규 ALB 생성. ECS 서비스와 함께 신규 구성. **Sticky Session 활성화 필수** (Socket.IO HTTP 핸드셰이크 → WebSocket 업그레이드 시 동일 Task 유지) |
| **Fargate 클러스터** | `MUNTO-PROD` | `MUNTO-PROD` (기존 재사용, 변경 없음) |
| **전환 방식** | - | 기존 인스턴스 종료 후 신규 ALB에 Route53 A 레코드 교체. 롤백 시 레코드 원복 |

**최종 인프라 구성:**

| 항목 | 값 | 비고 |
| --- | --- | --- |
| **ECS 클러스터** | `MUNTO-PROD` | 기존 재사용 |
| **ECS 서비스** | `munto-chat-prod` | 신규 |
| **ECR 레포** | `munto-chat-backend` | 신규 |
| **ALB** | `munto-chat-prod-alb` | 신규 |
| **RDS** | `munto-prod-api-db-aurora` 클러스터 내 `chat` DB | 신규 생성 (1안) |
| **Redis** | `prod-chat-redis` ElastiCache 클러스터 | 신규, `cache.t4g.small × 2` (2안) |
| **도메인** | `chat.munto.kr` → 신규 ALB | Route53 레코드 교체 |
| **기존 서버** | `munto-be-chat-prod` ECS 서비스 즉시 종료 | 실사용 트래픽 없음 확인 |
| **시크릿** | AWS SSM Parameter Store | `/prod/chat/*` |
| **로그** | CloudWatch Logs | `/ecs/munto-chat-prod` |
| **태스크 스펙** | 2 vCPU / 4 GB RAM / Fargate | Task 2개 운영, 최대 동시 연결 10,000개 (SRS 3.1.1 · 5.2 기준) |
| **사용자 ID** | 문토 userId | 문토 백엔드 JWT 기반, 데이팅 userId 별도 통합 없음 |

**전환 순서:**

1. 신규 ECS 서비스(`munto-chat-prod`) 및 ALB(`munto-chat-prod-alb`) 생성
2. CI/CD 파이프라인 구성 및 배포 검증
3. 기존 `munto-be-chat-prod` ECS 서비스 종료
4. Route53 `chat.munto.kr` A 레코드를 신규 ALB로 교체

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.03.30 | 김범진 | 최초 작성 |

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