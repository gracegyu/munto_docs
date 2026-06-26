# WebSocket 이벤트 명세서

채팅 서비스 Socket.IO 이벤트 규약입니다.
상세 요구사항은 [SRS 문서](./srs.md)를 참조하세요.

---

## 목차

1. [연결 규약](#1-연결-규약)
2. [클라이언트 → 서버 이벤트](#2-클라이언트--서버-이벤트)
3. [서버 → 클라이언트 이벤트](#3-서버--클라이언트-이벤트)
   - 3.1 `chat_list` / 3.2 `chat_list_updated`
   - 3.3 `room_joined` / 3.4 `room_left`
   - 3.5 `new_message` / 3.6 `message_sent` / 3.7 `message_failed`
   - 3.8 `read_receipt_updated` / 3.9 `unread_count_updated`
   - 3.10 `typing_started` / 3.11 `typing_stopped`
   - 3.12 `participant_joined` / 3.13 `participant_left`
   - 3.14 `announcement_set` / 3.15 `announcement_unset`
   - 3.16 `room_activated` / 3.17 `error`
4. [에러 코드](#4-에러-코드)
5. [부록](#5-부록)

---

## 1. 연결 규약

### 1.1 연결 정보

| 항목 | 값 |
|------|-----|
| **URL** | `wss://chat-server.munto.kr` |
| **Protocol** | Socket.IO v4 (WebSocket transport only) |
| **인증 방식** | Query Parameter (`token`) |

### 1.2 연결 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| `token` | string | ✅ | JWT Access Token (문토/데이팅 백엔드 발급) |

### 1.3 연결 옵션

| 옵션 | 권장값 | 설명 |
|------|-------|------|
| `transports` | `['websocket']` | WebSocket만 사용 |
| `reconnection` | `true` | 자동 재연결 활성화 |
| `reconnectionAttempts` | `5` | 최대 재연결 시도 횟수 |
| `reconnectionDelay` | `1000` | 첫 재연결 대기 시간 (ms) |
| `reconnectionDelayMax` | `30000` | 최대 재연결 대기 시간 (ms) |

### 1.4 연결 수립 시 자동 처리

1. 사용자 상태를 **Idle**로 변경 (Redis `user_status:{userId}`)
2. 서버에서 `chat_list` 이벤트 자동 전송

### 1.5 연결 종료 시 처리

1. 사용자 상태를 **Offline**으로 변경
2. 24시간 후 상태 데이터 자동 삭제 (TTL)

---

## 2. 클라이언트 → 서버 이벤트

### 2.1 `get_chat_list`

채팅방 목록을 요청합니다.

**Payload:** 없음

**응답:** `chat_list` 이벤트

**호출 시점:**
- 앱 Foreground 복귀 시
- 채팅방 목록 새로고침 시

---

### 2.2 `join_room`

채팅방에 입장합니다. 입장 시 읽음 처리가 수행됩니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `lastMessageId` | number | - | 마지막 수신 메시지 ID (재연결 시 동기화용) |

**응답:** `room_joined` 이벤트

**부가 효과:**
- 사용자 상태를 **Active**로 변경 (`activeRoomId` 설정)
- 해당 채팅방 `unreadCount = 0`
- 이전 Active 채팅방 자동 비활성화
- `lastMessageId` 전달 시 누락 메시지를 `room_joined` 응답에 포함

---

### 2.3 `leave_room`

채팅방에서 퇴장합니다. (Socket.IO Room Leave)

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |

**응답:** `room_left` 이벤트

**부가 효과:**
- 사용자 상태를 **Idle**로 변경 (`activeRoomId = null`)

> **주의:** 채팅방 자체를 나가는 것은 REST API 사용 (SRS 7.2.4 참조)

---

### 2.4 `send_message`

메시지를 전송합니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `type` | string | ✅ | `TEXT` \| `IMAGE` |
| `content` | string \| string[] | ✅ | 메시지 내용 |
| `tempId` | string | ✅ | 임시 메시지 ID (클라이언트 생성) |

**content 형식:**

| type | content 형식 | 제한 |
|------|-------------|------|
| `TEXT` | string | 최대 1,000자 |
| `IMAGE` | string[] | URL 배열, 최대 10개 |

**응답:**
- 성공: `message_sent` 이벤트
- 실패: `message_failed` 이벤트

**tempId 규약:**

| 항목 | 설명 |
|------|------|
| 생성 방법 | UUID v4 또는 Nano ID |
| 용도 (클라이언트) | 전송 중 메시지 UI 표시, 성공/실패 매핑 |
| 용도 (서버) | 중복 메시지 방지 (멱등성 보장) |

**서버 멱등성 처리:**
- Redis에 `tempId` 캐싱 (TTL: 5초)
- 동일 `tempId` 재요청 시 기존 메시지 ID 반환
- 5초 초과 재요청은 새 메시지로 처리

---

### 2.5 `mark_read`

특정 메시지까지 읽음 처리합니다. 서버는 `last_read_message_id`를 이 값으로 업데이트합니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `messageId` | number | ✅ | 이 메시지까지 읽었음 (이하 모두 읽음 처리) |

**응답:**
- `read_receipt_updated` 이벤트 (채팅방 참여자에게)
- `unread_count_updated` 이벤트 (본인에게)

---

### 2.6 `typing_start`

입력 중 상태를 시작합니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |

**브로드캐스트:** `typing_started` 이벤트 (채팅방 참여자에게)

---

### 2.7 `typing_stop`

입력 중 상태를 종료합니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |

**브로드캐스트:** `typing_stopped` 이벤트 (채팅방 참여자에게)

---

## 3. 서버 → 클라이언트 이벤트

### 3.1 `chat_list`

채팅방 목록입니다. 연결 성공 시 자동 전송됩니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `rooms` | ChatRoomSummary[] | 채팅방 목록 |

**ChatRoomSummary:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `roomType` | string | ✅ | `GROUP` \| `DM` \| `DATING_DM` |
| `name` | string | ✅ | 채팅방 이름 |
| `thumbnailUrl` | string \| null | ✅ | 썸네일 URL |
| `unreadCount` | number | ✅ | 읽지 않은 메시지 수 |
| `lastMessage` | LastMessage \| null | ✅ | 마지막 메시지 |
| `moimType` | string | - | 모임 종류 `SOCIALING` \| `CLUB` \| `CHALLENGE` (GROUP) |
| `moimId` | number | - | 모임 ID (GROUP) |
| `otherUser` | UserSummary | - | 상대방 정보 (DM) |
| `matchId` | number | - | 매칭 ID (DATING_DM) |
| `chatExpiresAt` | number | - | 만료 시간 (DATING_DM, Unix time ms) |
| `roomStatus` | string | - | `CREATED` \| `ACTIVATED` \| `EXPIRED` \| `LEFT` (DATING_DM) |

클라이언트에서는 roomType, 모임 타입에 따라 팩토리 패턴으로 구현

**LastMessage:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `messageId` | number | 메시지 ID |
| `content` | string | 메시지 내용 (이미지면 "사진") |
| `type` | string | `TEXT` \| `IMAGE` \| `SYSTEM` |
| `sentAt` | number | 전송 시간 (Unix time ms) |
| `sender` | UserSummary \| null | 전송자 (시스템 메시지면 null) |

---

### 3.2 `chat_list_updated`

채팅방 목록 실시간 업데이트입니다. Room Join 없이 수신됩니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `updateType` | string | ✅ | 업데이트 타입 |
| `unreadCount` | number | ✅ | 현재 읽지 않은 수 |
| `lastMessage` | LastMessage | - | 마지막 메시지 (NEW_MESSAGE 시) |

**updateType:**

| 값 | 설명 |
|----|------|
| `NEW_MESSAGE` | 새 메시지 수신 |
| `READ` | 읽음 처리 완료 |
| `CREATED` | 새 채팅방 생성 |
| `LEFT` | 채팅방 나감 |
| `EXPIRED` | 채팅방 만료 (DATING_DM) |
| `ACTIVATED` | 채팅방 활성화 (DATING_DM) |

**updateType별 추가 필드:**

| updateType | 추가 필드 | 설명 |
|------------|----------|------|
| `NEW_MESSAGE` | `lastMessage` | 새 메시지 정보 |
| `READ` | `userId`, `messageId` | 누가 어디까지 읽었는지 (DM 읽음 표시용) |
| `ACTIVATED` | `chatExpiresAt` | 만료 시간 (Unix time ms) |

**unreadCount 정합성:**
- 서버 DB 기준 값 (클라이언트 로컬 계산 금지)
- race condition 발생 시 마지막 수신 이벤트가 최신 값
- 채팅방 입장 시 `unreadCount=0`으로 확정

---

### 3.3 `room_joined`

채팅방 입장 성공입니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `message` | string | ✅ | 성공 메시지 |
| `missedMessages` | Message[] | - | 누락 메시지 목록 (`lastMessageId` 전달 시) |
| `hasMore` | boolean | - | 추가 메시지 존재 여부 (100개 초과 시 `true`) |

**missedMessages 포함 조건:**
- `join_room` 요청 시 `lastMessageId`가 전달된 경우
- `messageId > lastMessageId` 조건으로 조회된 메시지
- 최대 100개까지 반환, 초과 시 `hasMore: true`

---

### 3.4 `room_left`

채팅방 퇴장 성공입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `message` | string | 성공 메시지 |

---

### 3.5 `new_message`

새 메시지 수신입니다. 해당 채팅방 Room에 Join한 사용자에게 전송됩니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `id` | number | ✅ | 메시지 ID (BIGINT. number 전송 — 실 ID가 2^53 이하라 안전, SRS 7.3.5) |
| `roomId` | number | ✅ | 채팅방 ID |
| `type` | string | ✅ | 메시지 타입 |
| `content` | string \| string[] \| object | ✅ | 메시지 내용 |
| `sender` | UserSummary | ✅ | 전송자 정보 |
| `sentAt` | number | ✅ | 전송 시간 (Unix time ms) |
| `isAnnouncement` | boolean | ✅ | 공지 여부 |
| `isBlinded` | boolean | ✅ | 블라인드 여부 |
| `tempId` | string | - | 클라이언트 임시 ID (본인 메시지) |

**type:**

| 값 | content 형식 | 설명 |
|----|-------------|------|
| `TEXT` | string | 텍스트 메시지 |
| `IMAGE` | string[] | 이미지 URL 배열 |
| `SYSTEM` | object | 시스템 메시지 |
| `CHALLENGE_CHECKIN` | object | 챌린지 체크인 (향후) |
| `FEED` | object | 클럽 피드 (향후) |
| `POLL` | object | 클럽 투표 (향후) |

**SYSTEM content 형식:**

| action | data 형식 | 설명 |
|--------|----------|------|
| `JOIN` | `{ userId, nickname }` | 참여자 입장 |
| `LEAVE` | `{ userId, nickname }` | 참여자 퇴장 |
| `ANNOUNCE` | `{ messageId }` | 공지 설정 |

```json
// 예시
{ "action": "JOIN", "data": { "userId": 123, "nickname": "문토유저" } }
{ "action": "LEAVE", "data": { "userId": 123, "nickname": "문토유저" } }
{ "action": "ANNOUNCE", "data": { "messageId": 456 } }
```

---

### 3.6 `message_sent`

메시지 전송 성공입니다. 전송자에게만 전송됩니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `id` | number | ✅ | 서버 생성 메시지 ID |
| `roomId` | number | ✅ | 채팅방 ID |
| `sentAt` | number | ✅ | 전송 시간 (Unix time ms) |
| `tempId` | string | - | 클라이언트 임시 ID |
| `isBlinded` | boolean | - | 블라인드 여부 |
| `blindReason` | string | - | 블라인드 사유 |

---

### 3.7 `message_failed`

메시지 전송 실패입니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `roomId` | number | ✅ | 채팅방 ID |
| `tempId` | string | - | 클라이언트 임시 ID |
| `error` | ErrorInfo | ✅ | 에러 정보 |

**ErrorInfo:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `code` | string | 에러 코드 |
| `message` | string | 에러 메시지 |

---

### 3.8 `read_receipt_updated`

읽음 상태 업데이트입니다. 채팅방 참여자에게 브로드캐스트됩니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `messageId` | number | 마지막 읽음 처리된 메시지 ID |
| `unreadCount` | number | 해당 메시지를 안 읽은 사람 수 |

---

### 3.9 `unread_count_updated`

읽지 않은 메시지 수 업데이트입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `unreadCount` | number | 읽지 않은 수 |

---

### 3.10 `typing_started`

다른 사용자 입력 중 시작입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `user` | UserSummary | 사용자 정보 |

---

### 3.11 `typing_stopped`

다른 사용자 입력 중 종료입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `user` | UserSummary | 사용자 정보 |

---

### 3.12 `participant_joined`

참여자 입장 알림입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `participant` | Participant | 참여자 정보 |

**Participant:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | number | 사용자 ID |
| `nickname` | string | 닉네임 |
| `profilePhotoUrl` | string \| null | 프로필 사진 URL |
| `role` | string | `HOST` \| `MANAGER` \| `MEMBER` \| `ADMINISTRATOR` |

---

### 3.13 `participant_left`

참여자 퇴장 알림입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `participant` | UserSummary | 참여자 정보 |

---

### 3.14 `announcement_set`

공지사항 설정 알림입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `messageId` | number | 공지 메시지 ID |
| `setBy` | UserSummary | 설정자 정보 |
| `setAt` | number | 설정 시간 (Unix time ms) |

---

### 3.15 `announcement_unset`

공지사항 해제 알림입니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `messageId` | number | 해제된 메시지 ID |

---

### 3.16 `room_activated`

데이팅 DM 채팅방 활성화 알림입니다. 결제 완료 후 데이팅 백엔드가 `PATCH /rooms/{roomId}`를 호출하면 채팅방 참여자에게 브로드캐스트됩니다.

**Payload:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomId` | number | 채팅방 ID |
| `chatExpiresAt` | number | 만료 시간 (Unix time ms) |

**클라이언트 대응:**
- 채팅방 잠금 화면 → 채팅 화면으로 전환
- `chatExpiresAt` 기준 만료 타이머 시작

---

### 3.17 `error`

에러 발생입니다.

**Payload:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|-----|------|
| `code` | string | ✅ | 에러 코드 |
| `message` | string | ✅ | 에러 메시지 |
| `roomId` | number | - | 관련 채팅방 ID |

---

## 4. 에러 코드

| 코드 | 설명 | 재시도 | 사용자 노출 | 클라이언트 대응 |
|------|------|--------|------------|---------------|
| `UNAUTHORIZED` | 인증 실패 | ❌ | ✅ | 재로그인 후 재연결 |
| `FORBIDDEN` | 권한 없음 | ❌ | ✅ | 채팅방 참여 여부 확인 |
| `ROOM_NOT_FOUND` | 채팅방 없음 | ❌ | ❌ | 채팅방 목록 새로고침 |
| `ROOM_EXPIRED` | 채팅방 만료 (DATING_DM) | ❌ | ✅ | 채팅방 목록에서 제거 |
| `ROOM_LEFT` | 채팅방 나감 | ❌ | ❌ | 채팅방 목록에서 제거 |
| `PROFANITY_DETECTED` | 금칙어 포함 | ❌ | ✅ | 메시지 수정 후 재전송 |
| `IMAGE_TOO_LARGE` | 이미지 크기 초과 (10MB) | ❌ | ✅ | 이미지 리사이징 |
| `INAPPROPRIATE_IMAGE` | 부적절한 이미지 (7.6.5 도입 시) | ❌ | ✅ | 다른 이미지 선택 |
| `EXTERNAL_LINK_DETECTED` | 외부 링크 포함 | ❌ | ✅ | 블라인드 처리됨 안내 |
| `RATE_LIMIT_EXCEEDED` | 전송 제한 초과 | ✅ | ❌ | 잠시 후 자동 재시도 |
| `SANCTIONED` | 계정 제재로 채팅 차단(서비스별) | ❌ | ✅ | **재연결 중단** + 제재 안내(가능 시 해제 시각). 데이팅/문토 중 해당 서비스만 |
| `INTERNAL_ERROR` | 서버 내부 오류 | ✅ | ❌ | 자동 재시도 (최대 3회) |

**범례:**
- **재시도**: 클라이언트가 자동으로 재시도할 수 있는지 여부
- **사용자 노출**: 에러 메시지를 사용자에게 표시해야 하는지 여부

### 4.1 제재로 인한 연결 거부·강제 종료 (계약)

계정 제재(SRS 7.8.4) 반영 시, 클라이언트가 "재시도할지/무슨 화면을 보일지"를 구분할 수 있도록 사유를 구조화해 전달한다. **제재는 서비스별**이므로 페이로드에 `service`(DATING/MUNTO)를 포함한다.

**(1) 신규/재연결 거부 — handshake 미들웨어:** JWT 검증 → 제재 denylist 확인 후 거부 시 에러 코드를 실어 보낸다.

| 코드 | 의미 | 클라이언트 동작 |
|------|------|----------------|
| `SANCTIONED` | 제재로 차단 | **자동 재연결 중단**, 제재 안내 화면(`service`·`expiresAt` 표시) |
| `AUTH_FAILED` | 토큰 만료/무효 | 토큰 갱신 후 **1회** 재시도, 실패 시 로그인 유도 |
| (코드 없음/네트워크) | 일시 오류 | 기본 자동 재연결(백오프) |

거부 시 `connect_error` 페이로드: `{ code, service, expiresAt, reason }`.

**(2) 접속 중 소켓 강제 종료 — Kafka 제재 이벤트 수신 시:** 끊기 **직전** `force_disconnect` 이벤트를 보낸 뒤 소켓을 종료한다. (서버발 종료는 클라가 기본적으로 자동재연결하지 않으나, "제재 vs 서버 재시작"을 구분하려면 사전 이벤트가 필요)

| 이벤트 | 페이로드 | 클라이언트 동작 |
|--------|----------|----------------|
| `force_disconnect` | `{ code: "SANCTIONED", service, expiresAt, reason }` | 안내 화면 표시 + 재연결 시도 안 함 |

---

## 5. 부록

### 5.1 공통 타입

**UserSummary:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | number | 사용자 ID |
| `nickname` | string | 닉네임 |
| `profilePhotoUrl` | string \| null | 프로필 사진 URL |

### 5.2 시간 형식

모든 시간 필드는 **Unix time milliseconds**를 사용합니다.

### 5.3 재연결 전략

**재연결 대기 시간 (Exponential Backoff):**

| 시도 | 대기 시간 |
|------|----------|
| 1 | 1초 |
| 2 | 2초 |
| 3 | 4초 |
| 4 | 8초 |
| 5 | 16초 |

**재연결 후 처리:**
1. JWT 토큰 재검증
2. `chat_list` 이벤트 자동 수신
3. 이전 입장 채팅방 `join_room` 재호출 (`lastMessageId` 포함)
4. `room_joined` 응답의 `missedMessages`로 누락 메시지 동기화

**메시지 동기화 규칙:**

| 항목 | 규칙 |
|------|------|
| 기준점 | `lastMessageId` (타임스탬프 아님) |
| 저장 위치 | 클라이언트 로컬 스토리지 (채팅방별) |
| 서버 조회 조건 | `messageId > lastMessageId` |
| 최대 반환 개수 | 100개 (`hasMore`로 추가 여부 확인) |

**클라이언트 처리:**
- `missedMessages` 수신 시 기존 목록에 병합
- `messageId` 기준 중복 체크 (Set 사용)
- `messageId` 오름차순 정렬 후 표시
- `lastMessageId`를 가장 큰 `messageId`로 업데이트

상세 규칙은 SRS 5.3 참조

### 5.4 사용자 상태 (3단계 모델)

| 상태 | 조건 | 메시지 전달 | 푸시 처리 |
|-----|------|-----------|----------|
| **Active** | Socket.IO 연결 + `join_room` 상태 | Socket.IO | 발송 안 함 |
| **Idle** | Socket.IO 연결 + 다른 화면 | Socket.IO | 로컬 푸시 |
| **Offline** | Socket.IO 미연결 | - | 시스템 푸시 |

**Offline 판정 기준:**
- Socket.IO 연결 해제 시 즉시 Offline 처리
- Socket.IO 기본 ping/pong으로 좀비 연결 감지 (별도 커스텀 ping 없음)
- 연결 끊김 이유(앱 종료, 백그라운드 전환, 네트워크 단절 등)와 관계없이 동일하게 처리
- 상세 정의는 SRS 1.4 용어 정의 참조

### 5.5 Rate Limiting

| 항목 | 제한 |
|------|------|
| 초당 메시지 | 3개 |
| 분당 메시지 | 60개 |
| 알고리즘 | 슬라이딩 윈도우 (Redis Sorted Set) |
| 초과 시 | `RATE_LIMIT_EXCEEDED` 에러 |

### 5.6 블라인드 처리

| 항목 | 설명 |
|------|------|
| 대상 | 금칙어, 외부 링크 포함 메시지 (부적절 이미지 모더레이션은 V1 미포함 — SRS 7.6.5 TBD) |
| 전송자 처리 | `message_sent` + `isBlinded: true` |
| 수신자 처리 | `new_message` 미전송 |
| 푸시 | 미발송 |
| 자동 신고 | 외부 링크/금칙어 탐지 시 웹소켓이 자동신고 Kafka 이벤트 발행(`chat-auto-report-dating` / `chat-auto-report-munto`) → 앱 백엔드 consume(채팅 서버 미저장). 상세 [Kafka 이벤트 명세서](./kafka-events.md), SRS 7.6.6 |

### 5.7 다중 기기 지원

| 항목 | 설명 |
|------|------|
| 연결 | 기기별 독립적인 Socket.IO 연결 |
| 상태 관리 | 가장 최근 활동 기기 기준 |
| 푸시 정책 | 하나라도 Active/Idle이면 시스템 푸시 미발송 |

### 5.8 특수 메시지 (향후 구현)

| 타입 | 설명 | 생성 주체 |
|------|------|----------|
| `CHALLENGE_CHECKIN` | 챌린지 데일리 체크인 | 문토 백엔드 |
| `FEED` | 클럽 피드 카드 | 문토 백엔드 |
| `POLL` | 클럽 투표 카드 | 문토 백엔드 |

상세 content 형식은 [ERD 문서](./erd.md) 참조