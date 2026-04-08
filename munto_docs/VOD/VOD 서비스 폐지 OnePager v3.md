# VOD 서비스 폐지 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 4월 6일 오전 11:22
최근 수정일: 2026년 4월 7일 오후 12:33
문서 상태: Active
생성 일시: 2026년 4월 6일 오전 11:22
최종 편집자: 김범진

create by: 김범진

Project Name : VOD 서비스 폐지

Date : 2026-04-06

Submitter Info : 김범진

Project Description : 

[VOD 폐지 시나리오](https://www.notion.so/VOD-32fe2bc7639d8031abe2e29b2186f9ab?pvs=21) 해당 문서에 따라, 문토 앱/웹 내 VOD 서비스의 신규 판매를 종료하고 관련 기능 및 노출을 전면 롤백합니다. 단, 기존에 VOD를 구매한 회원은 마이페이지에서 기존 구매 콘텐츠를 계속 시청할 수 있도록 시청 권한을 유지합니다.

Business and Marketing Justification :

- 경영상의 판단으로 VOD 신규 판매를 종료하여 운영 비용 및 리소스를 절감합니다.
- 기존 구매자의 시청 권한을 유지함으로써 법적 의무(현행 약관 기준 제30조 제1항)를 이행하고 사용자 신뢰를 보호합니다.
- 신규 결제 차단 → 공지 → 화면 롤백 → 마이페이지 시청 종료의 단계적 진행으로 CS 리스크를 최소화합니다.
- 거래 기록은 전자상거래법 제6조에 따라 5년간 보존하여 법적 분쟁 대비 증빙을 확보합니다.
- VOD 폐지 후 마케팅·개발 리소스를 핵심 소셜링 기능에 집중할 수 있습니다.

Risk Assessment :

| 리스크 | 발생 가능성 | 영향도 | 대응 방안 |
| --- | --- | --- | --- |
| 기존 구매자 시청 차단 오류 | 중 | 높음 | 마이페이지 시청 기능 별도 QA, 회원 ID 기반 권한 관리 로직 세분화 |
| 신규 결제 차단 배포 지연 | 중 | 높음 | 4/13(월)~4/15(수) 배포 완료 목표, 개발 일정 사전 조율 |
| 공지 누락으로 인한 법적 분쟁 | 하 | 높음 | 약관 제10조 제4항 준수, 종료 30일 전 앱/웹 공지 + 유료 구매자 이메일/PUSH 개별 통지 |
| 호스트 미정산 잔액 처리 지연 | 상 | 중간 | 서비스 종료 전 미정산 잔액 전액 정산 완료 |
| 마이페이지 시청 기능 향후 종료 시 재공지 의무 발생 | 상 | 중간 | 최초 공지 시 마이페이지 유지 기간을 명확히 기재 (ex. "YYYY년 XX월까지 시청 가능") |
| 거래 기록 미보존으로 인한 공정위 조사 위험 | 하 | 높음 | 구매·결제 기록 DB 5년간 보존, 세금계산서 5년간 보존 |
| 약관 개정 지연 | 중 | 낮음 | 신규 결제 차단 배포 일정 연기, 배포 일정 사전 조율 |

Resource and Scheduling Details :

- 필요 인력: 백엔드 개발자 1명, 프론트엔드(앱/웹) 개발자 각 1명, QA 1명, CS 담당자, 마케팅 담당자
- 제휴 호스트 계약 종료(계약서 전수 확인, 법무 검토, 개별 합의, 위약금 확인 등)는 본 One Pager 범위 밖으로, 별도 프로세스로 진행합니다.
- 마일스톤:

| 단계 | 항목 | 주요 작업 | 예정일 |
| --- | --- | --- | --- |
| 0 | 내부 검토 및 의사결정 | 폐지 일자 확정, 마이페이지 유지 로직 기술 검토, 실행 계획 수립 | ~4/8(수) |
| 0-1 | 약관 개정 | VOD 관련 약관 조항 개정 작업 완료 (2단계 공지 전 선행 필수) | ~4/15(수) |
| 0-2 | CS 환불 운영 체계 구축 | 환불 대응 매뉴얼 준비, 전액/비례 환불 처리 기준 수립 (전자상거래법 제17조·제18조) | ~4/15(수) |
| 1 | 신규 결제 차단 배포 | 결제 모듈 차단 | 4/15(수) |
| 2 | 서비스 종료 공지 | 호스트 선공지 후 전체 회원 공지, 이메일/PUSH 개별 통지, 약관 개정 고지, 마이페이지 시청 종료 예정일 안내 포함 | 4/16(목) |
| 3 | 신규 판매 중단 | VOD 상세/리스트 페이지 내 '구매하기' 버튼 비활성화 | 4/16(목)~5/16(토) |
| 4 | VOD 관련 페이지·기능 제거 | 앱/웹 탐색 페이지 제거, 어드민 기능 비활성화, 검색 결과 제외 | 5/18(월)~ |
| 5 | 마이페이지 VOD 시청 중단 | 마이페이지 내 VOD 시청 불가. VOD 시청 기간이 구매후 1년이므로 신규 결제 차단 이후 1년 뒤에 시청 중단 진행 | 2027년 5월~ |
| 6 | 사후 관리 및 기록 보존 | CS 대응, 결제·이용 내역 DB 보존 | ~2031년 5월 |

---

Technical Description :

- 기술 스택: NestJS (API 서버), Next.js (웹 프론트엔드), Flutter (모바일 앱), PostgreSQL (DB)

### 1. 차단 대상 API 목록

VOD 신규 구매 흐름에서 호출되는 API 전체를 `410 Gone`으로 차단합니다. (1단계)
취소/환불 API는 기존 구매자 보호를 위해 5단계 이후까지 유지합니다.

| 버전 | 메서드 | 엔드포인트 | 조치 | 비고 |
| --- | --- | --- | --- | --- |
| v2 | POST | `/v2/order/course/:courseId/validate` | 410 Gone | 주문 유효성 검증 |
| v2 | POST | `/v2/order/course/:courseId` | 410 Gone | 주문 생성 |
| v3 | GET | `/v3/order/course/:courseId/availability` | 410 Gone | 주문 가능 여부 조회 |
| v3 | POST | `/v3/order/course/:courseId` | 410 Gone | 주문 생성 |
| v3 | POST | `/v3/order/course/confirm` | 410 Gone | 결제 확정 |
| v1 | GET | `/v1/course-enrollment/cancel/validate` | **유지** | 취소 검증 (기존 구매자용) |
| v1 | PATCH | `/v1/course-enrollment/cancel` | **유지** | 취소 처리 (기존 구매자용) |

응답 예시 (차단된 엔드포인트):

```json
HTTP/1.1 410 Gone
{
  "statusCode": 410,
  "message": "VOD 서비스가 종료되어 더 이상 구매할 수 없습니다."
}
```

---

### 2. Course 상태 전이 방식

현재 `CourseStatus` enum: `DRAFT → REVIEWING → APPROVED → ONSALE → PAUSED → CLOSED`

| 단계 | CourseStatus | 이유 |
| --- | --- | --- |
| 1단계 | `ONSALE` 유지 | VOD 탐색/리스트 API가 `status IN ('ONSALE', 'APPROVED')` 조건으로 필터링하므로, 이 시점에 `CLOSED`로 변경하면 탐색 화면에서 VOD가 즉시 사라짐. 탐색 화면 제거는 4단계 작업 범위이므로 1단계에서는 API 레이어에서만 구매를 차단함 |
| 4단계 | `CLOSED` 전환 | 탐색 페이지·메뉴·검색 결과 제거와 함께 처리. 코드 확인 결과, 마이페이지 시청 로직(`getUserEnrollments`, `getLectureUrl`)은 `CourseEnrollment` 기반으로 동작하며 `CourseStatus`를 체크하지 않아 기존 구매자 시청에 영향 없음 |

---

### 3. 마이페이지 시청 처리 방침

기존 구매자의 시청 권한은 `CourseEnrollment` 테이블의 레코드 존재 여부로 판단합니다.

```
CourseEnrollment {
  userId          // 구매자 ID
  courseId        // 구매한 VOD ID
  status          // REQUEST | APPROVE | REJECT | CANCEL | DELETE
  deletedAt       // soft delete
}
```

- 시청 허용 조건: `status = APPROVE` AND `deletedAt IS NULL`
- 시청 불가 조건: `status IN (CANCEL, DELETE)` 또는 `deletedAt IS NOT NULL`

**단계별 마이페이지 시청 처리 방침:**

| 단계 | 마이페이지 시청 | 비고 |
| --- | --- | --- |
| 1단계 (4/15) | 유지 | 신규 구매 차단만 처리, 기존 구매자 시청 정상 동작 |
| 2단계 (4/16) | 유지 | 공지 발송 시점. 시청 기능 변경 없음 |
| 3단계 (4/16~5/16) | 유지 | '구매하기' 버튼 비활성화 노출 기간. 시청 기능 변경 없음 |
| 4단계 (5/18~) | 유지 | VOD 탐색 화면 제거 및 `CourseStatus.CLOSED` 전환. 마이페이지 시청은 계속 허용 |
| 5단계 (27/5/18~) | **종료** | 별도 공지 후 결정. 최초 공지 시 종료 예정 시점 명시 필요 (약관 제10조 제4항) |

**클라이언트별 권한 처리 방식 (1~4단계 공통):**

| 플랫폼 | 처리 방식 |
| --- | --- |
| 웹 (Next.js) | `VodPurchaseButton` 컴포넌트에서 `isPurchased` prop 조건부 렌더링. 구매자는 "VOD 내역" 버튼 활성화, 비구매자는 "판매가 종료되었습니다" 버튼 비활성화 표시 |
| 앱 (Flutter) | `vod_detail_screen.dart`의 `_handlePurchaseMoim()` 에서 WebView bridge `isPurchase` 플래그로 분기. `isPurchase = true`이면 마이페이지 VOD 목록(`GO_TO_MY_COURSE_LIST`)으로 이동, `false`이면 아무 동작 없음 |

---

### 4. 화면 제거 범위

### 1단계 (4/15): 신규 구매 진입 차단

| 플랫폼 | 대상 | 조치 |
| --- | --- | --- |
| 웹 | `pages/apply/vod/index.tsx` | `getServerSideProps`에서 `{ notFound: true }` 반환 → 404 |
| 웹 | `pages/apply/vod/payment/index.tsx` | 동일하게 404 처리 |
| 웹 | `pages/apply/vod/done/index.tsx` | 동일하게 404 처리 |
| 웹 | `pages/apply/vod/failure/index.tsx` | 동일하게 404 처리 |
| 웹 | `lib/view/moim/vod/VodPurchaseButton.tsx` | 비구매자: "판매가 종료되었습니다" 버튼 비활성화 / 구매자·호스트: "VOD 내역" 버튼 유지 |
| 웹 | `lib/viewmodel/mypage/order/VODApplyViewModel.ts` | 파일 삭제 |
| 웹 | `lib/repository/OrderRepository.ts` | `postValidateVOD`, `postApplyVOD` 메서드 제거. 취소 메서드(`getValidateCancelVOD`, `postCancelVOD`)는 유지 |
| 앱 | `lib/screens/vod_apply/` (폴더 전체) | 삭제 (`vod_apply_screen.dart`, `vod_apply_viewmodel.dart`, `complete_page.dart`) |
| 앱 | `lib/screens/vod_detail/vod_detail_screen.dart` | `_handlePurchaseMoim()`에서 신규 구매 분기 제거, 기존 구매자 마이페이지 이동만 유지 |
| 앱 | `lib/ui/routes/route_constants.dart` | `vodApplyRoute`, `vodApplyRouteWithId`, `vodApply()`, `vodMain` 상수 제거. `vodCancel`은 유지 |
| 앱 | `lib/ui/routes/routes/vod_routes.dart` | `vodApplyRouteWithId`, `vodMain` GoRoute 제거. `vodCancel` 라우트는 유지 (기존 구매자 환불용) |
| 앱 | `lib/repositories/serverside_order_repository.dart` | `getCourseAvailability`, `createCourseOrder`, `confirmCourseOrder` 메서드 제거 |

### 4단계 (5/18~): 탐색/진입 전체 제거 (추후 별도 작업)

- 앱/웹 홈 탭 내 VOD 메뉴·배너 제거
- 탐색 페이지 VOD 카테고리 제거
- 검색 결과에서 VOD 콘텐츠 제외
- 어드민 VOD 관리 기능 비활성화
- `CourseStatus.CLOSED` 일괄 전환 (기존 구매자 시청 권한 영향 없음)

### 5단계 (TBD): 마이페이지 VOD 시청 중단 (추후 별도 작업)

- 마이페이지 내 VOD 시청 기능 제거
- 시청 플레이어 API 비활성화
- 공지 및 약관 개정 선행 필요 (약관 제10조 제4항)

---

### 5. 환불 처리

> *"기존 구매자가 약속된 기간까지 계속 이용할 수 있도록 조치한다면, 이는 서비스 '중단'이 아닌 신규 판매의 '종료'에 해당함. 구매자가 기대했던 '명시된 기간 내 시청 권한'이라는 가치가 훼손되지 않으므로, **별도의 환불 의무는 발생하지 않음.**"*
> 

환불 프로세스는 기존과 동일합니다. VOD 판매 중단에 따른 환불 처리 방식 변경은 없습니다.

- 취소/환불 API(`GET /v1/course-enrollment/cancel/validate`, `PATCH /v1/course-enrollment/cancel`)는 5단계(마이페이지 시청 중단) 이후까지 유지합니다.
- 환불 유형(전액/비례) 및 처리 기준은 기존 CS 운영 정책을 그대로 따릅니다.

---

### 6. 캐시 처리

| 단계 | 캐시 처리 |
| --- | --- |
| 1단계 | Redis 캐시 무효화 불필요. Next.js SSR 페이지(`pages/apply/vod/*`)는 `getServerSideProps` 기반이므로 CDN/브라우저 캐시 영향 없이 즉시 404 반영 |
| 4단계 | VOD 리스트 API 캐시 존재 여부 사전 확인 후 필요 시 무효화 처리 |

---

### 7. 인프라 변경 계획

### DB / 애플리케이션

| 단계 | 항목 | 내용 |
| --- | --- | --- |
| 1단계 | DB 스키마 변경 | 없음 |
| 1단계 | 마이그레이션 | 없음 |
| 1단계 | 환경변수 추가 | 없음 |
| 1단계 | 외부 서비스 연동 변경 | 없음 (Bootpay 연동은 소셜링·클럽·챌린지 결제에서 계속 사용됨) |
| 전 단계 공통 | 데이터 보존 | 구매·결제 기록 물리 삭제 없음. DB 레코드 유지 (전자상거래법 제6조, 5년 보존 의무) |
| 4단계 이후 | CourseStatus 전환 | `ONSALE` → `CLOSED` 일괄 업데이트 스크립트 필요. 마이그레이션 아닌 데이터 패치 스크립트로 처리 |
| 5단계 이후 | 시청 관련 데이터 처리 | 대규모 VOD 데이터 soft-delete 처리 시 별도 마이그레이션 스크립트 필요. 실행 전 영향 범위 재검토 필요 |

### AWS 인프라

| AWS 서비스 | 용도 | 해제 가능 시점 | 비고 |
| --- | --- | --- | --- |
| S3 (영상 원본) | VOD 원본 파일 저장 | 5단계 이후 | 마이페이지 시청 기능 유지 기간 동안 비용 계속 발생 |
| CloudFront (스트리밍 CDN) | 영상 스트리밍 배포 | 5단계 이후 | 마이페이지 시청 기능 유지 기간 동안 비용 계속 발생 |
| MediaConvert (인코딩) | VOD 업로드 인코딩 처리 | 4단계 이후 | 1단계 이후 신규 업로드가 없으므로 4단계(페이지·기능 전면 제거) 시점에 함께 해제 |
| Lambda (인코딩 트리거) | MediaConvert 트리거 | 4단계 이후 | 동일하게 4단계 시점에 함께 해제 |
- **1~4단계**: 모든 AWS 인프라 유지. 기존 구매자 시청을 위해 S3·CloudFront는 반드시 유지해야 합니다.
- **즉시 해제 가능한 항목**: 없음.

---

### 8. ERD

변경 없음. 기존 테이블 유지.

```
Course (CourseStatus: DRAFT|REVIEWING|APPROVED|ONSALE|PAUSED|CLOSED)
  └── CourseEnrollment (CourseEnrollmentStatus: REQUEST|APPROVE|REJECT|CANCEL|DELETE)
        └── Order
```

마이페이지 시청 권한 판단 기준: `CourseEnrollment.status = APPROVE AND deletedAt IS NULL`

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.04.06 | 김범진 | 최초 작성 |
| v1.0.1 | 26.04.07 | 김범진 | Technical Description 수정 |
| v1.0.2 | 26.04.07 | 김범진 | 약관 개정 기한 추가
마일스톤 세분화
환불 처리 항목 추가
AWS 인프라 변경 계획 추가 |

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