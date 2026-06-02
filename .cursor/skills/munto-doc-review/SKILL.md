---
name: munto-doc-review
description: >-
  Munto Jira 이슈·Notion(마크다운) 개발 문서(OnePager, SRS, 명세서, 보고서)를
  1~N차 리뷰하고 Review.md와 munto_docs/Jira/{KEY}.md 코멘트를 작성한다.
  Use when the user says 리뷰, review, 리뷰해줘, N차 리뷰, OnePager/SRS 리뷰,
  or mentions WEBB-/AWSI-/APPF-/WEBF- with a document to review.
disable-model-invocation: false
---

# Munto 개발 문서 리뷰

## 목적

`munto_docs` 레포의 Jira 이슈 문서와 Notion에서 내려받은 본문(`.md`)을 **내용 중심**으로 리뷰한다. 매 회 동일한 산출물을 만든다.

1. **상세 리뷰 문서** (`*Review.md` 또는 `*-review.md`)
2. **Jira 이슈 마크다운** (`munto_docs/Jira/{ISSUE_KEY}.md`)에 `## comment by {리뷰어}` 추가

기본 리뷰어: **전규현**. 사용자가 다른 이름을 지정하면 그 이름을 쓴다.

## 리뷰 원칙 (요약)

- **내용 Review**: Jira 요구사항 반영, 기술·비즈니스 정합, 구현 가능성, conflict(동일 문서 내 A/B 모순), 운영·마이그레이션·보안
- **작성법 Review**: 사용자가 명시하지 않으면 **제외** (가독성·맞춤법만 지적하지 않음)
- **Conflict**: 앞뒤·표·코드·다른 섹션 간 상충은 문서 버그로 반드시 지적
- **이모지 사용 금지**, **한국어**로 작성
- **git commit / push 하지 않음** — 파일 저장 후 사용자에게 경로만 안내

상세 체크리스트·파일 규칙: [reference.md](reference.md)  
입출력 예시: [examples.md](examples.md)

---

## 입력 해석

사용자가 `AWSI-83 리뷰 해줘`, `@munto_docs/Jira/AWSI-83.md 리뷰`, `WEBB-1377 2차 리뷰` 등으로 요청할 수 있다.

| 사용자 표현 | 의미 |
| --- | --- |
| `N차 리뷰`, `2차`, `v2 리뷰` | 이전 `*-review.md` 대비 **변경분·미해소 항목** 중심 |
| (없음) | **1차 리뷰** — 대상 문서 전체 |
| `Jira만`, `코멘트만` | Jira `.md` 코멘트만 작성 (Review 파일 생략 가능) |
| `Review만` | Review 파일만 (Jira 코멘트 생략) |

---

## 1단계: 자료 수집

다음 순서로 진행한다. MCP(Jira, Notion)가 있으면 보조로 사용하되, **레포 내 `.md`를 우선**한다.

### 1.1 Jira 이슈 문서

```
munto_docs/Jira/{ISSUE_KEY}.md
```

- 없으면 `munto_docs/**/{ISSUE_KEY}.md` 검색
- 상단 표(배경·현재 문제점·개선 방향·고려요소·기대효과)를 **리뷰 기준(SOT)** 으로 삼는다
- 기존 `## comment by …` / `# comment by …` 를 읽어 **이전 리뷰·작성자 답변** 맥락 파악

### 1.2 Notion 본문(마크다운)

같은 이슈·제목과 연결된 본문을 찾는다.

1. `munto_docs/Jira/{ISSUE_KEY}-*.md` (OnePager, 보고서 등)
2. `munto_docs/**/{ISSUE_KEY}*.md` (DB정합성, 채팅내제화 등)
3. Notion export: 파일명 끝 `{32자해시}.md` — 동일 제목·이슈 링크로 매칭
4. Jira 코멘트·본문에 있는 `notion.so` URL

**여러 후보가 있으면** 사용자에게 확인하거나, 버전 숫자가 가장 높은 문서(v3 > v2)를 기본 대상으로 한다.

### 1.3 N차 리뷰 시 이전 산출물

`Glob: **/*{ISSUE_KEY}*review*.md` 및 `**/*Review*.md` (동일 폴더)

- 가장 최근 리뷰 파일의 항목 ID(`R-01`, `C-001`, `v1-CHO-1` 등) 목록 확보
- 작성자가 “반영했다”고 한 코멘트와 대조

---

## 2단계: 리뷰 수행

### 2.1 1차 리뷰

1. Jira 표 5항목 대비 본문 누락·과장·모순 검사
2. 문서 유형별 체크 — [reference.md § 문서 유형별](reference.md)
3. 항목 부여:
   - OnePager/SRS 상세: `R-01` … 또는 `C-001` / `W-001` / `I-001` (Critical/Warning/Info)
   - DB 명세 N차: `v2-XXX-1` 형식 가능
4. **잘 된 점** 3~6개 (있을 때만, 형식적으로 채우지 않음)

### 2.2 2차 이상 (N차)

1. **이전 리뷰 반영 표** 작성 (해소 / 미해소 / 부분 해소)
2. **신규 이슈만** 상세 기술 (수정 과정에서 생긴 conflict 우선)
3. 총평에 “N차 기준 변경 범위” 한 줄 명시

### 2.3 심각도

| 등급 | 기준 |
| --- | --- |
| Critical / HIGH | 배포·정산·결제·보안·데이터 정합에 직접 영향, 요구사항 미충족 |
| Warning / MEDIUM | 구현 전 반드시 합의 필요, 운영 리스크 |
| Info / LOW | 보완 권장, 예시·표현 명확화 |

---

## 3단계: 산출물 작성

### 3.1 Review 문서

파일명 규칙 — [reference.md § 파일명](reference.md)

**공통 헤더:**

```markdown
# {문서 제목} — 리뷰

- **대상 문서**: `{파일명}` (버전·작성자·날짜 있으면 기재)
- **관련 Jira**: [{ISSUE_KEY}](https://munto.atlassian.net/browse/{ISSUE_KEY})
- **리뷰 차수**: 1차 | 2차 | …
- **리뷰 관점**: Jira 요구사항 반영, 구현 가능성, … (문서 유형에 맞게 1줄)
- **리뷰어**: {이름}
- **리뷰일**: YYYY-MM-DD
```

**본문 구조 (1차·상세 문서):**

```markdown
## 1. 전체 평가
(2~5문장)

## 2. 전체 문서에 해당하는 리뷰 의견
### R-01. …

## 3. 특정 섹션/문장에 해당하는 리뷰 의견
(인용 블록 + 위치 + 수정 요청)

## 잘 된 점
- …
```

**N차 전용 상단 블록:**

```markdown
## 이전 리뷰 반영 현황
| 상태 | 건수 | ID |
| 해소 | … | … |
| 미해소 | … | … |

## 이번 차수 신규 이슈
…
```

저장 위치: **대상 Notion `.md`와 같은 디렉터리** (예외: Jira 전용 분석은 `munto_docs/Jira/`).

### 3.2 Jira 이슈 `.md` 코멘트

파일: `munto_docs/Jira/{ISSUE_KEY}.md`  
파일 **맨 아래**에 추가:

```markdown
## comment by {리뷰어}

@{작성자 멘션} {문서 유형} 리뷰했습니다. (1차|2차 요약 2~4문장)

**요약**
- Critical/HIGH: N건 — (한 줄)
- Warning/MEDIUM: N건
- Info/LOW: N건

상세: `{Review 파일 상대경로}`

(선택) 즉시 합의/조치가 필요한 항목만 1~3개 bullet. Notion에 댓글로 남길 항목이 있으면 섹션 위치 명시.
```

- 기존 `## comment by {리먷 리뷰어}` 가 있으면 **같은 섹션 아래** `---` 구분 후 **새 블록** 추가 (날짜·차수 표기)
- 짧은 확인 리뷰(분석 검증 등)는 상세 Review 없이 코멘트만 가능 — [examples.md § 짧은 Jira 코멘트](examples.md)
- `# comment by` 형식이 파일에 쓰여 있으면 **새 추가분은 `##` 로 통일**해도 됨 (기존 블록은 수정하지 않음)

---

## 4단계: 완료 보고

사용자에게 다음을 짧게 전달한다.

1. 리뷰 차수·대상 문서 경로
2. 생성·수정한 파일 경로 (Review, Jira md)
3. 심각도별 건수
4. Jira/Notion에 **직접 붙여넣을** 코멘트가 있으면 해당 여부

**하지 않는 것**: Jira/Notion 원격 게시, commit, push.

---

## MCP·외부 도구

| 도구 | 용도 |
| --- | --- |
| user-Jira | 이슈 설명·코멘트·링크 확인 (로컬 md와 불일치 시) |
| user-Notion | 최신 본문 (로컬 md가 오래됐을 때) |

로컬 md와 Jira/Notion이 다르면 **차이를 리뷰 코멘트에 명시**하고, 어느 쪽을 기준으로 리뷰했는지 밝힌다.

---

## 트리거 예시

- `AWSI-83 리뷰 해줘`
- `WEBB-1377 OnePager 2차 리뷰`
- `@munto_docs/DB정합성/WEBB-1328-….md 리뷰`
- `이 Notion md 리뷰하고 WEBB-1326 Jira에도 코멘트 달아줘`
