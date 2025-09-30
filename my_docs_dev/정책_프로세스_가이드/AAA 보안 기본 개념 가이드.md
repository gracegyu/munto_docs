# AAA 보안 기본 개념 가이드

본 문서는 문토 개발자들이 보안의 기본 원리인 **AAA (Authentication, Authorization, Accounting)** 를 정확히 이해하고 실무에서 혼동하지 않도록 교육하기 위한 자료입니다.

---

## 1. AAA란 무엇인가?

AAA는 정보 보안의 3대 축을 의미합니다.

1. **Authentication (인증)**
   - **정체성(Identity)을 확인하는 과정**입니다.
   - "누구인가?"를 증명하는 단계.
   - 예시: 아이디/비밀번호 로그인, JWT 서명 검증, OAuth 토큰 발급.
2. **Authorization (인가/권한 부여)**
   - **인증된 사용자에게 어떤 리소스에 접근할 수 있는 권한이 있는지 확인하는 과정**입니다.
   - "무엇을 할 수 있는가?"를 판별.
   - 예시: 결제한 사용자만 VOD 파일 다운로드 허용, 관리자 계정만 설정 변경 가능.
3. **Accounting (계정 관리/사용 기록)**
   - **누가 언제 무엇을 했는지를 기록·추적하는 과정**입니다.
   - "사용 행위는 어떻게 기록되는가?"를 다룸.
   - 예시: CloudFront 로그, 결제 후 VOD 시청 이력 저장, 관리자 접근 로그.

---

## 2. AAA의 상호 관계

- **Authentication**이 먼저 수행되어야 Authorization이 가능합니다.
- Authorization이 있어야 사용자가 **허용된 행위**를 할 수 있습니다.
- 모든 행위는 **Accounting**을 통해 추적·감사할 수 있어야 합니다.

> 비유: 회사 건물 출입을 예로 들면
>
> - Authentication: 사원증으로 신원 확인 (이 사람이 직원인가?)
> - Authorization: 사무실은 들어갈 수 있지만 서버실은 불가 (어디까지 가능한가?)
> - Accounting: 출입 기록이 로그에 남음 (언제 어느 문을 열었는가?)

---

## 3. 이번 사례와의 연결

- 이번 VOD/이미지 다운로드 권한 검증에서 **혼동**이 발생한 부분:
  - **JWT를 검증**하는 것은 Authentication (토큰이 유효한 사용자임을 확인).
  - 하지만 **이 사용자가 해당 VOD/이미지를 볼 권리가 있는지**는 Authorization.
  - 따라서 Authorization은 추가적인 권한 데이터(구매 내역, 환불 여부 등)를 확인해야 함.
  - Accounting은 실제 다운로드 시도를 로그로 남겨 사후 분석·감사를 가능하게 함.

---

## 4. 개발자 실무 가이드

1. **Authentication (인증)**
   - 사용자 로그인 처리 (ID/PW, OAuth, JWT).
   - 토큰 서명·만료 검증.
2. **Authorization (인가)**
   - 서비스별 **권한 정책 정의** (예: 결제한 VOD만 접근 가능).
   - 권한 체크 로직은 BE 또는 권한 서버에서 수행.
   - 캐시나 Signed URL을 쓰더라도 반드시 권한을 기반으로 발급.
3. **Accounting (사용 기록)**
   - CloudFront/S3 로그, BE 접근 로그 필수 수집.
   - 보안 사고 추적과 비용 분석에 활용.

---

## 5. 핵심 교훈

- **Authentication과 Authorization을 혼동하지 말 것.**
  - JWT 검증만으로는 "누군지"는 알 수 있어도 "무엇을 할 수 있는지"는 알 수 없음.
- **Accounting은 종종 간과되지만 필수 요소.**
  - 로그 없이는 보안 사고 대응도, 비용 분석도 불가능.
- 보안 설계는 AAA를 모두 고려해야 완전해집니다.

---

## 6. 추가 학습 자료

- NIST: AAA Security Framework
- AWS Well-Architected Framework (Security Pillar)
- OAuth2 / OpenID Connect 권한 위임 사례

---

👉 이번 사례를 통해, 개발자들은 **AAA의 기본 원리**를 이해하고 실무 설계 시 Authentication·Authorization·Accounting을 각각 분리해 사고해야 합니다.
