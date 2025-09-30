# 이메일 반송(Invalid Email) 원인 및 해결 방안 보고서

## 1. 보고 목적

본 문서는 AWS SES(Simple Email Service) 사용 시 발생한 **Invalid Email 반송 문제**의 원인을 규명하고, 이를 해결하기 위한 **구체적이고 실행 가능한 조치 방안**을 제시합니다.

본 방안은 AWS Trust & Safety 팀에 보고할 수 있는 수준으로 정리되었습니다.

---

## 2. 문제 원인

- 최근 SES 발송에서 **10% 이상 높은 반송률(Bounce Rate)** 발생.
- 원인 분석 결과:
  - Email 등록 시 **유효성 확인 절차(Confirm/Double Opt-In)** 없이 DB에 저장됨.
  - 그 결과 **존재하지 않는 주소(Invalid Email)**, 오타가 있는 주소, 사용 불가 주소가 그대로 발송 대상에 포함됨.
  - 반송 이벤트를 DB에 자동 반영하는 체계 부재.

---

## 3. 해결 방법 요약 (Action Summary, 실행 순서 기준)

1. **DB 구조 개선 (우선 실행)**: `email_confirm_status` 필드 추가, 상태를 `PENDING`, `CONFIRMED`, `INVALID`로 관리. (또는 우회적으로 별도 `email_suppression` 테이블 운영)
2. **기존 반송 주소 정리 (우선 실행)**: SES Suppression List 및 로그를 통해 기존 반송 주소를 추출하여 DB 상태를 `INVALID`로 업데이트.
3. **반송 자동 처리 파이프라인 구축**: SES → SNS → Lambda → DB 업데이트 (Invalid Email 즉시 차단).
4. **Double Opt-In 도입**: 신규 Email 등록 시 반드시 확인 메일 발송 → 사용자가 Confirm URL 클릭 시 최종 등록.
5. **운영 정책 보완**: 현재 대량 마케팅 메일 발송 계획 없음 → Email 발송은 비밀번호 찾기 등 필수 트랜잭션으로만 제한.
6. **모니터링 강화**: SES Suppression List, CloudWatch 알람 설정으로 실시간 반송률 관리.

---

## 4. 상세 해결 방법

### 4.1 DB 구조 개선 (가장 우선)

- **`email_confirm_status` (Enum) 필드 추가**
  - `PENDING` : 입력 완료, Confirm 대기
  - `CONFIRMED` : Confirm 완료 (유효 Email)
  - `INVALID` : 반송 발생 등으로 SES에서 무효 처리
- DB 구조가 마련되어야 이후 SES 로그 기반 정리 및 자동 처리 가능.
- **대안**: 스키마 변경이 어렵다면 `email_suppression` 별도 테이블을 두고, 발송 전에 제외 처리.

---

### 4.2 기존 반송 주소 정리 (DB 구조 개선 직후 실행)

- **SES Suppression List 및 로그 확인**:
  - API(`ListSuppressedDestinations`) 호출로 Hard Bounce/Complaint 주소 추출.
  - 과거 SNS/SQS/S3 이벤트 아카이브 및 애플리케이션 발송 로그 활용.
- 추출된 Email을 DB에 `INVALID` 상태로 업데이트.
- 이미 Confirm된 주소라도 SES에서 Invalid로 판정된 경우 우선 `INVALID` 처리 후 재확인 절차 필요.

---

### 4.3 반송 자동 처리 아키텍처

```
SES (Bounce 발생)
   ↓
SNS Topic (bounce-events)
   ↓
Lambda 함수 (이벤트 파서)
   ↓
DB Update (email_confirm_status → INVALID)

```

- **SES**: 반송 이벤트 생성
- **SNS Topic**: 반송 이벤트 수집
- **Lambda**: 이벤트 파싱 후 DB API 호출
- **DB**: 해당 Email 주소의 상태를 `INVALID`로 업데이트

→ Invalid Email은 자동으로 발송 대상에서 제외.

---

### 4.4 Double Opt-In 도입

- 회원가입/비밀번호 찾기 시 입력된 Email로 **Confirm 메일 발송**.
- 사용자가 **확인 URL 클릭 시에만 `CONFIRMED` 상태로 변경**.
- Confirm되지 않으면 발송 대상에 포함되지 않음.

---

### 4.5 운영 정책 보완

- 마케팅 메일 발송은 중단, 현재 발송은 **비밀번호 찾기 등 필수 트랜잭션 메일로만 제한**.
- 이를 통해 단기간 내 반송률 상승 요인을 차단.

---

### 4.6 모니터링 및 재발 방지

- **SES Account-Level Suppression List** 활성화: 이미 반송된 주소로 재발송 방지.
- **CloudWatch 알람**: 반송률/불만족률 초과 시 관리자에게 즉시 알림.
- **주간 리뷰**: 발송 로그 및 Suppression List를 정기 점검.

---

## 5. 기대 효과

- 반송률 감소 및 SES 계정 안정성 확보.
- DB와 발송 시스템 간 실시간 동기화 → 불필요한 재발송 차단.
- 기존 Invalid Email을 조기에 정리하여 AWS Trust & Safety 요구 충족.
- 수신자 경험 개선 및 스팸 인식 최소화.
- AWS 정책 준수 및 장기적으로 SES 발송 평판 향상.

---

## 6. 결론

본 보고서는 Invalid Email 문제를 **원인 규명 + 해결 방안(기존 DB 정리, 자동 처리, Double Opt-In, DB 개선, 모니터링)**으로 통합하여 제시했습니다.

특히 **DB 구조 개선 → 기존 반송 주소 정리 → 자동 처리 파이프라인 구축**의 순서로 진행하면 AWS SES 반송 문제를 근본적으로 해결할 수 있으며, AWS Trust & Safety의 요구사항에도 부합합니다.
