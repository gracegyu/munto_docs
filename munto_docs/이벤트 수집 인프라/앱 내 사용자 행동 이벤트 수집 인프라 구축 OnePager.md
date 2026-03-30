# 앱 내 사용자 행동 이벤트 수집 인프라 구축 OnePager

분류: SRS
작성자: 김범진
최초 작성일: 2026년 3월 26일 오전 10:36
최근 수정일: 2026년 3월 26일 오전 10:54
문서 상태: Active
생성 일시: 2026년 3월 26일 오전 10:36
최종 편집자: 김범진

**Project Name:** 앱 내 사용자 행동 이벤트 수집 인프라 구축 및 홈 배너 지표 수집 구현

**Date:** 2026-03-26

**Submitter Info:** 김범진 / [beomjin.kim@munto.kr](mailto:beomjin.kim@munto.kr) / Munto App(Flutter) — [APPF-785](https://munto.atlassian.net/browse/APPF-785)

---

## Project Description

앱 내 주요 사용자 행동(배너 노출·클릭, 화면 진입·이탈 등)을 자사 서버로 직접 수집하는 이벤트 파이프라인을 구축한다. 현재는 Firebase Analytics, Facebook Events 등 외부 툴에만 이벤트가 저장되어, 자사 서버에서 직접 데이터를 조회하거나 분석하는 것이 불가능하다.

`munto-mobile-core`의 Logger 시스템(`LogOutputInterface`)에 `MuntoOutput`을 추가하여, 기존 외부 Output과 병렬로 동작하면서 자사 백엔드로도 이벤트를 전송할 수 있도록 한다. 홈 배너 노출·클릭 이벤트를 첫 번째 적용 대상으로 삼아 검증한 뒤, 이후 다른 이벤트로 점진적으로 확장한다.

---

## Business and Marketing Justification

- 외부 광고 대행사 대응 및 광고 단가 협의 시, 배너별 노출·클릭 성과 지표를 자사가 직접 제시할 수 있어야 함. 현재는 해당 데이터를 제공할 수단이 없음
- Firebase 등 외부 툴에 대한 데이터 의존도를 줄이고, 자사 DB에서 원하는 형태로 분석·집계할 수 있는 데이터 주권 확보
- 마케팅팀이 배너별 성과를 그라파나 대시보드에서 직접 조회 가능하게 되어, 의사결정 속도 향상
- 향후 배너 A/B 테스트, 개인화 추천 등 데이터 기반 운영으로 확장 가능한 기반 마련
- Logger의 Output 구조를 재사용하므로, 신규 이벤트 추가 비용이 매우 낮음

---

## Risk Assessment

| 리스크 | 영향도 | 대응 방안 |
| --- | --- | --- |
| 이벤트 전송 실패 시 앱 크래시 | 높음 | `_safeWriteEvent` 패턴 유지 — 전송 실패는 무시하고 앱에 영향 없도록 처리 |
| 대량 이벤트로 인한 서버 부하 | 중간 | 배치 전송 방식 적용 (즉시 전송 대신 묶어서 전송) |
| JSONB 파라미터의 타입 불일치 | 낮음 | 이벤트 모델(`MuntoEventModel`)에서 타입을 명시적으로 정의하여 방지 |
| 개인정보 포함 이벤트 수집 | 중간 | 수집 파라미터를 이벤트 모델에서 명시적으로 관리 |
| 레거시 이벤트 누락 | 낮음 | 기존 Firebase 이벤트는 그대로 유지되므로 데이터 손실 없음 |

---

## Resource and Scheduling Details

| 작업 | 대상 레포 | 예상 공수 |
| --- | --- | --- |
| `MuntoOutput` 구현 | munto-mobile | 1일 |
| 이벤트 수신 API 및 DB 저장 구현 | munto-backend | 1~2일 |
| 홈 배너 이벤트 적용 + `MuntoEventModel` 추가 | munto-mobile | 0.5일 |
| 메타베이스 대시보드 구성 | - | 0.5일 |
| **합계** |  | **3~4일** |

---

## Technical Description

### 아키텍처 개요

```
[앱] logger.logEvent(MuntoEventModel.viewBanner(...))
       ↓
[Logger] 등록된 Output에 선택적으로 병렬 전송
       ├─ FirebaseAnalyticsOutput  → Firebase
       ├─ FacebookEventsOutput     → Facebook
       └─ MuntoOutput (신규)      → Munto Backend API
                                         ↓
                                   app_events 테이블 (PostgreSQL)
                                         ↓
                                   Materialized View (집계)
                                         ↓
                                   메타베이스 대시보드
```

---

### DB 설계 방식 비교 및 선택 근거

이벤트 종류마다 파라미터 구조가 다르기 때문에(배너 이벤트는 `banner_id`, `banner_index`를, 페이지 이탈 이벤트는 `page_name`, `duration_ms`를 가짐), 저장 방식 선택이 핵심 설계 결정이었다.

| 기준 | JSON 단일 테이블 | 이벤트별 전용 테이블 | 혼합 구조 (선택) |
| --- | --- | --- | --- |
| 이벤트 추가 비용 | 낮음 | 높음 (테이블·API 추가) | 낮음 |
| 쿼리 편의성 | 낮음 (JSONB 문법 필요) | 높음 | 중간 (View로 보완) |
| 확장성 | 높음 | 낮음 | 높음 |
| Firebase 방식과의 일관성 | 동일 | 다름 | 동일 |

**혼합 구조를 선택한 이유:**

Firebase/Amplitude가 채택한 방식과 동일하게, 원본 이벤트는 단일 테이블에 JSONB로 저장하여 이벤트 추가 비용을 낮게 유지한다. 단, 메타베이스 대시보드 연동이나 반복 조회가 필요한 이벤트(배너 성과 등)에 대해서는 Materialized View를 별도로 구성하여 쿼리 편의성을 보완한다. 이 방식은 초기 구현 비용과 장기 확장성을 동시에 만족시키며, 나중에 특정 이벤트가 대용량 조회 대상이 될 경우 해당 시점에 전용 집계 테이블로 마이그레이션하면 된다.

---

### API 설계

```
POST /v1/events
Authorization: Bearer {token}
```

```json
{
  "events": [
    {
      "name": "view_banner",
      "user_id": 12345,
      "session_id": "abc-123",
      "source_route": "/home",
      "source_widget": "home_banner",
      "target_route": null,
      "prev_route": "/home/recommend",
      "parameters": { "banner_id": 1, "banner_index": 0 },
      "occurred_at": "2026-03-26T10:00:00Z"
    },
    {
      "name": "click_banner",
      "user_id": 12345,
      "session_id": "abc-123",
      "source_route": "/home",
      "source_widget": "home_banner",
      "target_route": "__external__",
      "prev_route": "/home/recommend",
      "parameters": { "banner_id": 1, "banner_index": 0, "url": "https://munto.kr/event/..." },
      "occurred_at": "2026-03-26T10:00:03Z"
    }
  ]
}
```

---

### DB 스키마

```sql
-- 원본 이벤트 저장
CREATE TABLE app_events (
  id          BIGSERIAL PRIMARY KEY,
  event_name  VARCHAR(100) NOT NULL,
  user_id     INT,
  session_id  VARCHAR(100),
  parameters  JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_events_name_occurred ON app_events (event_name, occurred_at);
CREATE INDEX idx_app_events_user_id ON app_events (user_id);
CREATE INDEX idx_app_events_parameters ON app_events USING GIN (parameters);

-- 배너 성과 집계 뷰
CREATE MATERIALIZED VIEW banner_event_stats AS
SELECT
  (parameters->>'banner_id')::INT AS banner_id,
  event_name,
  DATE_TRUNC('day', occurred_at) AS date,
  COUNT(*) AS count
FROM app_events
WHERE event_name IN ('view_banner', 'click_banner')
GROUP BY 1, 2, 3;
```

---

### 공통 이벤트 필드 설계

모든 이벤트에 공통으로 포함되는 필드를 정의한다.

| 필드 | 타입 | 설명 | 예시 |
| --- | --- | --- | --- |
| `user_id` | `int?` | 사용자 ID (비로그인 시 null) | `12345` |
| `session_id` | `string` | 세션 ID (앱 실행 단위) | `"abc-123"` |
| `occurred_at` | `timestamptz` | 이벤트 발생 시각 | `"2026-03-26T10:00:00Z"` |
| `source_route` | `string?` | 이벤트 발생 화면 route | `"/home"` |
| `source_widget` | `string?` | 이벤트 발생 위젯 | `"home_banner"` |
| `target_route` | `string?` | 이동 목적지 route 또는 특수값 | `"/socialing/detail/123"` |
| `prev_route` | `string?` | 직전 화면 route | `"/home/recommend"` |

`target_route`는 GoRouter의 `RouteConstants` 값을 그대로 사용하며, 다음 특수값을 함께 정의한다.

```dart
static const String back     = '__back__';      // 뒤로가기
static const String close    = '__close__';     // 모달/바텀시트 닫기
static const String external = '__external__';  // 외부 URL (배너 등)
/// 필요 시 추가
```

### 공통 필드 처리 방식 비교 및 선택 근거

공통 필드를 어디에 담을지에 대한 두 가지 옵션을 검토했다.

| 기준 | 옵션 A: LogEvent 모델에 별도 필드 추가 | 옵션 B: parameters Map에 포함 (선택) |
| --- | --- | --- |
| 타입 안전성 | 높음 (컴파일 타임 보장) | 중간 (MuntoEventModel 팩토리에서 required로 강제) |
| 수정 범위 | `munto-mobile-core` 전반 수정 필요 (LogEvent, Logger, _event() 시그니처 등) | `munto-mobile`만 작업, 코어 무수정 |
| Firebase/Facebook 호환성 | 해당 Output들이 새 필드를 무시해야 함 | 기존 동작 완전 유지 |
| MuntoOutput 구현 편의성 | 필드 직접 접근 가능 | `parameters`에서 꺼내서 상위 레벨로 분리 |
| 디버깅 편의성 | 높음 (ConsoleOutput에서 명시적 출력) | 중간 (parameters 안에 섞임) |

**옵션 B를 선택한 이유:**

`munto-mobile-core`를 수정하지 않고 `munto-mobile`의 `MuntoOutput`에서만 `parameters`의 공통 필드를 꺼내 상위 레벨로 분리하여 서버로 전송할 수 있다. `MuntoEventModel` 팩토리에서 `source_route` 등을 `required`로 강제하면 타입 안전성도 충분히 확보된다. Firebase/Facebook 등 기존 Output의 동작에도 전혀 영향을 주지 않는다.

---

### Flutter 클라이언트 구조

작업 범위는 `munto-mobile`, `dating-mobile` 각각에 한정되며, `munto-mobile-core`는 수정하지 않는다.

```
munto-mobile-core (수정 없음)
├── LogEvent              ← parameters 방식이므로 수정 불필요
├── Logger                ← 수정 불필요
├── LogOutputInterface    ← 수정 불필요
└── FirebaseAnalyticsOutput ← 수정 불필요

munto-mobile (신규 작업)
├── MuntoOutput (신규)    ← writeEvent()에서 parameters 꺼내 서버 전송
└── MuntoEventModel       ← 배너 관련 이벤트 추가

dating-mobile (신규 작업)
└── MuntoOutput (신규)    ← munto-mobile과 동일한 구조로 별도 구현
```

`MuntoOutput`은 `munto-mobile`과 `dating-mobile` 각각에 별도로 구현한다. 두 앱이 바라보는 백엔드 엔드포인트나 인증 방식이 다를 수 있으므로 코드를 공유하지 않는다.

**MuntoOutput** (`munto-mobile`에 신규 추가)

- `LogOutputInterface` 구현체
- `writeEvent()` 내부에서 `parameters`의 공통 필드(`source_route`, `target_route` 등)를 꺼내 상위 레벨로 분리하여 서버로 전송
- 10개 단위 배치 전송으로 서버 부하 방지

**MuntoLoggerExtension** (`logger_extensions.dart`에 추가)

- 기존 `logViewPaidSocialing`, `logCheckoutVod` 패턴과 동일하게 이벤트별 전용 메소드 추가
- 호출하는 쪽에서 공통 필드(`source_route`, `target_route` 등)를 직접 신경 쓰지 않아도 되도록 캡슐화
- 내부에서 `MuntoEventModel`의 `parameters`에 공통 필드를 포함하여 전송

```dart
// 호출 예시 (위젯에서)
logger.logBannerEvent(
  bannerId: banner.id,
  bannerIndex: index,
  sourceRoute: RouteConstants.home,
  targetRoute: RouteEvent.external,
);
```

### 수집 대상 이벤트 및 이력 관리

> TBD
> 

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.03.26 | 김범진 | 최초 작성 |

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