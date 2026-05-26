# 도메인 별 호스트 정원 포함 정책 일관화 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 29일 오전 11:09
최근 수정일: 2026년 5월 6일 오전 11:24
문서 상태: Active
생성 일시: 2026년 4월 29일 오전 11:09
최종 편집자: 김범진

## Project Name

도메인 별 호스트 정원 포함 정책 일관화

## Date

2026-04-29

## Submitter Info

김범진([beomjin.kim@munto.kr](mailto:beomjin.kim@munto.kr))

---

## Project Description

정책 문서는 "호스트는 정원에 1슬롯 포함된다"(§2-3)고 명시했지만, 실 코드는 도메인(클럽·챌린지·소셜링)마다 호스트의 데이터 표현·정원 차감·정산 대상 인원 상한 적용이 비대칭이다. 본 작업은 운영 중인 시스템에 누적된 정원·호스트 슬롯 정합 부채를 회복하는 마이그레이션이며, 항목별로 변경/유지를 결정한 뒤 통일안을 적용한다. 정산 도메인 필터(`orderStatus` 분류) 정합은 [WEBB-1328](https://munto.atlassian.net/browse/WEBB-1328)에서 별도로 다룬다.

---

## Business and Marketing Justification

- **호스트 정원 포함 정합 회복 (§2-3)**: 소셜링·챌린지는 호스트가 정원에 잡히지 않아 정원 10 모임에 일반 멤버 10명 + 호스트 1명 = 실제 11명 운영이 가능한 상태다. 클라이언트 매퍼 `+1` 보정 가드에 의존해 표시상으로만 가려져 있다. 본 작업으로 정원·호스트 슬롯이 데이터 레이어에서 정합 회복된다.
- **정산 대상 인원 상한 정합 회복 (§6-4)**: 클럽은 정산 대상 인원에 정원 상한 자체가 없고, 소셜링·챌린지도 정산 캡에 호스트가 차감되지 않아 1슬롯치 과지급이 가능한 구조다. 본 작업으로 정산 대상 인원이 정원 상한 내로 제한된다.
- **데이터 모델 단일화**: 모든 도메인의 호스트가 `Member` row로 표현되어 멤버 조회·권한 체크·카운트가 단일 식으로 작동한다. 매퍼 `+1` 보정 같은 임시방편이 제거되어 클라이언트 가드 의존성도 끊긴다.
- **챌린지 생성 경로 정합**: 동일 정원 챌린지가 어드민/유저 생성 경로에 따라 `availCount`가 1 어긋나는 버그(improvements.md §6) 해소.
- **도메인 간 분기 비용 감소**: 향후 신규 모임 기능 추가 시 도메인별 호스트 처리 분기 구현 부담이 사라진다. 호스트 권한 위임·이력 추적 등 멤버 모델 활용 신규 요구사항도 동일 구조 위에서 진행 가능하다.

---

## Risk Assessment

| 리스크 | 수준 | 대응 |
| --- | --- | --- |
| 정산 정책 변경 컨펌 지연·번복 | 높음 | 호스트 정산금이 직접 변동되는 변경이므로 PM·재무·운영팀의 사전 합의가 필수. 컨펌 회의에 도메인별 영향 정량 자료를 첨부. 컨펌 이후라도 호스트 클레임 발생 시 정책 번복 가능성이 있어 운영 의사결정 절차를 사전에 정의 |
| 호스트 클레임 및 CS 부담 (도메인별 영향 차등) | 높음 | **클럽**: §6-4 정산 캡 신설로 정원 초과분 컷 → 정산 금액 감소 가능 (3개월 측정 결과 즉시 영향 0건이나 캡 부재 자체가 위반). 
**챌린지**: 정산 캡 호스트 1슬롯 차감으로 호스트별 영향 산정 필요 (3개월 108건 중 13건 호스트 슬롯 미차감 가입 발견). 
**소셜링**: 클라이언트 `+1` 보정 가드 작동 케이스는 변화 없음. 가드 우회 8.2% 사례에서 1슬롯치 과지급 발생해 왔음. 
운영팀과 도메인별 안내 문구·환산 금액 시뮬레이션·CS 응대 가이드를 배포 전 확정. 배포 직후 일정 기간 CS 인입 모니터링 인력 확보 |
| 점검 윈도우 시간 초과 | 중 | 옵션 1(점검 윈도우) 채택 시 백필·smoke test 단계가 예상(60~90분)을 초과하면 다음 정산 주기 지연 또는 점검 연장 결정 필요. 스테이징에서 사전 리허설로 실측 후 윈도우 길이 확정 |

---

## Resource and Scheduling Details

- 백엔드·모바일·웹: 김범진 (Backend Team, 클라이언트 작업 겸임)

**백엔드 공수**

| Phase | 작업 | 공수 |
| --- | --- | --- |
| 0 | 스키마 마이그레이션 (enum rename, `ChallengeMember.grade` 컬럼 추가, `orderId` 제약 재정의: NOT NULL 제거 + nullable unique + CHECK 제약) | 1d |
| 1 | HOST row 백필 SQL 작성·검증·dry-run (~632k row, 전체 활성 모임) | 1.5d |
| 2 | enum OWNER → HOST 코드 치환 (18+ 곳) | 1d |
| 3 | availCount 초기값·증감 로직 정리 | 1d |
| 4 | 매퍼 +1 보정 일괄 제거 | 1d |
| 5 | ~~정산 캡 공식 정렬 + 정산 쿼리 host 필터~~
[WEBB-1390](https://munto.atlassian.net/browse/WEBB-1390)으로 분리. 본 OnePager 합계에서 제외 | ~~1.5d~~ |
| 6 | 다운스트림 점검 (멤버 조회 API, Sendbird, 권한) | 2d |
| — | 스테이징 검증·정산 diff 분석·배포 리허설 | 1.5d |
| 합계 |  | 9d (≈2주) |

**클라이언트·운영 공수**

| 영역 | 공수 |
| --- | --- |
| 모바일 — `currentMembers`·`maximumMembers` 사용처 식별, `+1` 보정 의존 가드 수정, `grade='OWNER'` 하드코딩 점검, 멤버 목록 호스트 포함 변화 대응, QA | 4~5d |
| 웹 — 동일 | 4~5d |
| BI/운영툴 — 대시보드 검증, 정산 보고서 신·구 공식 비교 | 2d |

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
| 3 | HOST row 백필 (~632k row, 전체 활성 모임, 트랜잭션 배치 분할) | 5~10분 |
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
    - 백필 직후~smoke test 단계에서 문제 발견 시 점검 모드 유지, 신버전 컨테이너 롤백, 백필 row 삭제 SQL(`DELETE WHERE grade=HOST AND orderId IS NULL`) 실행, 스키마 역마이그레이션 (CHECK 제약 제거 → `orderId` NOT NULL 복구 → 컬럼 제거 → enum 역rename)
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

### 현재 상태 (As-Is)

### 정책 문서

**§2-3 정원 정의** (참조: [노션 정책문서](https://www.notion.so/34be2bc7639d8033963fc8c0c37990ca?pvs=21))

> 모임마다 최대 인원(정원)이 정해져 있습니다.
> 
> - 소셜링: 호스트가 설정하는 가변 정원
> - 챌린지: 호스트가 설정하는 가변 정원. 최소 2명이 모여야 진행 확정
> - 클럽: 호스트가 설정하는 가변 정원
> 
> **호스트(HOST)는 정원에 포함됩니다.**
> 

**§6-4 정원 초과 제외** (정산 대상 인원의 상한)

> 정산 대상 인원은 아래 인원 조건을 초과할 수 없습니다. 예를 들어 10명 정원 소셜링에 환불 없는 취소 4명 + 참여 확정 9명(총 13건 결제 유지)이 있어도, 정산은 9명분만 적용됩니다.
> 
> - 소셜링: 정원에서 호스트와 스태프를 뺀 인원까지
> - 챌린지: 정원에서 호스트를 뺀 인원까지
> - 클럽: 정원에서 호스트와 스태프를 뺀 인원까지

정책 기준 식 (정원 10 모임):

- `availCount` 초기값 = `정원 - 1(HOST)` = **9**
- 정산 대상 인원 상한 = 소셜링·클럽 `정원 - 1(HOST) - staffCount`, 챌린지 `정원 - 1(HOST)`

### 소셜링 As-Is

**호스트 식별 위치**

- `Socialing.userId` (denormalized FK to User)
- `SocialingMember` 테이블에는 호스트 row 없음

**Member 모델** ([schema.prisma](https://www.notion.so/munto/libs/prisma/schema.prisma) 발췌)

```
enum SocialingMemberGrade {
  STAFF
  MEMBER
  // HOST 값 정의 없음
}

model SocialingMember {
  grade   SocialingMemberGrade @default(MEMBER)
  orderId Int                  @unique          // NOT NULL — 결제 1건당 멤버 row 1건
  ...
}
```

`orderId NOT NULL @unique` 제약 때문에 결제하지 않는 호스트는 멤버 row 생성이 구조적으로 불가.

**`availCount` 초기값**

`availCount = maximumPerson` (호스트 1슬롯 미차감)

- [socialing.entity.ts:182](https://www.notion.so/munto/apps/api/src/socialing/v5/core/entity/socialing.entity.ts#L182)
- [socialing.transformer.ts:58](https://www.notion.so/munto/apps/api/src/socialing/v5/repository/transformer/socialing.transformer.ts#L58)
- [socialing.v4.service.ts:1972](https://www.notion.so/munto/apps/api/src/socialing/v4/socialing.v4.service.ts#L1972)

**가입 가드**

`UPDATE Socialing SET availCount = availCount - 1 WHERE id = ? AND availCount > 0` ([socialingMember.v4.service.ts:401-411](https://www.notion.so/munto/apps/api/src/socialing/v4/socialingMember.v4.service.ts#L401-L411))

→ 백엔드 단독으로는 정원 10 모임에 일반 멤버 10명까지 가입 통과 가능

**정산 캡 식**

`cap = maximumPerson - staffCount` (호스트 1슬롯 미차감)

- [socialing-settlement.service.ts:65](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement/service/socialing-settlement.service.ts#L65)
- [settlement.admin.service.ts:958](https://www.notion.so/munto/apps/api/src/settlement/admin/settlement.admin.service.ts#L958)
- [socialing.admin.service.ts:1089](https://www.notion.so/munto/apps/api/src/admin/socialing/v1/service/socialing.admin.service.ts#L1089)

**응답 매퍼 `currentMembers` 계산** — 화면별 비대칭

| 매퍼 | 식 | UI 노출 |
| --- | --- | --- |
| 대부분의 소셜링 매퍼 | `currentMembers = max - availCount` | 호스트 누락 (`9/10`) |
| [socialing.feed.link.mapper.ts:103-104](https://www.notion.so/munto/apps/api/src/socialing/mapper/v4/socialing.feed.link.mapper.ts#L103-L104) | `currentMembers = max - availCount + 1` | 호스트 포함 (`10/10`) |

**정책 어긋남**

- §2-3 위반: `availCount` 초기값에서 호스트 1슬롯 미차감
- §6-4 위반: 정산 캡에서 호스트 1슬롯 미차감
- enum 비표준: 정책 등급은 HOST/STAFF/MEMBER이나 enum에 HOST 없음

### 챌린지 As-Is

**호스트 식별 위치**

- `Challenge.ownerId` (denormalized FK to User)
- `ChallengeMember` 테이블에는 호스트 row 없음

**Member 모델**

```
model ChallengeMember {
  // grade 컬럼 자체 없음 (STAFF 개념 없음)
  orderId Int @unique  // NOT NULL
  ...
}
```

**`availCount` 초기값** — 생성 경로별 비대칭

| 생성 경로 | 식 | 위치 |
| --- | --- | --- |
| 백오피스 | `availCount = maximumMembers - 1` | [challenge.admin.service.ts:308](https://www.notion.so/munto/apps/api/src/challenge/challenge.admin.service.ts#L308) |
| 앱(유저) | `availCount = maximumMembers` | [challenge.service.ts:252](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L252) |

동일 정원 챌린지가 생성 주체에 따라 시작값이 1 어긋남 (improvements.md §6).

**가입 가드**

`UPDATE Challenge SET availCount = availCount - 1` 후 결과가 `< 0`이면 롤백 + 예외 ([challenge.service.ts:620-632](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L620-L632)). 소셜링과 메커니즘은 다르나 결과적으로 `availCount = 0` 시점에 차단되는 점은 동일.

**정산 캡 식**

`settlementMaxCount = maximumMembers` (호스트 1슬롯 미차감)

- [settlement.schedule-job.service.ts:100](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L100)

**응답 매퍼 `currentMembers` 계산** — 매퍼별 비대칭

| 매퍼 | `currentMembers` | `maximumMembers` |
| --- | --- | --- |
| [challenge.detail.mapper.ts:180-181](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.detail.mapper.ts#L180-L181) | `max + 1 - availCount` | `max + 1` |
| [challenge-card.list.mapper.ts:147-148](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge-card.list.mapper.ts#L147-L148) | `max + 1 - availCount` | `max + 1` |
| [base.challenge.service.ts:52-53](https://www.notion.so/munto/apps/api/src/challenge/base.challenge.service.ts#L52-L53) | `max + 1 - availCount` | `max + 1` |
| [challenge.web.detail.mapper.ts:30-31](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.web.detail.mapper.ts#L30-L31) | `max + 1 - availCount` | `max + 1` |
| [challenge.feed.link.mapper.ts:58-59](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.feed.link.mapper.ts#L58-L59) | `max - availCount + 1` | **응답 미노출** (필드 자체 없음) |

같은 챌린지가 화면에 따라 `10/11`(detail), `10/10`(feed link)처럼 다르게 표시됨.

**정책 어긋남**

- §2-3 위반: 유저 생성 경로의 `availCount` 초기값 호스트 미차감
- §6-4 위반: 정산 캡 호스트 미차감
- 어드민/유저 경로 비대칭: 동일 모임이 생성 주체에 따라 다른 마감 동작
- 매퍼 비대칭: 화면마다 호스트 포함 표시 다름

### 클럽 As-Is

**호스트 식별 위치**

- `Club.ownerId` (denormalized FK to User)
- 추가로 `ClubMember(grade=OWNER)` row 1건 존재

**Member 모델**

```
enum ClubMemberGrade {
  MEMBER
  STAFF
  OWNER  // ← HOST 의미를 OWNER로 표현
}

model ClubMember {
  grade ClubMemberGrade @default(MEMBER)
  // orderId 필드 자체 없음 (결제 정보는 ClubMembership 모델에 분리)
  ...
}
```

`ClubMember`는 결제 정보를 분리 보관하므로 호스트 row 생성에 `orderId` 제약 충돌이 없다. 따라서 클럽만 OWNER row가 자연스럽게 존재할 수 있었음.

**`availCount` 초기값**

`availCount = maximumMembers - 1` — OWNER row 1건이 카운트되므로 자연스럽게 호스트 1슬롯 차감

**가입 가드**

`UPDATE Club SET availCount = availCount - 1` 후 결과가 `< 0`이면 롤백 + 예외 ([club.service.ts:1660-1670](https://www.notion.so/munto/apps/api/src/club/club.service.ts#L1660-L1670)). 챌린지와 동일 메커니즘.

**정산 캡 식**

**상한 자체 없음**. `settlementTargetCount = totalCount`로 결제 유지된 모든 Order가 정산 대상에 그대로 합산.

[settlement.schedule-job.service.ts:175-176](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L175-L176)

→ 정원 10 클럽에 환불 없는 취소 4 + APPROVE 9 = 결제 유지 13건이 모두 정산되어 정원 초과 정산금 지급

**응답 매퍼 `currentMembers` 계산**

`currentMembers = maximumMembers - availCount` — OWNER row가 `availCount`에 이미 반영되므로 자연스럽게 호스트 포함

**정책 어긋남**

- §2-3 부합: 정원 식·`availCount` 초기값은 정책에 부합 (호스트 1슬롯 차감됨)
- §6-4 위반: 정산 캡 식이 없어 환불 없는 취소가 정원 한도를 초과해도 정산
- enum 비표준: 정책 용어 HOST 대신 OWNER 사용 (도메인 간 네이밍 불일치)

### 도메인 별 운영 동작

**가입 마감 시점 (소셜링·챌린지)**

백엔드 단독으로는 `availCount > 0` 가드만 있으므로 정원 10 모임에 일반 10명까지 가입 통과 가능. 그러나 응답 매퍼 일부가 `currentMembers`에 `+1` 보정을 하므로 클라이언트가 `currentMembers >= maximumMembers`를 마감 판정에 사용하면 일반 9명에서 차단된다. 따라서 운영상 정원 초과는 거의 드러나지 않으나, 이는 데이터 레이어 정합이 아니라 **클라이언트 표시 보정에 의존하는 결과**다. `+1` 미보정 매퍼를 사용하는 화면이나 API 직접 호출 경로에서는 정원 초과가 발생할 수 있음.

**정산 대상 인원 상한 결과 (도메인별 차이)**

| 도메인 | 운영 결과 |
| --- | --- |
| 소셜링·챌린지 | 클라이언트 가드 작동 케이스: 일반 9명 결제·9명치 정산으로 정책 일치
가드 우회 케이스(`+1` 미보정 매퍼·API 직접 호출): 일반 10명 결제·10명치 정산으로 호스트 1슬롯치 과지급 |
| 클럽 | 정산 캡 부재로 결제 유지된 모든 Order가 정원 한도와 무관하게 합산됨. 정원 10에 결제 유지 13건이 있으면 13명치 정산 가능 |

소셜링·챌린지는 클라이언트 가드 의존이 위험 요소이고, 클럽은 백엔드 정산 캡 자체가 부재해 정원 정합이 깨질 수 있다.

### As-Is 요약 매트릭스

| 항목 | 소셜링 | 챌린지 | 클럽 |
| --- | --- | --- | --- |
| 호스트 식별 | `Socialing.userId` | `Challenge.ownerId` | `Club.ownerId` + `ClubMember(grade=OWNER)` |
| Member에 호스트 row | ❌ | ❌ | ✅ |
| Member.orderId 제약 | `Int @unique` (NOT NULL) | `Int @unique` (NOT NULL) | 필드 없음 |
| `availCount` 초기값 | `max` ❌ | 어드민 `max-1` ✅ / 유저 `max` ❌ | `max - 1` ✅ |
| 가입 가드 | `availCount > 0` | `availCount > 0` | `availCount > 0` |
| 정산 대상 인원 상한 식 | `max - staffCount` ❌ | `max` ❌ | **상한 없음** ❌ |
| 매퍼 `+1` 보정 | 매퍼별 비대칭 | 매퍼별 비대칭 | 보정 불필요 |
| §2-3 정합 | 위반 | 위반 (유저 경로) | 부합 |
| §6-4 정합 | 위반 | 위반 | 위반 |
| enum 정책 용어 | HOST 값 없음 | grade 컬럼 없음 | OWNER 사용 (HOST 아님) |

### 비대칭 사유 및 운영 영향 정량 평가

비대칭이 누적된 사유는 도메인이 추가되는 시점마다 그 시점의 편의로 호스트 표현·정원 식이 결정된 결과로 추정된다(코드 변경 이력 정밀 분석은 본 OnePager 범위 외). 본 절에서는 운영 영향만 정량으로 측정한다.

**측정 기간**: 2026-01-29 ~ 2026-04-29 (최근 3개월), 프로덕션 RDS 직접 조회.

### 정산 규모 베이스라인

| 도메인 | 정산 건수 | 영향 호스트 수 | 정산 대상 금액 | 호스트 지급액 (80%) |
| --- | --- | --- | --- | --- |
| 소셜링 | 7,954 | 982 | 29.99억 | 23.99억 |
| 챌린지 | 15 | 3 | 542만 | 434만 |
| 클럽 | 36 | 17 | 2,632만 | 2,105만 |

소셜링이 도메인 중 가장 큰 비중. 챌린지·클럽은 정산 자체 규모가 작아 절대 금액 영향은 제한적이지만 위반율은 별개.

### 호스트 정원 정합 위반 빈도

3개월 간 생성된 모임에서 호스트 1슬롯이 차감되지 않은 채 정원이 채워진 모임 수.

| 도메인 | 모임 수 | 호스트 슬롯 미차감 가입 | 비율 | 최대 초과 |
| --- | --- | --- | --- | --- |
| 소셜링 | 36,695 | 3,027 | **8.2%** | 정원 +2명 |
| 챌린지 | 108 | 13 | **12.0%** | 정원 +1명 |

소셜링은 일상적으로 1슬롯치 호스트 정산 과지급이 발생해 왔다는 뜻. 챌린지는 모집 자체가 적지만 위반율은 더 높음 (유저 생성 경로 시작값 `max` 버그 영향 추정 — 항목 4와 직결).

### 클럽 정산 캡 부재 영향

| 항목 | 결과 |
| --- | --- |
| 정원 초과 정산 발생 (3개월) | 0건 / 36건 |
| 정원 대비 사용률 최대 | 72% (정원 100, 정산 72) |

3개월 기준 즉시 영향 0건. 그러나 캡 자체가 부재한 구조는 정원 100~300명 클럽이 향후 채워질 경우 잠재 위험. 정책 §6-4 명시적 위반.

### HOST row 백필 영향 범위 (항목 2 (a)안 기준)

**전체 활성 모임 (deleted 제외)**

| 도메인 | 활성 모임 | 종료 상태 | 진행 중·미래 | 가장 오래된 모임 |
| --- | --- | --- | --- | --- |
| 소셜링 | 630,165 | 627,421 (99.6%) | **2,744** | 2020-11-04 |
| 챌린지 | 2,382 | 2,328 | **54** | 2023-01-02 |
| 클럽 | 14,021 (이미 OWNER row 존재) | — | — | 2022-08-18 |

**백필 전략 옵션**

| 안 | 백필 대상 row 수 | 부담 | invariant 일관성 | BI·멤버 모델 활용성 |
| --- | --- | --- | --- | --- |
| **(A) 전체 백필 (권장)** | **~632k row** | 트랜잭션 분할(10k×63 배치) 또는 새벽 점검 윈도우 1회. 단순 `INSERT INTO ... SELECT` raw SQL이라 처리 속도 빠름 (수 분~10분 내) | 모든 모임에 HOST row 존재 — 코드·검증·BI 식이 단일 | 종료 모임도 호스트 멤버 row로 표현되어 호스트 활동 이력 등 향후 활용 가능 |
| (B) 진행 중·미래 모임만 백필 | ~2,800 row | 매우 작음 — 단일 트랜잭션 | invariant가 status별로 분기됨 → "종료 상태는 예외" 분기가 코드·BI에 영구 잔존 | 종료 모임 멤버 조회·BI 통계에서 호스트 누락. 향후 호스트 이력 기능 도입 시 재백필 필요 |

**(A) 권장**: 부분 백필은 부담을 1/200로 줄이지만 invariant 일관성 손실 + 코드·BI 분기 영구 잔존 + 향후 활용성 손실의 비용이 더 크다. 전체 백필은 단순 `INSERT` raw SQL로 트리거 미동작·외부 영향 0이라 실제 부담은 점검 윈도우 시간 +5~10분 수준. invariant `COUNT(SocialingMember WHERE grade=HOST) = COUNT(Socialing)` 전체 검증 가능.

### Sendbird 채널 자동 가입 루프 영향

| 단계 | 영향 |
| --- | --- |
| 백필 단계 (raw SQL `INSERT`) | application hook 미동작 → Sendbird 호출 0건. **영향 없음** |
| 신규 모임 생성 (백필 이후) | ORM으로 HOST row 추가 시 status APPROVE hook이 `joinToChannel` 호출할 위험 ([shared.socialing-member.service.ts:212](https://www.notion.so/munto/libs/common/src/shared/services/shared.socialing-member.service.ts#L212)). **호스트 grade 분기 가드 1줄 추가**로 해소 |
| 클럽 (참고) | 이미 `ClubMember(grade=OWNER)` row를 같은 흐름으로 생성하나 `joinToChannel` 호출 안 함 — 별도 owner 등록 경로 사용. 이 패턴을 소셜링·챌린지에 동일 적용 |

### 멤버 조회 API 점검 부담

| 항목 | 건수 |
| --- | --- |
| `prisma.socialingMember.{find/count/aggregate}` 호출 | 20곳 |
| `prisma.challengeMember.{find/count/aggregate}` 호출 | 16곳 |
| 점검 대상 합계 | **36곳** |
| 기존 `ClubMember.grade = OWNER` 필터 사용처 (참고 패턴) | 17곳 |

**예상 처리 분포 (보수적 추정)**: 호스트 포함이 자연스러운 곳 70~80% (~26곳, 변경 없음) / `grade != HOST` 필터 추가 필요 20~30% (~10곳).

### 항목별 결론 요약 (정량 결과 반영)

- **항목 6** (소셜링 정산 캡 호스트 차감): 8.2% 위반율 → **변경 권장**
- **항목 7** (챌린지 정산 캡 호스트 차감): 12% 위반율 → **변경 권장**
- **항목 8** (클럽 정산 캡 신설): 즉시 영향 0건이나 정책 명시 위반 + 잠재 위험 → **변경 권장** (예방 차원)
- **항목 4** (챌린지 유저 경로 `availCount` 시작값): 챌린지 12% 위반율의 직접 원인으로 추정 → **변경 권장**
- **항목 2** (HOST row 백필 (a)안): 백필 대상 ~632k row (전체 활성 모임), 단순 INSERT raw SQL로 5~10분 처리. Sendbird 영향 0.5d, 멤버 조회 점검 2~3d (산정치 범위 내) → **(a) + (A) 전체 백필 변경 권장**. invariant 일관성 + 향후 활용성 + BI 정합 모두 회복
- **항목 1, 3, 5**: 정량 데이터와 무관한 결정 또는 항목 2에 종속

### 항목별 변경/유지 결정

비대칭을 단위로 쪼개 항목별로 변경/유지를 결정한다. 정책 명시 위반 항목은 변경 권장이 강하고, 데이터 표현·임시방편 항목은 정량 데이터·운영 의견에 따라 결정한다. **각 항목의 "유지" 옵션은 명시적으로 비교 대상에 포함**한다.

> 정산 도메인 필터(`orderStatus` 분류)는 본 PR 범위 외이며 [WEBB-1328](https://www.notion.so/webb-1328-settlement-target-filter-onepager.md)에서 다룬다. 본 PR은 모임 정원·호스트 슬롯·정산 대상 인원 상한 정합에 한정한다.
> 

### 항목 요약 매트릭스

| # | 항목 | 정책 위반 | 옵션 | 의존 | 정량 측정 트리거 | 잠정 권장 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | enum `OWNER` → `HOST` 네이밍 통일 | 없음 (네이밍 일관성 문제) | 변경 / 유지 / OWNER·HOST 양립 alias | — | 코드 18곳·BI 쿼리·캐시 영향 추정 (정량보다 비용 산정) | **변경** |
| 2 | 소셜링·챌린지 Member에 HOST row 백필 (데이터 표현 통일) | 직접 위반 아님 (매퍼 `+1` 의존 구조의 근원) | (a) 백필 / (b) 비대칭 유지 + 식만 정렬 / (c) 클럽 OWNER row 제거 | — | 백필 row 수, Sendbird 가입 영향, 멤버 조회 API 다운스트림 호출 빈도 | **미정** |
| 3 | `ChallengeMember.grade` 컬럼 추가 | 없음 | 추가 / 유지 | 항목 2 | 항목 2에 종속 | 항목 2 결정 후 자동 |
| 4 | 챌린지 유저 경로 `availCount` 시작값 통일 | §2-3 위반 | 변경(A 유저 경로 `max-1`로 정렬) / 변경(B 어드민도 `max`로) — 정책 위반 확대, 비추 / 유지 | — | 유저 경로 vs 어드민 경로 챌린지 생성 비율, 영향 모임 수 | **변경(A)** |
| 5 | 매퍼 `+1` 보정 일괄 제거 | 직접 위반 아님 (표시 단 임시방편) | 일괄 제거 / 유지 / 모든 매퍼에 `+1` 일관 적용 | 항목 2 | `+1` 미보정 매퍼 경유 화면 호출 빈도, 정원 초과 가입 발생 건수 | 항목 2 결정 후 자동 |
| 6 | 소셜링 정산 대상 인원 상한 호스트 1슬롯 차감 | §6-4 위반 | 변경 (`max-1-staffCount`) / 유지 | — | 가드 우회 빈도 + 1슬롯 과지급 발생 모임 수·금액 | **변경** |
| 7 | 챌린지 정산 대상 인원 상한 호스트 1슬롯 차감 | §6-4 위반 | 변경 (`max-1`) / 유지 | — | 항목 6과 동일 구조 | **변경** |
| 8 | 클럽 정산 대상 인원 상한 신설 | §6-4 명시적 위반 | 변경 (`max-1-staffCount`) / 유지 | — | 정원 초과 정산 발생 모임 수·금액 | **변경** |

**의존 관계**: 항목 2 → 항목 3, 5. 그 외 항목은 독립적.

**정량 의존 항목** (정량 결과에 따라 결정 변동): 2

**측정 결과 변경 권장 (정책 명시 위반 + 정량 측정 완료)**: 1, 4, 6, 7, 8

### 항목 1 — enum `OWNER` → `HOST` 네이밍 통일

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| **변경** ✅ | `ALTER TYPE RENAME` 1회, 코드 18곳 치환, 클라이언트 하드코딩 점검, BI 쿼리·캐시 동기 수정 | 정책 용어 정합. 도메인 간 enum 통일 |
| 유지 | 변경 비용 회피 | 클럽만 비표준 용어(`OWNER`) 영구 잔존. 신규 멤버가 매번 학습 비용 |
| OWNER·HOST 양립 alias | 점진 전환 가능 | 임시방편 코드가 영구화될 위험 |

비용은 낮고 정합 가치는 명확하므로 **변경 권장**.

### 항목 2 — 소셜링·챌린지 Member에 HOST row 백필

본 PR에서 가장 큰 의사결정 항목. (a)/(b)/(c) 세 가지 방향이 있고 각각 패러다임이 다르다.

### (a) 변경 — 모든 Member 테이블에 HOST row 백필 ("호스트도 멤버다")

| 측면 | 내용 |
| --- | --- |
| 요지 | 소셜링·챌린지에도 호스트를 `Member` row로 저장. 모든 도메인이 단일 모델 (`ownerId` denormalized + `Member(grade=HOST)` row)로 일관 |
| 도메인 간 일관성 | ★★★ — 멤버 조회·권한 체크·카운트가 모든 도메인 공통 식 |
| 매퍼 `+1` 보정 (항목 5) | 완전 제거 가능 (`availCount`, `currentMembers`가 자연스럽게 호스트 포함) |
| 멤버 모델 활용성 | ★★★ — 호스트 이력·권한·Sendbird 가입 등이 일반 멤버와 동일하게 처리됨 |
| 핵심 비용 | (1) `SocialingMember.orderId` / `ChallengeMember.orderId`가 `NOT NULL @unique` — 호스트는 결제하지 않으므로 제약 재정의 필요. 권장: nullable unique + CHECK 제약 (§통일안 참조). PostgreSQL은 unique 제약에서 NULLs를 distinct로 다루므로 여러 HOST row가 `orderId = NULL`을 가져도 충돌하지 않음 — 별도 부분 인덱스 불필요
(2) 기존 모임 전체에 HOST row 백필 마이그레이션 (수만~수십만 row 추정)
(3) 멤버 조회 API/쿼리 다수가 호스트를 포함하게 변함 → 다운스트림 점검
(4) Sendbird 채널 자동 가입 루프가 호스트도 처리하는지 검토 |
| 추가 작업 | `ChallengeMember.grade` 컬럼 추가 (항목 3) |
| Elapsed time | 3~4주 |

### (b) 유지 — 데이터 표현 비대칭 유지 + 식만 정렬

| 측면 | 내용 |
| --- | --- |
| 요지 | 데이터 표현(클럽만 HOST row, 소셜링·챌린지는 `ownerId`)은 그대로 두고 invariant 식과 정산 캡 공식만 통일 |
| 도메인 간 일관성 | ★ — 코드 식은 통일되나 데이터 모델 비대칭 잔존 |
| 매퍼 `+1` 보정 (항목 5) | 제거 가능 (식이 호스트 1슬롯을 데이터와 무관하게 차감) |
| 멤버 모델 활용성 | ★ — 도메인별 분기 코드 영구 잔존. 호스트를 일반 멤버처럼 다루는 신규 요구사항 발생 시 결국 (a)로 전환 필요 |
| 핵심 비용 | enum rename + `availCount` 초기값 통일 + 정산 캡 보정. 데이터 마이그레이션 불필요 |
| Elapsed time | 1.5~2주 |

### (c) 변경 — 클럽 OWNER row 제거 ("호스트는 멤버가 아니다")

| 측면 | 내용 |
| --- | --- |
| 요지 | 모든 도메인이 호스트를 `ownerId`로만 식별. `ClubMember`에서 OWNER row 제거. `Member`는 일반 멤버만 보유 |
| 도메인 간 일관성 | ★★ — 호스트 식별이 단일화되나, 클럽이 기존에 OWNER row에 의존하던 권한·채널 로직 재작성 필요 |
| 매퍼 `+1` 보정 (항목 5) | 모든 도메인에서 필요 (호스트가 `Member`에 없으므로). 다만 매퍼 단에서 일관되게 `+1`을 정책화 |
| 멤버 모델 활용성 | ★ — "호스트는 멤버가 아니다" 모델로 고정. 향후 호스트 권한/이력을 `Member`로 다루기 어려움 |
| 핵심 비용 | (1) 클럽 OWNER row 일괄 삭제 마이그레이션
(2) `ClubMember.grade=OWNER`에 의존하던 쿼리 다수 (`apps/api/src/club/club.service.ts`, `club.event-handler.ts` 등 18+ 곳) 재작성
(3) Sendbird 클럽 채널의 호스트 가입 로직이 `ClubMember` 기반이면 `ownerId` 기반으로 변경
(4) 매퍼 `+1` 보정을 모든 도메인에 일관 적용 |
| Elapsed time | 2~3주 |

### 권장

(a)는 "호스트도 멤버" 패러다임으로 멤버 모델을 풍부하게 활용. (c)는 정반대 패러다임. (b)는 임시 정상화로 향후 멤버 모델 활용도가 늘어나면 결국 (a)로 전환해야 하므로 두 번 일하게 된다.

문토의 멤버 모델은 이미 권한(STAFF), 채널 가입, 결제 이력 등 다양한 용도로 사용되고 있으며 향후 호스트도 동일하게 다뤄야 할 가능성이 높다. 따라서 **(a) 권장**. 정량 측정 결과 비용 산정치 초과 없음 (§비대칭 사유 및 운영 영향 정량 평가 참조):

- 백필 row 수 ~2.8k (진행 중·미래 모임 한정 (B)안 채택 시)
- Sendbird 영향 0.5d (호스트 grade 분기 가드 추가)
- 멤버 조회 API 점검 2~3d (36곳 분류, 기존 클럽 `OWNER` 필터 17곳 패턴 참고)

### 항목 3 — `ChallengeMember.grade` 컬럼 추가

| 옵션 | 장점 | 단점 |
| --- | --- | --- |
| **추가** | 항목 2 (a) 채택 시 HOST row 식별에 필수. 향후 STAFF 등 등급 추가 시 스키마 안정성 확보. 도메인 간 모델 일관 | 마이그레이션 비용 (컬럼 추가 + 백필 default `MEMBER`) |
| 유지 | 마이그레이션 절약 | 항목 2 (a) 채택 불가. STAFF 도입 시 재차 마이그레이션 필요 |

항목 2 결정에 종속. (a) 시 추가 필수, (b)/(c) 시 유지 가능. `ChallengeMemberGrade` enum 채택 시 `HOST, MEMBER`로 시작하고 STAFF는 미래에 필요해지면 `ALTER TYPE ADD VALUE`로 확장.

### 항목 4 — 챌린지 유저 경로 `availCount` 시작값 통일

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| **변경(A)** ✅ — 유저 경로 `max-1`로 정렬 | [challenge.service.ts:252](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L252) 1줄 수정. 신규 챌린지부터 적용 | §2-3 정합 회복. 어드민/유저 경로 1슬롯 차이 버그 해소 (improvements.md §6) |
| 변경(B) — 어드민 경로도 `max`로 | 어드민 경로 1줄 수정 | 정책 위반 확대. 비추 |
| 유지 | 변경 비용 회피 | 정책 위반 + 생성 경로 비대칭 잔존 |

**변경(A) 권장**

### 항목 5 — 매퍼 `+1` 보정 일괄 제거

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| 일괄 제거 | 매퍼 6곳 수정 + 클라이언트 동기 수정 + QA | 응답 포맷 정합. 클라이언트 가드 의존 제거 |
| 유지 | 비용 0 | 클라이언트 가드 의존 + 매퍼별 비대칭 잔존 |
| 모든 매퍼에 `+1` 일관 적용 | 매퍼 미보정 곳 수정 | 데이터 레이어 비대칭은 그대로. (c)안과 함께 가는 방향 |

항목 2에 종속. (a) 채택 시 일괄 제거가 자연스럽고, (b) 채택 시 식 통일과 함께 제거, (c) 채택 시 일관 적용. 측정 항목: `+1` 미보정 매퍼 경유 화면 호출 빈도.

### 항목 6 — 소셜링 정산 대상 인원 상한 호스트 1슬롯 차감

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| **변경** ✅ — `cap = max-1-staffCount` | 정산 코드 3곳 수정 + 정산 쿼리 검증 | §6-4 정합. 가드 우회 케이스의 1슬롯 과지급 차단 |
| 유지 | 비용 0 | §6-4 위반 잔존. 호스트 슬롯이 정산 대상에 포함되어 1슬롯치 호스트 정산 과지급 |

**측정 결과**: 3개월 36,695건 중 3,027건(8.2%)에서 일반·스태프 합계가 정원-1을 초과 — 호스트 1슬롯 미차감 가입이 일상적으로 발생. 변경 권장.

### 항목 7 — 챌린지 정산 대상 인원 상한 호스트 1슬롯 차감

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| **변경** ✅ — `cap = max-1` | [settlement.schedule-job.service.ts:100](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L100) 1줄 수정 | §6-4 정합. 정원 초과 가입의 호스트 정산 차단 |
| 유지 | 비용 0 | §6-4 위반 잔존 |

**측정 결과**: 3개월 챌린지 108건 중 13건(12%)에서 호스트 1슬롯 미차감 가입. 변경 권장.

### 항목 8 — 클럽 정산 대상 인원 상한 신설

| 옵션 | 비용 | 가치 |
| --- | --- | --- |
| **변경** ✅ — `cap = max-1-staffCount` 신설 | [settlement.schedule-job.service.ts:175-176](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L175-L176) 정산 식 신설 + 쿼리 검증 | §6-4 정합. 클럽 정원 초과 정산 차단 |
| 유지 | 비용 0 | §6-4 위반 잔존. 결제 유지 건수가 정원을 초과해도 무한 합산 |

**측정 결과**: 3개월 클럽 정산 36건 중 정원 초과 0건 (즉시 영향 없음, 정원 대비 사용률 최대 72%). 그러나 정산 캡 자체가 부재한 상태는 정원 100~300명 클럽이 향후 채워질 경우 잠재 위험. **클라이언트 가드와 무관하게 백엔드 정산 캡 자체가 정책 위반**이므로 예방 차원 변경 권장.

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

**`orderId` 제약 처리 — nullable unique + CHECK 제약**

호스트는 결제하지 않으므로 `SocialingMember.orderId` / `ChallengeMember.orderId`의 `NOT NULL @unique` 제약을 단순 nullable로 바꾸고, grade-orderId 정합은 **CHECK 제약**으로 DB 단에서 강제한다. 단순 nullable화만으로는 비호스트 멤버가 `orderId` 없이 생성되는 silent bug를 막지 못하므로 CHECK가 필수다.

```sql
-- (1) NOT NULL 제거 (HOST가 NULL 가질 수 있어야 함)
ALTER TABLE "SocialingMember" ALTER COLUMN "orderId" DROP NOT NULL;

-- (2) UNIQUE는 그대로 유지 (별도 작업 불필요)
-- PostgreSQL은 unique 제약에서 NULLs를 distinct로 다루므로
-- (PG 15 이전 기본, PG 15+에서도 NULLS DISTINCT가 기본값),
-- 여러 HOST row가 orderId = NULL을 가져도 unique 위반이 아니다.
-- 부분 유니크 인덱스(WHERE orderId IS NOT NULL)는 동일 효과이지만 불필요.

-- (3) grade-orderId 정합을 CHECK로 강제
ALTER TABLE "SocialingMember" ADD CONSTRAINT "chk_member_orderId"
  CHECK (
    ("grade" = 'HOST' AND "orderId" IS NULL)
    OR ("grade" <> 'HOST' AND "orderId" IS NOT NULL)
  );

-- ChallengeMember 도 동일 패턴 적용
```

- HOST 멤버는 `orderId IS NULL` 강제 — PG 기본 unique 동작이 NULLs distinct이므로 여러 HOST row가 NULL을 가져도 충돌하지 않음
- 비호스트 멤버는 `orderId IS NOT NULL` 강제 — Order ↔ Member 1:1 관계 무결성 유지
- Prisma schema에서는 `Int? @unique`로 표현되며, schema·DB 정합이 그대로 유지되어 drift 위험 없음. CHECK 제약은 raw migration으로 추가하고 의도는 schema 주석으로 남긴다
- 정산 쿼리에는 안전을 위해 `WHERE orderId IS NOT NULL` 또는 `WHERE grade != HOST` 필터를 명시적으로 추가
- **Prisma 4.13.0에서의 호환성**: `extendedIndexes` preview가 활성화돼 있지 않아 schema에 partial unique index를 표현할 수 없다. nullable unique는 표준 문법이라 schema·migration이 자동 정합. (이 레포는 raw SQL로 partial 인덱스를 운영한 선례가 있으나 — `DiscountAndSocialingMember` — schema와 표기 차이가 잔존한다. 신규 추가는 nullable unique로 단순화)

### 마이그레이션 비용·회수 가치 비교

변경하기로 결정된 항목별로 비용(개발 공수·마이그레이션 부담·클라이언트 영향)과 회수 가치(정량·정성)를 비교한다. 비용 대비 가치가 낮으면 해당 항목은 유지 결정으로 회귀 가능.

### 항목별 비용·가치

| 항목 | 비용 | 회수 가치 | 비용/가치 평가 |
| --- | --- | --- | --- |
| **1. enum `OWNER` → `HOST`** | • DB `ALTER TYPE` (atomic, 수 ms)
• 백엔드 코드 18곳 치환 1d
• Prisma schema 갱신·재생성
• Redis 캐시 무효화
• Redash·BI 쿼리 동기 수정 (외부 협조)
• 모바일/웹 `'OWNER'` 하드코딩 점검 | 정성: 도메인 간 enum 통일, 정책 용어 정합, 신규 멤버 학습 비용 절감
정량: 직접 금액 회수 없음 | 비용 낮음 + 정합 가치 명확 → **변경 가치 충분** |
| **2. HOST row 백필 (a)안 + (A) 전체 백필** | • 스키마: orderId 제약 재정의 (부분 unique + CHECK), ChallengeMember.grade 신설• 백필 SQL 1.5d, ~632k row (전체 활성 모임). 단순 INSERT INTO ... SELECT raw SQL, 트랜잭션 배치 분할로 점검 윈도우 510분 처리• 멤버 조회 API 점검 23d (36곳 분류, 클럽 OWNER 필터 17곳 패턴 참고)• Sendbird 가드 0.5d (호스트 grade 분기 1줄 ×3 도메인)• 매퍼 +1 일괄 제거 1d• 클라이언트 모바일 강제 업데이트 + 웹 일괄 배포 | 정성: 데이터 모델 단일화, 클라이언트 가드 의존 단절, 매퍼 +1 임시방편 제거. 향후 호스트 권한·이력 등 멤버 모델 활용 신규 요구사항 대응 가능. invariant 일관성 (모든 모임에 HOST row 존재)정량: 항목 6, 7과 결합 시 호스트 슬롯 미차감 가입 8.2%(소셜링)·12%(챌린지) 모임의 데이터 정합 회복 + 종료 모임 BI/통계 호스트 카운트 정합 회복 | 비용 측정 결과 산정치 범위 내. 백필 부담은 단순 INSERT raw SQL이라 632k row도 5~10분 내 처리 가능 → (a) + (A) 변경 권장 |
| **3. `ChallengeMember.grade` 컬럼 추가** | • 컬럼 추가 + default `MEMBER` 백필
• 공수 0.5d | 정성: 항목 2 (a)의 전제조건. 향후 STAFF 도입 가능 | 항목 2 (a) 채택 시 필수. 단독 가치는 작음 |
| **4. 챌린지 유저 경로 `availCount` 시작값 통일** | • [challenge.service.ts:252](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L252) 1줄 수정
• 공수 0.5d
• 신규 챌린지부터 적용 | 정성: §2-3 정합. improvements.md §6 버그 해소
정량: 챌린지 12% 호스트 슬롯 미차감 가입의 직접 원인 해소. 신규 챌린지 한정 | 비용 매우 낮음 + 정량 가치 명확 → **변경 가치 매우 높음** |
| **5. 매퍼 `+1` 보정 일괄 제거** | • 백엔드 매퍼 6곳 수정 1d
• 클라이언트 동기 수정 + QA
• 모바일 강제 업데이트 + 웹 일괄 배포 의존 | 정성: 클라이언트 가드 의존 단절. 매퍼 응답 일관성 회복 (`9/10`/`10/11`/`10/10` 화면별 비대칭 해소) | 항목 2에 종속. (a) 채택 시 비용 거의 추가 없음 (백필 후 자연스럽게 식 정합) |
| **6. 소셜링 정산 캡 호스트 1슬롯 차감 (WEBB-1390)** | • 정산 코드 3곳 수정
• 정산 쿼리 host 필터 추가
• 공수 0.5d (항목 5의 단독 변경분) | 정성: §6-4 정합정량: 3개월 36,695건 중 3,027건(8.2%)에서 1슬롯치 호스트 정산 과지급 차단. 소셜링 정산 30억 베이스라인 중 이론 최대 8.2% × 1/평균참여인원 영향분 회수 (정확 금액은 BI 후속 산정) | 비용 낮음 + 정량 가치 큼 → 변경 가치 매우 높음. WEBB-1390에서 단독 머지 |
| **7. 챌린지 정산 캡 호스트 1슬롯 차감 (WEBB-1390)** | • settlement.schedule-job.service.ts:100 1줄 수정
• 공수 0.5d | 정성: §6-4 정합정량: 3개월 108건 중 13건(12%)에서 호스트 슬롯 미차감 가입 → 1슬롯치 정산 차단. 챌린지 정산 542만 베이스라인이 작아 절대 금액은 제한적 | 비용 매우 낮음 + 위반율 높음 → 변경 가치 충분. WEBB-1390에서 단독 머지 |
| **8. 클럽 정산 캡 신설 (WEBB-1390)** | • settlement.schedule-job.service.ts:175-176 정산 식 신설
• 정산 쿼리 검증
• 공수 1d | 정성: §6-4 명시적 위반 해소정량: 3개월 즉시 영향 0건. 그러나 정원 100~300명 클럽이 향후 채워질 경우 잠재 위험 차단. 정원 대비 사용률 최대 72% 사례 존재 | 비용 낮음 + 즉시 정량 가치 0이나 정책 위반 + 잠재 위험 → 예방 차원 변경 권장. WEBB-1390에서 단독 머지 |

### 변경 결정 항목별 비용 합계 (잠정 권장 (a)안 + 항목 1·3·4·5·6·7·8 변경 채택 가정)

| 영역 | 본 OnePager 본체 | WEBB-1390 (분리) | 전체 합계 |
| --- | --- | --- | --- |
| 백엔드 공수 (인하우스) | 약 **9d** (Phase 0~4·6 + 검증·리허설) | 1.5d (Phase 5) | 10.5d |
| 모바일 공수 | 4~5d (매퍼 `+1` 의존 가드 + 강제 업데이트 빌드) | — (영향 없음) | 4~5d |
| 웹 공수 | 4~5d | — | 4~5d |
| BI/운영툴 공수 | 2d (enum rename 동기 수정) | — | 2d |
| **Elapsed time** | **3~4주** (옵션 1 점검 윈도우) | W1~W2 단독 머지 | 3~4주 (병행 진행) |
| **다운타임** | 새벽 60~90분 (본체 cut-over 시) | 0 (일반 배포) | — |

### 회수 가치 합계

| 항목 | 정량 | 정성 |
| --- | --- | --- |
| 호스트 정원 정합 회복 (§2-3) | 소셜링 8.2% + 챌린지 12% 모임의 데이터 정합 회복 | 클라이언트 매퍼 `+1` 가드 의존 단절. API 직접 호출·`+1` 미보정 매퍼 화면에서도 정원 초과 가입 차단 |
| 정산 대상 인원 상한 정합 회복 (§6-4) | 모임당 1슬롯치 호스트 정산 과지급 차단. 클럽 정원 초과 정산 잠재 위험 차단 | 백엔드 정산 자체가 정책 정합으로 작동 |
| 데이터 모델 단일화 ((a)안 채택 시) | — (직접 금액 없음) | 도메인 간 호스트 처리 분기 제거. 신규 기능 추가 시 도메인별 분기 비용 감소. 향후 호스트 권한 위임·이력 추적 등 신규 요구사항 동일 구조 위에서 진행 가능 |
| 챌린지 생성 경로 정합 | 신규 챌린지의 12% 위반율 직접 원인 해소 | improvements.md §6 버그 해소 |

### 비용 대비 가치가 낮아 유지 회귀 가능 항목

다음 시나리오에서는 일부 항목이 본 PR 범위에서 빠질 수 있다.

- **항목 8 → 유지 시나리오**: 클럽 정원 100~300명 모임이 향후 채워질 가능성이 낮다고 운영 측에서 판단할 경우. 단 정책 §6-4 명시 위반 잔존
- **항목 1 → 양립 alias 시나리오**: BI/운영툴 동기 수정 협조가 어려울 경우 OWNER·HOST alias 양립으로 점진 전환 — 비추, 임시방편 영구화 위험

본 시점 권장은 모든 항목 **변경**. 정량 데이터(소셜링 8.2%, 챌린지 12%)가 항목 2·6·7의 변경 가치를 정량적으로 뒷받침한다.

### 작업 범위

| Phase | 작업 | 주요 내용 |
| --- | --- | --- |
| 0 | 스키마 마이그레이션 | (1) `ALTER TYPE "ClubMemberGrade" RENAME VALUE 'OWNER' TO 'HOST'`
(2) `SocialingMemberGrade`에 `HOST` 값 추가
(3) `ChallengeMemberGrade` enum 신설 (`HOST, MEMBER`) + `ChallengeMember.grade` 컬럼 추가 (default `MEMBER`)
(4) `SocialingMember.orderId`, `ChallengeMember.orderId`: `NOT NULL` 제거 (Prisma `Int? @unique`로 표현, PG 기본 NULLs distinct로 HOST row 다중 NULL 허용) + CHECK 제약(`HOST=NULL, 그 외=NOT NULL`)  |
| 1 | HOST row 백필 | **(A) 전체 백필 채택**: 모든 활성 모임 (`deletedAt IS NULL`) — 소셜링 ~630k + 챌린지 ~2.4k = ~632k row. `INSERT INTO ... SELECT` raw SQL로 처리. 트랜잭션 분할(예: 10k×63 배치) 또는 점검 윈도우 새벽 1회 실행. invariant `COUNT(SocialingMember WHERE grade=HOST) = COUNT(Socialing)`, `COUNT(ChallengeMember WHERE grade=HOST) = COUNT(Challenge)` 전체 검증 |
| 2 | enum 통일 + 규칙 문서 정렬 | 코드 전반 `ClubMemberGrade.OWNER` → `HOST` 치환 (18+ 곳), `*-pseudocode.md` 3종 정렬 |
| 3 | `availCount` 초기값·증감 통일 | 소셜링·챌린지 모임 생성 시 HOST row 추가에 따라 `availCount = 정원 - 1`로 자동 시작. 어드민 경로의 `max - 1` 수동 보정 제거 ([challenge.service.ts:252](https://www.notion.so/munto/apps/api/src/challenge/challenge.service.ts#L252) 등). 향후 모든 가입/탈퇴는 Member row 변동만으로 정합 |
| 4 | 매퍼 `+1` 보정 일괄 제거 | `+1` / `max + 1` 패턴 grep 후 제거. HOST row가 `availCount`에 자연 반영되므로 보정 불필요. 영향 매퍼: [challenge.detail.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.detail.mapper.ts), [challenge-card.list.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge-card.list.mapper.ts), [challenge.feed.link.mapper.ts](https://www.notion.so/munto/apps/api/src/challenge/mapper/challenge.feed.link.mapper.ts), [socialing.feed.link.mapper.ts](https://www.notion.so/munto/apps/api/src/socialing/mapper/v4/socialing.feed.link.mapper.ts) 등 |
| 5 | 정산 대상 인원 상한 식 정렬 | 소셜링 3곳 ([socialing-settlement.service.ts:65](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement/service/socialing-settlement.service.ts#L65), [settlement.admin.service.ts:958](https://www.notion.so/munto/apps/api/src/settlement/admin/settlement.admin.service.ts#L958), [socialing.admin.service.ts:1089](https://www.notion.so/munto/apps/api/src/admin/socialing/v1/service/socialing.admin.service.ts#L1089)) `cap = max-1-staffCount`, 챌린지 [settlement.schedule-job.service.ts:100](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L100) `cap = max-1`, 클럽 [settlement.schedule-job.service.ts:175-176](https://www.notion.so/munto/apps/scheduler/src/scheduleJob/settlement.schedule-job.service.ts#L175-L176) 신설 `cap = max-1-staffCount`. 정산 쿼리에 `orderId IS NOT NULL` 또는 `grade != HOST` 필터 추가하여 호스트 row가 정산 합산에 잡히지 않도록 함 |
| 6 | 다운스트림 점검 | (1) 멤버 조회 API: 호스트 포함 여부 의도 확인, 필요 시 `grade != HOST` 필터 추가
(2) Sendbird 클럽·소셜링·챌린지 채널 자동 가입 루프: HOST row 추가 시 중복 가입 방지
(3) 권한 체크 코드: HOST row가 `Member` 조회에서 잡힐 때 의도된 동작인지 확인 |

**범위 외**: (c)안 / 정산 도메인 필터(`orderStatus` 분류) 정합은 [WEBB-1328](https://www.notion.so/webb-1328-settlement-target-filter-onepager.md) / `Socialing.hostId`·`Challenge.ownerId` denormalized FK 정리 (후속 과제) / 과거 미정산·과정산 건 보정 (운영 과제)

### 검증 시나리오

| 케이스 | 기대 |
| --- | --- |
| 클럽 정원 10·HOST 1·STAFF 0·멤버 9 | Member row 10건 (HOST 1 + 멤버 9), `availCount = 0`, 정산 대상 인원 상한 = 9 |
| 클럽 정원 10·HOST 1·STAFF 2·멤버 7 | Member row 10건, `availCount = 0`, 정산 대상 인원 상한 = 7 |
| 챌린지 정원 10 생성 직후 | ChallengeMember row 1건 (grade=HOST, orderId=NULL), `availCount = 9` |
| 챌린지 정원 10·일반 멤버 9 가입 | row 10건, `availCount = 0`, 정산 대상 인원 상한 = 9 |
| 소셜링 정원 10 생성 직후 | SocialingMember row 1건 (grade=HOST, orderId=NULL), `availCount = 9` |
| 소셜링 정원 10·HOST·STAFF 1·멤버 8 | row 10건, `availCount = 0`, 정산 대상 인원 상한 = 8 |
| 클럽 정원 10·결제 유지 13건 (정원 초과 케이스) | 정산 대상 인원 = MIN(13, 정원 캡 9) = **9** (§6-4 정합. 도메인 필터에 의한 status별 제외는 WEBB-1328 범위) |
| 백필 후 invariant | `COUNT(SocialingMember WHERE grade=HOST) = COUNT(Socialing)`, `COUNT(ChallengeMember WHERE grade=HOST) = COUNT(Challenge)` |

### 후속 과제

- `Socialing.hostId` / `Challenge.ownerId` denormalized FK 단일 소스 정리 — 본 PR로 모든 도메인이 `Member(grade=HOST)` row를 갖게 되므로 `ownerId` 컬럼은 조회 성능 최적화 외에 의미가 약해짐. 단일 소스화 vs 유지 결정은 별도 이슈
- enum rename에 따른 운영툴(Metabase) 쿼리·대시보드 정리 — 본 PR과 동시 진행하되 추적 티켓으로 분리
- 과거 미정산·과정산 건 보정 — 본 PR 적용 전 발생한 정산금 정합 차이의 운영 대응 (운영 과제)
- **정산 인원 식 단순화 — cap·MIN 제거 + Member 기반 count 직설 식 도입**
    - 배경: [WEBB-1390](https://munto.atlassian.net/browse/WEBB-1390)의 `cap = max - 1 - staffCount` + `MIN(totalCount, cap)`은 게이트 누수(`+1` 매퍼 보정 우회 등)에 대한 방어 장치다. 본 PR 본체에서 게이트가 통일되면(`availCount = 정원 - count(APPROVE Member)`) cap 위반은 0건이 되어야 한다.
    - 단계 1 (모니터링): 본체 cut-over 후 1~2 정산 주기 동안 `if (totalCount > cap) logger.warn(...)` 형태로 cap 작동 여부 관측. 클럽은 정기결제 모델이라 매주기 active 회원 수와 cap이 일치해야 함.
    - 단계 2 (제거·단순화): 모니터링 결과 cap 위반 0건 안정 확인 시 다음으로 단순화.
        - 소셜링·챌린지 (일회성): `settlementTargetCount = count(Member where grade=MEMBER AND status=APPROVE)`. Order 매핑 1:1 (`orderId @unique`)이라 동일 결과
        - 클럽 (정기결제): `settlementTargetCount = count(ClubMember where grade=MEMBER AND status=APPROVE)`. 매달 active 멤버 전원 정산 본질에 직설 정합
        - cap·MIN 검사 제거. Order는 amount 계산(가격·환불·할인 보정)에만 사용
    - 단계 3 (위반 발생 시 분기): 모니터링에서 cap 위반 발견 시 root cause 분석. 게이트 누수면 본체 보강, 데이터 정합 깨짐이면 보정 작업. cap은 안전망으로 유지

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.29 | 김범진 | 최초 작성 |
| v1.1.0 | 26.04.29 | 김범진 | 전면 재작성
  • 현재 As-Is 반영
  • 비대칭의 사유와 운영 영향 정량 평가 반영
  • 변경하기로 한 항목에 한해 통일안 + 마이그레이션 비용·회수 가치 비교 항목 추가 |
| v1.1.1 | 26.05.06 | 김범진 |   • partial unique index 제거
  • phase5를 별도 이슈로 분리 및 순서 조정 |

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