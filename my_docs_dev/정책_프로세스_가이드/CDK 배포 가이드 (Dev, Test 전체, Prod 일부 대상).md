# CDK 배포 가이드 (Dev, Test 전체, Prod 일부 대상)

## 계정 및 환경 구성 전략

- **Dev**, **Test**, **Prod**는 서로 다른 AWS 계정으로 분리하여 운영한다.
- **Dev/Test**는 모든 서비스를 CDK 기반 IaC 방식으로 관리한다.
- **Prod**는 기존 munto 서비스 인프라는 수동 유지하며, 신규 서비스(dating, admin)는 CDK로 구축한다.
- CDK 개발 전용 목적의 **sandbox.munto.kr 계정**을 별도 생성하여 실험 및 구조 검증에 사용한다.

## CDK 개발 전용 계정 (sandbox.munto.kr)

- CDK 프로젝트 구조 및 리소스를 실험하고 검증하는 **독립된 테스트베드** 역할 수행
- Dev/Test/Prod 계정과 격리되어 안전한 테스트 환경 제공
- **유일한 상시 리소스**는 Route53의 `sandbox.munto.kr` Hosted Zone이며, 나머지는 항상 클린 상태 유지
- 로컬 CLI에서 `cdk deploy`를 통해 수동 배포, CI/CD 연동은 하지 않음
- 인증서와 도메인은 수동으로 생성하며, ARN 또는 Hosted Zone은 `sandbox.context.json`, `.env.*`, SSM Parameter 등을 통해 참조

## CDK 전용 계정 운영 정책

- 실험 후 리소스는 즉시 삭제하고 클린 상태 유지
- Hosted Zone(`sandbox.munto.kr`)만 상시 유지
- 최소 권한 정책 적용, cross-account 접근은 제한적으로 허용
- Stack 구성, context 설정, 보안 그룹 설계 등 CDK 구조 실험에 특화

## 배포 브랜치 및 트리거 전략

### 브랜치 전략

- `dev` 브랜치 → Dev 환경 배포
- `test` 브랜치 → Test 환경 배포
- `prod` 브랜치 → Prod 환경 배포 (CodePipeline 사용)

### 트리거 방식

- **Dev/Test**: GitHub Actions 기반 자동화 (`cdk synth → diff → deploy`)
- **Prod**: CodePipeline 기반 수동 승인 포함 배포 (GitHub Webhook으로 트리거)

### 전략적 장점

- 환경별 브랜치 대응으로 명확한 추적성 및 일관성 확보
- CDK 전용 계정은 브랜치 트리거 대상에서 제외되어 자유로운 실험 가능

## CDK 프로젝트 구조

```jsx
cdk/
├── base-infra/
├── shared-resources/
├── munto-service/
├── dating-service/
├── admin-service/
├── pipeline/
├── docs/
└── README.md
```

## 배포 원칙 및 리소스 참조

- Dev/Test는 모든 서비스(base, dating, admin 포함)를 CDK로 관리
- base-infra는 1회 배포 후 import 방식으로 참조
- Prod는 기존 munto 유지, 신규 서비스는 Dev/Test에서 검증된 CDK 코드로 배포
- Prod CDK는 base/shared 리소스를 직접 생성하지 않고, SSM Parameter 또는 ARN으로 참조

## 공용 리소스 참조 규칙 (Prod)

- VPC ID, Subnet ID, SG ID, S3, MSK, RDS 등은 SSM Parameter 또는 context로 관리
- CDK에서 `ssm.StringParameter.fromStringParameterName()` 등으로 참조

## 인증서 및 도메인 운영

- 모든 환경의 인증서와 도메인은 **수동 생성 및 수동 참조**
- HostedZone: `HostedZone.fromLookup()` 사용
- 인증서 ARN은 `.env.*`, `sandbox.context.json`, SSM으로 전달

## CloudFront 및 도메인 전략

- 환경 별 CloudFront 및 인증서 분리:
  - dev: `devadmin.munto.co.kr`, `images.dev.munto.kr`
  - test: `test.dev.munto.kr`, `testimages.dev.munto.kr`
  - prod: `www.munto.kr`, `video.munto.kr`, `admin2.munto.co.kr`

## 보안 그룹 전략

- 불명확한 SG(`launch-wizard-*`, `munto--*`)는 폐기
- 명확한 네이밍 사용: `sg-env-role`, 예: `sg-dev-api-public`
- 최소 권한 및 오픈 포트 최소화 적용

## CI/CD 전략 이원화

- **Dev/Test**: GitHub Actions 기반 파이프라인으로 빠른 피드백 및 병렬 배포 제공
- **Prod**: CodePipeline으로 IAM 제어, 수동 승인 등 높은 안정성 확보
- 공통 배포 로직은 `cdk/pipeline` 디렉터리에 모듈화되어 공유 가능

## 배포 파이프라인 및 테스트 전략

- Dev/Test: GitHub Actions에서 `cdk synth → diff → deploy`
- Prod: CodePipeline에서 수동 승인 기반으로 `cdk deploy` 실행
- 모든 CDK 변경은 Dev/Test에서 충분히 테스트 후 Prod 반영
- 파이프라인 로직은 모듈화하여 GitHub Actions, CodePipeline에서 재사용 가능

## CI 이원화 이유

- GitHub Actions는 개발 속도와 효율성 제공
- CodePipeline은 보안성과 운영 통제 강화에 적합
- 환경별 요구사항에 맞춘 도구 선택으로 복잡도 최소화
- 공통 배포 로직은 중복 없이 일관성 있게 유지

## 향후 확장 고려

- `sandbox.munto.kr` 계정에 CodeBuild 또는 GitHub Actions Runner 도입 가능
- Static Analysis, Security Check 도입
- CDK 전용 계정은 개발자 실험을 위한 최적화 환경으로 유지
- 장기적으로 Prod 리소스 CDK 이관 및 cross-account base/shared 분리 고려

## 기타 운영 원칙

- Dev/Test는 CDK 기반 전환으로 테스트 신뢰도 및 일관성 강화
- Prod는 기존 munto는 수동 유지, 신규 서비스는 Stack 분리로 CDK 적용
- 리소스/Stack 네이밍은 prefix-suffix로 충돌 방지
- CDK context 기반 환경 구분 및 파라미터 설정 일관성 유지
- 서비스별 CDK 프로젝트 분리(cdk-dating-service 등)로 책임 명확화
- 데이팅 서비스는 Dev/Test/Prod 간 CDK 코드 일치성 확보
