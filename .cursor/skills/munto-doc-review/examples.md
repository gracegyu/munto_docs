# Munto 문서 리뷰 — 예시

## 예시 1: 1차 OnePager (상세 Review + Jira 요약)

**사용자:** `AWSI-83 리뷰 해줘`

**수집:**
- `munto_docs/Jira/AWSI-83.md`
- `munto_docs/Jira/AWSI-83-ElastiCache · RDS RI 재약정….md`

**Review 파일:** `munto_docs/Jira/AWSI-83-ElastiCache · RDS RI 재약정… Review.md`

**Jira md 추가 (Executive Summary 누락 시):**

```markdown
## comment by 전규현

@홍진영 … Option A·수치 방향 괜찮아 보입니다. …

**가장 큰 보완 (필수)**
보고서 맨 위에 Executive Summary 없음. 본문 시작이 **1. 권장 결정**부터라 … **Executive Summary** 섹션 추가 부탁. 참고: Notion **「정산 로직 개선 검증 결과 보고서」**([WEBB-1328](https://munto.atlassian.net/browse/WEBB-1328)).

**그 외 반영 권장**
1. …

(레포 Review.md 경로는 Jira에 적지 않음)
```

---

## 예시 2: N차 (반영 표 + 신규 이슈)

**사용자:** `WEBB-1321 2차 리뷰`

**수집:**
- `WEBB-1321-v2-review.md` (신규 작성)
- 이전: `WEBB-1321-review.md` 또는 `v1` 항목 ID 목록

**Review 상단:**

```markdown
## 이전 리뷰 반영 현황

| 상태 | 건수 | ID |
| --- | --- | --- |
| 해소 | 25건 | S-C1, S-M1, … |
| 미해소 | 3건 | CH-M2, ST-M2, ST-Q1 |

## 이번 차수 신규 이슈

### v2-CHO-1. [HIGH] …
```

**Jira:** `WEBB-1321.md`에 2차 요약 코멘트 + v2-review 경로

---

## 예시 3: 짧은 Jira 코멘트만 (분석 검증)

**사용자:** `WEBB-1386 리뷰해줘`

**수집:** `munto_docs/Jira/WEBB-1386.md` (분석이 이미 comment에 있음)

**산출:** Review 파일 없이 `## comment by 전규현` — 동의·교차 확인 1~2점·후속 이슈 요청

```markdown
## comment by 전규현

분석 확인했습니다. 400 응답이 전부 `refreshToken must be a string`인 점과 웹에서 undefined 가드 부재까지 추적한 근거는 명확합니다. 백엔드 DTO 검증 동작에 동의합니다.

한 가지 확인할 점은, 이 400 스파이크가 실제 사용자 세션 단절을 동반했는지 CS·재로그인 지표와 교차 확인해 주세요. WEBF 이슈에서 WebView 22% `isWebView()` 판정도 함께 다뤄 주세요.
```

---

## 예시 4: Notion 댓글 톤 (권장)

```markdown
**[Technical Description > 통일안 > 정산 캡]**

정산 캡은 STAFF를 빼는데 orderId CHECK는 HOST만 보면 STAFF 유료 결제 때 동작이 애매합니다. CHECK 조건에 STAFF 케이스를 명시해 주시면 좋겠습니다.
```

---

## 예시 5: R-번호 + Jira 위치 (보고서)

```markdown
**[1. 권장 결정 — lounge 행]**

(Jira [AWSI-83] 개선 방향과 Option A 보류 — Notion 댓글 본문)
```
