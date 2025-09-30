# **이메일 발송 인증: SPF, DKIM, DMARC 개요 및 SES 설정 가이드**

## 1. 왜 필요한가?

이메일은 원래 구조상 **보낸 사람 주소를 쉽게 위조할 수 있는 프로토콜(SMTP)** 위에서 동작합니다.

따라서 별도의 인증 체계가 없으면 스팸 발송자나 피싱 공격자가 쉽게 "보낸 사람 위조"를 할 수 있습니다.

이를 막기 위해 나온 것이 **SPF, DKIM, DMARC**입니다.

AWS SES뿐 아니라, **Gmail Workspace(구 G Suite)** 를 사용하는 경우에도 반드시 설정해야 하며, 동일 도메인(`munto.kr`)에서 두 서비스를 병행 사용한다면 **하나의 SPF 레코드 안에 SES와 Gmail을 모두 허용**하도록 작성해야 합니다.

---

## 2. 현황 점검 (munto.kr 기준)

- **SPF**: SES용 SPF(`include:amazonses.com`)는 이미 등록되어 있음. 하지만 Gmail(`include:_spf.google.com`)은 누락됨.
- **DKIM**: SES와 Gmail 모두 현재 DNS에 DKIM 레코드가 등록되어 있지 않음. (dig 명령어 확인 결과, 응답 없음)
- **DMARC**: 아직 등록되지 않음.

👉 따라서 SPF는 보완 필요, DKIM은 신규 설정 필요, DMARC는 신규 도입 필요.

---

## 3. SPF (Sender Policy Framework)

- **목적**: 이 도메인에서 메일을 보낼 수 있는 서버/서비스를 지정하여, 수신자가 "이 IP에서 보낸 메일이 정말로 허용된 것인지"를 확인하도록 함.
- **예시 레코드 (SES + Gmail 통합)**:
  ```
  v=spf1 include:amazonses.com include:_spf.google.com ~all

  ```
  → SES와 Gmail Workspace 모두에서 보낼 수 있도록 허용.

### SES에서 설정 방법

1. SES 콘솔에서 도메인 Identity 생성.
2. Route53 또는 사용하는 DNS에 위와 같은 TXT 레코드 추가.
3. `include:amazonses.com` 반드시 포함.

### Gmail에서 설정 방법

1. Google Admin Console → **도메인 인증** 메뉴로 이동.
2. SPF 레코드에 `include:_spf.google.com` 포함.
3. SES와 병행 사용 시 `include:amazonses.com`도 함께 추가.

---

## 4. DKIM (DomainKeys Identified Mail)

- **목적**: 메일 내용이 발송 중 위·변조되지 않았음을 증명.
- **설명**: 발송 서버가 비밀키로 서명한 값을 메일 헤더에 넣고, 수신 서버는 DNS에 등록된 공개키(CNAME/TXT)를 이용해 검증.

### 현황

- 현재 `munto.kr` 도메인에 SES와 Gmail 모두 DKIM 레코드가 설정되어 있지 않음.
- 이 상태에서는 발송 메일이 DKIM 검증에 실패 → 스팸 분류 및 평판 저하 위험.

### SES에서 설정 방법

1. SES 콘솔에서 도메인 Identity 등록 시 **DKIM 서명 활성화**.
2. 자동으로 생성되는 3개의 CNAME 레코드를 Route53에 추가.
3. 검증 완료 후 SES가 DKIM 서명을 자동으로 추가.

### Gmail에서 설정 방법

1. Google Admin Console → **앱 → Google Workspace → Gmail → 인증(DKIM)** 메뉴 이동.
2. "DKIM 키 생성" 후 DNS에 TXT 레코드 등록.
3. Admin Console에서 "시작(Start Authentication)"으로 변경해야 DKIM이 실제로 작동.

---

## 5. DMARC (Domain-based Message Authentication, Reporting & Conformance)

- **목적**: SPF/DKIM 결과를 종합해 수신자가 메일을 어떻게 처리해야 하는지 정책을 정의.
- **예시 레코드 (TXT)**:
  ```
  _dmarc.munto.kr TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@munto.kr"

  ```
  → SPF/DKIM 실패 시 격리(quarantine), 리포트를 `dmarc-reports@munto.kr`로 수신. 실제로 존재하는 **수신 가능한 이메일 계정**이어야 하고, 정기적으로 관리해야 합니다.

### SES/Gmail 공통 설정 방법

1. SES나 Gmail 자체에서 DMARC 레코드를 생성하지 않음.
2. 수동으로 DNS에 `_dmarc.munto.kr` TXT 레코드 추가.
3. 정책 값은 운영 단계에 맞게 `p=none` → `p=quarantine` → `p=reject` 순으로 강화.

---

## 6. 요약

| 항목 | 목적 | 현황 (munto.kr) | SES 설정 방법 | Gmail 설정 방법 |
| --- | --- | --- | --- | --- |
| **SPF** | 발송 서버 합법성 검증 | SES만 등록됨 (`include:amazonses.com`), Gmail 누락 | TXT: `include:amazonses.com` | TXT: `include:_spf.google.com` |
| **DKIM** | 메일 위변조 여부 검증 | SES, Gmail 모두 미설정 | SES 제공 CNAME 3개 등록 | Admin Console DKIM 키 생성 후 TXT 등록 |
| **DMARC** | SPF/DKIM 실패 시 정책 정의 | 미설정 | DNS TXT 직접 추가 | DNS TXT 직접 추가 (공통) |

---

## 7. 권장 설정 순서 (munto.kr 도메인 기준)

1. SPF TXT 레코드 보완 → SES + Gmail 모두 허용.
2. SES 도메인 Identity 등록 후 DKIM CNAME 3개 추가.
3. Google Admin Console에서 DKIM 키 생성 및 DNS에 TXT 추가.
4. DMARC TXT 레코드 추가 (초기 `p=none`, 이후 `p=quarantine`/`reject`로 강화).

---

✅ **정리**:

- SES는 SPF가 이미 등록됨. Gmail SPF는 추가 필요.
- DKIM은 SES/Gmail 모두 미설정 → 반드시 신규 설정 필요.
- DMARC는 공통으로 신규 설정 필요.
- SES와 Gmail 병행 사용 시, SPF는 하나의 레코드에 모두 포함해야 하며 DKIM은 서비스별 별도 등록.
