# Email 서비스 이중화 전략 보고서

## 1. 보고 목적

본 문서는 AWS SES(Simple Email Service) 정지(Suspension)나 장애 상황에서 **서비스 중단 없는 Email 발송**을 보장하기 위한 **이중화(Failover) 전략**을 제시합니다. 특히 Gmail Workspace를 보조 채널로 활용하여, 비밀번호 찾기 등 필수 트랜잭션 메일이 언제나 발송 가능하도록 합니다.

---

## 2. 배경 및 필요성

- 최근 SES 발송 정지 사례에서 고객의 비밀번호 찾기 기능까지 중단.
- SES는 반송률/불만족률 초과 시 **즉시 발송 정지**가 발생할 수 있음.
- 따라서 **단일 프로바이더 의존은 리스크가 큼** → 보조 채널(Gmail, SendGrid 등) 확보 필요.

---

## 3. 이중화 전략 개요

- **기본 경로**: AWS SES (ap-northeast-2, Verified Domain)
- **보조 경로**: Gmail Workspace SMTP 또는 Gmail API
- **전환 조건**:
  1. SES SDK/SMTP 응답에서 `AccountSuspendedException`, `SendingPausedException`, `MessageRejected(…paused…)` 등 **정지 관련 에러 감지**
  2. SES 계정 상태 점검(`GetAccount.sendingEnabled=false`)
- **전환 방식**:
  - 런타임 Config(`EMAIL_PROVIDER=SES|GMAIL`) 기반 전환
  - Circuit Breaker 패턴 적용 (정지 감지 → Gmail로 Failover → SES 정상화 후 자동 복귀)

---

## 4. 아키텍처 설계

```
Application
   ↓
EmailService Interface
   ├── SESAdapter
   └── GmailAdapter

Circuit Breaker + Config Store
   ↓
Slack/Jira 알림 채널 (Suspension 감지 시)

```

- **Adapter 패턴**: `EmailService` 인터페이스 정의, SES/Gmail 구현체 분리.
- **Circuit Breaker**: 정지 이벤트 발생 시 SES 경로 차단, 일정 시간(TTL) Gmail 경로만 사용.
- **Slack/Jira 알림**: 정지 감지 즉시 운영팀 알림.

---

## 5. 실행 절차

### 5.1 환경 설정

```
EMAIL_PROVIDER=SES
SES_REGION=ap-northeast-2
GMAIL_SMTP=smtp.gmail.com
GMAIL_USER=tech@munto.kr
GMAIL_PASS=app-specific-password

```

### 5.2 예외 처리 로직 (의사코드)

```tsx
try {
  ses.send(mail)
} catch (err) {
  if (isSuspensionError(err)) {
    alertSlack(err)
    switchProvider('GMAIL')
    gmail.send(mail)
  } else {
    retryOrThrow(err)
  }
}
```

### 5.3 회로 차단기 로직

- Suspension 발생 → **Circuit OPEN (60분)**
- GmailAdapter로 라우팅
- 60분 후 Canary Test(SES로 자기 자신 발송)
  - 성공: Circuit CLOSE, SES 복귀
  - 실패: Circuit 연장

---

## 6. Gmail 사용 시 주의사항

- **SPF/DKIM/DMARC**: SES와 함께 Gmail도 DNS에 모두 반영 필요
  - SPF 예시: `v=spf1 include:amazonses.com include:_spf.google.com ~all`
  - DKIM: SES와 Gmail 각각 발급된 키 등록
  - DMARC: 도메인 단위 공통 적용
- **쿼터 제한**: Gmail Workspace는 하루 약 2,000건, 트랜잭션 메일에만 사용.
- **컴플라이언스**: From/Reply-To, 수신거부 정책 일관성 유지.

---

## 7. 운영 체크리스트

- [ ] SES/Gmail SPF, DKIM, DMARC DNS 레코드 확인
- [ ] EmailService Adapter 인터페이스 구현 완료
- [ ] Circuit Breaker 상태 모니터링 대시보드 구축
- [ ] Slack/Jira 알림 테스트
- [ ] Failover/복귀 시나리오 E2E 테스트

---

## 8. 결론

- SES 단일 경로는 **정지 리스크**로 인해 서비스 연속성에 취약.
- Gmail 보조 경로를 통한 **이중화 체계**는 트랜잭션 메일 가용성을 보장.
- 런타임 스위치 + Circuit Breaker로 **재빌드 없는 즉시 전환**을 지원.
- 이 전략을 구현하면 개발자가 즉시 참고하여 Email 이중화 기능을 구현할 수 있습니다.
