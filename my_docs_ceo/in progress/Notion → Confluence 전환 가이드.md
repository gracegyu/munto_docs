# 📘 Notion → Confluence 전환 가이드

본 문서는 Munto가 현재 운영 중인 약 3,000개의 Notion 문서를 Confluence로 전환하며, 지식 관리 체계를 재정립하기 위한 **최종 마이그레이션 가이드**입니다.

---

## 1. 전환 배경 및 목적

- **Notion의 한계**
  - 버전 관리 미흡 (Diff/Tag 부재)
  - DB 1만 건 이상 시 성능 저하
  - 보안/권한 관리, 거버넌스 부족
- **Confluence 전환 기대효과**
  - 체계적인 문서 분류 및 구조화
  - Jira, Slack 등 기존 툴과의 긴밀한 통합
  - 엔터프라이즈급 보안, 권한 관리, 감사 로그 제공
  - 장기적 지식 자산 관리 기반 확보

---

## 2. 마이그레이션 프로세스 (Best Practice)

### 단계별 접근

1. **사전 진단**
   - Notion 내 문서 총량, DB 활용 현황, 권한 구조, 사용 패턴 분석
   - 문서 유형 분류 (예: 정책/가이드, 회의록, 프로젝트 산출물, DB)
2. **분류/정리**
   - 중복 문서 제거
   - 불필요한 Draft 문서 아카이빙
   - 기존 문서 체계 점검 및 정리 (카테고리/계층 구조 재정립, 태그/속성 표준화)
   - 핵심 분류 체계(Category → Space → Page 구조) 정의
3. **마이그레이션 실행**
   - **(권장) 사내 Migration Tool 개발**: Notion API → Staging(JSON/CSV) → Transform(템플릿/Jinja2, Page Properties & Labels 매핑, 사용자/이메일 매핑) → Load(Confluence REST Upsert, Attachment 업로드). `original_notion_id`로 멱등성 확보, 재시도/로그/롤백 포함.
   - 자동화 도구 활용 (예: Notion → Confluence 마이그레이터, Markdown Export) _+ 사내 툴 보완_.
   - **Database 변환 옵션**: (A) CSV Export → 표/페이지 변환, (B) API 기반 **Row→Page 자동 생성**(속성→Page Properties/Label, Action Items→Jira 이슈 생성/역링크).
   - **링크/멘션/이미지 변환 규칙**: Notion 내부 링크→Confluence 경로 치환, @사용자 Mentions 매핑, 이미지/첨부는 Attachment 업로드 후 본문 URL 재치환.
   - **증분 동기화 & 검증**: 날짜 필터 기반 증분 이행, Dry-run로 Storage Format 검사, 배치(예: 500건) 단위 샘플 QA.
4. **검증 및 QA**
   - 무작위 샘플링 검수 (본문, 링크, 첨부 정상 여부)
   - 주요 문서 Stakeholder 리뷰
5. **교육 및 온보딩**
   - 직원 대상 Confluence 사용 가이드 배포
   - Notion 대비 달라진 점 강조 (버전 관리, 권한 관리, 검색 체계)
   - FAQ 문서화
6. **운영/거버넌스 수립**
   - Space Owner 지정
   - 문서 생성/리뷰/승인 프로세스 확립
   - 보존 정책 및 아카이빙 기준 정의

---

## 3. Confluence 관리 체계 설계

### 문서 구조 (예시)

- **회사 레벨 Space**
  - 정책/규정
  - 조직/HR
- **프로젝트 레벨 Space**
  - 기획/설계
  - QA/테스트
  - 회의록/의사결정
- **제품 레벨 Space**
  - 릴리즈 노트
  - 개발자 문서(API, 아키텍처)
  - 운영 가이드

### 권한 관리

- Space 단위 권한 설정 (읽기/편집/관리자)
- 페이지 단위 예외 권한 허용 최소화
- 외부 협력사/파트너 계정은 별도 Restricted Space 운영

### 버전 관리

- 모든 문서 자동 버전 기록 보관
- 주요 문서(정책, 기술 문서)는 주기적 Tag/Label 지정
- 변경 이력 기반 리뷰/승인 절차 추가

---

## 4. 직원 관점에서 달라지는 점

- **Notion**
  - 자유로운 DB 기반, 유연한 문서 작성
  - 개인 노트와 업무 문서 경계 모호
  - 검색 속도/성능 한계 존재
- **Confluence**
  - 정형화된 문서 체계 (Space → Page)
  - Jira/Slack 등과 직접 연계
  - 버전 관리, 권한 관리 강화
  - Database 개념 부재 → Table, Page Properties Report로 대체

👉 따라서, **“DB처럼 활용하던 문서”는 Confluence Table, Jira Issue, 외부 BI 툴 등으로 재분배**해야 합니다. 또한 DB 속성(예: 회의록의 참석자, 담당자, 태그 등)은 Confluence에서는 **문서 본문에 포함하거나 Page Properties/Label로 관리**하는 방식으로 변환해야 합니다. 이러한 변환은 수동 입력도 가능하지만, 변환 툴에서 Notion 필드를 추출해 Confluence 문서 본문 상단의 Page Properties 매크로나 표 형태로 자동 삽입하도록 구현할 수 있습니다. 이 과정에서 일부 불편함은 발생하지만, 대신 **검색/추적/거버넌스** 측면에서 강력한 이점이 생깁니다.

---

## 5. Notion → Confluence Migration 난관 및 해결책

| 난관             | 상세 설명                                   | 해결 방안                                 |
| ---------------- | ------------------------------------------- | ----------------------------------------- |
| Database 변환    | Notion DB는 Confluence에 직접 매핑 불가     | CSV Export 후 Table 변환 / Jira 연계 활용 |
| 문서 링크 깨짐   | 내부 링크 경로 변경                         | 매핑 테이블 작성 후 Migration Tool 보정   |
| 권한 체계 불일치 | Notion은 Page 단위, Confluence는 Space 중심 | Space 설계 단계에서 권한 구조 재정립      |
| 사용자 거부감    | Notion의 자유로움 → Confluence의 정형화     | 교육, 가이드 제공 및 FAQ 운영             |

---

## 6. 최적의 Migration 전략

- **하이브리드 접근**: 모든 Notion DB를 강제로 Confluence로 옮기지 않고, 일부는 Jira/Sheets/BI Tool로 분산
- **Top-down Governance**: 회사/제품/프로젝트 단위 Space 체계 정의 후 Migration 진행
- **Phased Migration**: 일괄 이전이 아닌, 우선순위 문서(정책/기술/QA)를 먼저 이전 → 점진적 확대
- **Change Management**: 직원 대상 교육 세션, 피드백 채널 운영, 초반 FAQ 적극 관리

---

## 7. 외부 자동화 도구 소개

Confluence 전환 시 사내 툴 외에도 다음과 같은 외부 자동화 도구/서비스를 활용할 수 있습니다:

- **Atlassian 공식 Importer**: [Confluence Cloud Import from Notion](https://support.atlassian.com/confluence-cloud/docs/import-data-from-notion-into-confluence/?utm_source=chatgpt.com) – ZIP 업로드 기반 자동 마이그레이션.
- **Adaptavist Migration Tool(유료)**: [Adaptavist Notion to Confluence Migration](https://www.adaptavist.com/en-gr/blog/notion-to-confluence-migrations?utm_source=chatgpt.com) – 엔터프라이즈급 관리/자동화 지원.
- **오픈소스 툴**:
  - [notion2confluence (Node.js)](https://github.com/Shashwatsingh22/notion2confluence?utm_source=chatgpt.com) – Notion 페이지를 Confluence로 변환하는 스크립트.
  - [notion‑confluence‑migrator (Python GUI)](https://hackmd.io/%40pazcode/HJmsQq8tA?utm_source=chatgpt.com) – GUI 기반 마이그레이터.

이들 도구를 기본 마이그레이션에 활용하고, **사내 전용 툴로 보완**하는 전략이 최적입니다.

### 추천 도구

- **우선 권장**: Atlassian 공식 Importer – 안정성, 지원, 포맷 호환성이 가장 뛰어나며 대규모 이행에 적합.
- **엔터프라이즈 확장**: Adaptavist Migration Tool – 대규모 조직/복잡한 권한 체계에 유리.
- **커스터마이즈 필요 시**: 오픈소스 툴(notion2confluence, notion-confluence-migrator) – 제한적 기능이지만 자체 자동화 로직과 결합해 보완 가능.

---

## 8. Migration 이후 Notion 원본 보존 정책

- **원본 유지 필요성**: 누락 문서 검증, QA/사용자 피드백, 법적/감사 대응.
- **권장 보존 기간**: Migration 완료 후 **3~6개월** 유지 권장.
- **삭제 시점 기준**: Confluence 안정화(검색/권한/링크), 사용자 피드백 반영 완료, 전체 Export 아카이브 확보 후.
- **비용 고려**: Free/Plus는 부담 적음, Business/Enterprise는 월 구독료 발생 → 장기 유지 시 비용 증가.
- **최적 전략**: 3~6개월 후 삭제 또는 관리자 전용 접근 제한, 법적/핵심 문서는 Export 후 별도 아카이브.

---

## 9. 비용 비교 (Confluence & Notion 기준)

| 항목                      | 사용자 수 | 플랜                  | 월 요금(USD)          | 비고                                   |
| ------------------------- | --------- | --------------------- | --------------------- | -------------------------------------- |
| **Confluence (Standard)** | 15명      | Standard              | $6.40/사용자 → 약 $96 | 14일 무료 후 과금 시작                 |
| **Notion (Free)**         | 제한 없음 | Free                  | $0                    | 기본 기능, 보존 비용 없음              |
| **Notion (Plus)**         | 15명      | Plus (₩14,000/사용자) | 약 ₩210,000 (≈$160)   | 현재 가격 기준, 장기 보존 시 비용 발생 |

👉 현재 Confluence는 Free 플랜(최대 10명)으로 운영 중이므로 비용 부담 없음. 단, 사용자 수가 10명을 넘으면 Standard 플랜으로 업그레이드 필요(15명 기준 약 $96/월). Notion이 Free라면 보존 비용이 없고, Plus 이상일 경우 월 $120 추가 비용 발생.

---

## 10. 결론

Munto의 Notion → Confluence 전환은 단순한 툴 교체가 아니라 **조직의 지식 관리 수준을 한 단계 끌어올리는 기회**입니다. Notion의 강점이었던 유연성을 잃지 않으면서도, Confluence의 강점인 **정형화, 거버넌스, 보안, 통합성**을 극대화해야 합니다.

> 핵심 성공 요인:
>
> - 명확한 문서 구조 설계 (Space 단위)
> - DB 활용 문서의 대체 수단 마련
> - 직원 온보딩 및 Change Management
> - 점진적 Migration + 철저한 QA

---

📌 **부록**: Migration Checklist (별도 페이지로 작성 권장)

-
