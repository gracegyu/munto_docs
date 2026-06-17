# 운영·개발 계정의 ElastiCache 및 RDS Reserved Instance(RI) 필요 여부를 검토하고, 재약정 대상 및 구성안을 결정한다.

| 항목 | 내용 |
| --- | --- |
| 배경 | munto-prod의 ElastiCache·RDS RI 4건이 2026-05-27 일괄 만료되어 현재 모든 운영 캐시/DB 노드가 On-Demand 요금으로 청구되고 있다.<br>munto-dev는 RI를 보유한 적이 없어 항상 On-Demand로 운영되어 왔다. dev 환경 유지·축소 방침과 함께 RI 적용 필요성을 재검토해야 한다. |
| 현재 문제점 | prod ElastiCache 6 노드와 Aurora 2 노드가 RI 할인 없이 On-Demand로 청구되어 매 시간 추가 비용이 누적된다.<br>기존 prod RI 중 t3.micro × 4와 t4g.medium 잉여 2개는 운영 인스턴스에 매칭되지 않아 지난 1년간 비용 효율이 낮았다(t4g.medium 잉여는 dev 이관 목적으로 약정했으나 dev 미운영 방침으로 활용되지 않음).<br>prod·dev 모두 재약정 시나리오별 단가 비교가 정리되어 있지 않아 의사결정 근거가 부족하다. |
| 개선 방향 | 1) munto-prod: 현재 운영 구성(ElastiCache t4g.small × 2 + t4g.medium × 2 + m6g.large × 2 / RDS r6g.large × 2 aurora-postgresql)을 기준선으로 재약정 대상을 확정한다.<br>2) munto-dev: dev 환경 유지 방침을 먼저 확정한다. 축소·종료 방향이면 RI 미구매로 결론짓고, 상시 운영이 필요한 인스턴스가 있다면 해당 타입에 한해 RI 효율을 별도 계산한다.<br>3) prod·dev 각각에 대해 1년/3년 × All Upfront / Partial / No Upfront 6 시나리오의 월·연 비용을 On-Demand 대비 비교하는 문서를 작성한다.<br>4) DocumentDB(prod-munto, dev-docdb-instance) 전용 RI 적용 가능 여부와 단가를 별도로 확인한다.<br>5) 권고안을 도출하여 팀 리뷰 후 즉시 재약정한다 (prod는 이미 On-Demand 누적 중이므로 지연 비용 최소화). |
| 고려요소 | 재약정은 AWS에서 자동 갱신되지 않으므로 결정 후 직접 구매 절차를 진행해야 한다.<br>3년 약정은 단가 할인폭이 가장 크지만 인스턴스 타입 변경 유연성이 낮다. 특히 m6g.large / r6g.large는 향후 트래픽 변화에 따라 스케일 조정 가능성이 있으므로 1년 약정이 안전할 수 있다.<br>지난 1년의 운영-약정 불일치(t3.micro × 4, t4g.medium 잉여 2개, aurora t4g.medium 1개)가 재발하지 않도록, 이번에는 실제 운영 인스턴스와 정확히 일치하는 수량·타입으로만 약정한다.<br>dev 인프라 축소·종료 일정이 RI 의사결정의 선결 조건이므로 인프라 운영 방침을 먼저 확정한다.<br>All Upfront 결제는 단가가 가장 저렴하나 현금 유출이 선반영되므로 재무 측과 결제 옵션을 사전 협의한다. |
| 기대효과 | prod·dev 각각에 대한 RI 필요성 판단과 재약정 시나리오별 비용이 정량적으로 정리되어 의사결정 근거가 문서로 남는다.<br>prod에서는 현재 운영 구성과 정확히 매칭되는 RI를 즉시 구매하여 On-Demand 누적 비용을 중단하고, dev에서는 운영 방침에 맞게 불필요한 약정을 회피하여 과약정 손실 재발을 막는다. |


## comment by 홍진영

개발팀

(@김범진 @김도연 @홍진영 @김세현 @전규현)

안녕하세요

운영·개발 계정의 ElastiCache 및 RDS Reserved Instance(RI) 필요 여부를 검토하여,

**ElastiCache · RDS RI 재약정을 통한 비용 최적화 검토 보고서**

를 작성하였습니다.

리뷰 부탁드리겠습니다.

감사합니다.

## comment by 전규현

@홍진영 1차 리뷰입니다.

**RI 내용(Option A·수치·lounge·액션)은 문제 없습니다.** 이번에 손보면 좋은 부분은 **ES(Executive Summary)** 입니다.

팀 보고서는 **본문 맨 위 ES**가 있는 형식인데, 이번 문서는 **1. 권장 결정**부터 시작합니다. 다음 보고서부터는 잊지 않도록 **ES**를 맨 위에 넣어 주세요.

**의견:** 상세 본문은 그대로 두고 **문서 맨 위**에 **ES**를 넣어 주세요. 아래만 보이면 됩니다.

1. 권고 결론 (Option A, lounge 보류, dev 포함)
2. 연간 비용·절감 (1.2 한 줄)
3. 리스크·전제 (lounge, 재무 #2)
4. 즉시 액션