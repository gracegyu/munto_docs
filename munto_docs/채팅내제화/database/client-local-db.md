# 채팅 클라이언트 로컬 DB 스키마

채팅 SDK(`munto_chat_sdk` / `@munto/chat-sdk`)가 기기 내에 유지하는 로컬 DB의 **공통 논리 스키마**입니다.

- 플랫폼별 구현체는 다르나(코드·ORM 공유 불가), 필드명·타입·구조는 아래 **공통 논리 스키마(SOT) 1벌**을 기준으로 양쪽이 동일하게 구현합니다. 필드 매핑표 + parity(정합) 테스트로 어긋남을 막습니다.
- ID 타입 등 필드 정의는 **서버 ERD(`erd.md`) 기준**으로 통일합니다.
- 양쪽 모두 **SQLite 기반**이라 논리 스키마가 1:1로 매핑됩니다. JSONB가 없으므로 `content` 필드는 JSON을 직렬화한 TEXT로 저장합니다.

**DB 기술 (확정):**

| 플랫폼 | 관계형 DB (메시지·방·전송큐) | KV (설정/플래그) | 민감값(토큰) |
|---|---|---|---|
| Flutter (문토/임베드) | **Drift** (SQLite) | shared_preferences | flutter_secure_storage |
| React Native (Closer) | **expo-sqlite + Drizzle ORM** | react-native-mmkv | expo-secure-store |

> Flutter의 Isar는 미유지보수(abandoned)로 배제, RN의 WatermelonDB는 현재 규모(10만 미만)엔 과해 배제. 선택한 로컬 DB가 ORM 역할을 겸하므로 별도 ORM은 얹지 않습니다.

---

## 타입 정의 (서버 ERD와 동일 값 사용)

```
-- message_type: TEXT | IMAGE | SYSTEM | CHALLENGE_CHECKIN | FEED | POLL
-- chat_room_type: GROUP | DM | DATING_DM
-- thumbnail_type: PROFILE | ROOM
```

---

## 테이블 정의

### 1. pending_messages (전송 실패 메시지)

전송 실패(`FAILED`) 상태의 메시지를 영구 저장합니다. 사용자가 재전송 성공하거나 명시적으로 삭제하기 전까지 유지됩니다.

```sql
CREATE TABLE pending_messages (
    id          TEXT    PRIMARY KEY,            -- 로컬 임시 ID (UUID)
    room_id     INTEGER NOT NULL,               -- 채팅방 ID (서버 chat_rooms.id)
    sender_id   INTEGER NOT NULL,               -- 전송자 ID (서버 user.id)
    type        TEXT    NOT NULL,               -- message_type: TEXT | IMAGE
    content     TEXT,                           -- 직렬화된 JSON. TEXT: {"text":"..."}, IMAGE 타입은 null
    image_path  TEXT,                           -- IMAGE 타입 전용: 기기 내 이미지 로컬 경로 (업로드 전)
    failed_at   BIGINT  NOT NULL,               -- 실패 시간 (Unix timestamp ms)
    created_at  BIGINT  NOT NULL                -- 최초 전송 시도 시간 (Unix timestamp ms)
);
```

**필드 설명:**

| 필드 | 설명 |
|---|---|
| `id` | 클라이언트에서 생성한 UUID. 서버 메시지 ID와 무관 |
| `content` | TEXT 타입: `{"text": "메시지 내용"}`. IMAGE 타입은 null |
| `image_path` | IMAGE 타입 전용. S3 업로드 전 기기 내 파일 경로. 업로드 성공 후 제거 |
| `failed_at` | 전송 실패 확정 시간. 재전송 UI 표시 기준 |

---

### 2. cached_messages (최근 메시지 캐시)

채팅방 진입 시 빠른 표시를 위해 최근 메시지를 캐싱합니다. 서버 메시지와 동일한 구조를 유지합니다.

```sql
CREATE TABLE cached_messages (
    id          BIGINT  PRIMARY KEY,            -- 서버 메시지 ID (messages.id, BIGSERIAL)
    room_id     INTEGER NOT NULL,               -- 채팅방 ID (서버 chat_rooms.id)
    sender_id   INTEGER NOT NULL,               -- 전송자 ID (서버 user.id)
    type        TEXT    NOT NULL,               -- message_type: TEXT | IMAGE | SYSTEM | ...
    content     TEXT    NOT NULL,               -- 직렬화된 JSON (서버 messages.content JSONB와 동일 구조)
    -- TEXT:   {"text": "안녕하세요!"}
    -- IMAGE:  {"images": ["https://s3.../image1.jpg", ...]}
    -- SYSTEM: {"action": "JOIN|LEAVE|ANNOUNCE", "data": {...}}
    is_read     INTEGER NOT NULL DEFAULT 0,     -- 읽음 여부: 0 | 1 (로컬 전용)
    sent_at     BIGINT  NOT NULL,               -- 전송 시간 (서버 messages.sent_at과 동일)
    cached_at   BIGINT  NOT NULL                -- 로컬 캐싱 시간 (로컬 전용)
);

-- 채팅방별 메시지 조회 (커서 기반 페이지네이션)
CREATE INDEX idx_cached_messages_room_id ON cached_messages(room_id, id);
```

**필드 설명:**

| 필드 | 설명 |
|---|---|
| `id` | 서버 `messages.id` (BIGSERIAL). 정렬 SSOT |
| `content` | 서버 JSONB를 TEXT로 직렬화. 구조는 서버와 동일 |
| `is_read` | 로컬 전용. 서버 `last_read_message_id` 기반으로 계산하여 저장 |
| `sent_at` | 서버와 동일한 Unix timestamp ms |
| `cached_at` | 로컬 캐싱 시각. LRU 삭제 기준 |

---

### 3. cached_rooms (채팅방 목록 캐시)

채팅방 목록 화면의 빠른 표시를 위해 참여 채팅방 정보를 캐싱합니다.

```sql
CREATE TABLE cached_rooms (
    id               INTEGER PRIMARY KEY,       -- 서버 채팅방 ID (chat_rooms.id, SERIAL)
    type             TEXT    NOT NULL,           -- chat_room_type: GROUP | DM | DATING_DM
    name             TEXT,                       -- 채팅방 이름
    thumbnail_url    TEXT,                       -- 채팅방 대표 이미지 URL (S3)
    last_message     TEXT,                       -- 미리보기용 최근 메시지 텍스트 (로컬 전용)
    last_message_at  BIGINT,                     -- 최근 메시지 시간 (서버 chat_rooms.last_message_at과 동일)
    unread_count     INTEGER NOT NULL DEFAULT 0, -- 읽지 않은 메시지 수 (로컬 전용)
    cached_at        BIGINT  NOT NULL            -- 로컬 캐싱 시간 (로컬 전용)
);
```

**필드 설명:**

| 필드 | 설명 |
|---|---|
| `id` | 서버 `chat_rooms.id` |
| `type` | 서버 `chat_room_type` Enum과 동일한 값 사용 |
| `last_message` | 목록 미리보기용 텍스트. 서버에는 없는 로컬 전용 필드 |
| `unread_count` | 서버 `last_read_message_id` 기반으로 계산하여 저장 |

---

### 4. cached_thumbnails (썸네일 캐시)

프로필 사진 및 채팅방 대표 이미지 썸네일만 기기에 저장합니다. 채팅방 내 메시지 이미지(S3 원본)는 저장하지 않습니다.

```sql
CREATE TABLE cached_thumbnails (
    target_id   INTEGER NOT NULL,               -- 대상 ID (user.id 또는 chat_rooms.id)
    type        TEXT    NOT NULL,               -- thumbnail_type: PROFILE | ROOM
    url         TEXT    NOT NULL,               -- 원본 S3 URL
    local_path  TEXT    NOT NULL,               -- 기기 내 썸네일 저장 경로
    file_size   INTEGER NOT NULL,               -- bytes
    cached_at   BIGINT  NOT NULL,               -- 로컬 캐싱 시간 (LRU 삭제 기준)

    PRIMARY KEY (target_id, type)
);
```

**필드 설명:**

| 필드 | 설명 |
|---|---|
| `target_id` | `type=PROFILE`이면 `user.id`, `type=ROOM`이면 `chat_rooms.id` |
| `type` | PROFILE 또는 ROOM |
| `local_path` | 다운로드된 썸네일의 기기 내 파일 경로 |
| `file_size` | 썸네일 파일 크기 (bytes). 전체 용량 계산에 사용 |
| `cached_at` | LRU 삭제 기준 |

---

## 로컬 DB 삭제 정책

| 테이블 | 삭제 조건 |
|---|---|
| `pending_messages` | 재전송 성공 시 자동 삭제, 또는 사용자가 명시적으로 삭제 시 |
| `cached_messages` | 용량 제한 도달 시 `cached_at` 기준 LRU 삭제 (상세 수치 TBD) |
| `cached_rooms` | 서버로부터 채팅방 나감 / 삭제 이벤트 수신 시 즉시 삭제 |
| `cached_thumbnails` | 전체 썸네일 용량 초과 시 `cached_at` 기준 오래된 항목부터 삭제 (상세 수치 TBD) |

---

## 서버 ERD와의 관계

| 로컬 테이블 | 서버 테이블 | 비고 |
|---|---|---|
| `cached_messages` | `messages` | `id`, `room_id`, `sender_id`, `type`, `content`, `sent_at` 동일 기준 |
| `cached_rooms` | `chat_rooms` | `id`, `type`, `last_message_at` 동일 기준 |
| `cached_thumbnails` | `chat_rooms`, 외부 `users` | `target_id`가 각각 참조 |
| `pending_messages` | — | 서버에 없는 로컬 전용 테이블 |

---

## 스키마 버전 / 마이그레이션 (forward-compatible)

V1 앱이 현장에 남은 채 V2~V4 스키마가 배포되므로(SRS §2.8.3 하위호환), V1부터 진화 가능한 스키마로 설계한다.

- 로컬 DB에 **스키마 버전 메타**를 둔다. (Drift = `schemaVersion`, Drizzle = `__drizzle_migrations` / `user_version` PRAGMA)
- 앱 시작 시 **자동 마이그레이션**을 수행한다. (Drift `MigrationStrategy`, Drizzle `useMigrations`)
- **규칙**:
  - 컬럼 추가는 **nullable 또는 기본값(default)** 으로만 — 구버전 데이터가 그대로 흡수되도록.
  - **파괴적 변경 금지**: 컬럼 삭제·타입 변경·이름 변경 금지(불가피하면 새 컬럼 추가 후 점진 이행).
  - 마이그레이션은 RN·Flutter 양쪽에서 동일 버전·동일 의미로 구현하고 parity 테스트로 검증.

## 손상(corruption) 복구

로컬 DB는 파일 기반이라 손상될 수 있다. 클라 DB는 캐시이고 서버가 SOT이므로 "깨져도 복구"가 원칙이다 (V1부터 적용).

1. 앱 시작/이상 감지 시 **무결성 체크** (`PRAGMA integrity_check`).
2. 손상 시 **로컬 DB 폐기 후 서버에서 재동기화** — `cached_*`는 서버에 영구 저장되어 손실 없음.
3. **`pending_messages`(미전송 전송 큐)는 캐시와 분리 저장**하여 폐기 시에도 보존하고 우선 플러시한다(유실 방지).

## 버전별 테이블 (단계 추가)

현재 4테이블은 **V1 baseline**이며, 이후 버전에서 추가한다.

| 버전 | 추가 테이블/컬럼 | 비고 |
|---|---|---|
| **V1** | `pending_messages`, `cached_messages`, `cached_rooms`, `cached_thumbnails` | 1:1 DM 중심 |
| **V2** | 방별 동기화 커서(예: `room_sync_state(room_id, last_message_id, synced_at)`) | 델타 동기화 `sync()` (SRS §2.9.2) |
| **V3·V4** | 그룹 참여자·공지 캐시, (V4) 특수기능(인증·투표) 캐시 | 그룹·클럽/챌린지 |

## 암호화 (현재 미적용)

로컬 메시지 at-rest 암호화(SQLCipher 등)는 **현재 범위에서 적용하지 않는다.** 데이팅 DM 민감성을 고려해 향후 필요 시 재검토한다(Drift·expo-sqlite 모두 SQLCipher 기반 암호화 지원).
