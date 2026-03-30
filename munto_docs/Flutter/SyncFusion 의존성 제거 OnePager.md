# SyncFusion 의존성 제거 OnePager

분류: SRS
작성자: 김범진
최근 수정일: 2026년 3월 9일 오후 2:02
최초 작성일: 2026년 3월 5일 오후 12:36
날짜: 2026년 3월 9일
문서 상태: Active
생성 일시: 2026년 3월 5일 오후 12:36
최종 편집자: 김범진

## Date

2026-03-05

## Submitter Info

김범진

## Project Description

`syncfusion_flutter_datepicker`, `syncfusion_flutter_calendar`, `syncfusion_flutter_sliders` 패키지 의존성을 제거하고, 문토 디자인 시스템(Muntorial) 기반의 자체 위젯으로 대체한다. Syncfusion 라이선스 비용 및 라이선스 리스크를 제거하는 것이 목표이다.

관련 문서: [SyncFusion 의존성 제거 요구사항](https://www.notion.so/SyncFusion-2eae2bc7639d80aca03fd3842b817838?pvs=21) 

---

## 대상 패키지 및 사용 화면

| 패키지 | 사용 화면 |
| --- | --- |
| syncfusion_flutter_datepicker | 필터(요일/날짜 선택), 모임 개설 날짜 선택 |
| syncfusion_flutter_calendar | 호스트 소셜링 일정 |
| syncfusion_flutter_sliders | 필터(나이 선택), 모임 개설(성비 설정) |

---

## Business and Marketing Justification

- **라이선스 비용 절감**: Syncfusion 상용 라이선스 비용 제거
- **라이선스 리스크 제거**: Community 라이선스 제약(매출 기준) 및 라이선스 정책 변경 리스크 회피
- **디자인 시스템 통일**: Muntorial 컬러·타이포그래피 기반 일관된 UI 확보
- **의존성 단순화**: 외부 상용 패키지 제거로 장기 유지보수성 향상

---

## Risk Assessment

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 자체 구현 기능 누락 | 기존 UX 저하 | 요구사항 문서 기준 POC 검증 후 본 개발 시 누락 항목 보완 |
| 앱별 마이그레이션 공수 | munto-mobile, dating-mobile 등 다수 화면 수정 | 단계별 교체(필터→모임 개설→호스트 일정 순) |

---

## Resource and Scheduling Details

TBD

---

## Technical Description

### 1. muntorial 패키지 내 구현 구조

```
muntorial/lib/src/widgets/
├── calendar/
│   ├── muntorial_calendar.dart      # MuntorialCalendar (weekdays, monthYearFormat)
│   ├── calendar_weekday_item.dart   # CalendarWeekdayItem
│   ├── calendar_marker.dart         # CalendarMarker
│   ├── calendar_holiday_item.dart  # CalendarHolidayItem (미래 확장용)
│   ├── weekday_picker.dart          # MuntorialWeekdayPicker
│   └── calendar.dart                # export
├── slider/
│   ├── single_slider.dart           # MuntorialSlider (tooltipBuilder)
│   ├── range_slider.dart            # MuntorialRangeSlider
│   └── slider.dart                  # export
```

### 관련 클래스

| 클래스 | 용도 |
| --- | --- |
| CalendarWeekdayItem | 요일 설정 (weekday, label, color) |
| CalendarMarker | 날짜 위 점 표시 (date, color) |
| CalendarHolidayItem | 공휴일 설정 (date, label, color) — 미래 확장용 |

---

### 2. 기술 표준 확정: Week Code (ISO 8601 / Dart)

### 표준

- **ISO 8601** (Dart/Flutter 기본값)을 사용합니다.
- **정의**: Monday = 1, Sunday = 7로 고정합니다.

### 이유

- Flutter `DateTime.weekday`와의 연산 일관성을 유지하여 변환 로직에 따른 버그를 방지하기 위함입니다.
- 화면 노출 순서(일요일 시작 등)는 **UI 레이어에서 리스트 인덱스로만** 처리합니다.

### 적용

- `CalendarWeekdayItem.weekday`는 `DateTime.weekday` 값(1~7)을 그대로 사용합니다.
- 일요일 시작 캘린더: `weekdays = [일(7), 월(1), 화(2), ..., 토(6)]` 순서로 주입
- 월요일 시작 캘린더: `weekdays = [월(1), 화(2), ..., 일(7)]` 순서로 주입

---

### 3. 위젯 기술 명세 (Technical Spec)

### 3.1 MuntorialCalendar

- 외부 패키지를 사용하지 않고, PageView 기반으로 자체 구현한다.

| 구분 | 항목 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| **Input** | weekdays | List<CalendarWeekdayItem> | O | 7개. 순서 = 표시 순서 = 그리드 첫 열 |
|  | selectionMode | CalendarSelectionMode | - | single / range (기본: single) |
|  | initialDate | DateTime | - | 초기 표시/선택 월 |
|  | selectedDate | DateTime | - | 단일 모드: 선택된 날짜 |
|  | selectedDateRange | DateTimeRange | - | 구간 모드: 선택된 구간 |
|  | selectableRange | DateTimeRange | - | minDate~maxDate (선택 가능 범위) |
|  | markers | List<CalendarMarker> | - | 일정 있는 날 마커(점) 표시 |
|  | holidays | List<CalendarHolidayItem> | - | 공휴일. 미래 확장용 데이터 주입 구조 |
|  | monthYearFormat | String Function(DateTime) | - | 헤더 "2026년 1월" 포맷 |
|  | maxRangeDays | int | - | 구간 모드 최대 일수 (기본: 7) |
|  | rangeExceededMessage | String | - | 구간 초과 시 다이얼로그 메시지 |
|  | headerAlignment | MainAxisAlignment | - | 헤더 정렬 (기본: center) |
| **Output** | onDateSelected | ValueChanged<DateTime?> | - | 단일 모드: 날짜 선택 시 |
|  | onDateRangeSelected | ValueChanged<DateTimeRange?> | - | 구간 모드: 구간 선택 시 |
|  | onMonthChanged | ValueChanged<DateTime> | - | 표시 월 변경 시 (PageView 스와이프/헤더 버튼) |
- 주 시작일 (Week Start): weekdays 리스트 순서로 앱에서 결정
    - 일요일 시작: [일,월,...,토]
    - 월요일 시작: [월,화,...,일]
- 주말 색상: `CalendarWeekdayItem.color`로 요일별 주입
- 월/년 헤더 포맷: `DateFormat` 파라미터로 주입. 앱에서 `DateFormat.yMMMM(locale)` 등 사용

### 3.2 MuntorialWeekdayPicker

| 구분 | 항목 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| **Input** | weekdays | List<CalendarWeekdayItem> | O | 7개 칩. 라벨·색상·순서 주입 |
|  | selectedWeekdays | List<int> | - | 선택된 요일 (DateTime.weekday, 1~7) |
| **Output** | onWeekdaySelected | ValueChanged<int> | - | 요일 선택 시 (토글) |
- 일~토 7개 칩,  선택(토글)
- `weekdays: List<CalendarWeekdayItem>`로 라벨·색상·순서 주입

### 3.3 MuntorialSlider

| 구분 | 항목 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| **Input** | value | double | O | 현재 값 |
|  | range | RangeValues | O | 최소 값+최대 값 |
|  | divisions | int | - | 고정 단계 수 (null이면 연속) |
|  | step | double | - | 단위 반올림 (예: 0.1) |
|  | tooltipBuilder | String Function(double) | - | thumb 상단 말풍선 (성비 "2:8" 등) |
|  | backgroundColor | Color | - | 비활성 트랙 색상 |
|  | sliderColor | Color | - | 활성 트랙 및 썸 색상 |
| **Output** | onChanged | ValueChanged<double> | - | 값 변경 시 |
- 외부 패키지를 사용하지 않고, Flutter 기본 Slider + SliderTheme을 이용한다.
- `tooltipBuilder`로 thumb 상단 말풍선 표시(성비 "2:8" 등)

### 3.4 MuntorialRangeSlider

| 구분 | 항목 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| **Input** | values | RangeValues | O | 현재 선택 범위 (start, end) |
|  | range | RangeValues | O | 최소 값+최대 값 |
|  | divisions | int | - | 고정 단계 수 (null이면 연속) |
|  | step | double | - | 단위 반올림 (예: 0.1) |
|  | backgroundColor | Color | - | 비활성 트랙 색상 |
|  | sliderColor | Color | - | 활성 트랙 및 썸 색상 |
| **Output** | onChanged | ValueChanged<RangeValues> | - | 값 변경 시 |

### 3.5 공통 클래스

### CalendarWeekdayItem

```dart
class CalendarWeekdayItem {
  const CalendarWeekdayItem({
    required this.weekday,
    required this.label,
    this.color,
  });

  /// DateTime.weekday (ISO 8601: 1=월, 2=화, ..., 7=일)
  final int weekday;

  /// 요일 라벨 (앱에서 formatWeekday 등으로 주입)
  final String label;

  /// 요일별 표시 색상. null이면 기본. 주말 색상(일본 토요일 파랑 등)에 사용
  final Color? color;
}
```

### CalendarHolidayItem

```
class CalendarHolidayItem {
  const CalendarHolidayItem({
    required this.date,
    required this.label,
    this.color,
  });

  /// 공휴일 날짜 (시간 무시, dateOnly)
  final DateTime date;

  /// 공휴일 라벨 (예: "설날", "Christmas")
  final String label;

  /// 공휴일 표시 색상. null이면 기본
  final Color? color;
}
```

### CalendarMarker

```
class CalendarMarker {
  const CalendarMarker({
    required this.date,
    this.color,
  });

  /// 마커를 표시할 날짜
  final DateTime date;

  /// 마커 색상. null이면 기본값(primary/neutral20) 사용
  final Color? color;
}
```

---

## 4. 국제화(i18n) 설계

- **PO 파일**: munto-mobile, dating-mobile 등 앱 패키지에 존재
- **muntorial**: i18n 의존성 없음. 라벨·포맷은 외부 주입

---

## 5. 성능 및 안정성

### 5.1 PageView 최적화

| **구분** | **내용** |
| --- | --- |
| **초기 페이지** | `PageController(initialPage: N)`로 현재 월/년 기준 페이지 지정 |
| **성능 옵션** | `allowImplicitScrolling`, `viewportFraction` 등 PageView 옵션 적용 |
| **메모리 누수 방지** | `PageController.dispose()` 호출 보장
`PageView.builder` 사용 시 `itemBuilder` 내 불필요한 위젯 생성 최소화 |
| **렌더링 최적화** | `cacheExtent`로 미리 로드할 페이지 수 제한 (권장: 1~2페이지)
날짜 셀(`_CalendarCell`) 또는 행 단위로 `RepaintBoundary` 적용
선택/호버 시 해당 영역만 repaint
`_CalendarWeekdayRow`, `_CalendarDayCircle` 등 변경 없는 위젯에 `const` 적용
rebuild 시 인스턴스 재생성 감소 |
| **마커 조회 최적화** | `_getMarkersForDate`가 42개 셀마다 `where` 호출
월별/날짜별 캐시(Map)로 반복 필터링 감소 |
| **날짜 계산 캐싱** | `_effectiveMinDate`, `_effectiveMaxDate` getter가 `DateTime.now()` 포함 
`didUpdateWidget` 등에서 필요 시에만 재계산 |

### 5.2 Unit Test

- 날짜 계산 로직 테스트 케이스 작성 계획
    - 윤년: 2024년 2월 29일, 2023년 2월 28일 등
    - 월말-월초: 1/31 → 2/1, 3/31 → 4/1 등 월 전환
    - 영문 텍스트처럼 긴 월 명칭 노출 시 UI 확인
    - 주 시작일(CalendarWeekdayItem 순서)에 따른 그리드 첫 주 빈 칸 수
    - `minDate`/`maxDate` 경계 날짜 선택 가능 여부
    - 구간 선택 시 `maxRangeDays` 초과 방지 로직
    - WeekdayItem.textColor가 언어 환경에 따라 변경되는지 확인

---

## 변경 이력

| 일자 | 내용 |
| --- | --- |
| 2026-03-05 | 최초 작성 |
| 2026-03-09 | 피드백 반영: Week Code 표준, API Spec, Holiday 확장성, 성능/테스트, 클래스 네이밍 통일 (CalendarWeekdayItem, CalendarHolidayItem) |

※ 상세 API Spec 테이블(MuntorialCalendar/WeekdayPicker/Slider/RangeSlider Input·Output 전체)은 muntorial/docs/syncfusion-onepager-feedback-update.md 참조