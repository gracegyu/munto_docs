## 1. 배경 및 현재 문제점

기존 Munto의 AWS 인프라는 하나의 계정에 Production(Prod)과 Development(Dev) 환경이 혼재되어 구축되어 있었다. 리소스는 `dev-`, `prod-` 등의 Prefix를 통해 환경을 구분했으나, 다음과 같은 문제점이 발생하였다:

- 리소스 격리가 되지 않아 운영 중단 리스크 존재
- 권한 관리 및 네트워크 분리가 어려움
- CDK 등의 자동화 도구 도입 시 충돌 위험
- Dev와 Prod 간 환경 구성 차이로 인해 테스트 신뢰도가 낮음
- 수동 운영으로 인한 변경 이력 추적 불가 및 배포 오류 위험
- 인프라 변경 시 수작업이 반복되어 운영 생산성이 낮고, 오류 가능성이 상존함

> 위와 같은 문제를 해결하기 위해서는 인프라를 코드로 정의하고 관리하는 Infrastructure as Code (IaC) 방식이 반드시 필요하며, 그 중에서도 AWS에서는 CDK가 가장 실용적인 선택지이다.

## 2. 개선 방향

환경을 다음과 같이 **계정 기준으로 분리**하고, 인프라 구축 방식도 전환한다:

| 환경 | 계정 분리    | 구축 방식                                           |
| ---- | ------------ | --------------------------------------------------- |
| Dev  | ✅ 별도 계정 | ✅ CDK 자동화 (IaC 기반)                            |
| Test | ✅ 별도 계정 | ✅ CDK 자동화 (IaC 기반)                            |
| Prod | ✅ 별도 계정 | ❌ 기존 수동 유지 (단, 신규 서비스는 CDK 병행 구축) |

## 3. 데이팅 서비스 전략

새롭게 도입되는 **데이팅 서비스**는 기존 인프라와 분리된 구조로 운영되며, 다음과 같이 설계한다:

### 3.1 Dev / Test 환경

- 전체 인프라 및 데이팅 서비스를 포함하여 **모든 리소스를 CDK로 정의하고 자동 배포 (IaC)**
- 리소스 이름은 `contextEnv` 기반으로 Prefix/Suffix를 명확히 구분 (예: `dating-api-dev`, `dating-db-test` 등)
- 공통 인프라(`VPC`, `IAM`, `ALB` 등)는 별도 CDK Stack으로 정의
- CDK 프로젝트는 멀티 환경을 지원하도록 설계하여 `-context env=dev|test` 형식으로 배포 분기 가능

### 3.2 Prod 환경

- 기존 Prod 리소스는 수동 구성 그대로 유지
- 단, **데이팅 서비스만 CDK로 별도 Stack을 구성하여 병행 운영**
- CDK로 생성된 리소스는 기존 수동 리소스와 충돌하지 않도록 리소스 네이밍 및 Stack 이름을 명확히 분리
- Prod 환경에서 CDK로 구축된 데이팅 서비스는 Dev/Test에서 동일한 코드로 충분히 검증된 후 배포되므로 운영 안정성을 확보함

예:

```
new DatingServiceStack(app, `DatingServiceStack-prod`, {
  env: { account: '123456789012', region: 'ap-northeast-2' },
  contextEnv: 'prod'
});

```

## 4. CDK 프로젝트 설계 전략

### 4.1 리소스 충돌 방지

- 기존 Dev/Test CDK 프로젝트와 데이팅 서비스 전용 CDK 프로젝트가 동일한 계정에 배포되더라도 **충돌이 발생하지 않도록 명확한 이름 규칙을 적용**
- 리소스 이름: `munto-dating-api-dev`, `munto-infra-alb-test` 형식으로 환경, 서비스 단위 명확히 구분
- CloudFormation Stack 이름: `DatingServiceStack-dev`, `InfraStack-test` 등으로 명시적 지정

### 4.2 CDK 코드 구조

```
const env = app.node.tryGetContext('env'); // dev/test/prod
const suffix = env ? `-${env}` : '';
const apiName = `dating-api${suffix}`;

```

### 4.3 프로젝트 구조 예시

```
cdk-date/
 ├── bin/
 │   └── date-service.ts
 ├── lib/
 │   └── date-service-stack.ts
 ├── cdk.json
 └── context/
     ├── dev.json
     ├── test.json
     └── prod.json

```

## 5. CDK 프로젝트 분리 전략

Munto는 서비스 성격과 책임 분리를 기반으로 다음과 같이 **3개의 CDK 프로젝트로 구성**하는 것이 바람직하다:

| CDK 프로젝트         | 대상 리소스                    | 사용 환경         |
| -------------------- | ------------------------------ | ----------------- |
| `cdk-infra`          | 공통 인프라 (VPC, ALB, IAM 등) | Dev / Test        |
| `cdk-dating-service` | 데이팅 서비스 관련 리소스      | Dev / Test / Prod |
| `cdk-legacy-service` | 기존 서비스 관련 리소스        | ✅ **Prod 전용**  |

이 구조에서는 **Production 환경에서 사용하는 CDK 프로젝트는 `cdk-dating-service`와 `cdk-legacy-service` 2개뿐이며**, 이 중 `cdk-legacy-service`는 **기존 시스템 유지를 위한 유일한 CDK 프로젝트**이다. 이를 통해 기존 수동 인프라와 새로운 CDK 기반 서비스 간의 충돌 없이 점진적인 전환을 진행할 수 있다.

---

## 6. 리스크 및 대응 방안

| 리스크          | 설명                                              | 대응 전략                                                                  |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 리소스 중복     | Dev/Test의 전체 CDK와 Prod의 데이팅 CDK 충돌 가능 | 리소스 명 명확 분기 (`prefix-suffix` 적용)                                 |
| Stack 이름 충돌 | CloudFormation Stack 이름 중복 시 배포 오류       | Stack 이름에 환경명 포함                                                   |
| 운영 불일치     | Dev/Test는 자동화, Prod는 수동으로 인한 불일치    | Prod용 CDK 정의만 유지, 점진적 전환 계획 수립                              |
| 테스트 불가     | Prod 전용 CDK는 Dev에서 테스트 불가               | 동일한 CDK 코드를 Dev/Test에서도 실행 가능하도록 `--context env` 구조 설계 |

---

## 7. 결론 및 향후 계획

- 신규 서비스(데이팅)는 전 환경에 대해 CDK 기반 구축을 도입하여 안정적이고 일관된 인프라 운영을 목표로 함
- Prod는 기존 리소스를 유지하면서도 신규 서비스부터 CDK로 점진적으로 전환을 시작
- Dev/Test는 완전한 CDK 기반으로 전환됨에 따라 테스트 신뢰도 및 배포 일관성을 확보
- IaC는 인프라 구성과 변경을 코드로 관리함으로써, 운영의 신뢰성과 변경 추적성을 크게 향상시킴
- CDK 프로젝트는 공통 인프라, 데이팅 서비스, 기존 서비스로 분리하여 서비스별 책임과 배포 단위를 명확히 함
- 향후에는 기존 Prod 리소스도 CDK로 점진적으로 이관할 수 있도록 리소스를 코드로 정의하는 작업을 병행
- CDK 전환 흐름에 따라 전체 인프라가 코드로 관리되는 상태로 진화할 수 있도록 계획 수립 예정
