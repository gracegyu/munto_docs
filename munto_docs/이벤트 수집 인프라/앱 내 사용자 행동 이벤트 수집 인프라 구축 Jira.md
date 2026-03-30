# 앱 내 사용자 행동 이벤트 수집 인프라 구축 및 홈 배너 지표 수집 구현

## **배경**

마케팅 의사결정(광고 단가 협의, 외부 대행사 대응)에 배너 성과 지표가 필수적으로 필요하지만, 현재 홈 배너의 노출 수·클릭 수 데이터가 전혀 수집되지 않고 있음이 확인됨.

이를 계기로, 배너에 국한하지 않고 **앱 내 모든 주요 사용자 행동 이벤트를 우리 서버(Munto Backend)로 직접 전송할 수 있는 이벤트 수집 인프라**를 구축하고자 함.

기존 Firebase Analytics, Facebook Events 등 외부 툴에만 의존하는 구조에서 벗어나, `munto-mobile-core`의 Logger 시스템에 **MuntoOutput(자사 서버 전송 Output)**을 추가하여 클릭, 노출, 화면 진입 등 다양한 이벤트를 자사 DB에서도 직접 관리할 수 있도록 한다.

## **현재 문제점**

- `AppBanner` 테이블에 노출 수·클릭 수 컬럼 없음
- 배너 관련 이벤트를 기록하는 별도 테이블 없음
- 그라파나 배너 조회수 대시보드는 기획전 ID 기반으로만 필터링 가능하여, ID 없이 URL로 연결된 배너(취향인연 등)는 조회 불가
- 앱 이벤트 데이터가 Firebase/Facebook 등 외부 툴에만 저장되어, 자사 서버에서 직접 분석·조회가 불가능한 구조

## **개선 방향**

### **1단계: Logger에 MuntoOutput 추가 (munto-mobile-core)**

`LogOutputInterface`를 구현하는 `MuntoOutput`을 신규 추가합니다.

- `writeEvent(LogEvent event)` 호출 시 Munto 백엔드 API로 이벤트를 전송
- 기존 `FirebaseAnalyticsOutput`, `FacebookEventsOutput` 등과 동일한 방식으로 Logger에 등록
- 이벤트명, 파라미터, 사용자 ID, 세션 ID, 발생 시각 등 메타데이터를 함께 전송
- 배치 전송 또는 즉시 전송 방식 선택 가능하도록 설계

```
// 사용 예시LoggerModule.addOutputs([MuntoOutput(apiClient: muntoApiClient),]);// 배너 노출 이벤트logger.logEvent(MuntoEventModel.viewBanner(  bannerId: banner.id,  bannerIndex: index,));// 배너 클릭 이벤트logger.logEvent(MuntoEventModel.clickBanner(  bannerId: banner.id,  bannerIndex: index,  bannerUrl: banner.url,));
```

### **2단계: 백엔드 이벤트 수신 API 구현 (munto-backend)**

- 앱에서 전송한 이벤트를 수신하는 API 엔드포인트 구현
- 이벤트 데이터를 DB에 저장 (이벤트명, 파라미터, 사용자 ID, 발생 시각 등)
- 향후 그라파나 대시보드 연동 가능하도록 설계

### **3단계: 홈 배너 이벤트 적용 (munto-mobile)**

- 홈 배너 노출 시 `viewBanner` 이벤트 전송
- 홈 배너 클릭 시 `clickBanner` 이벤트 전송
- 기존 Firebase 이벤트와 병렬로 동작 (MuntoOutput만 추가)

## **필요 데이터 (배너 이벤트 기준)**

- 배너 ID
- 배너 노출 위치 (홈 기준 몇 번째 배너인지, 0-based index)
- 이벤트 종류 (노출/클릭)
- 사용자 ID
- 세션 ID
- 수집 일시
- 배너 URL (클릭 이벤트 시)

## **기대효과**

- 배너, 탭, 화면 진입 등 **앱 내 모든 주요 행동 이벤트를 자사 서버에서 직접 분석** 가능
- 마케팅팀이 배너별 성과 지표를 직접 조회 가능
- 외부 분석 툴(Firebase, Amplitude 등)에 대한 의존도 낮추고 데이터 주권 확보
- 향후 배너 A/B 테스트, 개인화 추천 등 데이터 기반 운영 확장 가능
- Logger의 Output 구조를 활용하므로 기존 이벤트 추가 비용 최소화

## **작업 범위**

- [ ]  `munto-mobile-core`: `MuntoOutput` 구현 (`LogOutputInterface` 기반)
- [ ]  `munto-backend`: 이벤트 수신 API 및 DB 저장 구현
- [ ]  `munto-mobile`: 홈 배너 노출/클릭 이벤트 적용
- [ ]  `munto-mobile`: `MuntoEventModel`에 배너 관련 이벤트 추가