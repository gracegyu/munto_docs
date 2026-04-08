# Bridge Events

체험단 소셜링 상세 웹뷰에서 사용하는 브릿지 이벤트를 정의한다.
기존 `BridgeMessageType`을 재사용하며, 체험단 전용 추가 이벤트는 없다.

## 메시지 포맷

### Request (Web → App)

```json
{
  "type": "REQUEST_TYPE",
  "requestId": "req_1234567890_0001",
  "data": { ... }
}
```

### Response (App → Web)

```json
{
  "type": "RESPONSE",
  "requestId": "req_1234567890_0001",
  "success": true,
  "data": { ... }
}
```

### Event (App → Web)

```json
{
  "type": "APP_EVENT",
  "eventType": "EVENT_TYPE",
  "data": { ... }
}
```

## 사용 이벤트 목록

### Web → App (Request)

| Type | 용도 | Data | Response |
| --- | --- | --- | --- |
| `BRIDGE_READY` | 브릿지 초기화 완료 | `{ timestamp }` | `{ status: "ok" }` |
| `REQUEST_TOKEN` | 인증 토큰 요청 | (없음) | `{ token: string }` |
| `CLOSE_WEBVIEW` | 웹뷰 닫기 | (없음) | `{ success: boolean }` |
| `LIKE_MOIM` | 소셜링 좋아요 토글 | `{ contentType: "socialing", contentId, isLike }` | `{ liked: boolean }` |
| `PURCHASE_MOIM` | 체험단 신청/결제 | `{ contentType: "socialing", contentId, isPurchase: true, price }` | (없음, 앱에서 결제 플로우 처리) |
| `NAVIGATE_TO_REVIEW` | 리뷰 작성 화면 이동 | `{ contentType: "socialing", userName, userId }` | (없음) |
| `NAVIGATE_TO_CONTENT` | 다른 콘텐츠 이동 | `{ contentType, contentId }` | (없음) |
| `PROFILE_CLICK` | 유저 프로필 이동 | `{ userId }` | (없음) |

### App → Web (Event)

| EventType | 용도 | Data |
| --- | --- | --- |
| `LIKE_STATUS_CHANGED` | 좋아요 상태 변경 (앱 내 다른 화면에서 변경 시) | `{ contentType, contentId, liked }` |
| `APP_STATE_CHANGED` | 앱 foreground/background 전환 | `{ state }` |
| `NETWORK_STATE_CHANGED` | 네트워크 연결 상태 변경 | `{ connected, connectionType? }` |

## 통신 플로우

### 초기화

```
[웹뷰 로드] → onPageFinished
  → 앱: injectJavaScript (브릿지 코드 주입)
  → 웹: BRIDGE_READY 전송
  → 앱: RESPONSE + updateToken (localStorage에 토큰 저장)
  → 웹: 토큰으로 API 호출하여 체험단 상세 데이터 로드
```

### 체험단 신청/결제

```
[유저: 신청 CTA 클릭]
  → 웹: PURCHASE_MOIM { contentType: "socialing", contentId, isPurchase: true, price }
  → 앱: PURCHASE_MOIM 수신
    → 본인인증 미완료 시: 본인인증 모달 표시 → 완료 후 결제 진행
    → 본인인증 완료 시: Bootpay 결제 플로우 실행
  → 앱: 결제 완료 → POST /api/v1/trial/socialings/{id}/apply 호출
  → 앱: 결제 결과에 따라 웹뷰 새로고침 또는 닫기
```

### 리뷰 작성 이동

```
[유저: 리뷰 작성 버튼 클릭]
  → 웹: NAVIGATE_TO_REVIEW { contentType: "socialing", userName, userId }
  → 앱: 네이티브 리뷰 작성 화면으로 이동
  → (리뷰 작성 완료 시 서버에서 자동 80% 부분환불 처리)
```

## 참고 파일

### Mobile (Flutter)

- `lib/models/webview/bridge_message.dart` — 메시지 타입 및 모델
- `lib/utils/webview_helper.dart` — 웹뷰 컨트롤러 (메시지 수신/발신)

### Frontend (Next.js)

- `utils/bridge/bridgeCore.ts` — 브릿지 코어 로직
- `utils/bridge/useBridge.ts` — React hook
- `utils/bridge/useMoimBridge.ts` — 콘텐츠 브릿지 API