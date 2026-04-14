# MSK(Kafka)에서 SQS로의 메시징 아키텍처 마이그레이션 기획 OnePager

분류: SRS
작성자: 홍진영
최초 작성일: 2025년 12월 30일 오후 4:02
최근 수정일: 2026년 1월 6일 오전 10:06
문서 상태: Active
생성 일시: 2025년 12월 30일 오후 4:02
최종 편집자: 홍진영

## Project Name

MSK(Kafka)에서 SQS로의 메시징 아키텍처 마이그레이션

---

## Date

**2024년 12월 30일**

---

## Submitter Info

- **제출자**: 홍진영
- **담당 부서**: Engineering

---

## Project Description

### 개요

 MSK(Kafka)는 실시간 스트리밍 메시징에 최적화되어 있고, SQS는 단순 비동기 작업 큐에 최적화되어 있어 각각의 용도에 맞게 사용해야 합니다.
 현재 점수 계산, 추천 생성, 발견 생성 작업은 단순 작업 큐 패턴(단일 Consumer, 순서 보장 불필요, 간단한 재시도)이므로 SQS에 적합하며, MSK의 고급 기능(파티션, 오프셋 관리, Consumer Group)은 불필요한 복잡도만 증가시킵니다.
 이에 MSK는 실시간 스트리밍이 필요한 작업(푸시 알림 이벤트 등)에 계속 활용하고, 단순 작업 큐는 SQS로 전환하여 관리 복잡도 감소, 비용 절감, 개발 생산성 향상을 달성합니다. `V1.0.1`

 현재 MSK(Kafka)를 통해 처리되고 있는 점수 계산 및 추천 생성 작업을 AWS SQS로 마이그레이션하여 메시징 아키텍처를 단순화하고 관리 오버헤드를 감소시키는 프로젝트입니다.

### 목적

- MSK(Kafka)에서 SQS로 메시징 아키텍처 전환
- 메시지 타입별 최적화된 큐 시스템 구축
- 관리 오버헤드 최소화 및 비용 효율성 확보
- 재시도 로직 자동화 및 DLQ 내장 기능 활용

### 주요 변경사항

1. **MSK → SQS 전환**: 점수 계산 및 추천 생성 큐를 SQS로 마이그레이션
2. **큐 분리**: 점수 계산 큐를 추천용/발견용으로 분리
3. **DLQ 자동화**: SQS 내장 DLQ 기능 활용
4. **Lambda 재시도 비활성화**: SQS Redrive Policy만 활용

### 마이그레이션 대상 큐

- `score-calculation-queue` → `score-calculation-queue` (SQS, queueType으로 구분)
- `recommendation-queue` → `recommendation-queue` (SQS)
- 발견 큐 생성 → `discover-queue` (SQS, 신규 추가)

### 현재 시스템 현황

**현재 아키텍처**:

```
[API/Scheduler]
    ↓ Producer (KafkaJS)
[MSK - Kafka Topics]
    - score-calculation-queue
    - recommendation-queue
    - push-event
    - push-event-multicast
    ↓ Consumer (Lambda/Docker)
[Lambda Functions / Docker Containers]
    - score-calculation-consumer
    - recommendation-consumer

```

**현재 문제점**:

1. 관리 복잡도
    - 모든 메시지가 Kafka를 통해 처리
    - 간단한 작업에도 Kafka 설정 필요
    - Consumer Group 관리 오버헤드
2. 재시도 로직
    - 수동으로 재시도 로직 구현 필요
    - DLQ 직접 구성
    - 에러 처리 복잡

### 새로운 아키텍처

```
[API/Scheduler]
    ↓ Producer
[SQS Queues]
    - score-calculation-queue             (점수 계산, queueType으로 구분)
    - recommendation-queue                 (추천 생성)
    - discover-queue                       (발견 생성)
    ↓ Consumer Lambda
[Lambda Functions]
    - score-calculation-consumer
    - recommendation-consumer
    - discover-consumer
    ↓
[Database (PostgreSQL)]

```

---

## Business and Marketing Justification

### 비즈니스 가치

1. **운영 효율성 향상**
    - 관리 복잡도 감소로 운영 인력 부담 감소
    - 완전 관리형 서비스(SQS)로 인프라 관리 시간 절약
    - 자동화된 재시도 및 DLQ로 에러 처리 시간 단축
2. **비용 최적화**
    - 예상 사용량 기준 무료 티어 범위 내 ($0)
    - MSK 브로커 인스턴스 비용 절감 가능
    - 요청 기반 과금으로 사용량에 따른 유연한 비용 관리
3. **시스템 안정성 향상**
    - 내장 DLQ로 실패 메시지 자동 관리
    - 자동 재시도 메커니즘으로 처리 성공률 향상
    - CloudWatch 통합 모니터링으로 문제 조기 감지
4. **개발 생산성 향상**
    - 간단한 API로 개발 속도 향상
    - 복잡한 Kafka 설정 불필요
    - 표준 AWS 서비스로 온보딩 용이

### 기대 효과

- **관리 복잡도**: 높음 → 낮음
- **재시도 로직**: 수동 구현 → 자동 (내장)
- **DLQ 구성**: 수동 구성 → 자동 구성
- **비용**: 브로커 인스턴스 비용 → 요청 기반 (무료 티어)
- **확장성**: 수동 스케일링 → 자동 스케일링

### 비용 분석

**SQS 비용 (월간 예상)**:

- 무료 티어: 1,000,000건/월 무료
- 예상 사용량: 약 1,000,000건/월
- **예상 비용: $0 (무료 티어 범위 내)**

**MSK vs SQS 비교**:

| 항목 | MSK | SQS |
| --- | --- | --- |
| 관리 복잡도 | 높음 (브로커 관리) | 낮음 (완전 관리형) |
| 재시도 로직 | 수동 구현 | 자동 (내장) |
| DLQ | 수동 구성 | 자동 구성 |
| 비용 | 브로커 인스턴스 비용 | 요청 기반 (무료 티어) |
| 확장성 | 수동 스케일링 | 자동 스케일링 |

---

## Risk Assessment

### 리스크

1. **메시지 손실 가능성**
    - **설명**: SQS는 최소 1회 전달 보장 (at-least-once)
    - **영향**: 중복 처리 가능성 있음
    - **확률**: 낮음
    - **심각도**: 중간
2. **처리 지연**
    - **설명**: SQS는 실시간 처리가 아닌 폴링 방식
    - **영향**: Lambda가 즉시 트리거되므로 영향 최소
    - **확률**: 낮음
    - **심각도**: 낮음
3. **비용 증가**
    - **설명**: 트래픽이 예상보다 많을 경우
    - **영향**: 무료 티어 초과 시 추가 비용 발생
    - **확률**: 낮음
    - **심각도**: 낮음
4. **마이그레이션 중 서비스 중단**
    - **설명**: 전환 과정에서 일시적 중단 가능
    - **영향**: 사용자 경험 저하
    - **확률**: 낮음
    - **심각도**: 높음

### 대응 방안

1. **중복 처리 방지**
    - Consumer에서 idempotency 체크 구현 `V1.0.1`
        - **Idempotency Key 설계**:
        - `score-calculation`: `(userId, date, queueType)` 조합으로 중복 체크
        - `recommendation`: `(userId, showAt)` 조합으로 중복 체크
        - `discover`: `(userId, showAt)` 조합으로 중복 체크
        - 구현 방식: DB 조회를 통해 해당 Key 조합이 이미 존재하는지 확인 후, 존재하면 처리 건너뛰기
    - DB unique constraint 활용
    - 메시지 ID 기반 중복 검증
2. **비용 모니터링**
    - CloudWatch로 실시간 비용 추적
    - 예산 알람 설정
    - 월간 비용 리포트 작성
3. **점진적 전환**
    - Canary 배포로 단계적 전환
    - 문제 발생 시 즉시 롤백
    - 모니터링 강화
4. **롤백 계획**
    - 코드 롤백으로 MSK로 즉시 전환 가능
    - 인프라는 유지하여 빠른 전환 가능
    - 롤백 절차 문서화

### 완화 전략

- **테스트 강화**: 통합 테스트, 부하 테스트, 에러 시나리오 테스트
- **모니터링**: CloudWatch 알람 및 대시보드 구성
- **문서화**: 마이그레이션 절차 및 롤백 절차 상세 문서화

---

## Resource and Scheduling Details

### 리소스 요구사항

### 인프라 리소스

- **SQS 큐**: 3개 (메인 큐) + 3개 (DLQ)
- **Lambda Event Source Mapping**: 3개
- **CloudWatch 알람**: 5개 이상
- **CloudWatch 대시보드**: 3개

### 인력 리소스

- **백엔드 개발자**: 2명
- **DevOps 엔지니어**: 1명
- **QA 엔지니어**: 1명

### 예상 작업 시간

- **총 기간**: 2주
- **Week 1**: 구현
- **Week 2**: 테스트 및 검증

### 일정 계획

### Week 1: 구현

- **인프라**: SQS 큐/DLQ 생성 (3개 메인 큐 + 3개 DLQ), IAM 설정, Event Source Mapping, CloudWatch 구성
- **코드**: SQS 서비스 모듈 구현, Producer/Consumer 마이그레이션, Discover Consumer 신규 구현

### Week 2: 테스트 및 검증

- **통합 테스트**: 플로우 검증, 에러 시나리오, 부하 테스트
- **모니터링 검증**: CloudWatch 메트릭/알람, DLQ 동작 확인

### 체크리스트

### 인프라 준비

- [ ]  SQS 메인 큐 생성 (3개)
    - [ ]  `score-calculation-queue`
    - [ ]  `recommendation-queue`
    - [ ]  `discover-queue`
- [ ]  DLQ 생성 및 연결 (3개)
    - [ ]  `score-calculation-dlq`
    - [ ]  `recommendation-dlq`
    - [ ]  `discover-dlq`
- [ ]  IAM 역할 및 정책 설정
- [ ]  Lambda Event Source Mapping 설정
- [ ]  CloudWatch 알람 설정
- [ ]  CloudWatch 대시보드 구성

### 코드 구현

- [ ]  SQS 서비스 모듈 구현
- [ ]  Producer 코드 수정 (MSK → SQS)
- [ ]  Consumer 코드 수정 (MSK → SQS)
- [ ]  Discover Producer 구현 (API에서 SQS 발행)
- [ ]  Discover Consumer 신규 구현
- [ ]  MSK 관련 코드 제거

### 테스트

- [ ]  단위 테스트
- [ ]  통합 테스트
- [ ]  에러 시나리오 테스트

### 배포

- [ ]  모니터링 검증
- [ ]  전체 전환

---

## Technical Description

### 아키텍처 설계

### SQS 큐 상세 설계

**점수 계산 큐**:

- **`score-calculation-queue`** (점수 계산)
    - 목적: 추천용 및 발견용 유저 점수 계산 (메시지 내 queueType으로 구분)
    - 타입: Standard Queue
        - 현재 점수 계산 및 추천 생성에 대해 순서가 중요하지 않기 때문에 FIFO를 사용하지 않고 Standard Queue를 사용합니다. `V1.0.1`
    - DLQ: `score-calculation-dlq`
    - Visibility Timeout: 300초 (5분)
    - Message Retention: 1일
    - Max Receive Count: 3

**추천 생성 큐**:

- **`recommendation-queue`** (추천 생성)
    - 목적: 유저별 추천 큐 생성
    - 타입: Standard Queue
    - DLQ: `recommendation-dlq`
    - Visibility Timeout: 600초 (10분)
    - Message Retention: 4시간 (14400초)
    - Max Receive Count: 3

**발견 생성 큐**:

- **`discover-queue`** (발견 생성)
    - 목적: 유저별 발견 큐 생성 (API에서 발행, Consumer에서 처리)
    - 타입: Standard Queue
    - DLQ: `discover-dlq`
    - Visibility Timeout: 600초 (10분)
    - Message Retention: 4시간 (14400초)
    - Max Receive Count: 3

### 메시지 형식

**점수 계산 메시지**:

```json
{
  "userIds": [1, 2, 3, ...],
  "queueType": "RECOMMEND" | "DISCOVER",
  "scheduledTime": "2024-01-01T00:00:00Z"
}

```

**추천 생성 메시지**:

```json
{
  "userIds": [1, 2, 3, ...],
  "showAt": 1704067200000,
  "expiresAt": 1704153600000
}

```

**발견 생성 메시지**:

```json
{
  "userId": 123,
  "showAt": 1704067200000,
  "expiresAt": 1704153600000
}

```

### DLQ 설정

### DLQ 구성

- 각 메인 큐에 대해 DLQ 생성 및 연결
- Message Retention Period: 1일
- Redrive Policy: maxReceiveCount 3회

### 재시도 동작

- Lambda 재시도 비활성화 (`MaximumRetryAttempts: 0`)
- Lambda 실패 시 메시지는 즉시 큐로 반환
- SQS가 Visibility Timeout 후 메시지를 다시 표시
- `maxReceiveCount` (3회) 초과 시 자동으로 DLQ로 이동

### 구현 세부사항

### SQS 서비스 모듈 구조

```
core/integrations/sqs/
├── sqs.module.ts
├── services/
│   ├── sqs.service.ts          # SQS 클라이언트 래퍼
│   └── sqs-producer.service.ts # Producer 서비스
└── interfaces/
    └── sqs-message.interface.ts

```

### Producer 변경사항

**기존 (Kafka)**:

```tsx
await this.kafkaService.send(this.TOPIC_NAME, {
  key: `${queueType}-batch-${totalBatches}`,
  value: JSON.stringify(message),
});

```

**변경 후 (SQS)**:

```tsx
await this.sqsService.sendMessage('score-calculation-queue', {
  MessageBody: JSON.stringify(message),
  MessageAttributes: {
    queueType: { DataType: 'String', StringValue: queueType },
    scheduledTime: { DataType: 'String', StringValue: scheduledTime },
  },
});

```

### Consumer 변경사항

**기존 (MSK)**:

```tsx
async processScoreCalculationEvents(event: any) {
  // MSK 이벤트 파싱
  for (const [topicPartition, records] of Object.entries(event.records)) {
    // Base64 디코딩
    const messageString = Buffer.from(record.value, 'base64').toString('utf-8');
    const message = JSON.parse(messageString);
    // 처리...
  }
}

```

**변경 후 (SQS)**:

```tsx
async processScoreCalculationEvents(event: SQSEvent) {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      // 처리...
      // 성공 시 자동으로 메시지 삭제 (Lambda 기본 동작)
    } catch (error) {
      // 에러 발생 시 Lambda는 재시도하지 않음 (MaximumRetryAttempts: 0)
      // 메시지는 Visibility Timeout 후 다시 큐에 표시되고,
      // SQS Redrive Policy에 따라 maxReceiveCount 초과 시 DLQ로 이동
      throw error;
    }
  }
}

```

**재시도 동작**:

- Lambda 재시도 비활성화 (`MaximumRetryAttempts: 0`)
- Lambda 실패 시 메시지는 즉시 큐로 반환
- SQS가 Visibility Timeout 후 메시지를 다시 표시
- `maxReceiveCount` (3회) 초과 시 자동으로 DLQ로 이동

### Discover Producer 변경사항 (API에서 발행)

**기존 (직접 DB 저장)**:

```tsx
// API에서 직접 ExploreQueue 생성
await this.prisma.exploreQueue.createMany({
  data: exploreQueues,
});

```

**변경 후 (SQS 발행)**:

```tsx
// API에서 SQS로 메시지 발행
await this.sqsService.sendMessage('discover-queue', {
  MessageBody: JSON.stringify({ userId }),
  MessageAttributes: {
    source: { DataType: 'String', StringValue: 'api' },
  },
});

```

### Discover Consumer 변경사항

**기존 (없음 - API에서 직접 처리)**:

- API에서 직접 ExploreQueue 생성

**변경 후 (SQS Consumer)**:

```tsx
async processDiscoverEvents(event: SQSEvent) {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { userId } = message;

      // 발견 큐 생성 로직
      await this.exploreService.createIfNotExistExploreQueue(userId);

      // 성공 시 자동으로 메시지 삭제 (Lambda 기본 동작)
    } catch (error) {
      // 에러 발생 시 Lambda는 재시도하지 않음 (MaximumRetryAttempts: 0)
      // 메시지는 Visibility Timeout 후 다시 큐에 표시되고,
      // SQS Redrive Policy에 따라 maxReceiveCount 초과 시 DLQ로 이동
      throw error;
    }
  }
}

```

**재시도 동작**:

- Lambda 재시도 비활성화 (`MaximumRetryAttempts: 0`)
- Lambda 실패 시 메시지는 즉시 큐로 반환
- SQS가 Visibility Timeout 후 메시지를 다시 표시
- `maxReceiveCount` (3회) 초과 시 자동으로 DLQ로 이동

### Discover Producer 변경사항 (API에서 발행)

**기존 (직접 DB 저장)**:

```tsx
// API에서 직접 ExploreQueue 생성
await this.prisma.exploreQueue.createMany({
  data: exploreQueues,
});

```

**변경 후 (SQS 발행)**:

```tsx
// API에서 SQS로 메시지 발행
await this.sqsService.sendMessage('discover-queue', {
  MessageBody: JSON.stringify({ userId }),
  MessageAttributes: {
    source: { DataType: 'String', StringValue: 'api' },
  },
});

```

### Discover Consumer 변경사항

**기존 (없음 - API에서 직접 처리)**:

- API에서 직접 ExploreQueue 생성

**변경 후 (SQS Consumer)**:

```tsx
async processDiscoverEvents(event: SQSEvent) {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { userId } = message;

      // 발견 큐 생성 로직
      await this.exploreService.createIfNotExistExploreQueue(userId);

      // 성공 시 자동으로 메시지 삭제 (Lambda 기본 동작)
    } catch (error) {
      // 에러 발생 시 Lambda는 재시도하지 않음 (MaximumRetryAttempts: 0)
      // 메시지는 Visibility Timeout 후 다시 큐에 표시되고,
      // SQS Redrive Policy에 따라 maxReceiveCount 초과 시 DLQ로 이동
      throw error;
    }
  }
}

```

### 인프라 구성

### CloudFormation/CDK 예시

**CloudFormation 템플릿 예시**:

```yaml
Resources:
  # 메인 큐
  ScoreCalculationQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: score-calculation-queue
      VisibilityTimeout: 300
      MessageRetentionPeriod: 86400  # 1일
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt ScoreCalculationDLQ.Arn
        maxReceiveCount: 3

  # DLQ
  ScoreCalculationDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: score-calculation-dlq
      MessageRetentionPeriod: 86400  # 1일

  # Lambda Event Source Mapping - Lambda 재시도 비활성화
  ScoreCalculationConsumerEventSource:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      EventSourceArn: !GetAtt ScoreCalculationQueue.Arn
      FunctionName: !Ref ScoreCalculationConsumerFunction
      MaximumRetryAttempts: 0  # Lambda 재시도 비활성화
      BatchSize: 10
      Enabled: true

```

**CDK 예시 (TypeScript)**:

```tsx
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

// DLQ 생성
const scoreCalculationDLQ = new sqs.Queue(this, 'ScoreCalculationDLQ', {
  queueName: 'score-calculation-dlq',
  retentionPeriod: cdk.Duration.days(1),
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// 메인 큐 생성 및 DLQ 연결
const scoreCalculationQueue = new sqs.Queue(this, 'ScoreCalculationQueue', {
  queueName: 'score-calculation-queue',
  visibilityTimeout: cdk.Duration.seconds(300),
  retentionPeriod: cdk.Duration.days(1),
  deadLetterQueue: {
    queue: scoreCalculationDLQ,
    maxReceiveCount: 3,
  },
});

// Lambda Event Source Mapping - Lambda 재시도 비활성화
const scoreCalculationConsumerEventSource = new lambda.EventSourceMapping(
  this,
  'ScoreCalculationConsumerEventSource',
  {
    eventSourceArn: scoreCalculationQueue.queueArn,
    target: scoreCalculationConsumerFunction,
    batchSize: 10,
    enabled: true,
    retryAttempts: 0, // Lambda 재시도 비활성화
  }
);

```

### 모니터링 및 알람

### CloudWatch 메트릭

**SQS 메인 큐 메트릭**:

- `ApproximateNumberOfMessages`: 대기 중인 메시지 수
- `ApproximateNumberOfMessagesNotVisible`: 처리 중인 메시지 수
- `NumberOfMessagesSent`: 발행된 메시지 수
- `NumberOfMessagesReceived`: 수신된 메시지 수
- `NumberOfMessagesDeleted`: 삭제된 메시지 수
- `ApproximateAgeOfOldestMessage`: 가장 오래된 메시지의 대기 시간

**DLQ 메트릭**:

- `ApproximateNumberOfMessagesVisible`: DLQ에 쌓인 메시지 수 (알람 임계값: 1개 이상)
- `NumberOfMessagesReceived`: DLQ로 이동한 메시지 수

**Lambda Consumer 메트릭**:

- `Invocations`: 호출 횟수
- `Errors`: 에러 횟수 (알람 임계값: 에러율 > 5%)
- `Duration`: 실행 시간 (알람 임계값: P95 > 60초)
- `Throttles`: 스로틀 횟수

### CloudWatch 알람 구성

**DLQ 알람** (최우선):

- DLQ 메시지 알람 (Critical, 임계값: 1개)
- DLQ 메시지 급증 알람 (Warning, 5분간 10개 이상)

**메인 큐 알람**:

- 큐 백로그 알람 (임계값: 1000개)
- 처리 지연 알람 (임계값: 5분)

**Lambda Consumer 알람**:

- 에러율 알람 (임계값: 에러율 5%)
- 실행 시간 알람 (임계값: P95 > 60초)

### CloudWatch 대시보드

- **SQS 큐 대시보드**: 메인 큐별 메시지 수, 처리량, DLQ 메시지 수, 실패율
- **Lambda Consumer 대시보드**: 호출 횟수, 에러 횟수, 실행 시간, 동시 실행 수
- **통합 대시보드**: 전체 시스템 처리량, 실패율 추이, DLQ 메시지 추이, 처리 지연 시간

### 참고 자료

- [AWS SQS 공식 문서](https://docs.aws.amazon.com/sqs/)
- [AWS Lambda SQS 이벤트 소스](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [SQS 비용 계산기](https://aws.amazon.com/sqs/pricing/)

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 25.12.30 | 홍진영 | 최초 작성 |
| v1.0.1 | 26.01.06 | 홍진영 | 문서 개요 수정 |

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