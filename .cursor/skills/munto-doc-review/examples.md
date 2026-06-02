# Munto 문서 리뷰 — 예시

## 예시 1: 1차 OnePager (상세 Review + Jira 요약)

**사용자:** `AWSI-83 리뷰 해줘`

**수집:**
- `munto_docs/Jira/AWSI-83.md`
- `munto_docs/Jira/AWSI-83-ElastiCache · RDS RI 재약정….md`

**Review 파일:** `munto_docs/Jira/AWSI-83-ElastiCache · RDS RI 재약정… Review.md`

**Jira md 추가:**

```markdown
## comment by 전규현

@홍진영 RI 재약정 검토 보고서 리뷰했습니다. prod 즉시 재약정·lounge 보류·dev 4종 약정 방향은 Jira 배경과 맞고 수치 근거도 충분합니다.

**요약**
- Warning: 2건 — DocumentDB RI 트랙 일정, lounge 사이즈업 후 재약정 절차
- Info: 1건 — All Upfront 재무 협의 문구 보강

상세: `munto_docs/Jira/AWSI-83-ElastiCache · RDS RI 재약정을 통한 비용 최적화 검토 보고서 Review.md`
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

## 예시 4: Critical/Warning/Info ID (OnePager 상세)

```markdown
### [C-001] STAFF가 정산 캡 정의에서 누락

**위치**: `## Technical Description > 통일안 > 정산 캡`

> (원문 인용)

정산 캡은 STAFF를 차감하지만 orderId CHECK는 HOST만 기준으로…
```

---

## 예시 5: R-번호 (인프라·기능 OnePager)

```markdown
### R-02. API 응답 스키마 및 에러 처리 미정의

`POST /v1/events` 요청만 있고 응답·부분 실패·멱등·배치 상한이 없습니다. …
```
