# ElastiCache · RDS RI 재약정 비용 최적화 검토 보고서 — 리뷰

- **대상 Notion 문서**: ElastiCache · RDS RI 재약정을 통한 비용 최적화 검토 보고서 (v1.0.0, 2026-06-02, 홍진영)
- **관련 Jira**: [AWSI-83](https://munto.atlassian.net/browse/AWSI-83)
- **리뷰 차수**: 1차 · **리뷰어**: 전규현 · **리뷰일**: 2026-06-02

---

## 1. 전체 평가

**RI 내용(Option A·단가·lounge·액션)은 문제 없음.** 손보면 좋은 부분은 **Executive Summary**뿐(본문이 **1. 권장 결정**부터 시작). Jira·Notion에 Executive Summary 4줄 추가 의견([WEBB-1328](https://munto.atlassian.net/browse/WEBB-1328) 참고).

Notion 블록 코멘트(선택): **§2** 액션 #3·#4 건수 표기.

---

## 2. 리뷰 의견 (Notion 댓글·수정용)

Executive Summary·구조는 **§1**·Jira 코멘트에만 적었습니다. 아래는 Notion **6. 액션 아이템** 블록용입니다.

**[6. 액션 아이템 — #3, #4]**

#3 “prod RI 4종”, #4 “dev RI 3종” 표기가 실제 주문이랑 안 맞습니다. #3은 **6건**(ElastiCache 4 + Aurora 2), #4는 **4건**입니다. 콘솔에서 살 때 헷갈리지 않게 **건수/구성**으로 문구만 바꿔 주세요.

---

## 3. 참고 (리뷰 안 함)

Jira “기준선”과 lounge Option A 보류는 충돌 없음. dev 6시나리오 표·DocDB 한 줄 등은 이번엔 코멘트 안 달았습니다.
