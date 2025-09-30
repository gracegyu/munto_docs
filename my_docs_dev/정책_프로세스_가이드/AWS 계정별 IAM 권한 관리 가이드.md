# AWS 계정별 IAM 권한 관리 가이드

## ✅ 운영 환경 구성

| 환경 이름   | AWS 계정 용도                                         | 도메인 예시      |
| ----------- | ----------------------------------------------------- | ---------------- |
| **Prod**    | 실제 운영 서비스가 배포되는 환경                      | munto.kr         |
| **Dev**     | 개발자가 기능 개발 및 통합 테스트를 수행하는 환경     | dev.munto.kr     |
| **Test**    | QA, PM이 기능 검증 및 시나리오 테스트를 수행하는 환경 | test.munto.kr    |
| **Sandbox** | CDK 구조 테스트, PoC, 실험용으로 활용하는 복수화 계정 | sandbox.munto.kr |

## ⚡️ 기존 문제점

- 모든 계정에 대해 관리자(Admin) 권한을 전멸 부여하고 있어, 보안 리스크 존재
- IAM Role 및 Policy에 대한 명확한 기준이 없음
- S3, EC2, RDS 등 헌정 리소스에 대한 최소 권한 제어가 불재

## 🌟 보안 정책 목표

1. 각 환경은 동일한 IAM 정책 체계를 가지고, 최소 권한 원칙 적용
2. `assume-role` 기반 접근 방식 도입
3. 관리자(AdministratorAccess) 권한은 환경별으로 제한된 인원에게만 부여
4. 모든 권한은 그룹 또는 역할 기반으로 관리, 직무 중심으로 권한 분리
5. IAM 정책은 Git 저장소를 통해 형사관리 및 추적 가능하게 운영

## 🧍🏻 환경별 권한 관리 기준

| 환경        | 대상        | 권한 수준                                                      | 설명                                               |
| ----------- | ----------- | -------------------------------------------------------------- | -------------------------------------------------- |
| **Prod**    | 운영 관리자 | `ViewOnlyAccess`, `RDSFullAccess`, `EC2StartStop` 등           | 운영 작업 최소화, 배포권한 없음                    |
|             | 개발자      | 접근 차단 또는 `ReadOnlyAccess`                                | 운영 리소스 변경 방지                              |
| **Dev**     | 개발자      | `CDKDeployPolicy`, `EC2InstancePolicy`, `CloudWatchLogsAccess` | 배포 및 디버건 가능                                |
| **Test**    | QA, PM      | `ViewOnlyAccess`, `S3ReadAccess`, `RDSQueryAccess`             | 테스트 관찰 목적 접근 허용                         |
| **Sandbox** | 개발자      | `AdministratorAccess` (단기)                                   | 실험 및 구조 테스트 용도, 사용 후 리소스 제거 권장 |

## 👥 IAM Role 정의 및 명명 가정

### ▶ 기본 Role 형식

| Role 이름     | 설명                      | 권한                            |
| ------------- | ------------------------- | ------------------------------- |
| `dev-lead`    | Dev 환경 배포 담당 개발자 | CDK 및 리소스 생성 권한         |
| `test-qa`     | 테스트 담당자             | 테스트 데이터 접근 및 로그 확인 |
| `infra-admin` | 운영 관리자               | 일반 리소스 제어 + 모니터링     |
| `sandbox-dev` | 구조 실험 개발자          | 일시적 Full Access 허용         |

### ▶ 리뷰 및 권한 관리 위한 Naming 규칙

- 이름 처리 공식: `[env]-[role]-[user]`
  - 예) `dev-dev-lead-raymond`, `test-qa-kim`, `prod-infra-admin`
- Role은 Git 저장소 및 정책 관리 문서(Notion/Confluence 등)에 규칙에 따라 등록 및 관리

## 📦 사용자 정의 정책 예시

- `CDKDeployPolicy`:
  - CloudFormation, SSM, IAM, Lambda, API Gateway 등에 대한 제한적 생성/수정 권한
- `RDSQueryAccess`:
  - RDS Data API 또는 특정 DB에 대한 읽기/구도 권한
- `S3ReadAccess`, `S3WriteAccess`:
  - 명시된 Bucket 리소스에 한정한 최소 권한 부여

## 🔐 접근 방식 및 운영 원칙

1. 모든 작업자는 기본적으로 권한이 없는 상황에서 Role을 assume하는 방식으로 접근
2. Dev/Test 환경은 cross-account role을 통해 개발자가 필요한 권한을 임시 획득
3. Prod 환경은 cross-account 접근 제한, 운영자에게만 제한적 권한 허용
4. 모든 정책은 Git 저장소 내 `iam-policies/` 디렉터리로 형사 관리
5. CloudTrail + IAM Access Analyzer를 통해 주기적 검토 시스템 구성

## 🛠 적용 프로세스

1. 기존 IAM 사용자 및 권한 목록 정리
2. 관리자 권한 전멸 회수
3. 역할(Role) 및 그룹(Group) 기반 권한 재설계
4. 정책 JSON 생성 및 Git에 등록
5. 환경별 역할별 사용자 연결 및 테스트
6. 신규 계정 생성 시 승인 및 정책 할당 프로세스 수립

## 📌 참고 사항

- **AWS Console에서 Admin이 직접 권한 수정 가능**하지만, 모든 변경 사항은 Git 저장소에 반사 후 적용 권장
- **AWS Organizations SCP**를 활용한 상위 계정 제어 정책 도입 검토
- **정책 배포 자동화**: CI/CD와 연계된 정책 적용 스크립트 작성 가능 (ex. GitHub Actions로 IAM 정책 반영)

## 🧩 IAM Role 관리와 Git 통합 운영 방식

- 모든 정책 및 역할 정의는 Git 저장소에서 `iam-policies/roles/` 구조로 관리
- 역할 생성 및 수정은 JSON 또는 YAML 기반 파일로 관리하며, 리뷰 후 AWS에 적용
- 운영자가 Console에서 직접 수정한 경우에도 반드시 Git 저장소에 반영
- 변경 이력은 Git 기반으로 추적 가능하여, 정책 변경에 대한 감사 및 협업 용이

---

📢 _운영자는 IAM 정책 변경 시 반드시 Git에 기록하고, 검토/리뷰 후 적용합니다._
