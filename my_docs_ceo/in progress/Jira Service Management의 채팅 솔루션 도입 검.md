# **Jira Service Management의 채팅 솔루션 도입 검토 보고서**

## 1. 개요

본 보고서는 고객 지원 및 내부 IT 서비스 대응을 위한 Jira Service Management(이하 JSM)의 채팅 솔루션 활용 방안을 검토하고, 도입 가능한 옵션과 구성 방식에 대해 설명합니다. 보고 대상은 당사 서비스 포털(Help Center) 개선 및 고객 접점 확대를 검토하는 경영진입니다.

---

## 2. Jira Service Management의 채팅 관련 기능

### 2.1. 기본 기능

JSM은 기본적으로 실시간 채팅 기능을 내장하고 있지 않으며, 고객 요청은 서비스 포털 또는 이메일, 양식 기반으로 수집됩니다.

다만, **Atlassian Assist(구 Halp)**를 포함한 다양한 연동 솔루션을 통해 실시간 채팅 기능을 통합할 수 있습니다.

❗ **Atlassian Assist는 Jira Service Management Premium 이상 요금제에서만 사용할 수 있으며**, Slack 또는 Microsoft Teams 기반으로 작동합니다. 또한 고객(C/S) 채널이 아닌 **사내 내부 요청 대응 전용 솔루션**으로 설계되어 있어, 외부 고객 응대 채널에는 적합하지 않습니다.

---

## 3. 도입 가능한 채팅 솔루션 옵션

> ⚠️ 참고: 모든 채팅 솔루션은 고객이 별도 설치 없이, 당사 웹사이트나 앱에 표시된 채팅창(UI)에서 바로 이용할 수 있습니다. 우리는 여러 솔루션 중 하나만 선택하여 구축하면 되며, 고객은 어떤 솔루션이 적용되었는지 인식하지 않아도 일관된 경험을 누릴 수 있습니다.

### 3.1. **Atlassian Assist (Halp)**

- **설명**: Slack 또는 Microsoft Teams와 연동하여 고객 또는 직원의 채팅 메시지를 JSM 이슈로 변환
- **장점**:
  - 내부 실시간 대응에 적합
  - Slack 내에서 티켓 생성 및 응답 가능
  - Jira Service Management Premium 플랜 이상에서 통합 제공
- **단점**: 외부 고객 채널용 웹 채팅 기능은 미제공

### 3.2. **외부 라이브챗 솔루션 연동**

- **대상 솔루션 예시**:
  - **Crisp Chat** (한국어 UI 지원, 가격 대비 기능 우수, 국내 스타트업 활용도 높음)
  - **Tidio** (마케팅 자동화 기능 포함)
  - **Zendesk Chat** (엔터프라이즈에 적합하나 비용 상대적으로 높음)
  - **LiveChat** (브랜드 신뢰도 높고 API 연동 유연)
- **구성 방식**:
  - 당사 웹사이트 또는 모바일 앱에 채팅 위젯 삽입
  - 대화 데이터를 API 또는 Zapier 등을 통해 JSM 이슈로 연동
- **특징**:
  - 별도 URL 또는 위젯 방식으로 제공
  - 고객 경험(UI/UX)을 자유롭게 설계 가능

> 📌 한국 환경 기준 추천: UI/UX, 구축 편의성, 비용 측면에서 Crisp Chat을 우선 고려할 것을 권고합니다. 특히 스타트업 및 중소기업 중심으로 국내에서도 널리 사용되고 있으며, 한국어 인터페이스와 빠른 셋업이 장점입니다.

> 💰 비용 요약 (2025년 7월 기준):
>
> - **Crisp Chat**: 무료 플랜 제공, 유료 플랜은 $45/월(Mini), $95/월(Essentials), $295/월(Unlimited)부터 시작 (출처)
> - **Tidio**: 무료 플랜 제공, 유료 플랜은 $24.17/월(Starter), $49.17/월(Growth), $749/월(Plus)부터 시작 (출처)
> - **Zendesk Chat**: 무료 플랜(Lite, 단일 사용자) 있음, 유료 플랜은 $19/월/agent(Support), $55/월/agent(Suite Team)부터 시작 (출처)
> - **LiveChat**: 무료 플랜 없음, 유료 플랜은 $24/월(Starter), $41/월(Team), $59/월(Business)부터 시작 (출처) 대부분 월 구독 방식이며, 연간 결제 시 할인 제공. 7~14일 무료 체험 플랜 제공됨

### 3.3. **Atlassian Marketplace 연동 앱**

- 예: SnapEngage, Chat for Jira Service Management
- **JSM의 서비스 포털 내에 채팅 기능을 포함할 수 있음**
- 일부 앱은 고객 포털 URL 내에서 직접 채팅창을 제공

---

## 4. 서비스 포털 연동 방식

| 연동 방식        | 구성 형태              | URL 방식                     | 비고                  |
| ---------------- | ---------------------- | ---------------------------- | --------------------- |
| Atlassian Assist | Slack/Teams 내 연동    | 내부 채널 URL                | 사내 IT 대응에 적합   |
| 외부 채팅 위젯   | Web/App UI에 포함      | 별도 URL 또는 도메인 내 삽입 | 고객 지원에 적합      |
| SnapEngage 등 앱 | JSM Help Center에 포함 | 기존 포털 URL 내 제공        | 관리 및 유지보수 용이 |

---

## 5. 자체 채팅 기능 존재 여부

- **Jira Service Management 자체에는 별도 채팅 UI 또는 실시간 채팅 기능이 내장되어 있지 않음**
- 실시간 고객 응대를 위해서는 **외부 솔루션 또는 Atlassian Assist 등의 연동 도구가 필수**

---

## 6. 권고사항

| 항목               | 권고 옵션                                                            |
| ------------------ | -------------------------------------------------------------------- |
| 내부 IT 지원 채널  | Atlassian Assist + Slack 연동                                        |
| 고객용 실시간 응대 | Crisp Chat 또는 SnapEngage + JSM 연동                                |
| 장기 전략          | 서비스 포털 내 일원화된 고객 UI 제공을 위한 Marketplace 기반 앱 연동 |

---

## 7. 결론

Jira Service Management는 기본적으로 실시간 채팅 기능을 포함하지 않으며, 실시간 고객 응대를 위해서는 Atlassian Assist 또는 외부 솔루션을 유료로 연동해 구축해야 합니다. 특히 Atlassian Assist는 내부 협업 대응용으로 적합하며, 외부 고객을 대상으로 한 채널에는 별도 외부 솔루션이 필요합니다.

Premium 요금제 이상의 구독 시, Atlassian Assist를 통한 효율적 내부 채팅 대응 체계도 구축할 수 있으며, 고객 접점 확대를 위해서는 Crisp Chat과 같은 외부 솔루션 연동이 효과적입니다.

---

※ 부록: 관련 링크

- Atlassian Assist 소개: https://www.atlassian.com/software/assist
- Custom domain 및 Help Center: https://support.atlassian.com/organization-administration/docs/add-a-custom-domain/
