# OnePager 리뷰 리포트 (내용 분석)

**문서**: `WEBB-1377-도메인 별 호스트 정원 포함 정책 일관화 OnePager.md`
**유형**: Engineering One Pager
**리뷰 관점**: 결정 항목·통일안·정산 공식·마이그레이션 절차·운영 영향 등 본문 내용에 대한 실질적 검토 (문서 작성법 관련 의견은 제외)
**리뷰 일시**: 2026-04-29
**리뷰어**: 김그레이스

> 아래 각 항목은 Notion 본문에 댓글로 그대로 남길 수 있도록 작성되었습니다. 항목별로 "위치"에 댓글을 달고 본문을 복사해 사용하시면 됩니다.

---

## 요약

- Critical: 7건
- Warning: 6건
- Info: 3건

본 OnePager는 비대칭의 원인 분석과 결정 항목 도출, 옵션 비교 구조가 매우 우수합니다. 다만 다음 두 영역에 대한 보완이 필요합니다.

1. **STAFF·status 시나리오와 invariant 정의의 빈틈**: 정산 캡과 `orderId` CHECK 제약이 HOST만을 기준으로 정의되어 있어, STAFF가 존재하는 도메인(소셜링·클럽)에서의 결제/정원 차감 동작이 불완전하게 기술되어 있습니다.
2. **(a)안 권장의 근거 강도와 cut-over 운영 계획**: (a)안 채택의 핵심 비용(백필·매퍼 변경·강제 업데이트)을 정당화하는 근거가 "향후 멤버 모델 활용도 가능성"에 머물러 있고, 호스트 정산금 변경의 cut-over 시점에 필요한 운영팀·CS 안내 계획이 비어 있습니다.

---

## 상세 결과

### Critical

#### [C-001] (a)안 권장 근거가 정성적이며 비용 대비 가치 검증이 부족

**위치**: `## Technical Description > 권장 분석`

> 문토의 멤버 모델은 이미 권한(STAFF), 채널 가입, 결제 이력 등 다양한 용도로 사용되고 있으며 향후 호스트도 동일하게 다뤄야 할 가능성이 높다(예: 호스트 활동 이력, 호스트 권한 위임).

(a)안의 핵심 비용은 ① HOST row 백필(수만~수십만 건), ② `orderId` 제약 재정의, ③ 매퍼 4종+ 변경, ④ 모바일 강제 업데이트입니다. 이 비용의 정당화 근거가 "호스트 활동 이력·권한 위임 가능성이 높다"라는 정성적 추정에 머물러 있어, (b)안(식만 통일, 1.5~2주) 대비 1~2주 + 클라이언트 4~5d × 2 + BI 2d의 추가 투자를 합의하기 어렵습니다.

다음 중 하나로 보강을 부탁드립니다.

- 호스트 권한 위임/활동 이력이 명시된 로드맵 항목 또는 이미 백로그에 있는 Jira 이슈 인용
- "(b)안 후 (a)안으로 단계 전환" 시 두 번 일하게 되는 비용 vs 처음부터 (a)안의 비용 비교
- 매퍼 +1 보정의 누적 부담(매퍼 추가 시마다 보정 의무 발생)을 정량화한 근거

(b)안을 폐기하기보다, **Phase 분리 안 — (b)안으로 빠른 정상화 후 후속 OnePager에서 (a)안 마이그레이션**도 비교 옵션에 추가해 검토할 가치가 있어 보입니다.

---

#### [C-002] STAFF가 정산 캡과 `orderId` CHECK 제약 정의에서 누락

**위치**: `## Technical Description > 통일안 > 정산 캡 (Invariant SE3)` 및 `orderId 제약 처리`

정산 캡 공식은 STAFF를 차감하지만, `orderId` CHECK 제약은 HOST만을 기준으로 정의되어 있어 STAFF의 결제 여부에 따른 동작이 불완전합니다.

```sql
ALTER TABLE "SocialingMember" ADD CONSTRAINT "chk_member_orderId"
  CHECK (
    ("grade" = 'HOST' AND "orderId" IS NULL)
    OR ("grade" <> 'HOST' AND "orderId" IS NOT NULL)
  );
```

소셜링·클럽에는 STAFF가 존재하는데(검증 시나리오에 "HOST 1·STAFF 2·멤버 7" 케이스 포함됨), STAFF가 결제 없이 모임에 참여하는 운영 케이스가 있는지에 따라 다음 두 결정이 갈립니다.

- 가능성 1: STAFF는 항상 결제한다 → 현 CHECK 제약 OK, 정산 캡에서 STAFF 차감은 결제했으나 정산 대상 아님 의미
- 가능성 2: STAFF는 결제하지 않고 모임에 참여 가능 → CHECK 제약은 `grade IN ('HOST', 'STAFF') AND orderId IS NULL OR grade='MEMBER' AND orderId IS NOT NULL`로 확장되어야 함

현재 운영 데이터에서 STAFF 멤버의 `orderId NULL` 비율을 사전 점검하고, 해당 결정을 결정 항목에 명시 부탁드립니다. 결정에 따라 백필 SQL과 정산 쿼리 필터(아래 C-003 참조)도 달라집니다.

---

#### [C-003] 정산 쿼리 필터 — "`orderId IS NOT NULL` 또는 `grade != HOST`" 둘 중 정답 명시 필요

**위치**: `## Technical Description > 통일안 > orderId 제약 처리` 마지막 줄 / `작업 범위 Phase 5`

> 정산 쿼리에는 안전을 위해 `WHERE orderId IS NOT NULL` 또는 `WHERE grade != HOST` 필터를 명시적으로 추가

두 조건은 STAFF가 결제하지 않을 수 있는 케이스에서 결과가 달라집니다(C-002 참조).

- `WHERE orderId IS NOT NULL`: 결제한 멤버만 정산 대상 → 정산금 합산의 의미와 정확히 일치
- `WHERE grade != HOST`: 호스트만 제외 → 결제하지 않은 STAFF가 있다면 정산 합산이 0 곱해지긴 하지만 row count가 잘못 잡혀 cap MIN 계산이 어긋날 수 있음

정산 쿼리는 합산 대상의 의미와 일치하는 `orderId IS NOT NULL`이 맞다고 보입니다. "또는"이 아니라 어느 쪽을 표준으로 적용할지 명시 부탁드립니다. 또한 cap 계산식(`COUNT(Member WHERE status=APPROVE AND grade IN (HOST, STAFF))`)과 정산 합산식의 status·grade·orderId 필터가 서로 정합한지 표 형태로 정리해 두시면 정산 검증 단계에서 디버깅이 쉬워집니다.

---

#### [C-004] `availCount` 정합 메커니즘이 명시되지 않음 — 트리거인지 애플리케이션 레벨인지

**위치**: `## Technical Description > 통일안 > Invariant 1 (정원 정합성)` / `작업 범위 Phase 3`

> availCount = 정원 - COUNT(Member WHERE status = APPROVE)
> 모임 생성 직후: HOST row 1건 즉시 생성 → availCount = 정원 - 1
> 일반 멤버 가입 시 row 추가, availCount 자동 차감

`availCount`는 별도 컬럼인지, 매번 COUNT로 산출하는 view/derived인지 명확하지 않습니다. "자동 차감"이 누구에 의해 일어나는지가 다음 결정과 직결됩니다.

- 별도 컬럼 + 트리거: PostgreSQL 트리거로 Member INSERT/UPDATE 시 자동 차감 → 백필 SQL이 트리거를 깨우면서 availCount도 함께 변경됨
- 별도 컬럼 + 애플리케이션: NestJS 트랜잭션 내에서 Member 추가와 availCount 감산이 함께 진행 → 백필 SQL은 availCount도 명시적으로 -1 해야 함
- 컬럼 없이 derived: 매 요청마다 COUNT 쿼리 → 가입 가드의 동시성 처리(SELECT FOR UPDATE 등) 확인 필요

또한 백필 시점의 availCount 정합 — 정원 10·일반 0명 모임에 HOST row 1건을 백필하면 availCount는 10에서 9로 변경되어야 합니다. 백필 SQL에 availCount 변경이 포함되는지, 트리거가 알아서 처리하는지를 명시 부탁드립니다. 옵션 2 Blue-Green에서는 운영 중 백필이라 race condition 발생 여지가 더 큽니다.

---

#### [C-005] 옵션 2 Blue-Green Step 5의 enum 값 제거 — PostgreSQL `DROP VALUE` 미지원

**위치**: `## Resource and Scheduling Details > 배포 전략 옵션 > 옵션 2: Blue-Green + Expand-Contract` Step 5

> Step 5 — enum OWNER 값 정리 — 클럽 잔여 OWNER row를 HOST로 UPDATE 후 enum 정리

PostgreSQL은 `ALTER TYPE ... DROP VALUE`를 직접 지원하지 않습니다. enum 값을 제거하려면 다음 시퀀스가 필요합니다.

1. 새 enum 타입 생성 (`ClubMemberGrade_new`)
2. Member 컬럼 타입을 새 enum으로 ALTER + USING 절로 캐스팅
3. 기존 enum 타입 DROP
4. 새 enum 타입을 원래 이름으로 RENAME

이 절차는 락 시간이 발생하고, 옵션 2의 "무중단" 가치를 약화시킵니다. Step 5의 enum 정리 절차를 위 시퀀스로 구체화하고, 락 시간·롤백 시나리오를 명시 부탁드립니다. 옵션 2 채택 시 추가 공수 +3~4d 안에 이 절차의 검증 시간이 포함되어 있는지도 확인이 필요합니다.

또한 옵션 1(점검 윈도우)에서 Step 2의 `ALTER TYPE ... RENAME VALUE 'OWNER' TO 'HOST'`는 단순 rename이므로 빠르지만, ALTER TYPE의 enum 추가(`ADD VALUE`)는 트랜잭션 내에서 추가한 값을 즉시 사용할 수 없는 제약이 있습니다(특히 9.x 호환). 마이그레이션을 두 트랜잭션으로 분리해야 하는지 사전 점검 부탁드립니다.

---

#### [C-006] 과거 과지급분 보정 정책의 부재 — cut-over 시점 호스트 안내가 비어 있음

**위치**: `## Technical Description > 후속 과제` 마지막 항목 / `## Resource and Scheduling Details > 후행 작업` 첫 항목

> 과거 미정산·과정산 건 보정 — 본 PR 적용 전 발생한 정산금 정합 차이의 운영 대응 (운영 과제)

본 OnePager의 핵심 가치는 "호스트 정산금 정상화"입니다. cut-over 직후 동일 정원·동일 가입 상황에서 호스트가 받던 정산 금액이 1슬롯치(클럽은 그 이상) 줄어들게 됩니다. 이 변경을 인지한 호스트로부터 "과거 과지급분은 어떻게 되는가"라는 문의가 발생할 가능성이 높습니다.

후속 과제로 넘기더라도 본 OnePager 단계에서 다음 결정은 합의되어야 합니다.

- 과거 과지급분 환수 여부 (회사 부담 vs 호스트 환수 vs 부분 분담)
- 호스트 안내 문구 초안과 안내 채널 (앱 푸시·이메일·CS 응대 스크립트)
- 운영팀·CS의 사전 학습 일정

W3 "영향 호스트·운영팀 사전 공지" 단계의 산출물(공지 초안·CS 응대 가이드)을 명시 부탁드립니다. 이 합의가 없으면 cut-over 시점 운영 리스크가 매우 큽니다.

---

#### [C-007] 모바일 강제 업데이트 보급률 임계값 미정 — cut-over 시점 결정 기준 부재

**위치**: `## Resource and Scheduling Details > 클라이언트 호환성 처리 — 모바일 강제 업데이트`

> 강제 업데이트 시점이 백엔드 배포 시점과 정렬되어야 함 — 모바일 신버전 보급률을 일정 임계 이상 확보 후 백엔드 cut-over 권장

"일정 임계"가 정량 기준으로 제시되지 않아 W4 cut-over 결정의 트리거가 모호합니다. 일반적인 문토 강제 업데이트 보급률 곡선(예: 출시 후 3일 내 X%, 1주 내 Y%)에 비추어 임계값과 도달 일정을 정해 두시면 좋겠습니다.

또한 다음 사항을 함께 명시 부탁드립니다.

- iOS/Android 스토어 심사 기간 버퍼 (특히 iOS 평균 24~48시간)
- 보급률 미달 시 cut-over 연기 기준과 의사결정자
- 강제 업데이트 거부 사용자의 CS 인입 추정과 응대 방안

W4 한 주만으로 보급률·심사·cut-over를 모두 소화하기 빠듯할 수 있어 W3과 W4 사이 1주 버퍼 추가 검토를 권장드립니다.

---

### Warning

#### [W-001] 클럽 정산 캡 신설의 영향 규모 사전 측정 결과 부재

**위치**: `## Risk Assessment` 첫 행 (정산금 감소로 호스트 영향)

> 클럽: 정산 캡 신설로 환불 없는 취소 누적분이 정원 상한에서 컷되어 정산 금액 감소가 확실시됨

"확실시됨"으로만 표현되어 있고, 영향 호스트 수와 금액 규모의 사전 측정 결과가 비어 있습니다. 본 PR 적용 전 read-replica에서 직전 1개월 클럽 정산을 신·구 공식으로 재계산한 결과(영향 호스트 N명, 감소 금액 X만 원)를 OnePager에 추가해 두시면 의사결정 근거가 강해지고, C-006의 호스트 안내 문구 작성 시에도 활용 가능합니다.

소셜링·챌린지 측은 클라이언트 가드 작동 시 변화 없음으로 표현되어 있는데, 가드 우회 사례가 운영에서 실제로 얼마나 발생했는지(매퍼 +1 미보정 매퍼를 사용한 화면 또는 직접 API 호출)에 대한 모니터링 결과도 같이 첨부 부탁드립니다.

---

#### [W-002] Sendbird 채널 가입 루프의 실제 코드 위치·메커니즘 미식별

**위치**: `## Risk Assessment` 5번째 행 (Sendbird 채널 자동 가입 중복·누락) / `## Technical Description > 작업 범위 Phase 6`

리스크와 작업 범위 모두에 "Sendbird 채널 자동 가입 루프 검토"가 포함되어 있으나, 실제 트리거 위치(어떤 이벤트 핸들러·서비스 메소드)와 현재 동작 방식이 명시되어 있지 않습니다. (a)안 채택 시 SocialingMember/ChallengeMember에 HOST row가 새로 들어가면서 기존 호스트 가입 로직과 중복 트리거될 가능성이 가장 큰 실행 리스크인 만큼, 다음 정도는 본 OnePager에서 사전 분석을 부탁드립니다.

- 도메인별 Sendbird 가입 트리거의 호출 시점 (Member INSERT 직후 vs 가입 API 종단 vs 별도 워커)
- HOST의 현재 가입 경로(소셜링: `Socialing.userId` 기반? / 클럽: ClubMember OWNER row 기반?)
- 백필 SQL 실행 시 트리거 차단 방법 (애플리케이션 레벨 플래그 / 트리거 비활성 / Sendbird 호출의 idempotency 의존)

해당 분석이 없으면 백필 시점의 Sendbird 부작용을 사전에 차단하기 어렵습니다.

---

#### [W-003] 결정 1 (`OWNER → HOST` rename)이 본 작업의 핵심 가치와 분리 가능

**위치**: `## Technical Description > 결정 항목` 1번 / `Risk Assessment` 7번째 행

`OWNER → HOST` rename은 코드 일관성에 도움이 되지만, 정원·정산 정합성 회복이라는 본 OnePager의 핵심 가치와 직결되지 않습니다. 한편 rename은 Redash·BI·Redis 캐시·외부 enum 직렬화 값까지 영향이 넓어 별도 위험 요소를 안고 있습니다(R-007).

다음 중 하나로 검토 부탁드립니다.

- rename을 본 PR에 포함하더라도, rename 단독으로 별도 단계(예: Phase 0의 첫 작업)로 분리하고 별도 검증 라운드를 거친 후 본 작업에 합류
- rename을 본 OnePager 범위에서 제외하고 후속 OnePager로 분리(작업 범위 외 항목으로 추가)

rename을 분리하면 R-007 발생 시 본 작업 cut-over에 영향을 주지 않고 롤백할 수 있고, 정산 정합성 회복 자체의 검증이 더 깔끔해집니다.

---

#### [W-004] invariant 검증 SQL의 도메인 status 정의 부재

**위치**: `## Technical Description > 검증 시나리오` 마지막 행

> 백필 후 invariant: COUNT(SocialingMember WHERE grade=HOST) = COUNT(Socialing), COUNT(ChallengeMember WHERE grade=HOST) = COUNT(Challenge)

이 invariant는 모든 Socialing/Challenge row가 HOST 1건을 가져야 한다는 의미인데, 종료된 모임(`status='ENDED'` 등)·삭제된 모임·취소된 모임도 포함하는지 모호합니다. soft delete된 모임에 HOST row를 추가할 필요가 있는지, 종료된 모임의 정산 재계산 영향이 있는지에 따라 백필 범위가 달라집니다.

다음 형태로 명시 부탁드립니다.

```
COUNT(SocialingMember WHERE grade=HOST AND deletedAt IS NULL)
  = COUNT(Socialing WHERE status IN ('PUBLISHED', 'IN_PROGRESS', 'ENDED') AND deletedAt IS NULL)
```

또한 Socialing/Challenge의 어떤 status까지를 백필 대상으로 할지 결정 부탁드립니다.

---

#### [W-005] 챌린지 어드민 생성 경로와 유저 생성 경로의 통합 의도 명시 부족

**위치**: `## Technical Description > 작업 범위 Phase 3` / `WEBB-1377 이슈 본문 § 결과적으로 모임당 약 1슬롯치 ...`

이슈 본문에 따르면 챌린지의 비대칭은 어드민 경로(`max - 1`)와 유저 경로(`max`)의 시작값이 다르다는 점입니다. Phase 3에서 "어드민 경로의 `max - 1` 수동 보정 제거"라고 했는데, 두 경로가 모두 HOST row 추가 후 자동으로 `availCount = 정원 - 1`로 수렴하는지, 아니면 두 경로의 코드 패스를 통합하는지 결정이 명시되지 않습니다.

(a)안 채택 시 두 경로 모두 "Challenge 생성 + ChallengeMember(HOST) 생성"이 한 트랜잭션에 들어가야 하는데, 어드민 경로와 유저 경로의 트랜잭션 경계가 다르다면 코드 패스 통합 또는 공통 도메인 메소드 추출이 별도 작업으로 필요할 수 있습니다. Phase 3에 이 부분을 보강 부탁드립니다.

---

#### [W-006] 검증 시나리오에 race condition·동시성 케이스 부재

**위치**: `## Technical Description > 검증 시나리오`

검증 시나리오는 정원·HOST·STAFF·멤버의 정적 조합만 다루고 있고, 다음 동시성 케이스가 빠져 있습니다.

- 동시 결제: 마지막 1슬롯 남은 모임에 두 사용자가 동시 결제 시도 → 한 명만 성공해야 함
- 백필 시점 신규 가입: (옵션 2 Blue-Green Step 3에서) 백필 트랜잭션 진행 중 신규 가입 트랜잭션 → availCount 정합 유지
- 매퍼 +1 보정 제거 시 클라이언트의 다중 인스턴스: 신버전 클라이언트와 구버전 클라이언트가 동일 모임에 접근 시 표시값 차이

위 케이스의 기대 동작과 데이터 락(SELECT FOR UPDATE 또는 Redis 분산 락)에 대한 결정을 검증 시나리오 또는 통일안에 추가 부탁드립니다.

---

### Info

#### [I-001] 결정 항목과 옵션 비교 구조가 매우 우수

**위치**: `## Technical Description > 결정 항목` / `결정 2 옵션 비교 (상세)` / `결정 3 옵션 비교`

(a)/(b)/(c) 옵션을 동일한 축(요지·일관성·매퍼 보정·멤버 모델 활용성·핵심 비용·Elapsed time·적합 시점)으로 비교한 표 구조와 결정 2와 결정 3 사이의 의존 관계를 별도 표로 명시한 부분은 의사결정 추적성이 매우 높습니다. 다른 OnePager에도 권장드립니다.

---

#### [I-002] `orderId` 제약 처리에 대한 기술적 근거가 명확

**위치**: `## Technical Description > 통일안 > orderId 제약 처리`

단순 nullable화가 아니라 부분 유니크 인덱스 + CHECK 제약 조합으로 grade-orderId 정합을 DB 단에서 강제한다는 결정은 silent bug 방지에 적합합니다. CHECK 제약의 STAFF 처리만 보강하면(C-002) 그대로 사내 표준 패턴으로 활용 가능해 보입니다.

---

#### [I-003] 단계적 접근 옵션 추가 검토 권장

**위치**: `## Technical Description > 권장 분석`

C-001과 W-003에서 언급한 대로, 본 OnePager의 결정 1·2·3을 한 번에 처리하는 것 외에도 다음 단계적 접근을 옵션으로 비교해 볼 수 있습니다.

- Phase A — 정산 캡 신설(클럽) + 정산 쿼리 필터 보강(소셜링·챌린지): 정산 정합성만 우선 회복, DB 스키마 변경 없음
- Phase B — `availCount`/매퍼 +1 보정 제거: 데이터 표현은 그대로 두고 식만 통일((b)안)
- Phase C — HOST row 백필 + enum rename: (a)안과 결정 1을 후속 OnePager로 분리

이 접근은 정산 정상화 가치를 1주 내 회수하면서 클라이언트 강제 업데이트 부담을 후속 단계로 미룰 수 있어 cut-over 리스크 관리에 유리합니다. 결정 항목에 추가 옵션으로 비교만 해 두셔도 좋겠습니다.

---

## 종합 의견

본 OnePager는 비대칭의 원인 분석과 결정 항목 도출, 옵션 비교 구조가 매우 견고합니다. 특히 클럽·챌린지·소셜링 3개 도메인의 호스트 처리 차이를 단일 표로 정리한 부분과, `orderId` 제약 처리에 대한 부분 유니크 인덱스 + CHECK 제약 조합 결정은 그대로 사내 표준으로 적용 가능한 수준입니다.

다만 다음 두 영역의 보완이 cut-over 전에 반드시 필요해 보입니다.

1. **STAFF·status·동시성 시나리오의 빈틈** (C-002, C-003, C-004, W-004, W-006): 현재 통일안은 HOST를 중심으로만 정의되어 있고 STAFF의 결제 여부·정산 영향, status별 백필 범위, 백필 시점 동시성 처리가 명확하지 않습니다. cut-over 직전 정산 검증 단계에서 발견되면 일정에 큰 영향을 줄 수 있습니다.
2. **(a)안 채택의 cut-over 운영 계획** (C-001, C-006, C-007, W-001): (a)안의 비용을 정당화하는 근거가 정성적이고, 호스트 정산금 변경의 cut-over 시점에 필요한 운영팀·CS 안내 계획과 정량 영향 측정 결과가 비어 있습니다. 본 OnePager의 핵심 가치인 "정산금 정상화"가 호스트에게는 부정적 변경으로 인식될 가능성이 있어 운영 리스크가 큰 영역입니다.

추가로 결정 1(`OWNER → HOST` rename) 분리 가능성(W-003)과 단계적 접근 옵션(I-003)도 의사결정 시 검토해 보실 만합니다.

---

## 변경 이력

| 버전 | 일자 | 변경자 | 변경 내용 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-04-29 | 김그레이스 | 최초 리뷰 작성 (문서 작성법 기준) |
| v1.1.0 | 2026-04-29 | 김그레이스 | 노션 댓글로 옮기기 좋은 톤으로 본문 재작성 |
| v2.0.0 | 2026-04-29 | 김그레이스 | 문서 작성법 의견 제외, 본문 내용(결정·통일안·정산 공식·운영 영향) 분석으로 전면 재작성 |
