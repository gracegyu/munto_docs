# 도메인 별 호스트 정원 포함 정책 일관화 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 29일 오전 11:09
최근 수정일: 2026년 4월 29일 오후 12:57
문서 상태: Active
생성 일시: 2026년 4월 29일 오전 11:09
최종 편집자: 김범진

## Project Description

정책 문서는 "호스트는 정원에 1슬롯 포함된다"고 명시했지만, 실 코드는 도메인(클럽·챌린지·소셜링)마다 호스트의 데이터 표현·정원 차감·정산 캡 적용이 비대칭이다. 본 작업은 모든 도메인 Member 테이블에 `HOST` row를 두는 단일 모델로 통일하고, enum 네이밍(`OWNER` → `HOST`)과 `availCount`·정산 캡 공식을 정렬해 정책-코드 정합을 회복한다.

---

## Business and Marketing Justification

- **호스트 정산금 과지급의 구조적 해소**: 클럽은 정산 캡 자체가 없어 환불 없는 취소까지 합산되며 정원 초과분이 정산되어 왔다. 소셜링·챌린지도 정산 캡에 호스트가 차감되지 않아 향후 클라이언트 가드 우회 시 1슬롯치 과지급이 가능한 구조다. 본 작업으로 정산 금액이 정책에 맞게 정상화된다.
- **정책-규칙-코드 3중 정합**: 노션 정책 문서, WEBB-1321 규칙 문서, 실 코드가 일치하게 되어 규칙 문서의 실효성이 회복된다.
- **데이터 모델 단일화**: 모든 도메인의 호스트가 `Member` row로 표현되어 멤버 조회·권한 체크·카운트가 단일 식으로 작동한다. 매퍼 `+1` 보정 같은 임시방편이 제거되어 클라이언트 가드 의존성도 끊긴다.
- **도메인 간 분기 비용 감소**: 향후 신규 모임 기능 추가 시 도메인별 호스트 처리 분기 구현 부담이 사라진다. 호스트 권한 위임·이력 추적 등 멤버 모델 활용 신규 요구사항도 동일 구조 위에서 진행 가능하다.
- **챌린지 생성 경로 정합**: 동일 정원 챌린지가 어드민/유저 생성 경로에 따라 `availCount`가 1 어긋나는 버그(improvements.md §6) 해소.

---

## Risk Assessment

| 리스크 | 수준 | 대응 |
| --- | --- | --- |
| 정산금 감소로 호스트 영향 (도메인별 차등) | 높음 | **클럽**: 정산 캡 신설로 환불 없는 취소 누적분이 정원 상한에서 컷되어 정산 금액 감소가 확실시됨. **소셜링·챌린지**: 클라이언트 `+1` 보정 가드가 작동해 온 케이스는 변화 없음. 가드 우회·미보정 매퍼 화면을 통한 가입이 있던 케이스만 감소. 스테이징에서 직전 1주(소셜링·챌린지) / 1개월(클럽) 정산을 신·구 공식으로 재계산해 도메인별 영향 호스트·금액 규모 분리 보고. PM·운영팀 사전 공유 후 배포 |
| HOST row 백필 마이그레이션 실패·부분 적용 | 높음 | 백필 SQL을 도메인별 트랜잭션 단위로 분할. 멱등성 보장(`ON CONFLICT DO NOTHING`). 사전에 read-replica에서 백필 dry-run 후 row count 검증. 백필 직후 `COUNT(Member WHERE grade=HOST) = COUNT(Socialing/Challenge)` invariant 검사 |
| `orderId` 제약 변경으로 인한 정산/주문 쿼리 회귀 | 높음 | 부분 유니크 인덱스 + CHECK 제약으로 grade-orderId 정합을 DB 단에서 강제. 정산 쿼리 전수 점검 후 `orderId IS NOT NULL` 또는 `grade != HOST` 필터 추가. `Order` ↔ `Member` 조인 쿼리 회귀 테스트. 스테이징에서 정산 시뮬레이션 |
| 멤버 조회 API에 호스트 포함되어 클라이언트 표시 깨짐 | 중 | API별로 호스트 포함 의도 결정 → 의도된 곳은 그대로, 불필요한 곳은 `grade != HOST` 필터 추가. 모바일/웹 회귀 테스트 |
| Sendbird 채널 자동 가입 중복·누락 | 중 | HOST row 추가 시점의 가입 트리거가 기존 호스트 가입 로직과 중복되지 않도록 가드. 기존 모임의 HOST row 백필 시에는 Sendbird 호출 차단(이미 가입되어 있음) |
| 매퍼 `+1` 보정 누락 식별 실패 | 중 | `+1`, `max + 1`, `1 - availCount` 패턴 전수 grep. 클라이언트 회귀 테스트 |
| `OWNER` → `HOST` rename 외부 영향 | 중 | (1) 백엔드 enum/문자열 참조 grep 후 PR 차단 가드 (2) API 응답에 `grade` 문자열 노출 엔드포인트 식별 후 모바일/웹 클라이언트 하드코딩 비교 점검 (3) Redis 등 캐시 `'OWNER'` 직렬화 값 무효화 (4) Redash·BI·운영툴 쿼리 사전 공유 후 동시 수정 |
| 마이그레이션 배포 타이밍 어긋남 | 중 | 스키마 변경(컬럼 추가, enum 변경, `orderId` 제약 재정의) ↔ HOST row 백필 ↔ Prisma client 재생성 빌드 ↔ API 컨테이너 롤링 배포가 동기 순서로 진행되어야 함. 스테이징에서 시퀀스 리허설 1회 |
| 권한 체크 코드의 의도치 않은 변동 | 중 | `Member` 조회에 HOST row가 새로 잡히는 경로 식별. 권한 분기에서 호스트가 일반 멤버처럼 처리되어 회귀 발생하지 않는지 케이스별 점검 |
| 진행 중 모임 정산 일관성 | 낮음 | 정산 스케줄러는 모임 종료 후 실행. 다음 정산 주기 시작 전 배포면 안전 |

---

## Resource and Scheduling Details

본 작업은 (a)안 채택을 가정하며 스키마 변경·HOST row 백필·정산 쿼리 수정·Sendbird 점검 등 영향이 넓다. 백엔드 외에 모바일·웹 클라이언트의 매퍼 `+1` 의존 코드와 BI/운영툴 쿼리도 동반 수정된다. 모바일·웹 작업은 백엔드 담당자가 겸임하며, 영역별 공수와 elapsed time을 분리해 표기한다.

**담당**

- 백엔드·모바일·웹: 김범진 (Backend Team, 클라이언트 작업 겸임)
- BI/운영툴: 데이터팀 또는 운영팀 1명 (배정 필요)

**백엔드 공수**

| Phase | 작업 | 공수 |
| --- | --- | --- |
| 0 | 스키마 마이그레이션 (enum rename, `ChallengeMember.grade` 컬럼 추가, `orderId` 제약 재정의: NOT NULL 제거 + 부분 유니크 인덱스 + CHECK) | 1d |
| 1 | HOST row 백필 SQL 작성·검증·dry-run | 1.5d |
| 2 | enum `OWNER` → `HOST` 코드 치환 (18+ 곳) | 1d |
| 3 | `availCount` 초기값·증감 로직 정리 | 1d |
| 4 | 매퍼 `+1` 보정 일괄 제거 | 1d |
| 5 | 정산 캡 공식 정렬 + 정산 쿼리 host 필터 | 1.5d |
| 6 | 다운스트림 점검 (멤버 조회 API, Sendbird, 권한) | 2d |
| — | 스테이징 검증·정산 diff 분석·배포 리허설 | 1.5d |
| **합계** |  | 10.5d |

**클라이언트·운영 공수**

| 영역 | 공수 |
| --- | --- |
| 모바일 — `currentMembers`·`maximumMembers` 사용처 식별, `+1` 보정 의존 가드 수정, `grade='OWNER'` 하드코딩 점검, 멤버 목록 호스트 포함 변화 대응, QA | 4~5d |
| 웹 — 동일 | 4~5d |
| BI/운영툴 — Redash 등 쿼리에서 `'OWNER'` → `'HOST'` 일괄 수정, 대시보드 검증, 정산 보고서 신·구 공식 비교 | 2d |

**Elapsed time**: 3~4주

- W1: 백엔드 Phase 0~3 PR (스키마·백필·enum·`availCount`). 모바일/웹 작업 착수 (병렬)
- W2: 백엔드 Phase 4~5 PR (매퍼·정산), 다운스트림 점검 시작. 클라이언트 1차 QA
- W3: 스테이징 통합 검증, 정산 diff 분석, 배포 시퀀스 리허설. 영향 호스트·운영팀 사전 공지
- W4: 정산 주기 직후(매주 화 04:00 KST) 동기 배포 — 스키마 마이그레이션 → 백필 → 백엔드 롤링 → 모바일/웹 신버전 강제 업데이트(또는 점진 전환). 배포 후 1주 모니터링

**권장 배포 타이밍**: 정산 주기(매주 화 04:00 KST) 직후. 다음 주기까지 1주 검증 여유 확보.

**배포 전략 옵션**

본 PR은 DB 스키마 변경·HOST row 백필·정산 의미 변경·매퍼 응답 포맷 변경이 동시에 정합되어야 한다. 두 가지 배포 옵션을 검토하고, 운영 특성·정산 cut-over 명확성을 고려해 **옵션 1(짧은 점검 윈도우)을 1차 권장**한다.

| 항목 | 옵션 1: 점검 윈도우 (60~90분) | 옵션 2: Blue-Green + Expand-Contract |
| --- | --- | --- |
| 다운타임 | 새벽 60~90분 | 0 |
| 작업 복잡도 | 단순 (한 번에 적용) | 복잡 (3단계 분할, backwards-compatible 코드 필요) |
| 백엔드 추가 공수 | — | +3~4d |
| 총 elapsed time | 3~4주 | 4~5주 |
| 롤백 용이성 | 점검 중 즉시 / 해제 후 어려움 | 단계별 즉시 |
| Cut-over 시점 명확성 | 명확 — 정산 변경 시점이 운영·CS·호스트 응대에 유리 | 모호 — 점진 전환이라 영향 호스트별 시점 차이 |
| 사용자 영향 | 새벽 시간대 503 (트래픽 최저) | 거의 없음 |

### 옵션 1: 짧은 점검 윈도우 (권장)

화요일 04:00 KST 정산 스케줄러 종료 직후, 트래픽 최저 시간대에 1~2시간 점검 모드로 일괄 적용한다.

| Step | 작업 | 소요 |
| --- | --- | --- |
| 1 | 점검 모드 진입 (API 503 + 점검 페이지, Scheduler 일시 정지) | 즉시 |
| 2 | DB 스키마 마이그레이션 (enum, `ChallengeMember.grade` 컬럼 추가, `orderId` 제약 재정의) | 5~10분 |
| 3 | HOST row 백필 (도메인별 트랜잭션 단위 배치) | 10~30분 (row 수 의존) |
| 4 | 백필 invariant 검증 (`COUNT(Member WHERE grade=HOST) = COUNT(모임)`) | 5분 |
| 5 | API / Scheduler 컨테이너 신버전 롤링 배포 | 10~15분 |
| 6 | smoke test (멤버 조회·가입·정산 dry-run, Sendbird 채널 가입 확인) | 10~15분 |
| 7 | 점검 모드 해제 | 즉시 |

### 옵션 2: Blue-Green + Expand-Contract (무중단)

문토 인프라가 Blue-Green을 지원하므로 무중단 배포가 가능하다. 단 단순한 컨테이너 교체가 아닌 expand-contract 분할이 필수다.

| Step | 작업 | 비고 |
| --- | --- | --- |
| 1 | **Blue 1차 배포 (backwards-compatible)** — `OWNER`/`HOST` 양립 인식, `availCount`·정산 캡 구식 유지, 매퍼 `+1` 유지 | 구버전 클라이언트 정상 동작. 백엔드 +3~4d 공수 |
| 2 | **DB 마이그레이션 (운영 중)** — enum `HOST` 값 추가 (rename 아님), `ChallengeMember.grade` 컬럼 추가, `orderId` 제약 재정의 | Blue가 양립 인식이라 정합 유지 |
| 3 | **HOST row 백필** — 운영 중 도메인별 배치 트랜잭션 점진 진행 | Blue 정상 동작 유지 |
| 4 | **Green 배포 (신버전)** — `HOST` 단독, 신 `availCount`·정산 캡, 매퍼 `+1` 제거. 트래픽 카나리 또는 일괄 전환 | Blue/Green 공존 |
| 5 | **enum `OWNER` 값 정리** — 클럽 잔여 OWNER row를 HOST로 UPDATE 후 enum 정리 | Blue 종료 후 |

옵션 2는 정산금이 변하는 시점이 점진 전환에 따라 호스트별로 다를 수 있어 운영팀의 정산금 변경 안내·CS 응대가 복잡해진다. 또한 단계별 코드 가드를 추가로 유지·검증해야 한다. 본 PR이 **정산 정확성 회복**이 핵심 가치이므로 cut-over 시점이 명확한 옵션 1을 권장한다.

**클라이언트 호환성 처리 — 모바일 강제 업데이트**

매퍼 `+1` 제거로 구버전 클라이언트의 `currentMembers`가 1 적게 표시될 수 있다. 정원·인원 표시는 호스트 결제·환불 페이지·신청 마감 가드 등 결제 흐름의 핵심 정보라 화면 정합이 흐트러지면 사용자 혼란과 CS 부담이 커진다. 따라서 **모바일은 신버전 강제 업데이트, 웹은 신버전 일괄 배포**로 진행한다.

- iOS/Android 모두 신버전을 스토어에 사전 등록·심사 통과시킨 후, 백엔드 배포 직전에 minimum supported version 정책으로 구버전 차단
- 강제 업데이트 시점이 백엔드 배포 시점과 정렬되어야 함 — 모바일 신버전 보급률을 일정 임계 이상 확보 후 백엔드 cut-over 권장
- 웹은 새로고침으로 신버전 자동 적용

**롤백 전략**

- **옵션 1 (점검 윈도우)**:
    - 백필 직후~smoke test 단계에서 문제 발견 시 점검 모드 유지, 신버전 컨테이너 롤백, 백필 row 삭제 SQL(`DELETE WHERE grade=HOST AND orderId IS NULL`) 실행, 스키마 역마이그레이션 (CHECK 제약·부분 유니크 인덱스 제거 → 컬럼 제거 → enum 역rename)
    - 점검 해제 후 문제 발견 시 핫픽스 우선 (예: 매퍼 `+1` 임시 복구). 스키마 롤백은 데이터 정합 위험으로 회피
- **옵션 2 (Blue-Green)**: 단계별 즉시 롤백 가능. Step 4(Green 배포) 문제 시 Blue 트래픽 100% 복귀
- 롤백 SQL·시퀀스는 사전 작성·스테이징 검증 후 배포 시 동봉

**후행 작업**

- 영향 호스트 안내 (운영팀)
- 매퍼 `+1` 잔존·HOST row 누락 모니터링 1주
- 모바일 강제 업데이트 거부 사용자 추적 — 백엔드 cut-over 직후 minimum version 미만 차단으로 자연 해소되나 CS 인입 모니터링

---

## Technical Description

### 용어

| 용어 | 의미 |
| --- | --- |
| 정원 (`maximumPerson` / `maximumMembers`) | 호스트 1명을 **포함**한 모임 전체 최대 인원 |
| `availCount` | 추가 가입 가능한 잔여 슬롯 수. 가입 가드와 "남은 자리 N석" UI에 사용 |
| `currentMembers` | 현재 모임 참가자 수(호스트 포함). UI 노출용. `정원 - availCount` |
| 정산 캡 | 정산 대상 인원의 상한값. 호스트·스태프 차감한 값 |

### 도메인 별 호스트, 모임 참가 인원, 정산 인원 현황 (정원 10명 기준)

| 도메인 | 호스트 저장 위치 | `availCount` 초기값 (기대 9) | 정산 캡 (기대 9 또는 9-staff) | 백엔드 단독 시 이론상 최대 |
| --- | --- | --- | --- | --- |
| 소셜링 | `Socialing.userId`
enum에 HOST 값 없음 | **10** ❌ | 10-staff ❌ | 일반 10명까지 가입 시 10명치 정산 |
| 클럽 | `ClubMember.grade=OWNER` row | 9 ✅ | **상한 없음** ❌ | 환불 없는 취소까지 합산되어 9명치 초과 정산 가능 (예: 13명치) |
| 챌린지
(백오피스) | `Challenge.ownerId` | 9 ✅ | 10 ❌ | 일반 10명까지 가입 시 10명치 정산 |
| 챌린지 | `Challenge.ownerId` | **10** ❌ | 10 ❌ | 일반 10명까지 가입 시 10명치 정산 |

### 문제 구조: DB는 호스트 카운트 누락, 응답은 `+1`로 가림

소셜링·챌린지의 호스트는 `Socialing.userId` / `Challenge.ownerId`로만 식별되고 `Member` 테이블에 row가 없다. 이 때문에 DB에 저장된 `availCount`는 호스트 1슬롯을 차감하지 않은 상태로 누적된다.

```
[DB 진실 — 정원 10 소셜링, 일반 멤버 0명]
  Socialing.maximumPerson = 10
  Socialing.availCount    = 10        ← 호스트 1슬롯 미차감
```

이 raw 값이 두 흐름에서 직접 사용되며 서로 다른 방식으로 어긋난다.

**(1) 가입 가드 / 정산 — DB 값을 그대로 사용**

가입 가드는 `availCount > 0`만 검사한다. 일반 멤버가 한 명 들어오면 `availCount`를 1 감소시키고, 0이 되면 차단한다. 따라서 정원 10 모임에 일반 멤버 10명이 가입할 때까지 백엔드 단독으로는 가드가 막지 않는다. 정산 스케줄러도 동일한 raw 값(`maximumPerson - staffCount`)을 캡으로 쓰므로 호스트 1슬롯치가 추가로 정산 대상에 포함될 수 있다.

**(2) UI 응답 매퍼 — `+1`로 누락분을 가림**

응답 매퍼는 호스트가 `Member`에 없다는 한계를 응답 시점에 `+1`로 보정한다.

```tsx
// challenge.detail.mapper.ts:180-181
maximumMembers: challenge.maximumMembers + 1,
currentMembers: challenge.maximumMembers + 1 - challenge.availCount,
```

UI 입장에서는 `currentMembers / maximumMembers`가 정원과 맞아떨어져 정원 초과가 드러나지 않는다. 그러나 이는 DB 정합성 회복이 아니라 표시 단의 임시방편이며, 가입 가드와 정산 로직은 여전히 raw 값을 사용한다.

매퍼별로 `+1` 적용이 일관되지 않다.

| 위치 | `currentMembers` | `maximumMembers` |
| --- | --- | --- |
| [challenge.detail.mapper.ts:180-181](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.detail.mapper.ts#L180-L181) | `+1` 보정 | `+1` 보정 |
| [challenge.feed.link.mapper.ts:58-59](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.feed.link.mapper.ts#L58-L59) | `+1` 보정 | 보정 없음 |
| [socialing.feed.link.mapper.ts:103-104](https://www.notion.so/munto/apps/api/src/socialing/mapper/v4/socialing.feed.link.mapper.ts#L103-L104) | `+1` 보정 | 보정 없음 |
| 그 외 소셜링 매퍼 다수 | 보정 없음 | 보정 없음 |

같은 모임이라도 화면별로 `9/10`, `10/11`, `10/10`처럼 다르게 보일 수 있다.

**왜 운영상 정원 초과·과지급이 거의 드러나지 않았나**

소셜링·챌린지의 백엔드 가드는 `availCount > 0` 단독이므로 이론상 일반 멤버 10명까지 가입이 가능하다. 그러나 응답 매퍼 일부가 `currentMembers = max - availCount + 1` 식으로 호스트 1명을 보정해 응답하므로 클라이언트가 `currentMembers >= maximumMembers`를 마감 판정 기준으로 쓰면 일반 9명 시점에 마감된다. 실제 운영에서는 클라이언트 가드가 작동해 호스트 포함 10명·일반 9명 결제·9명치 정산으로 정책과 일치하는 결과로 수렴한다.

문제는 이 정합이 데이터 레이어가 아닌 클라이언트 표시 보정에 의존한다는 점이다. 다음 세 가지 위험이 존재한다.

1. 매퍼별 `+1` 적용이 일관되지 않다. `+1` 미보정 매퍼를 쓰는 화면이나 API 직접 호출에서는 일반 멤버가 10명까지 가입이 통과될 수 있다.
2. 클럽은 정산 캡 자체가 없어 클라이언트 가드와 무관하게 환불 없는 취소가 누적될수록 정원을 초과해 정산된다.
3. 챌린지는 어드민 생성 경로(`max - 1`)와 유저 생성 경로(`max`)의 시작값이 1 어긋나 동일 정원 챌린지가 생성 주체에 따라 다른 마감 동작을 보일 수 있다.

### 결정 항목

| # | 결정 | 잠정 권장안 |
| --- | --- | --- |
| 1 | enum 네이밍 통일 | `OWNER` → `HOST` 일괄 rename |
| 2 | 통일 단위 | **(a) 데이터 표현 통일** — 모든 도메인 Member 테이블에 HOST row 백필 |
| 3 | `ChallengeMember.grade` 필드 추가 | **추가** (결정 2의 (a) 채택과 직결) |

결정 2와 결정 3은 강한 의존 관계가 있다.

| 결정 2 | 결정 3 | 정합 |
| --- | --- | --- |
| (a) 데이터 표현 통일 | **추가 필수** | `ChallengeMember`에 HOST row를 식별할 컬럼 필요 |
| (b) 개념·정합식 통일 | 추가 무관 | grade 없이도 식이 작동 |
| (c) 호스트 분리 통일 | 추가 불필요 | HOST는 `ownerId`로만 식별, Member는 모두 일반 멤버 |

### 결정 2 옵션 비교 (상세)

### (a) 데이터 표현 통일 — 모든 Member 테이블에 HOST row 백필

| 측면 | 내용 |
| --- | --- |
| 요지 | 소셜링·챌린지에도 호스트를 `Member` row로 저장. 모든 도메인이 단일 모델 (`ownerId` denormalized + `Member(grade=HOST)` row)로 일관 |
| 도메인 간 일관성 | ★★★ — 멤버 조회·권한 체크·카운트가 모든 도메인 공통 식 |
| 매퍼 `+1` 보정 | 완전 제거 가능 (`availCount`, `currentMembers`가 자연스럽게 호스트 포함) |
| 멤버 모델 활용성 | ★★★ — 호스트 이력·권한·Sendbird 가입 등이 일반 멤버와 동일하게 처리됨 |
| 핵심 비용 | (1) `SocialingMember.orderId` / `ChallengeMember.orderId`가 `NOT NULL @unique` — 호스트는 결제하지 않으므로 제약 재정의 필요. **권장**: 부분 유니크 인덱스(`WHERE orderId IS NOT NULL`) + CHECK 제약(HOST=NULL, 비호스트=NOT NULL) 조합으로 grade-orderId 정합을 DB 단에서 강제 (상세는 §통일안 참조)
(2) 기존 모임 전체에 HOST row 백필 마이그레이션 (수만~수십만 row 추정)
(3) 멤버 조회 API/쿼리 다수가 호스트를 포함하게 변함 → 다운스트림 점검 (`grade != HOST` 필터 추가 또는 의도적 포함 처리)
(4) Sendbird 채널 자동 가입 루프가 호스트도 처리하는지 검토 |
| 추가 작업 | `ChallengeMember.grade` 컬럼 추가, `ChallengeMemberGrade` enum 신설 (결정 3) |
| Elapsed time | 3~4주 |
| 적합 시점 | 멤버 모델을 권한·이력·채널 등에서 깊이 활용할 계획이 있고, 도메인 간 일관성 비용을 한 번에 해소하려는 경우 |

### (b) 개념·정합식 통일 — 코드 식만 정렬

| 측면 | 내용 |
| --- | --- |
| 요지 | 데이터 표현(클럽만 HOST row, 소셜링·챌린지는 `ownerId`)은 그대로 두고 invariant 식과 정산 캡 공식만 통일 |
| 도메인 간 일관성 | ★ — 코드 식은 통일되나 데이터 모델 비대칭 잔존 |
| 매퍼 `+1` 보정 | 제거 가능 (식이 호스트 1슬롯을 데이터와 무관하게 차감) |
| 멤버 모델 활용성 | ★ — 도메인별 분기 코드 영구 잔존, 호스트를 일반 멤버처럼 다루는 신규 요구사항 발생 시 결국 (a)로 전환 필요 |
| 핵심 비용 | enum rename + `availCount` 초기값 통일 + 정산 캡 보정. 데이터 마이그레이션 불필요 |
| Elapsed time | 1.5~2주 |
| 적합 시점 | 빠른 정상화가 필요하고 멤버 모델 통일이 당장 필요하지 않은 경우 |

### (c) 호스트 분리 통일 — 클럽도 OWNER row 제거

| 측면 | 내용 |
| --- | --- |
| 요지 | 모든 도메인이 호스트를 `ownerId`로만 식별. `ClubMember`에서 OWNER row 제거. `Member`는 일반 멤버만 보유 |
| 도메인 간 일관성 | ★★ — 호스트 식별이 단일화되나, 클럽이 기존에 OWNER row에 의존하던 권한·채널 로직 재작성 필요 |
| 매퍼 `+1` 보정 | 모든 도메인에서 필요 (호스트가 `Member`에 없으므로). 다만 매퍼 단에서 일관되게 `+1`을 정책화 |
| 멤버 모델 활용성 | ★ — "호스트는 멤버가 아니다" 모델로 고정. 향후 호스트 권한/이력을 `Member`로 다루기 어려움 |
| 핵심 비용 | (1) 클럽 OWNER row 일괄 삭제 마이그레이션
(2) `ClubMember.grade=OWNER`에 의존하던 쿼리 다수 (`apps/api/src/club/club.service.ts`, `club.event-handler.ts` 등 18+ 곳) 재작성
(3) Sendbird 클럽 채널의 호스트 가입 로직이 `ClubMember` 기반이면 `ownerId` 기반으로 변경
(4) 매퍼 `+1` 보정을 모든 도메인에 일관 적용 |
| Elapsed time | 2~3주 |
| 적합 시점 | "호스트는 멤버와 다른 존재"라는 모델을 명확히 하고 싶고, 클럽의 OWNER row 의존을 정리할 의지가 있는 경우 |

### 권장 분석

(b)는 임시 정상화이며 도메인 비대칭이 잔존한다. 향후 멤버 모델 활용도가 늘어나면 결국 (a)로 전환해야 하므로 두 번 일하게 된다.

(a)와 (c)는 모두 도메인 간 일관성을 회복하지만 방향이 정반대다.

- (a)는 **"호스트도 멤버다"** 패러다임 — 멤버 모델을 풍부하게 활용
- (c)는 **"호스트는 멤버가 아니다"** 패러다임 — 호스트를 별도 모델로 분리

문토의 멤버 모델은 이미 권한(STAFF), 채널 가입, 결제 이력 등 다양한 용도로 사용되고 있으며 향후 호스트도 동일하게 다뤄야 할 가능성이 높다(예: 호스트 활동 이력, 호스트 권한 위임). 따라서 **(a)를 권장**한다. 단점인 `orderId` 제약은 부분 유니크 인덱스 + CHECK 제약 조합으로 grade-orderId 정합을 DB 단에서 강제하는 방식으로 해결한다 (통일안 참조).

### 결정 3 옵션 비교 (`ChallengeMember.grade` 필드 추가)

| 안 | 장점 | 단점 |
| --- | --- | --- |
| **추가** ✅ | (a) 채택 시 HOST row 식별에 필수. 향후 STAFF 등 등급 추가 시 스키마 안정성 확보. 도메인 간 모델 일관 | 마이그레이션 비용 (컬럼 추가 + 백필 default `MEMBER`) |
| 추가 안 함 | 마이그레이션 절약 | (a) 채택 불가. STAFF 도입 시 재차 마이그레이션 필요 |

결정 2의 권장안 (a)와 직결되어 **추가**를 잠정 권장한다. `ChallengeMemberGrade` enum은 `HOST, MEMBER`로 시작하고 STAFF는 미래에 필요해지면 `ALTER TYPE ADD VALUE`로 확장한다.

### 통일안 ((a)안 + 결정 3 추가 기준)

모든 도메인이 동일한 데이터 모델을 갖는다.

| 도메인 | 호스트 식별 |
| --- | --- |
| 소셜링 | `Socialing.userId` (denormalized) + `SocialingMember(grade=HOST)` row |
| 챌린지 | `Challenge.ownerId` (denormalized) + `ChallengeMember(grade=HOST)` row |
| 클럽 | `Club.ownerId` (denormalized) + `ClubMember(grade=HOST)` row |

**Invariant 1 (정원 정합성)**

```
availCount = 정원 - COUNT(Member WHERE status = APPROVE)
```

- 모임 생성 직후: HOST row 1건 즉시 생성 → `availCount = 정원 - 1`
- 일반 멤버 가입 시 row 추가, `availCount` 자동 차감
- HOST 1슬롯 고정 차감이 데이터로 표현되므로 매퍼 `+1` 보정 불필요

**정산 캡 (Invariant SE3)**

```
cap = 정원 - COUNT(Member WHERE status = APPROVE AND grade IN (HOST, STAFF))
settlementTargetCount  = MIN(totalCount, cap)
settlementTargetAmount = MIN(totalPaymentAmount, price × settlementTargetCount [- discount])
```

- 소셜링·클럽: `cap = 정원 - 1(HOST) - staffCount`
- 챌린지: `cap = 정원 - 1(HOST)` (STAFF row 0건이므로 자동 적용)
- `status = APPROVE` 조건은 `availCount` 식과 일관 — DELETE/CANCEL 등 비활성 row는 cap 계산에서 제외해야 정확한 상한이 산출됨

**`orderId` 제약 처리 — 부분 유니크 인덱스 + CHECK 제약**

호스트는 결제하지 않으므로 `SocialingMember.orderId` / `ChallengeMember.orderId`의 `NOT NULL @unique` 제약을 단순 nullable화하지 않고, **grade 조건부로 강제**한다. 단순 nullable화는 비호스트 멤버가 `orderId` 없이 생성되는 silent bug를 막지 못하므로 CHECK로 정합을 DB 단에서 보장한다.

```sql
-- (1) NOT NULL 제거 (HOST가 NULL 가질 수 있어야 함)
ALTER TABLE "SocialingMember" ALTER COLUMN "orderId" DROP NOT NULL;

-- (2) UNIQUE를 부분 인덱스로 재정의 — orderId가 NOT NULL일 때만 유일
DROP INDEX "SocialingMember_orderId_key";
CREATE UNIQUE INDEX "SocialingMember_orderId_key"
  ON "SocialingMember"("orderId")
  WHERE "orderId" IS NOT NULL;

-- (3) grade-orderId 정합을 CHECK로 강제
ALTER TABLE "SocialingMember" ADD CONSTRAINT "chk_member_orderId"
  CHECK (
    ("grade" = 'HOST' AND "orderId" IS NULL)
    OR ("grade" <> 'HOST' AND "orderId" IS NOT NULL)
  );

-- ChallengeMember 도 동일 패턴 적용
```

- HOST 멤버는 `orderId IS NULL` 강제 — 여러 모임의 HOST row가 NULL을 가져도 부분 유니크 인덱스가 충돌시키지 않음
- 비호스트 멤버는 `orderId IS NOT NULL` 강제 — Order ↔ Member 1:1 관계 무결성 유지
- Prisma schema에서는 `Int? @unique`로 표현되며, 부분 인덱스·CHECK 제약은 raw migration으로 추가하고 의도는 schema 주석으로 남긴다
- 정산 쿼리에는 안전을 위해 `WHERE orderId IS NOT NULL` 또는 `WHERE grade != HOST` 필터를 명시적으로 추가

### 작업 범위

| Phase | 작업 | 주요 내용 |
| --- | --- | --- |
| 0 | 스키마 마이그레이션 | (1) `ALTER TYPE "ClubMemberGrade" RENAME VALUE 'OWNER' TO 'HOST'`
(2) `SocialingMemberGrade`에 `HOST` 값 추가
(3) `ChallengeMemberGrade` enum 신설 (`HOST, MEMBER`) + `ChallengeMember.grade` 컬럼 추가 (default `MEMBER`)
(4) `SocialingMember.orderId`, `ChallengeMember.orderId`: `NOT NULL` 제거 + 부분 유니크 인덱스(`WHERE orderId IS NOT NULL`) + CHECK 제약(`HOST=NULL, 그 외=NOT NULL`) |
| 1 | HOST row 백필 | 모든 기존 소셜링·챌린지에 `Member(userId=ownerId, grade=HOST, orderId=NULL, status=APPROVE)` row 1건씩 생성. 트랜잭션 단위로 진행 |
| 2 | enum 통일 + 규칙 문서 정렬 | 코드 전반 `ClubMemberGrade.OWNER` → `HOST` 치환 (18+ 곳), `*-pseudocode.md` 3종 정렬 |
| 3 | `availCount` 초기값·증감 통일 | 소셜링·챌린지 모임 생성 시 HOST row 추가에 따라 `availCount = 정원 - 1`로 자동 시작. 어드민 경로의 `max - 1` 수동 보정 제거 ([challenge.service.ts:252](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L252) 등). 향후 모든 가입/탈퇴는 Member row 변동만으로 정합 |
| 4 | 매퍼 `+1` 보정 일괄 제거 | `+1` / `max + 1` 패턴 grep 후 제거. HOST row가 `availCount`에 자연 반영되므로 보정 불필요. 영향 매퍼: [challenge.detail.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.detail.mapper.ts), [challenge-card.list.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge-card.list.mapper.ts), [challenge.feed.link.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.feed.link.mapper.ts), [socialing.feed.link.mapper.ts](https://www.notion.so/munto/apps/api/src/socialing/mapper/v4/socialing.feed.link.mapper.ts) 등 |
| 5 | 정산 캡 공식 정렬 | 소셜링 3곳 ([socialing-settlement.service.ts:65](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement/service/socialing-settlement.service.ts#L65), [settlement.admin.service.ts:958](https://www.notion.so/munto/apps/api/src/settlement/admin/settlement.admin.service.ts#L958), [socialing.admin.service.ts:1089](https://www.notion.so/munto/apps/api/src/admin/socialing/v1/service/socialing.admin.service.ts#L1089)), 챌린지 [settlement.schedule-job.service.ts:100](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L100), 클럽 신설 [settlement.schedule-job.service.ts:185-190](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L185-L190). 정산 쿼리에 `orderId IS NOT NULL` 또는 `grade != HOST` 필터 추가 |
| 6 | 다운스트림 점검 | (1) 멤버 조회 API: 호스트 포함 여부 의도 확인, 필요 시 `grade != HOST` 필터 추가
(2) Sendbird 클럽·소셜링·챌린지 채널 자동 가입 루프: HOST row 추가 시 중복 가입 방지
(3) 권한 체크 코드: HOST row가 `Member` 조회에서 잡힐 때 의도된 동작인지 확인 |

**범위 외**: (c)안 / `Socialing.hostId`·`Challenge.ownerId` denormalized FK 정리 (단일 소스로 통합은 후속 과제) / 과거 미정산·과정산 건 보정 (운영 과제)

### 검증 시나리오

| 케이스 | 기대 |
| --- | --- |
| 클럽 정원 10·HOST 1·STAFF 0·멤버 9 | Member row 10건 (HOST 1 + 멤버 9), `availCount = 0`, 정산 = MIN(orders, 9) |
| 클럽 정원 10·HOST 1·STAFF 2·멤버 7 | Member row 10건, `availCount = 0`, 정산 = MIN(orders, 7) |
| 챌린지 정원 10 생성 직후 | ChallengeMember row 1건 (grade=HOST, orderId=NULL), `availCount = 9` |
| 챌린지 정원 10·일반 멤버 9 가입 | row 10건, `availCount = 0`, 정산 = MIN(orders, 9) |
| 소셜링 정원 10 생성 직후 | SocialingMember row 1건 (grade=HOST, orderId=NULL), `availCount = 9` |
| 소셜링 정원 10·HOST·STAFF 1·멤버 8 | row 10건, `availCount = 0`, 정산 = MIN(orders, 8) |
| 클럽 정원 10·환불 없는 취소 4 + APPROVE 9 | 정산 = 9 (정책 §6-4 정합) |
| 백필 후 invariant | `COUNT(SocialingMember WHERE grade=HOST) = COUNT(Socialing)`, `COUNT(ChallengeMember WHERE grade=HOST) = COUNT(Challenge)` |

### 후속 과제

- `Socialing.hostId` / `Challenge.ownerId` denormalized FK 단일 소스 정리 — 본 PR로 모든 도메인이 `Member(grade=HOST)` row를 갖게 되므로 `ownerId` 컬럼은 조회 성능 최적화 외에 의미가 약해짐. 단일 소스화 vs 유지 결정은 별도 이슈
- enum rename에 따른 운영툴(Redash/BI) 쿼리·대시보드 정리 — 본 PR과 동시 진행하되 추적 티켓으로 분리
- 과거 미정산·과정산 건 보정 — 본 PR 적용 전 발생한 정산금 정합 차이의 운영 대응 (운영 과제)

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.29 | 김범진 | 최초 작성 |

---

<aside>
🧾

## **문서 작성 규칙**

</aside>

1. **항목마다 작성자/작성일을 명시**
2. **모든 변경은 ‘변경 이력’ 테이블에 기록**
3. **문서 버전은 Semantic Versioning(v1.0.0)을 따름**
4. **기여자는 실질적인 내용 추가/수정에 참여한 사람만 포함**
5. 변경 사항이 발생하거나 리뷰 요청이 필요한 문서의 경우, 관련 수정 내용을 변경 이력과 함께 명시하고, 해당 부분 끝에 버전을 표기하여 혼동을 방지한다. 
    - 변경 내용 `(v1.0.1)`