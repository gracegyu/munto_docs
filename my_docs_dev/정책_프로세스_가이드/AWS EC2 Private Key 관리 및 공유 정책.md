# AWS EC2 Private Key 관리 및 공유 정책

## 1. 문서 목적

본 문서는 AWS EC2 인스턴스에 접속하기 위한 Private Key(PEM 파일 등)의 보안성, 추적성, 운영 효율성을 확보하기 위해 사내 개발자 간 안전한 보관 및 공유 방법을 정의하는 것을 목적으로 한다.

---

## 2. 적용 범위

- 본 정책은 AWS EC2 인스턴스 운영 및 유지보수에 관여하는 모든 개발자 및 운영자를 대상으로 한다.
- 신규/기존 모든 EC2 인스턴스에 적용된다.

---

## 3. 기본 원칙

1. **직접 공유 금지**: 이메일, 메신저, 파일 서버를 통한 PEM 파일 직접 공유는 금지한다.
2. **중앙 집중 관리**: Private Key는 중앙 관리형 시스템 또는 Bastion Host에서만 관리한다.
3. **추적 가능성 확보**: 모든 접근은 사용자별 로그 추적이 가능해야 한다.
4. **보안 우선**: 키는 안전하게 암호화 저장 및 접근 제어 정책을 따른다.

---

## 4. 권장 관리 방식

### 4.1 Session Manager 기반 접속 (우선 적용 권장)

- AWS Systems Manager Session Manager를 활용하여 Private Key 없이 EC2 접속.
- IAM 정책으로 사용자별 접근 제어.
- CloudTrail 및 SSM 로그로 접속 이력 관리.
- **장점**: 키 배포 불필요, 보안성 및 운영 효율성 우수.
- **적용 권장**: 가능한 경우 최우선 적용.

### 4.2 Bastion Host 기반 관리 (보조 방안)

- Session Manager 사용이 제한적일 경우 대안으로 활용.
- Bastion Host를 통한 SSH 접속.
- Bastion에만 Private Key를 저장하고, 개발자는 MFA 인증 후 Bastion을 통해 EC2 접근.
- Bastion Host 접속 이력은 중앙 로그 서버로 수집.

### 4.3 사용자별 Public Key 등록 (보조 방법)

- EC2 인스턴스의 `authorized_keys`에 개발자별 Public Key 등록.
- 퇴사/권한 해제 시 해당 키만 제거 가능.
- Private Key는 각 개발자가 개인 보관.

---

## 5. 보조적 관리 방안

- **Secrets Manager/Vault 사용**: Private Key를 안전하게 저장하고 IAM 기반 접근 제어.
- **MFA 적용**: Bastion Host, Vault 접근 시 MFA 필수화.
- **Git 저장 금지**: Private Key는 VCS 저장소에 절대 포함하지 않는다.
- **암호화 전송**: 필요 시 GPG, KMS 등을 이용해 암호화된 상태로만 공유.

---

## 6. 운영 절차

1. 신규 인스턴스 생성 시:
   - Session Manager 연결 우선 적용.
   - 불가피할 경우 Bastion Host를 통한 PEM 관리.
2. 개발자 추가 시:
   - IAM 사용자 생성 및 권한 부여.
   - 필요 시 Public Key 등록.
3. 개발자 퇴사/권한 변경 시:
   - 해당 사용자 IAM 계정 및 Key 폐기.
   - Bastion/EC2 authorized_keys에서 Public Key 삭제.
4. 정기 점검:
   - 분기별 Key 접근 로그 검토.
   - 불필요 계정 및 키 정리.

---

## 7. 결론

본 정책은 AWS EC2 Private Key를 안전하게 관리하기 위한 최소 보안 가이드라인을 제시한다. Session Manager를 우선 적용하여 Private Key 공유 문제를 근본적으로 해소하고, 제한 상황에서는 Bastion Host 및 Public Key 방식을 보조적으로 운영한다.
