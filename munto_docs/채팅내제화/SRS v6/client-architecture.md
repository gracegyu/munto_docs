# 채팅 클라이언트 아키텍처 (SDK 통합 가이드)

> 본 문서는 채팅 **SDK가 어디까지 책임지고, 각 앱(데이팅·문토·Closer)이 무엇을 구현하는지**의 경계를 정의한다.
> SRS(`srs.md`) §2.2.1이 SDK의 *내부 구조*를 정의한다면, 본 문서는 그 SDK 위에서 각 앱이 **View·ViewModel(MVVM)을 어떻게 붙이는지**를 정의한다.
> SRS 범위가 아니다 — SRS §2.1은 "UI/UX는 각 앱에서 별도 구현"으로 못 박았고, 본 문서가 그 *별도 구현*의 규약이다.

---

## 1. 책임 경계 (가장 중요)

채팅 기능은 **SDK 한 겹**으로 공유하고, 화면과 상태관리는 **각 앱이 각자** 구현한다. SDK는 **인터페이스(계약)까지만** 제공한다.

```
┌─────────────────────────────────────────────┐
│  앱 (데이팅 / 문토 / Closer) — 각 프로젝트 책임      │
│  ┌───────────────┐   ┌───────────────┐        │
│  │ View (화면)     │←─│ ViewModel       │        │  ← MVVM 의 V·VM = 앱이 구현
│  │ Widget/Component│   │ BLoC / hooks    │        │
│  └───────────────┘   └───────┬───────┘        │
└──────────────────────────────│────────────────┘
                               │  (SDK 공개 인터페이스에만 의존)
┌──────────────────────────────▼────────────────┐
│  채팅 SDK — munto_chat_sdk / @munto/chat-sdk      │  ← M·데이터 레이어 = SDK 가 소유
│  MuntoChatClient (공개 API + 이벤트 Stream)        │
│  Repository · 소켓 · REST · 로컬 캐시 · 재전송 큐    │
└────────────────────────────────────────────────┘
```

| 레이어 | 소유 | 데이팅/문토(Flutter) | Closer(RN) |
| --- | --- | --- | --- |
| Model (도메인 모델) | **SDK** | 그대로 사용 | 그대로 사용 |
| 데이터 레이어 (소켓·REST·캐시·재전송·재연결) | **SDK** | 그대로 사용 | 그대로 사용 |
| ViewModel (상태관리) | **앱** | BLoC (dating 표준) / Riverpod (munto) | hooks + store |
| View (화면 UI) | **앱** | Widget (Screen/View 분리) | React Component |

> **원칙**: 앱은 `MuntoChatClient`(공개 인터페이스)에만 의존한다. 소켓·REST·로컬 DB·tempId·재전송 같은 내부 구현에 직접 접근하지 않는다. SDK 내부가 바뀌어도 앱 코드는 영향받지 않아야 한다.

> **적용 순서**: 데이팅(`dating-mobile`)을 먼저 올리고 문토(`munto-mobile`)는 이후다. 따라서 Flutter 규약은 **dating-mobile(BLoC) 기준**으로 적고, munto-mobile은 Riverpod 차이만 별도 표기한다. Closer(RN)는 **별도 레포**가 될 가능성이 크며, 화면·ViewModel은 Closer가 구현한다.

---

## 2. SDK 계약 (플랫폼 무관 — 공통)

앱의 ViewModel이 의존하는 유일한 표면이다. (Flutter 기준 시그니처, RN은 동일 의미의 TS API)

### 2.1 명령 (Command) — 호출

| 분류 | 메서드 | 비고 |
| --- | --- | --- |
| 생명주기 | `initialize(config)` · `connect()` · `disconnect()` · `dispose()` | 앱 시작 시 1회 초기화, DI 싱글톤으로 보유 |
| 채팅방 | `joinRoom(roomId, {lastMessageId})` · `leaveRoom(roomId)` · `getChatList()` | `lastMessageId`로 누락분 동기화 |
| 메시지 | `sendMessage({roomId, type, content}) → tempId` · `markRead(roomId)` | 반환된 `tempId`로 성공/실패 이벤트 매핑 |
| 타이핑 | `startTyping(roomId)` · `stopTyping(roomId)` | |
| 상태 | `isConnected` | |

### 2.2 이벤트 (Event) — Stream 구독

ViewModel은 아래 Stream을 구독해 UI 상태로 변환한다.

| Stream | 용도 |
| --- | --- |
| `connectionState` | 연결/재연결/끊김 표시 |
| `onChatList` · `onChatListUpdated` | 채팅방 목록 / 목록 실시간 갱신 |
| `onRoomJoined` · `onRoomLeft` | 입장/퇴장 완료 |
| `onMessage` | 새 메시지 수신 |
| `onMessageSent` · `onMessageFailed` | 전송 성공/실패 (`tempId` 매핑) |
| `onReadReceiptUpdated` · `onUnreadCountUpdated` | 읽음/안읽은 수 |
| `onTypingStarted` · `onTypingStopped` | 타이핑 인디케이터 |
| `onParticipantJoined` · `onParticipantLeft` | 참여자 변동 |
| `onAnnouncementSet` · `onAnnouncementUnset` | 공지 설정/해제 |
| `onError` | 에러 표면화 |

### 2.3 REST 계약 (히스토리·페이지네이션)

실시간 외 조회는 SDK의 Retrofit 인터페이스로 제공한다. ViewModel은 이를 호출만 한다.

- `ChatRoomApi`: 채팅방 목록·상세·나가기·참여자·사진 모아보기·전체 안읽은 수
- `MessageApi`: 메시지 목록·공지 목록·공지 설정/해제
- 페이지네이션 공통 파라미터: `after` · `before` · `count` (커서 기반)

### 2.4 SDK가 *대신* 책임지는 것 (앱이 다시 구현하지 말 것)

- **낙관적 전송**: `sendMessage`가 `tempId`를 즉시 반환 → ViewModel은 임시 메시지를 먼저 그리고, `onMessageSent`/`onMessageFailed`로 확정/실패 갱신만 한다.
- **재전송 큐 + 재연결**: 끊김 후 재연결, 재시도 가능한 실패 메시지 자동 재전송, 현재 방 자동 재입장은 SDK 내부(`PendingMessageQueue` + 재연결 로직)가 처리한다.
- **로컬 캐시**: 최근 메시지·채팅방·썸네일 캐싱은 SDK가 담당한다.

> 따라서 앱의 ViewModel이 새로 만들 것은 **"Stream → UI 상태 변환"과 "사용자 입력 → SDK 명령 호출"** 두 방향의 바인딩뿐이다.

---

## 3. Flutter 바인딩 (dating-mobile 기준 — BLoC)

`dating-mobile`의 레이어·BLoC·Screen/View 규약(`.agents/rules/mobile/flutter.md`)을 그대로 따른다. 신규 화면이므로 레거시 패턴(`detail-*`, 구형 Dio 직접 호출, `Widget _buildXxx()`)은 참조하지 않는다.

### 3.1 레이어 매핑

```
source/
├── domain/model/                       ← SDK 모델 재노출 (앱 전용 모델 필요 시만 추가)
└── presentation/
    ├── bloc/ChatRoomBloc               ← ViewModel. MuntoChatClient를 직접 주입받음
    └── view/ChatRoomScreen, _ChatRoomView
```

의존성 방향: `presentation → MuntoChatClient(SDK)`.

> **앱 측 Repository는 두지 않는다 (기본값)**: `MuntoChatClient` 자체가 이미 Repository다 — SRS §2.2.1대로 내부에서 `IChatRepository`(Remote/Local) + 소켓 + 캐시를 캡슐화한다. 그 위에 앱 `ChatRepository`를 또 두면 Repository를 두 겹으로 쌓는 군더더기이므로, **BLoC가 SDK 클라이언트를 직접 주입받아** 사용한다. 단 §3.6의 *예외* (REST 히스토리 + 소켓 라이브 병합, 모델 매핑이 실제로 필요한 경우)에만 얇은 래퍼를 도입한다.

### 3.2 SDK 등록 (GetIt)

```dart
// SDK 클라이언트는 앱 전역 싱글톤으로 1회 등록·초기화한다.
class ChatModule {
  static void registerTo(GetIt getIt) {
    getIt.registerSingleton<MuntoChatClient>(MuntoChatClient());
  }
}
```

### 3.3 ViewModel — BLoC + Freezed 상태 (SDK 직접 주입)

BLoC가 `MuntoChatClient`를 직접 주입받아 명령은 호출, 이벤트는 Stream 구독한다. 중간 Repository 계층을 두지 않는다.

```dart
// 상태는 Freezed @With 믹스인으로 정의 (dating 표준)
@freezed
class ChatRoomState with _$ChatRoomState {
  @With<LoadingState>()
  const factory ChatRoomState.loading() = _Loading;
  @With<SuccessState>()
  const factory ChatRoomState.success(List<MessageModel> messages) = _Success;
  @With<ErrorState>()
  const factory ChatRoomState.error(String message) = _Error;
}

class ChatRoomBloc extends Bloc<ChatRoomEvent, ChatRoomState> {
  ChatRoomBloc() : super(const ChatRoomState.loading()) {
    _client = getIt<MuntoChatClient>(); // SDK 직접 주입
    // SDK Stream 구독 → BLoC 이벤트로 흘려보냄
    _sub = _client.onMessage.listen((m) => add(ChatRoomEvent.messageReceived(m)));
    on<_Initialize>(_onInitialize);
    on<_MessageReceived>(_onMessageReceived);
    on<_SendText>(_onSendText);
  }

  late final MuntoChatClient _client;
  late final StreamSubscription _sub;

  // 명령은 클라이언트 직접 호출
  Future<void> _onSendText(_SendText e, Emitter emit) =>
      _client.sendMessage(roomId: e.roomId, type: MessageType.text, content: e.text);

  @override
  Future<void> close() {
    _sub.cancel(); // 구독 해제 필수
    return super.close();
  }
}
```

### 3.4 View — Screen / View 분리

```dart
// Screen — BlocProvider + DI 주입만
class ChatRoomScreen extends StatelessWidget {
  const ChatRoomScreen({super.key, required this.roomId});
  final int roomId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ChatRoomBloc()..add(ChatRoomEvent.initialize(roomId)),
      child: const _ChatRoomView(),
    );
  }
}

// View — CommonScaffold 내장 blocListener 활용 (중복 BlocListener 래핑 금지)
class _ChatRoomView extends StatelessWidget {
  const _ChatRoomView();

  @override
  Widget build(BuildContext context) {
    return CommonScaffold<ChatRoomBloc, ChatRoomState>(
      title: '채팅',
      successBuilder: (context, state) {
        // 메시지 리스트 UI
      },
    );
  }
}
```

### 3.5 munto-mobile 차이 (이후 적용)

- 상태관리: BLoC → **Riverpod Notifier**. Stream 구독 → Notifier state 갱신, `ref.onDispose`로 구독 해제.
- 상태 플래그: `state is LoadingState` → `state.isLoading` / `state.error != null`.
- 구조 규칙(레이어, 한국어 주석, 위젯 분리)은 동일.

### 3.6 예외 — 얇은 래퍼가 정당한 경우

기본은 SDK 직접 주입이지만, 아래처럼 ViewModel 안에 두기엔 무거운 *조합/변환 로직*이 생기면 그때만 얇은 래퍼(또는 service)를 도입한다. 순수 1:1 위임 래퍼는 만들지 않는다.

- **REST 히스토리 + 소켓 라이브 병합**: `MessageApi.getMessages()`(과거) + `onMessage`(실시간)를 하나의 메시지 소스로 합칠 때
- **모델 매핑**: SDK 이벤트 모델(`MessageSentEventModel` / `MessageFailedEventModel`)을 앱 도메인 상태로 변환할 때
- **스트림 좁히기**: 18개 Stream 중 특정 화면이 쓰는 일부만 묶어 노출할 때

---

## 4. RN 바인딩 (Closer 기준 — 별도 레포 가정)

RN MVVM은 팀 기존 규칙이 없어 **본 문서에서 처음 정의**한다. 화면·ViewModel은 Closer가 구현하고, SDK(`@munto/chat-sdk`)는 인터페이스까지만 제공한다.

### 4.1 레이어 매핑

```
src/
├── chat/
│   ├── chatClient.ts        ← @munto/chat-sdk 클라이언트 싱글톤 + 초기화
│   ├── useChatRoom.ts       ← ViewModel (custom hook + store)
│   └── ChatRoomScreen.tsx   ← View (React component)
```

### 4.2 클라이언트 싱글톤

```ts
// 앱 부팅 시 1회 초기화하고 모듈 싱글톤으로 공유한다.
import { MuntoChatClient } from '@munto/chat-sdk';

export const chatClient = new MuntoChatClient();

export async function initChat(tokenProvider: () => Promise<string>) {
  await chatClient.initialize({ serverUrl: 'wss://chat.munto.kr', tokenProvider });
  await chatClient.connect();
}
```

### 4.3 ViewModel — hook + store

```ts
// SDK 이벤트 구독 → 컴포넌트 상태로 변환. cleanup 필수.
export function useChatRoom(roomId: number) {
  const [messages, setMessages] = useState<MessageModel[]>([]);

  useEffect(() => {
    chatClient.joinRoom(roomId);
    const sub = chatClient.onMessage((m) => setMessages((prev) => [...prev, m]));
    const failSub = chatClient.onMessageFailed((e) => {/* tempId로 실패 표시 */});

    return () => {            // 언마운트 시 정리
      sub.unsubscribe();
      failSub.unsubscribe();
      chatClient.leaveRoom(roomId);
    };
  }, [roomId]);

  const sendText = (text: string) =>
    chatClient.sendMessage({ roomId, type: 'text', content: text });

  return { messages, sendText };
}
```

> 전역 상태(채팅방 목록·안읽은 수)는 store(zustand 등)로 끌어올리고, 화면 로컬 상태는 hook 안에 둔다. 낙관적 전송·재전송은 SDK가 처리하므로 RN에서 재구현하지 않는다.

### 4.4 View

```tsx
export function ChatRoomScreen({ roomId }: { roomId: number }) {
  const { messages, sendText } = useChatRoom(roomId);
  // 메시지 리스트 + 입력창 렌더링
}
```

---

## 5. 플랫폼 공통 체크리스트

- [ ] 앱은 `MuntoChatClient` 공개 인터페이스에만 의존한다 (소켓·REST·tempId·로컬 DB 직접 접근 금지)
- [ ] SDK 클라이언트는 **싱글톤 1개**로 초기화·공유한다 (Flutter=GetIt, RN=모듈 싱글톤)
- [ ] 모든 Stream/이벤트 구독은 ViewModel 종료 시 **반드시 해제**한다 (`close`/`dispose`/cleanup)
- [ ] 메시지 전송은 낙관적 UI로 그리고 `onMessageSent`/`onMessageFailed`로 확정한다 (직접 재전송 로직 금지 — SDK 책임)
- [ ] 재연결·재입장·재전송을 앱에서 다시 구현하지 않는다 (SDK 내부 책임)

---

## 변경 이력

| 일자 | 내용 |
| --- | --- |
| 2026-06-16 | 신규 작성 — SDK 책임 경계 + Flutter(dating-mobile/BLoC)·RN(Closer) MVVM 바인딩 규약 정의 |