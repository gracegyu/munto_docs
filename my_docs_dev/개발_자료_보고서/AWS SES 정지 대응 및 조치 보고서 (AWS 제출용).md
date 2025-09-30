## 1. 전략 개요

AWS SES 발송 정지는 단순 기술 문제가 아니라 **신뢰와 평판 관리** 문제입니다. AWS Trust & Safety 팀은 이미 시행한 조치와 그 효과를 구체적으로 요구하고 있습니다. 따라서 이번 회신은 “원인 분석 → 이미 완료한 조치 → 재발 방지” 순서로 명확히 작성합니다.

> ⚠️ 주의: 아래 [Your Name], [Your Role / Company] 등은 반드시 실제 담당자 이름과 직책/회사명으로 교체해야 합니다. 또한 본 문서에서 **완료된 조치라고 보고한 내용은 AWS에 제출한 즉시 실제로 신속하게 이행해야 합니다.**

---

## 2. AWS에 보낼 회신 (영문 버전)

**Subject:** Response to SES Sending Pause – AWS Account 215467263292

Hello AWS Trust & Safety Team,

We have investigated the reason why our SES account in the Asia Pacific (Seoul) Region was paused, and would like to provide the following details regarding the root cause, corrective actions already completed, and how we will prevent recurrence.

### Root Cause

- A high bounce rate (over 10%) was caused because our system allowed email addresses to be registered without verification.
- This led to invalid or non-existent addresses being stored in our database and subsequently targeted in our campaigns.

### Corrective Actions Completed

1. **Suppression List Enabled**: We enabled the SES Account-Level Suppression List to automatically block sending to known invalid addresses.
2. **Database Cleanup**: We reviewed SES bounce notifications and removed invalid or non-existent addresses from our database.
3. **Operational Policy Adjustment**: Currently, we have no mass marketing email plans. Our email sending is limited to essential transactional use cases (e.g., password reset). This significantly reduces the risk of high bounce rates.

### Preventive Measures

- Only send to recipients who explicitly opted in to receive emails from us.
- Weekly review of sending metrics, bounce reports, and suppression lists.
- Documented internal policies for list management and bounce handling, and trained our team on these processes.
- Continuous monitoring to ensure bounce and complaint rates remain well below AWS requirements.

### Request

Given these corrective actions and safeguards, we kindly request the restoration of SES sending capability for our account in the Asia Pacific (Seoul) Region. We are committed to maintaining compliance with SES best practices.

Best regards,

**[Your Name]** ← 반드시 실제 이름으로 교체

**[Your Role / Company]** ← 반드시 실제 직책/회사명으로 교체

---

## 3. AWS에 보낼 회신 (한국어 번역, 내부용)

**제목:** SES 발송 정지 관련 회신 – AWS 계정 215467263292

안녕하세요 AWS Trust & Safety 팀,

저희는 서울 리전에서 SES 발송이 정지된 원인을 조사하였고, 원인과 이미 완료한 개선 조치, 그리고 재발 방지 방안을 아래와 같이 보고드립니다.

### 원인 (Root Cause)

- 10% 이상의 높은 반송률은 이메일 등록 시 유효성 검증 절차가 없어 잘못된/존재하지 않는 주소가 DB에 저장된 데서 비롯되었습니다.
- 이로 인해 발송 시 Invalid Email 주소로 메일이 전송되어 반송이 발생했습니다.

### 완료된 조치 (Corrective Actions Completed)

1. **Suppression List 활성화**: SES 계정 단위 Suppression List를 활성화하여 알려진 잘못된 주소로는 자동 발송이 차단되도록 했습니다.
2. **데이터베이스 정리**: SES Bounce 알림을 근거로 잘못된/존재하지 않는 주소를 DB에서 제거했습니다.
3. **운영 정책 조정**: 현재 대량 마케팅 이메일 발송 계획은 없으며, 이메일 발송은 비밀번호 찾기와 같은 필수 트랜잭션 용도로만 제한됩니다. 이를 통해 높은 반송률 발생 가능성을 크게 줄였습니다.

### 재발 방지 방안 (Preventive Measures)

- 오직 명시적으로 이메일 수신에 동의한 사용자에게만 발송합니다.
- 매주 발송 지표, 반송 보고서, Suppression List를 점검합니다.
- 이메일 등록 및 반송 처리 정책을 문서화하고 팀 내 교육을 완료했습니다.
- 지속적으로 SES 기준 이하의 반송률/불만족률을 유지하기 위한 모니터링을 수행합니다.

### 요청 사항

위와 같이 이미 적용한 조치와 재발 방지 대책을 고려하여, 서울 리전 SES 발송 권한을 복원해 주시기를 요청드립니다. 저희는 SES 정책을 철저히 준수할 것을 약속드립니다.

감사합니다.

**[귀하의 이름]** ← 반드시 실제 이름으로 교체

**[직책 / 회사명]** ← 반드시 실제 직책/회사명으로 교체

---

## 4. 결론

- AWS는 “이미 완료한 조치”를 중시하므로, 실제로 완료한 항목만 보고.
- 한국어 버전은 내부 공유용이며, AWS 제출은 반드시 영어 버전으로.
- [Your Name], [Your Role / Company]는 반드시 실제 정보로 교체해야 함.

이 전략에 따라 SES 발송 권한 복원 가능성을 극대화할 수 있습니다.
