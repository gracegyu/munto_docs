# ElastiCache · RDS RI 재약정을 통한 비용 최적화 검토 보고서

분류: 보고서
작성자: 홍진영
최초 작성일: 2026년 6월 2일 오전 9:40
최근 수정일: 2026년 6월 2일 오후 12:30
문서 상태: Active
생성 일시: 2026년 6월 2일 오전 9:40
최종 편집자: 홍진영

- 관련 이슈: [AWSI-83](https://munto.atlassian.net/browse/AWSI-83)
- 범위: `munto-prod`, `munto-dev` / `ap-northeast-2`
- 상태: 결정 대기

---

## 1. 권장 결정

| 계정 | 대상 | 결정 | 약정 구성 |
| --- | --- | --- | --- |
| munto-prod | ElastiCache (dating, redis-2) | 즉시 재약정 | t4g.small × 2, m6g.large × 2 / 1년 / All Upfront |
| munto-prod | ElastiCache (lounge) | **약정 보류** | 메모리 88% — 사이즈업 결정 후 새 타입으로 별도 약정 |
| munto-prod | RDS Aurora-PG | 즉시 재약정 | db.r6g.large × 2 / 1년 / All Upfront |
| munto-prod | DocumentDB (prod-munto) | 별도 검토 | DocumentDB RI 단가·필요성 확인 후 결정 |
| munto-dev | ElastiCache · RDS Aurora-PG | 즉시 약정 | t4g.micro × 1, t3.micro × 2, db.t3.medium aurora-pg × 1 / 1년 / All Upfront |
| munto-dev | DocumentDB · 임시 복원 RDS | 제외 | DocDB는 별도 트랙, 임시 복원 인스턴스는 일시 자원 |

### 1.1 선택 근거 요약

- **1년 / All Upfront**: 3년 대비 사이즈 변경 유연성 확보 + 1년 약정 내에서 All Upfront가 No Upfront 대비 약 11% 추가 절감.
- **lounge 보류**: 메모리 잔여 약 0.4 GiB(88% 사용)로 OOM 임계.
    - ElastiCache RI는 size flexibility 미지원이라 사이즈 변경 시 약정 손실 발생.
- **Aurora 약정 안전**: RDS RI는 동일 패밀리 내 size flexibility 지원이라 r6g.large → r6g.xlarge 사이즈업 시에도 RI 크레딧 부분 적용.
- **dev 포함**: 항시 운영 4종은 1년 RI 적용 시 페이백 약 7–10개월로 손익분기 확보. 임시 복원 인스턴스는 제외.

### 1.2 권고안 적용 시 연간 비용

| 구분 | 연 비용 (USD) | KRW (≈, @1,350원) | 선납 (USD) |
| --- | --- | --- | --- |
| 현재 (전체 On-Demand) | 12,956 | ₩17.5M | 0 |
| 권고안 (Option A) | 8,279 | ₩11.2M | 6,807 (₩9.2M) |
| **연간 절감** | **−4,677** | **약 −₩6.3M (−36.1%)** | — |

> 대안 Option B(lounge 포함 모든 노드 약정)는 절감 USD 5,099 (₩6.9M, −39.4%)로 USD 422 추가 절감되나, lounge 사이즈업이 6개월 안에 발생하면 손해. 세부 분석은 §5.3 참고.
> 

> 권고안 미적용 시 On-Demand 누적 비용 **약 USD 11 (≈ ₩15,000) / 일**.
> 

---

## 2. 현황

### 2.1 운영 자원

**munto-prod**

| 서비스 | Identifier | 타입 | 수량 | 엔진 / 버전 |
| --- | --- | --- | --- | --- |
| ElastiCache | prod-dating-redis | cache.t4g.small | 2 | redis 7.0.7 |
| ElastiCache | prod-munto-lounge-redis | cache.t4g.medium | 2 | redis 7.0.7 |
| ElastiCache | prod-munto-redis-2 | cache.m6g.large | 2 | redis 7.0.7 |
| RDS Aurora-PG | munto-prod-api-db-aurora-1 / -2 | db.r6g.large | 2 | aurora-postgresql 14.20 |
| DocumentDB | prod-munto | db.t4g.medium | 1 | docdb 4.0.0 |

**munto-dev** (RI 보유 0건 — 모든 노드 On-Demand)

| 서비스 | Identifier | 타입 | 수량 | 엔진 / 버전 |
| --- | --- | --- | --- | --- |
| ElastiCache | dev-dating-redis | cache.t4g.micro | 1 | redis 7.0.7 |
| ElastiCache | dev-munto-cache-redis | cache.t3.micro | 1 | redis 7.0.7 |
| ElastiCache | dev-munto-lounge-redis | cache.t3.micro | 1 | redis 7.0.7 |
| RDS Aurora-PG | dev-db-aurorainstance1 | db.t3.medium | 1 | aurora-postgresql 14.20 |
| DocumentDB | dev-docdb-instance | db.t3.medium | 1 | docdb 4.0.0 |
| RDS Aurora-PG (임시) | munto-dev-temp-restore-instance-20260407 | db.t3.medium |  | aurora-postgresql 14.20 |

### 2.2 만료된 prod RI

| 서비스 | 타입 | 수량 | 기간 / 결제 | 운영 매칭 |
| --- | --- | --- | --- | --- |
| ElastiCache | cache.t3.micro | 4 | 1년 / No Upfront | 미매칭 (운영은 t4g 계열) |
| ElastiCache | cache.t4g.medium | 4 | 1년 / No Upfront | lounge 2개 매칭, 2개는 dev 이관에 따른 잉여 |
| RDS | db.r6g.large (aurora-pg) | 2 | 1년 / No Upfront | 운영 Aurora 2 노드와 매칭 |
| RDS | db.t4g.medium (aurora-pg) | 1 | 1년 / No Upfront | 미매칭 (운영 t4g.medium은 DocumentDB 엔진, aurora-pg RI 적용 불가) |

---

## 3. 사용률 및 약정 리스크 (최근 7일, CloudWatch)

### 3.1 ElastiCache (avg / max)

| 클러스터 | 노드 | 메모리 % | EngineCPU % | 연결 수 | 평가 |
| --- | --- | --- | --- | --- | --- |
| prod-dating-redis | -001 | 12.0 / 12.1 | 0.6 / 8.6 | 6.9 / 19 | 🟢 매우 여유 |
| prod-dating-redis | -002 | 12.0 / 12.0 | 0.3 / 2.0 | 5.7 / 7 | 🟢 매우 여유 |
| prod-munto-lounge-redis | -001 | **88.0 / 88.3** | 0.5 / 0.9 | 10.1 / 15 | 🔴 메모리 한계 임박 |
| prod-munto-lounge-redis | -002 | **87.9 / 88.2** | 0.4 / 0.9 | 11.4 / 17 | 🔴 메모리 한계 임박 |
| prod-munto-redis-2 | -001 | 44.9 / 45.9 | 0.9 / 3.9 | 72.1 / 108 | 🟡 여유 |
| prod-munto-redis-2 | -002 | 44.9 / 45.8 | 0.6 / 2.7 | 11.3 / 16 | 🟡 여유 |

### 3.2 RDS Aurora (avg / max)

| 인스턴스 | CPU % | FreeableMemory | DB 연결 수 | 평가 |
| --- | --- | --- | --- | --- |
| munto-prod-api-db-aurora-1 | 28.2 / **96.1** | 2.62 / 2.75 GiB | 18.8 / 47 | 🟡 피크 CPU 96% 도달 |
| munto-prod-api-db-aurora-2 | 32.2 / **99.7** | 2.88 / 3.08 GiB | 34.6 / 71 | 🟡 피크 CPU 99.7% 도달 |
| Cluster volume | — | — | 76 GB 사용 | 🟢 Aurora 자동 확장 |

> r6g.large RAM 16 GiB 중 FreeableMemory ≈ 3 GiB (약 13 GiB 사용 중).
> 

### 3.3 노드별 약정 리스크

AWS 정책 — **ElastiCache RI**는 size flexibility 미지원 (사이즈 변경 시 환불·전환 불가). **RDS RI**는 동일 패밀리·리전·엔진 내 size flexibility 지원 (예: r6g.large RI 1개는 r6g.xlarge 사용 시간의 50% 크레딧 적용).

| 노드 | 핵심 지표 | 리스크 | 약정 권고 |
| --- | --- | --- | --- |
| cache.t4g.small × 2 (dating) | 메모리 12% | 🟢 낮음 | 약정 진행 |
| cache.t4g.medium × 2 (lounge) | 메모리 88% (잔여 약 0.4 GiB) | 🔴 높음 — 트래픽 증가 시 OOM 임계 | **보류 → 사이즈업 후 신규 약정** |
| cache.m6g.large × 2 (redis-2) | 메모리 45%, CPU < 1% | 🟢 낮음 — 다운사이즈 여력은 있으나 변경 계획 없으면 약정 안전 | 약정 진행 |
| db.r6g.large × 2 (aurora-pg) | CPU 피크 96–99%, 메모리 여유 ~3 GiB | 🟡 중간 — 사이즈업 가능성 있으나 size flexibility로 RI 부분 활용 가능 | 약정 진행 + 모니터링 강화 |

---

## 4. RI 단가 (ap-northeast-2)

`aws elasticache describe-reserved-cache-nodes-offerings` / `aws rds describe-reserved-db-instances-offerings` 조회 결과. 8760 hr/yr 환산. 단위 USD.

### 4.1 ElastiCache (Redis) — 노드 1개

| 노드 타입 | 1yr No Up. | 1yr Partial | 1yr All Up. | 3yr No Up. | 3yr Partial | 3yr All Up. | OD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cache.t4g.micro (dev) | 140.2 | — | **134** | — | — | — | 184 |
| cache.t3.micro (dev) | 148.9 | — | **138** | — | — | — | 193 |
| cache.t4g.small | 280.3 | 265.4 | **262** | 210.2 | 195.0 | **185.7** | 368 |
| cache.t4g.medium | 560.6 | 539.6 | **525** | 429.2 | 399.2 | **371.7** | 736 |
| cache.m6g.large | 1,086.2 | 1,033.8 | **1,013** | 832.2 | 767.1 | **717.7** | 1,980 |

### 4.2 RDS Aurora-PostgreSQL — 인스턴스 1개

| 인스턴스 클래스 | 1yr No Up. | 1yr Partial | 1yr All Up. | 3yr Partial | 3yr All Up. | OD |
| --- | --- | --- | --- | --- | --- | --- |
| db.t3.medium (dev) | 946.1 | — | **797** | — | — | 1,279 |
| db.r6g.large | 1,804.6 | 1,557.6 | **1,525** | 1,087.8 | **1,024.3** | 2,470 |

> r6g.large/aurora-pg Single-AZ는 3yr No Upfront 미제공.
> 

### 4.3 prod 전체 시나리오 (모든 노드 약정 기준 = Option B 가정)

ElastiCache 6 노드 + Aurora 2 노드 합산.

| 시나리오 | 연 비용 | 선납 | OD 대비 절감 |
| --- | --- | --- | --- |
| On-Demand (현재 상태) | 11,108 | 0 | 기준 |
| 1yr No Upfront (이전 약정과 동일) | 7,464 | 0 | −32.8% |
| 1yr Partial Upfront | 6,793 | 3,444 | −38.8% |
| 1yr All Upfront | 6,650 | 6,650 | −40.1% |
| 3yr Partial Upfront | 5,207 | 7,768 | −53.1% |
| 3yr All Upfront | 4,599 | 14,748 | −58.6% |

> Option A는 위 표에서 lounge t4g.medium 2개를 OD로 유지 (RI 4종만 약정). §5.3 참고.
> 

---

## 5. 의사결정 근거

### 5.1 1년 vs 3년 → 1년

- 사용률 분석 (§3) 결과 m6g.large (다운사이즈 여력), r6g.large (사이즈업 가능성) 모두 12개월 내 변경 가능성이 있어 3년 약정 시 변경 손실 리스크 큼.
- 1년 All Upfront만으로도 OD 대비 약 40% 절감 확보 — 3년 추가 절감 7%p보다 변경 리스크 우위.
- 내년 재검토 시점에 트래픽·구성 안정화되면 3년 약정 재검토.

### 5.2 결제 옵션 → All Upfront

| 옵션 | 1yr 절감 (OD 대비) | 선납 (Option A 기준) | 특징 |
| --- | --- | --- | --- |
| No Upfront | 약 32.8% | 0 | 매월 정산, 현금 출자 0 |
| Partial Upfront | 약 38.8% | ₩4.7M | 절반 선납 + 시간당 청구 |
| **All Upfront** | **약 40.1%** | **₩9.2M** | 전액 선납 |
- All Upfront ↔ Partial Upfront 차이는 1.4%p (≈ USD 143 / yr).
- 현금 보존이 우선이면 Partial Upfront로 폴백 가능.

### 5.3 lounge 약정 — Option A vs Option B

**Option A — 보수적 (권장)**

lounge t4g.medium은 RI 약정 보류, 사이즈업 결정 후 새 타입으로 별도 약정. 그 동안 OD 유지.

| 항목 | OD 연 | RI 1yr AU 연 | 절감 |
| --- | --- | --- | --- |
| prod ElastiCache (lounge 제외: t4g.small × 2, m6g.large × 2) | 4,695 | 2,550 | −2,145 |
| prod ElastiCache lounge (t4g.medium × 2, OD 유지) | 1,472 | 1,472 | 0 |
| prod RDS Aurora (r6g.large × 2) | 4,941 | 3,050 | −1,891 |
| dev (RI 4종) | 1,848 | 1,207 | −641 |
| **합계** | **12,956** | **8,279** | **−4,677 (≈ −₩6.3M, −36.1%)** |

선납 총액 **약 ₩9.2M** (prod ₩7.6M + dev ₩1.63M).

**Option B — 즉시 절감 우선**

lounge까지 포함해 모든 노드 1년 약정. 사이즈업 시 lounge RI 손실.

- 합계 연 비용 USD 7,857 / 절감 −USD 5,099 (≈ −₩6.9M, −39.4%)
- 선납 총액 약 ₩10.6M
- Option A 대비 추가 절감 USD 422 / yr

**손익 시나리오** (lounge RI 손실 = 사이즈업 시점 잔여 약정 비율 × USD 1,050)

| lounge 사이즈업 시점 | Option B의 lounge 손실 | Option B의 lounge 누적 절감 | Option B − Option A |
| --- | --- | --- | --- |
| 약정 후 3개월 | 788 | 263 | **−525 (Option A 우위)** |
| 약정 후 6개월 | 525 | 525 | 0 (손익분기) |
| 약정 후 9개월 | 263 | 788 | +525 (Option B 우위) |
| 사이즈업 없음 (12개월) | 0 | 1,050 | +422 (Option B 우위) |

**결론**: 메모리 잔여 약 0.4 GiB(88% 사용) 상황에서 6개월 이내 사이즈업 여부에 따라 Option B는 손익분기 이전 손실 위험이 큼 → Option A 채택.

### 5.4 dev 포함 근거

dev 4 노드 (임시 복원 제외)는 24/7 운영 중이고 사이즈 변경 가능성 낮음. 1년 RI 적용 시 페이백 7–10개월.

| 노드 | 수량 | OD/yr | 1yr All Up. 연 | 절감/yr | 페이백 |
| --- | --- | --- | --- | --- | --- |
| cache.t4g.micro | 1 | 184 | 134 | 50 | 약 10개월 |
| cache.t3.micro | 2 | 386 | 276 | 110 | 약 10개월 |
| db.t3.medium (aurora-pg) | 1 | 1,279 | 797 | 482 | 약 7개월 |
| **소계** |  | **1,848** | **1,207** | **641 (≈ ₩866K, −34.7%)** | — |

### 5.5 DocumentDB

- prod-munto (db.t4g.medium docdb) / dev-docdb-instance (db.t3.medium docdb) 는 별도 트랙.
- `aws docdb describe-reserved-db-instances-offerings` 로 단가 조회 후 효율 산출 — 단일 노드 운영이라 RI 절감 폭이 작을 수 있음.

---

## 6. 액션 아이템

| # | 액션 | 담당 |
| --- | --- | --- |
| 1 | 본 문서 팀 리뷰 (#infra, 재무) | 홍진영 |
| 2 | All Upfront 선납 ₩9.2M (prod ₩7.6M + dev ₩1.63M) 결제 가능 여부 재무 확인 | 홍진영 ↔ 재무 |
| 3 | munto-prod RI 4종 구매 (t4g.small × 2, m6g.large × 2, r6g.large aurora-pg × 2) | 홍진영 |
| 4 | munto-dev RI 3종 구매 (t4g.micro × 1, t3.micro × 2, db.t3.medium aurora-pg × 1) | 홍진영 |
| 5 | prod-munto-lounge-redis 사이즈업 결정 (예: t4g.large, m6g.medium 비교) 후 신규 RI 구매 | 홍진영 |
| 6 | Aurora r6g.large CPU 피크 96–99% 모니터링 강화 + 스케일업 트리거 정의 | 홍진영 |
| 7 | DocumentDB RI 단가 조회 및 권고안 보완 | 홍진영 |
| 8 | RI 만료 일정을 [tech@munto.kr](mailto:tech@munto.kr) Google Calendar에 등록 (D-30 알림 포함) | 홍진영 |

> AWS RI는 자동 갱신되지 않음. 기존 RI 만료 이후 prod ElastiCache·Aurora가 OD 단가로 청구되고 있으므로 구매 지연 = 비용 누적.
> 

---

## 7. 부록 — 단가 출처 및 환산

```bash
# ElastiCache RI offerings
aws --profile munto-prod elasticache describe-reserved-cache-nodes-offerings \
  --region ap-northeast-2 \
  --cache-node-type cache.t4g.small \
  --product-description redis

# RDS Aurora-PG RI offerings
aws --profile munto-prod rds describe-reserved-db-instances-offerings \
  --region ap-northeast-2 \
  --db-instance-class db.r6g.large \
  --product-description aurora-postgresql

# CloudWatch 사용률 (예시)
aws --profile munto-prod cloudwatch get-metric-statistics \
  --region ap-northeast-2 \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=prod-munto-lounge-redis-001 \
  --start-time <ISO> --end-time <ISO> \
  --period 3600 --statistics Average Maximum
```

연 비용 환산: `연 비용 = FixedPrice / 약정연수 + RecurringChargeAmount × 8760`

**On-Demand 단가** (Seoul, ap-northeast-2)

| 노드 타입 | OD 시간당 |
| --- | --- |
| cache.t4g.micro | $0.021 |
| cache.t3.micro | $0.022 |
| cache.t4g.small | $0.042 |
| cache.t4g.medium | $0.084 |
| cache.m6g.large | $0.226 |
| db.t3.medium (aurora-pg) | $0.146 |
| db.r6g.large (aurora-pg, Single-AZ) | $0.282 |

---

## 8. 변경 이력

| 버전 | 변경자 | 변경 내용 |
| --- | --- | --- |
| v1.0.0 | 홍진영 | 최초 작성 — Option A(권장) 기준 prod/dev RI 재약정 권고 |