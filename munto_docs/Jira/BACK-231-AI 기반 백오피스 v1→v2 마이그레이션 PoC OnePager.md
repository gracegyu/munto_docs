# AI 기반 백오피스 v1→v2 마이그레이션 PoC OnePager

분류: SRS
작성자: 김도연
최초 작성일: 2026년 6월 10일 오전 10:29
최근 수정일: 2026년 6월 11일 오전 8:55
문서 상태: Active
생성 일시: 2026년 6월 10일 오전 10:29
최종 편집자: 김범진

## **Project Name**

AI 기반 백오피스 v1→v2 마이그레이션 PoC 

## **Date**

2026-06-10

## **Submitter Info**

김도연

## **Project Description**

v1([admin.munto.co.kr/purchase/all_list.html](http://admin.munto.co.kr/purchase/all_list.html))에서 운영 중인 **소셜링 신청 관리**를, 기획 디자인(`문토 체험단 백오피스.html#social-apply-list`) UI 기준으로 v2([admin-v2.munto.co.kr](http://admin-v2.munto.co.kr/))에 **Rebuild**한다.

v1 HTML을 그대로 옮기는 것이 아니라, **디자인 UI + 주문 API(`GET admin/order`) → v2 React-Admin 화면** 조합이 가능한지, 필요 시 **백엔드 API 확장**까지 포함해 end-to-end로 얼마나 걸리는지 검증한다. PoC 통과 후 본 마이그레이션(WBS·일정)은 **별도 최종 OnePager**에 정리한다.

## **PoC 대상 선정 이유**

**1) 운영 핵심 화면**

소셜링 신청 관리는 주문·결제·참여 상태를 한눈에 보는 **운영 허브**이다. v1 `purchase/all_list.html`에서 일상적으로 사용 중이다.

**2) 체험단 출시와 API 검증**

체험단 기능 추가에 따라 주문 API 응답에 `isTrial`, `isEarlyBird`가 포함된다. 디자인의 **결제 유형(일반 결제 / 얼리버드 / 체험단)** 컬럼·필터와 직접 연결되므로, PoC에서 **표시 + 서버 필터 + (필요 시) API 확장**을 한 번에 검증하기에 적합하다.

**3) 3-layer 대응이 명확**

| Layer | 위치 |
| --- | --- |
| v1 | `purchase/all_list.html`, `js/purchase/all_list.js` |
| v2 | `MoimList.tsx`, Resource `moim/social` → `GET admin/order` |
| 디자인 | `#social-apply-list` |
| 백엔드 | `munto-backend` — `order.admin.service` / `GetOrdersQueryInput` |

**4) v2 기반 활용 + 디자인 갭은 백엔드로 메울 수 있음**

v2에는 `MoimList.tsx`와 `moim/social` → `admin/order` provider 연동이 **이미 존재**하나, 사이드바 메뉴는 주석 처리되어 있고 UI·필터는 디자인과 불일치한다. PoC는 이를 Rebuild하고, 디자인에 있으나 API에 없는 필터(날짜범위·결제유형)는 **소규모 백엔드 확장**으로 맞출 수 있다.

## **Business and Marketing Justification**

**마이그레이션 방식 사전 합의**: v1·v2·디자인 3-layer 공존 상황에서, «UI Rebuild + API 확장(필요 시)» 패턴이 통하는지 **2~3일** 안에 확인한다.

**AI 활용 생산성 실측**: 디자인 HTML + v1·백엔드 Swagger 참조 + Claude 협업으로 신청 목록 1화면(프론트·백엔드) 구현 리드타임을 숫자로 남긴다. 이후 v1 전체(~124 페이지) 공수 추정의 기초가 된다.

**Peer Review 후 착수**: 진행 전 문서 공유로 범위 creep(상세·엑셀·타 도메인)를 막고 PoC를 효율적으로 수행한다.

## **Risk Assessment & Mitigation**

- **위험 요인 1: PoC 대상 화면 혼동**

대응 방안: PoC는 **소셜링 신청(주문) 목록**만 대상이다. 체험단 모집(`TrialSocialingList`), 소셜링 모임 목록, 챌린지 신청 등은 Out. 메뉴·API·Resource를 문서에 고정한다.

- **위험 요인 2: 범위 creep (상세·엑셀까지 확장)**

대응 방안: **목록 1화면 + 목록용 API 확장**까지만 In. 신청 상세, 엑셀 다운, v1 타 메뉴는 PoC 제외. ※ 날짜범위·결제유형 **서버 필터**는 디자인 정합을 위해 **In**(백엔드 작업 허용).

- **위험 요인 3: 디자인 «결제 유형»과 API 필드 불일치**

대응 방안: M1에서 규칙을 확정한다 — `isTrial` → 체험단, `isEarlyBird` → 얼리버드, 그 외 → 일반 결제. `orderKind`(CARD/FREE 등)는 «결제 방법»으로 별도 취급. PoC에서 **응답 `payType` 필드 추가** 또는 **쿼리 `payType` 필터**를 백엔드에 넣어 프론트 매핑 중복·혼동을 줄인다.

- **위험 요인 4: v2 기존 코드와 디자인 이중 기준**

대응 방안: `MoimList`·`customDataProvider`는 **연동 패턴만 참고**하고, UI·컬럼·필터는 디자인 `#social-apply-list` 기준으로 Rebuild한다. `CustomMenu`의 «모임 신청 관리 > 소셜링 신청 관리» 메뉴 **주석 해제**로 운영 접근 가능하게 한다.

## **Resource and Scheduling Details**

**필요 자원 (Resources)**

- 인력: 프론트 1명 + 백엔드 1명(또는 풀스택 1~2명), Peer Review 참여자
- 레포: `munto-backoffice-v1`, `munto-backoffice-v2`, `munto-backend`
- 입력물: 디자인 HTML, v1 `all_list` / `all_list.js`, v2 `MoimList.tsx`
- 참조: `customDataProvider.ts`, `GetOrdersQueryInput`, `orderList.mapper.ts`

**추정 일정 (Scheduling): 총 2~3일 (PoC 본체만)**

| 단계 | 기간 | 내용 | 완료 기준 |
| --- | --- | --- | --- |
| M1 준비 | 0.5일 | v1·디자인·Swagger 필드 매핑, API 갭·확장 스펙(날짜·payType) 확정 | In/Out·API 변경안 확정 |
| M2 백엔드 | 0.5~1일 | `GET admin/order` 쿼리 확장(날짜범위·결제유형 필터), 단위/통합 테스트 | Swagger 반영·dev 호출 성공 |
| M3 프론트 | 0.5~1일 | 신청 목록 Rebuild, provider 파라미터 연동, 메뉴 노출 | 목록·필터·페이지네이션 동작 |
| M4 검증 | 0.5일 | v1 `all_list` 대비, 체험단 필터·표시, 리드타임 기록 | 성공 기준 통과 |

※ 본 OnePager는 **PoC 착수 전** Peer Review용. PoC 완료 후 **최종 OnePager** 별도 작성.

## **Technical Description**

**1) PoC 3-layer**

| Layer | 위치 | PoC에서의 역할 |
| --- | --- | --- |
| v1 | `purchase/all_list.html`, `all_list.js` | 동작·비교 **기준** |
| v2 | `MoimList.tsx`, `moim/social`, `CustomMenu`(주석 처리됨) | **Rebuild + 메뉴 활성화** |
| 디자인 | `#social-apply-list` | UI·필터 **기준** |
| 백엔드 | `order.admin.service`, `getOrders.input` | **API 확장** |

**2) v2 현황 (PoC 전)**

| 항목 | 상태 |
| --- | --- |
| `MoimList.tsx` | ✅ 있음 (구 UI, 디자인 미반영) |
| `moim/social` → `GET admin/order` | ✅ provider 연동됨 |
| `AdminApp` Resource 등록 | ✅ 있음 |
| 사이드바 메뉴 | ❌ `CustomMenu`에서 **주석 처리** |
| 결제 유형 컬럼·필터 | ❌ 미구현 |
| 날짜범위 필터 | ❌ API·UI 모두 없음 |

**3) API — 기존 + PoC 확장안**

| 항목 | 내용 |
| --- | --- |
| 목록 API | `GET admin/order` (기존) |
| v2 Resource | `moim/social` (provider 재사용·쿼리 파라미터 추가) |
| 페이지네이션 | `prev` / `next` (id 커서) |
| 응답 (기존) | `isTrial`, `isEarlyBird`, `orderKind`, `socialing`, `user` … |
| **확장 (PoC)** | `gteDate` / `lteDate` + `dateType`(ORDER_DATE | MEETING_DATE) |
| **확장 (PoC)** | `payType` 쿼리 필터 (GENERAL | EARLY_BIRD | TRIAL) 및/또는 응답 `payType` |

**4) 검증 범위**

| In Scope | Out of Scope |
| --- | --- |
| 목록 1화면 Rebuild (검색·모집상태·테이블·페이지네이션) | 신청 상세 (`#social-apply-detail`) |
| 결제 유형 **컬럼** + **서버 필터** | 엑셀 다운 |
| 날짜범위·주문일/모임일 **서버 필터** (백엔드 확장) | v1 타 메뉴, 타 도메인 |
| `GET admin/order` 확장 + v2 provider 연동 | 체험단 모집·모임 목록 화면 |
| v1 `all_list` 동일 조건 목록 비교 |  |
| `CustomMenu` 메뉴 노출 |  |

**5) M1 체크리스트**

- [ ]  실응답 ↔ 디자인 16컬럼 매핑표
- [ ]  결제 유형 규칙 (`isTrial` / `isEarlyBird` / `payType`) 확정
- [ ]  날짜필터 API 스펙 확정 (`gteDate`, `lteDate`, `dateType`)
- [ ]  체험단 주문 샘플 — 목록 노출·필터 동작 확인 계획
- [ ]  확장 불필요 항목 → «갭 목록» (본작업 이관)

**6) 구현 요약**

- **백엔드**: `GetOrdersQueryInput` + `getOrderList` where 조건 확장, Swagger·단위 테스트
- **프론트**: `SocialApplyList.tsx` (또는 `MoimList` 개편), 결제유형·날짜 필터 UI
- **provider**: `moim/social` 쿼리에 신규 파라미터 전달
- **메뉴**: `CustomMenu` «소셜링 신청 관리» 주석 해제

**7) PoC 성공 기준 (전부 충족 시 완료)**

- [ ]  디자인 기준 UI로 신청 목록 렌더
- [ ]  결제 유형 컬럼 정확 표시 (체험단·얼리버드·일반)
- [ ]  결제 유형·날짜범위 **서버 필터** 동작
- [ ]  v1 `all_list`와 동일 검색·모집상태 조건에서 목록 결과 실질 동일
- [ ]  `customDataProvider` → 확장된 `admin/order` 연동 확인
- [ ]  남은 API/디자인 갭 «갭 목록» 작성
- [ ]  프론트·백엔드 포함 리드타임(시간) 기록

**8) Peer Review 요청**

1. PoC 대상 «소셜링 신청 관리»가 적절한가
2. In/Out(백엔드 확장 포함)이 **2~3일**에 적절한가
3. API 확장안(날짜·payType)이 충분한가
4. 성공 기준이 PoC 통과 판단에 충분한가

**참고**

- V1 어드민 페이지: https://admin.munto.co.kr/purchase/all_list.html
- V2 어드민 페이지: https://admin-v2.munto.co.kr/#/socialing-event/list
- 할당된 지라 이슈: https://munto.atlassian.net/issues?jql=status%20in%20(%22In%20Progress%22%2C%20Open%2C%20Reopened)%20AND%20assignee%20%3D%20712020%3Af0ffc070-cac4-416f-b544-6095ee4164c2%20ORDER%20BY%20created%20DESC&selectedIssue=BACK-231