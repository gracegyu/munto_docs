# Munto 문서 리뷰 — 참조

## 레포 구조

```
munto_docs/
├── Jira/                    # 이슈 요약 + comment by 스레드
│   ├── WEBB-1377.md
│   ├── WEBB-1377-… OnePager.md
│   └── WEBB-1377-… OnePager Review.md
├── DB정합성/                # WEBB-* 명세·OnePager·review
├── 채팅내제화/, 체험단/, …   # 도메인별 Notion md + Review
└── …
```

- **Jira md**: 상단 5항목 표 + 팀 코멘트 타임라인
- **Notion md**: OnePager / SRS / 보고서 / 명세서 본문 (메타: 작성자, 버전, 변경 이력)

정책 배경: `my_docs_dev/정책_프로세스_가이드/개발 문서 리뷰란 무엇인가.md`

---

## 파일명 규칙

| 유형 | 패턴 | 예 |
| --- | --- | --- |
| OnePager/SRS 1차 Review | `{본문베이스} Review.md` 또는 `{본문베이스}-review.md` | `… OnePager Review.md`, `WEBB-1328-…-review.md` |
| 이슈 키 + 차수 | `{ISSUE_KEY}-v{n}-review.md` | `WEBB-1321-v2-review.md` |
| SRS 버전 | `{문서명}_Review_v{n}.md` | `채팅 서비스 내재화 SRS_Review_v3.md` |

**우선순위**: 같은 폴더에 기존 Review가 있으면 **동일 네이밍 스타일**을 따른다.  
N차는 기존 파일을 덮어쓰지 않고 **새 파일** 또는 파일 상단에 차수·날짜를 갱신 (기존 레포 관례: `v2-review` 새 파일).

---

## Jira 이슈 md 코멘트 규칙

1. 경로: `munto_docs/Jira/{ISSUE_KEY}.md` (없으면 `munto_docs/**/{ISSUE_KEY}.md` 중 이슈 요약 파일)
2. 섹션: `## comment by {리뷰어}`
3. 멘션: 본문 작성자·리뷰 요청자 (`@김범진` 등) — 이전 코멘트에서 추출
4. 상세 리뷰가 길면 Jira 코멘트는 **요약 + Review 파일 상대경로**만
5. **같은 차수 중복 작성 금지** — 이미 동일 날짜·차수 코멘트가 있으면 사용자에게 확인

### 코멘트 톤

- 존댓말, 건설적, “~해 주시면 좋겠습니다” / “확인 부탁드립니다”
- 동의·잘 된 점을 먼저 짚은 뒤 이슈 나열 (가능할 때)
- 장애·인프라 리뷰: **즉시 / 병행 / 조속히** 로 액션 구분

---

## 문서 유형별 체크리스트

### Engineering OnePager

- [ ] Jira 5항목(배경·문제·방향·고려·효과)과 본문 정합
- [ ] As-Is → 영향 → 결정 → To-Be 순서 (마이그레이션은 통일안보다 앞 단계)
- [ ] 결정 항목·옵션 비교·권고안 근거 (정성만이면 Warning)
- [ ] Technical Description: API/DB/스키마, 에러·멱등·한도
- [ ] Resource/일정, 롤백, 모니터링, cut-over·CS·운영
- [ ] 범위 외·하위 이슈 분리 명시
- [ ] 변경 이력·버전 표기 (N차 시 diff 추적 가능한지)

### SRS / 기능 명세

- [ ] 요구사항 ID·시나리오·예외 경로
- [ ] API 요청/응답/상태코드/에러
- [ ] DB 스키마와 API 필드 매핑
- [ ] 클라이언트·서버 책임 경계
- [ ] TBD·미정 항목과 일정 리스크

### DB 정합성 / 규칙 명세 (다문서 세트)

- [ ] 문서 간 Invariant·용어·상태 전이 일치
- [ ] 환불·정산·취소 경로 cross-reference
- [ ] “1 Case = 1 Job”, SOT=PG, 원자적 check+update 등 팀 원칙
- [ ] N차: 이전 리뷰 ID 표 + 신규 conflict

### 인프라·비용·분석 보고서

- [ ] 수치·단위·기간·리전 명시
- [ ] 권고안과 리스크(보류·예외) 분리
- [ ] Jira 배경 대비 결론 도출 여부

### 짧은 분석·버그 이슈 (Review 파일 생략 가능)

- [ ] Jira 코멘트만으로 결론·동의·추가 확인 1~3점

---

## N차 리뷰 전용

1. **변경 범위 파악**: 본문 변경 이력, Jira “수정했습니다” 코멘트, 버전 번호
2. **반영 표** 필수 컬럼: `ID | 심각도 | 상태(해소/미해소/부분) | 비고`
3. 미해소 항목은 **재지적하지 않고** “여전히 미해소 — {이유}” 한 줄 + 신규 근거만 추가
4. 수정으로 **새 conflict** 발생 시 HIGH로 올림

---

## Conflict 탐지 힌트

- 같은 문서 §A “전액 환불” vs §B “환불 없음”
- Jira 표 vs OnePager 본문
- 테스트 매트릭스 vs 설계 절 (음성/양성 테스트 방향)
- Invariant vs 정합성 표 vs 예시 코드
- 비용·일정 표 vs 권고안 문단

---

## Notion 댓글용 (선택)

상세 Review의 섹션별 항목은 Notion에 그대로 붙일 수 있게:

- **위치**: `## Technical Description > …`
- 인용: `>` 블록으로 원문 일부
- 수정 요청: 명령형이 아닌 요청형 한국어

사용자가 Notion Comment만 원하면 `Notion_Comment_리뷰_가이드.md` 스타일(P0/P1 + 위치)로 별도 요약 가능 — 기본 산출물은 Review.md + Jira md.

---

## 리뷰 관점 문구 (헤더용)

- OnePager: `Jira 요구사항 반영, 결정·마이그레이션·정산/운영 영향, 구현 가능성 (작성법 제외)`
- SRS: `Jira 요구사항 반영, API/DB 스펙, 클라이언트·운영 고려 (작성법 제외)`
- DB 명세: `Invariant·문서 간 정합, v{n-1} 리뷰 반영 여부`
- 보고서: `Jira 배경 대비 결론·수치·리스크, 의사결정 지원 여부`
