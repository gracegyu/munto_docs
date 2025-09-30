# Git 기반 IAM 권한 관리 연동 방안

IAM 정책 및 역할(Role)을 Git에서 관리하고, 변경 사항을 AWS에 안정적으로 적용하기 위해 다음과 같은 운영 체계를 구축합니다.

---

## 1. Git 저장소 구조 및 운영 방식

IAM 정책은 전용 Git 저장소에서 관리하며, 저장소 구조는 다음과 같습니다:

```
aws-iam-config-repo/
├── policies/                # 정책 JSON 정의
│   ├── dev/
│   ├── prod/
│   └── shared/
├── roles/                   # 역할 정의 및 연결 정책
│   ├── dev/
│   ├── prod/
│   └── shared/
├── scripts/                 # 배포 스크립트 (ex. GitHub Actions, CLI)
└── README.md             # 운영 가이드 및 정책 적용 절차
```

---

## 2. 정책 적용 프로세스 (PR → 리뷰 → 반영)

1. **정책 수정 또는 신규 Role 정의 시**
   - `policies/`, `roles/` 디렉토리에 JSON 파일 생성 또는 수정
   - 커밋 메시지는 `[dev|prod] IAM Policy Update - <설명>` 형식 권장
2. **Pull Request 생성 및 리뷰**
   - 리뷰어는 보안 관리자 또는 인프라 담당자
   - 정책의 최소 권한 원칙, 리소스 제한 여부 확인
3. **리뷰 승인 및 Merge**
   - Merge 후 CI 파이프라인 또는 수동 CLI 스크립트를 통해 AWS에 반영
   - 예: `aws iam create-policy --policy-name <...> --policy-document file://...`
4. **변경 이력 추적**
   - Git Commit 로그 및 PR 내역으로 감사 추적 가능

---

## 3. 정책 적용 방식 (수동 또는 자동)

### (1) 수동 방식

- 운영자가 변경된 정책 파일을 기준으로 CLI로 직접 적용

```
aws iam create-policy --policy-name my-policy \
  --policy-document file://policies/dev/my-policy.json
```

### (2) 자동화 방식

- GitHub Actions, Jenkins 등을 통해 CI로 정책 자동 반영
- 예: PR merge 시 다음 순서로 실행
  1. 변경된 정책 파싱
  2. 기존 정책과 비교하여 차이 검출
  3. `create-policy`, `update-assume-role-policy` 등 AWS CLI 명령 실행

---

## 4. 권장 사항 및 참고

- 정책명, 역할명은 명확히 네이밍: `dev-cdk-deploy`, `prod-monitor`, 등
- 권한 충돌 방지를 위해 수정 전 반드시 기존 정책/역할 확인
- AWS Console을 통한 수동 변경 시에도 반드시 Git 반영 후 PR 생성
- 별도의 정책 관리 저장소를 운영하는 것이 이상적 (`aws-iam-config`, `infra-iam-control`, 등)
- 정책 적용 실패나 충돌 방지를 위해 배포 전 Dry Run 수행 가능

---

## 📌 예시 저장소 명

- `aws-iam-config`
- `infra-iam-policy`
- `munto-iam-management`

---

본 운영 체계를 통해 IAM 권한 변경을 코드 기반으로 관리하고, 협업/감사/재현 가능성을 확보할 수 있습니다.
