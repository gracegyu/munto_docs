# 채팅 서비스 ERD

본 문서는 채팅 서비스의 데이터베이스 스키마를 정의합니다.
상세 요구사항은 [SRS 문서](../srs.md)를 참조하세요.

---

## 네이밍 컨벤션

- **Database**: snake_case 사용 (예: `user_id`, `created_at`, `is_active`)
- **API (JSON)**: camelCase 사용 (예: `userId`, `createdAt`, `isActive`)
- **서버에서 자동 변환 처리**

---

## 타입 정의

```sql
-- 채팅방 타입 (SRS 2.4 참조)
CREATE TYPE chat_room_type AS ENUM (
    'GROUP',        -- 그룹 채팅방 (소셜링/클럽/챌린지)
    'DM',           -- 개인 DM
    'DATING_DM'     -- 데이팅 DM
);

-- 그룹 채팅방 모임 종류 (GROUP 전용, SRS 7.2.1.1 참조)
CREATE TYPE moim_type AS ENUM (
    'SOCIALING',    -- 소셜링
    'CLUB',         -- 클럽
    'CHALLENGE'     -- 챌린지
);

-- 채팅방 상태 (데이팅 DM 전용, SRS 7.2.1.3 참조)
CREATE TYPE room_status_type AS ENUM (
    'CREATED',      -- 생성됨 (활성화 전)
    'ACTIVATED',    -- 활성화됨 (재화 차감 완료)
    'EXPIRED',      -- 만료됨 (30일 경과)
    'LEFT'          -- 나감 (한쪽 이상 나감)
);

-- 참여자 역할 (SRS 6.5.2 참조)
CREATE TYPE participant_role_type AS ENUM (
    'HOST',         -- 호스트 (모임 주최자)
    'MANAGER',      -- 매니저 (멤버 내보내기/공지 권한)
    'MEMBER',       -- 일반 멤버
    'ADMINISTRATOR' -- 관리자 (문토봇)
);

-- 메시지 타입 (SRS 7.3, 7.7 참조)
CREATE TYPE message_type AS ENUM (
    'TEXT',             -- 텍스트 메시지
    'IMAGE',            -- 이미지 메시지 (단일/모아보내기)
    'SYSTEM',           -- 시스템 메시지 (입장/퇴장/공지 등)
    'CHALLENGE_CHECKIN', -- 챌린지 데일리 체크인 메시지 (향후)
    'FEED',             -- 클럽 피드 카드 메시지 (향후)
    'POLL'              -- 클럽 투표 카드 메시지 (향후)
);

-- (신고 enum 제거됨) 신고 접수·처리는 각 앱 백엔드(데이팅 safety / 문토 report) 소유 — SRS 7.6.6 참조

-- 금칙어 일치 타입 (SRS 7.8.5 참조)
CREATE TYPE profanity_match_type AS ENUM (
    'PARTIAL',  -- 부분 일치
    'EXACT'     -- 완전 일치
);

-- 백오피스 감사 로그 행동 유형 (SRS 7.8.1 참조)
CREATE TYPE audit_action_type AS ENUM (
    'DELETE_MESSAGE',   -- 메시지 삭제
    'FORCE_LEAVE',      -- 차단/제재 이벤트로 인한 채팅방 강제 퇴장 (차단·제재 결정 자체는 앱 백엔드 소유 — SRS 7.6.7/7.8.4)
    'UPDATE_PROFANITY'  -- 금칙어 추가/수정/삭제
);
```

---

## 테이블 정의

### 1. chat_rooms (채팅방)

채팅방 기본 정보를 저장합니다.

```sql
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    type chat_room_type NOT NULL,                           -- 채팅방 타입
    title VARCHAR(255),                                     -- 채팅방 제목 (그룹 채팅방)
    
    -- 그룹 채팅방 메타데이터 (SRS 7.2.1.1) — 모임 종류 + 모임 ID 한 쌍으로 표현
    moim_type moim_type,                                    -- 모임 종류 (SOCIALING | CLUB | CHALLENGE), GROUP 전용
    moim_id INT,                                            -- 모임 ID (외부 참조: 소셜링/클럽/챌린지 ID, FK 없음)
    
    -- 데이팅 DM 메타데이터 (SRS 7.2.1.3)
    match_id INT,                                           -- 데이팅 매칭 ID
    room_status room_status_type DEFAULT 'CREATED',         -- 채팅방 상태
    activated_at BIGINT,                                    -- 활성화 시간 (Unix time ms)
    chat_expires_at BIGINT,                                 -- 만료 시간 (ms, 매칭 후 30일)
    
    -- 공통 필드
    last_message_at BIGINT,                                 -- 최근 메시지 시간 (Unix time ms)
    created_at BIGINT NOT NULL,                             -- 생성 시간 (Unix time ms)
    updated_at BIGINT NOT NULL,                             -- 수정 시간 (Unix time ms)

    -- type별 필수 컬럼 무결성
    CONSTRAINT chk_group_room_meta
        CHECK (type != 'GROUP' OR (moim_type IS NOT NULL AND moim_id IS NOT NULL)),
    CONSTRAINT chk_dating_room_meta
        CHECK (type != 'DATING_DM' OR match_id IS NOT NULL)
);

-- 인덱스
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_moim ON chat_rooms(moim_type, moim_id);  -- 모임 종류·ID 필터 (그룹)
CREATE INDEX idx_chat_rooms_match_id ON chat_rooms(match_id);
CREATE INDEX idx_chat_rooms_room_status ON chat_rooms(room_status);
CREATE INDEX idx_chat_rooms_chat_expires_at ON chat_rooms(chat_expires_at);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `type` | GROUP (소셜링/클럽/챌린지), DM (개인), DATING_DM (데이팅) |
| `moim_type`, `moim_id` | 그룹 채팅방 전용. 모임 종류(SOCIALING/CLUB/CHALLENGE) + 모임 ID. GROUP이면 둘 다 필수 |
| `match_id` | 데이팅 DM의 경우 필수 |
| `room_status` | 데이팅 DM 전용 상태 관리 |
| `last_message_at` | 채팅방 목록 정렬용 |

---

### 2. chat_room_participants (채팅방 참여자)

채팅방 참여자 정보를 저장합니다.

읽음 처리는 `last_read_message_id` 단일 컬럼으로 관리합니다. 채팅은 순서대로 읽히므로 마지막으로 읽은 메시지 이전은 모두 읽은 것으로 간주합니다.

```sql
CREATE TABLE chat_room_participants (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,                                   -- 채팅방 ID
    user_id INT NOT NULL,                                   -- 사용자 ID (외부 참조)
    role participant_role_type NOT NULL DEFAULT 'MEMBER',   -- 역할
    joined_at BIGINT NOT NULL,                              -- 참여 시간 (Unix time ms)
    left_at BIGINT,                                         -- 나간 시간 (ms, NULL이면 참여 중)
    last_read_message_id BIGINT,                            -- 마지막으로 읽은 메시지 ID (NULL이면 아무것도 읽지 않음)
    
    CONSTRAINT fk_participants_room_id 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);

-- 인덱스
CREATE INDEX idx_participants_room_id ON chat_room_participants(room_id);
CREATE INDEX idx_participants_user_id ON chat_room_participants(user_id);
CREATE INDEX idx_participants_room_user ON chat_room_participants(room_id, user_id);
CREATE INDEX idx_participants_left_at ON chat_room_participants(left_at);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `role` | HOST (호스트), MANAGER (매니저), MEMBER (멤버), ADMINISTRATOR (문토봇) |
| `left_at` | NULL이면 현재 참여 중, 값이 있으면 나간 상태 |
| `last_read_message_id` | 읽음 처리 기준. 이 ID 이하의 메시지는 모두 읽음으로 처리 |

**읽음 처리 쿼리 패턴:**

```sql
-- 안읽은 메시지 수 (채팅방 목록 뱃지)
SELECT COUNT(*) FROM messages
WHERE room_id = :roomId
  AND id > COALESCE(:last_read_message_id, 0);

-- 메시지별 읽은 사람 수 (메시지 옆 읽음 표시)
SELECT COUNT(*) FROM chat_room_participants
WHERE room_id = :roomId
  AND last_read_message_id >= :messageId
  AND left_at IS NULL;

-- 읽음 처리 (채팅방 진입 시)
UPDATE chat_room_participants
SET last_read_message_id = :latestMessageId
WHERE room_id = :roomId AND user_id = :userId;
```

---

### 3. messages (메시지)

채팅 메시지를 저장합니다.

**순서 보장 기준:** `id`(BIGSERIAL)가 메시지 순서의 단일 진실 공급원(Single Source of Truth)입니다. `sent_at`은 UI 표시용이며 정렬 기준이 아닙니다. (SRS 7.3.5 참조)

```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,                               -- 메시지 순서 기준 (SSOT)
    room_id INT NOT NULL,                                   -- 채팅방 ID
    sender_id INT NOT NULL,                                 -- 전송자 ID (외부 참조)
    type message_type NOT NULL,                             -- 메시지 타입
    content JSONB NOT NULL,                                 -- 메시지 내용
    -- TEXT: {"text": "메시지 내용"}
    -- IMAGE: {"images": ["url1", "url2", ...]} (단일도 배열)
    -- SYSTEM: {"action": "JOIN|LEAVE|ANNOUNCE", "data": {...}}
    is_announcement BOOLEAN NOT NULL DEFAULT FALSE,         -- 공지 여부
    is_blinded BOOLEAN NOT NULL DEFAULT FALSE,              -- 블라인드 여부 (외부 링크 등)
    original_content JSONB,                                 -- 블라인드 처리 전 원본 내용
    blinded_at BIGINT,                                      -- 블라인드 처리 시간 (Unix time ms)
    blind_reason VARCHAR(255),                              -- 블라인드 사유
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,           -- 의심 메시지 자동 탐지 플래그 (SRS 7.8.8, V2+ 활성. V1부터 forward-compatible 보유)
    sent_at BIGINT NOT NULL,                                -- 전송 시간 (Unix time ms)
    
    CONSTRAINT fk_messages_room_id 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_messages_room_id_cursor ON messages(room_id, id);  -- 커서 기반 페이지네이션 (id가 SSOT)
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_is_announcement ON messages(is_announcement);
CREATE INDEX idx_messages_is_blinded ON messages(is_blinded);
CREATE INDEX idx_messages_content_images ON messages USING GIN ((content->'images'));

-- 백오피스 키워드 검색용 bigram 인덱스 (한글 부분 문자열 검색 최적화)
-- 사전 설정: CREATE EXTENSION IF NOT EXISTS pg_bigm;
CREATE INDEX idx_messages_content_text_bigm ON messages 
USING GIN ((content->>'text') gin_bigm_ops);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `type` | TEXT (텍스트), IMAGE (이미지), SYSTEM (시스템) |
| `content` | JSONB 형식, 타입별로 구조가 다름 |
| `is_announcement` | 공지로 설정된 메시지 |
| `is_blinded` | 외부 링크 등으로 블라인드 처리된 메시지 |
| `original_content` | 블라인드 처리 전 원본 내용 (블라인드 시에만 저장) |
| `blinded_at` | 블라인드 처리 시간 (Unix time ms) |
| `blind_reason` | 블라인드 사유 (예: EXTERNAL_LINK, PROFANITY 등) |

**content 형식:**

```json
// TEXT
{"text": "안녕하세요!"}

// IMAGE (단일)
{"images": ["https://s3.../image1.jpg"]}

// IMAGE (모아보내기)
{"images": ["https://s3.../image1.jpg", "https://s3.../image2.jpg"]}

// SYSTEM (입장)
{"action": "JOIN", "data": {"userId": 123, "nickname": "사용자"}}

// SYSTEM (퇴장)
{"action": "LEAVE", "data": {"userId": 123, "nickname": "사용자"}}

// SYSTEM (공지 설정)
{"action": "ANNOUNCE", "data": {"messageId": 456}}

// CHALLENGE_CHECKIN (챌린지 데일리 체크인) - 향후 구현
{
  "challengeId": 123,
  "userId": 456,
  "nickname": "사용자",
  "imageUrl": "https://s3.../checkin.jpg",
  "checkinDate": "2024-01-15",
  "message": "오늘도 완료!"
}

// FEED (클럽 피드 카드) - 향후 구현
{
  "feedId": 789,
  "clubId": 123,
  "channelId": 456,
  "channelName": "일상",
  "userId": 789,
  "nickname": "사용자",
  "previewText": "오늘 클럽 모임 후기...",
  "thumbnailUrl": "https://s3.../thumbnail.jpg"
}

// POLL (클럽 투표 카드) - 향후 구현
{
  "pollId": 101,
  "clubId": 123,
  "title": "다음 모임 장소는?",
  "items": [
    {"id": 1, "text": "강남역", "voteCount": 5},
    {"id": 2, "text": "홍대입구역", "voteCount": 3}
  ],
  "expiresAt": 1705363200000,
  "multipleChoice": false,
  "anonymous": true,
  "allowAddItem": false,
  "totalVotes": 8
}
```

---

> **신고(report) 테이블 없음** — 채팅 신고 접수·처리·저장은 채팅 서버가 보유하지 않는다. 사용자 신고는 클라이언트가 각 앱 백엔드(데이팅 `safety` / 문토 `report`)의 신고 API를 직접 호출하고, 자동 신고(외부 링크 등)는 채팅 서버가 앱 백엔드 신고 API로 전달한다(서버-투-서버). 백오피스 신고 처리도 기존 앱 백오피스를 사용한다. (SRS 7.6.6 참조) 신고 대상 메시지 원문은 채팅 서버 admin 메시지 조회로 제공.

---

> **차단(block) 테이블 없음** — 사용자 차단은 채팅을 넘어 매칭·프로필·소셜링·댓글 등 앱 전역에 영향을 주므로 **차단 SOT는 각 앱 백엔드**(데이팅 / 문토)다. 채팅 서버는 차단을 저장·소유하지 않고, **이벤트 기반으로 강제**한다: 차단 발생 시 앱 백엔드가 채팅 서버에 S2S로 해당 DM 방 종료/강제 퇴장을 요청하고(감사 로그 `FORCE_LEAVE`), 신규 DM 생성은 앱 백엔드가 차단 여부를 확인한 뒤 생성 요청한다. (SRS 7.6.7 참조)

---

### 4. notification_settings (채팅 알림 설정)

사용자별 채팅 알림 설정(전역, 모든 채팅방 공통)을 저장합니다. **채팅 서버 소유**(SRS 7.5.2 — 발송 주체가 채팅 서버이므로). 전체 알림(앱 마스터)·기기 알림 권한은 기기/앱 레벨이라 여기 저장하지 않습니다. 기존 문토/데이팅 백엔드의 채팅 알림 설정값은 채팅 서버 DB로 마이그레이션합니다.

```sql
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,                            -- 사용자 ID
    chat_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE, -- 채팅 알림 (전역). 채팅 서버 소유 (SRS 7.5.2)
    updated_at BIGINT NOT NULL                              -- 업데이트 시간 (Unix time ms)
);

-- 인덱스
CREATE INDEX idx_notification_user_id ON notification_settings(user_id);
```

---

### 5. room_notification_settings (채팅방별 알림 설정)

채팅방별 개별 알림 설정을 저장합니다.

```sql
CREATE TABLE room_notification_settings (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,                                   -- 채팅방 ID
    user_id INT NOT NULL,                                   -- 사용자 ID
    enabled BOOLEAN NOT NULL DEFAULT TRUE,                  -- 알림 켜기/끄기
    updated_at BIGINT NOT NULL,                             -- 업데이트 시간 (Unix time ms)
    
    CONSTRAINT fk_room_notif_room_id 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    CONSTRAINT unique_room_notif_room_user UNIQUE (room_id, user_id)
);

-- 인덱스
CREATE INDEX idx_room_notif_room_id ON room_notification_settings(room_id);
CREATE INDEX idx_room_notif_user_id ON room_notification_settings(user_id);
```

---

### 6. profanity (금칙어)

관리자용 금칙어 목록을 저장합니다.

```sql
CREATE TABLE profanity (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL UNIQUE,                      -- 금칙어
    match_type profanity_match_type NOT NULL DEFAULT 'PARTIAL', -- 일치 타입
    case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,          -- 대소문자 구분
    created_at BIGINT NOT NULL,                             -- 생성 시간 (Unix time ms)
    updated_at BIGINT NOT NULL                              -- 수정 시간 (Unix time ms)
);

-- 인덱스
CREATE INDEX idx_profanity_word ON profanity(word);
CREATE INDEX idx_profanity_match_type ON profanity(match_type);
```

---

### 7. audit_log (백오피스 감사 로그)

관리자의 수정/삭제 행동을 기록합니다. 조회 행동은 제외합니다. (SRS 7.8.1 참조)

```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id INT NOT NULL,                                   -- 관리자 ID (UserGrade.ADMIN)
    action_type audit_action_type NOT NULL,                 -- 행동 유형
    target_type VARCHAR(20) NOT NULL,                       -- 대상 종류 (MESSAGE | USER | PROFANITY)
    target_id BIGINT NOT NULL,                              -- 대상 ID (메시지/사용자/금칙어 ID)
    reason TEXT,                                            -- 사유 (선택)
    created_at BIGINT NOT NULL                              -- 처리 시간 (Unix time ms)
);

-- 인덱스
CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `admin_id` | 행동을 수행한 관리자 ID |
| `action_type` | DELETE_MESSAGE / FORCE_LEAVE / UPDATE_PROFANITY |
| `target_type`, `target_id` | 대상 식별 (메시지/사용자/금칙어) |
| `reason` | 처리 사유 (선택) |

---

## 단계별 활성화 (추적용 태그)

빌드를 단계별로 쪼개는 것이 아니라, 스키마는 V1~V4 전체를 미리 설계(forward-compatible)한다. 아래는 각 테이블이 **어느 전환 단계에서 활성·필수가 되는지** 추적용 태그다(SRS 2.7).

| 테이블 | 활성 단계 | 비고 |
|--------|----------|------|
| `chat_rooms` | **V1**~ | `moim_type`/`moim_id`(그룹용: 소셜링=V3·클럽/챌린지=V4)는 nullable로 V1부터 미리 보유 |
| `chat_room_participants` | **V1**~ | 읽음 커서(`last_read_message_id`) |
| `messages` | **V1**~ | `message_type`의 CHALLENGE_CHECKIN/FEED/POLL은 V4용, V1부터 enum 보유. `is_suspicious`는 V2+(자동 탐지 7.8.8)용이나 V1부터 nullable 보유(forward-compatible) |
| `notification_settings` | **V1** | 채팅 알림 설정 |
| `room_notification_settings` | **V1** | 채팅방별 알림 |
| `profanity` | **V1** | 런타임 필터링(시드). 관리 UI는 V2+(SRS 7.8.5) |
| `audit_log` | **V1** | 백오피스 운영 필수 |

> 클럽 투표·피드·채널 등 특수 기능 데이터는 문토 백엔드 소유(SRS 7.7), **신고(report)·차단(block)은 각 앱 백엔드(데이팅 / 문토) 소유**(SRS 7.6.6/7.6.7 — 차단은 매칭·프로필·소셜링 등 앱 전역 영향)이므로 채팅 ERD에 두지 않는다. 채팅 ERD는 자기 소유 범위(방·메시지·참여자·알림설정·금칙어·감사로그)만 설계한다.

---

## ERD 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              chat_rooms                                      │
│  (채팅방)                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  id (PK)                                                                    │
│  type: GROUP | DM | DATING_DM                                               │
│  title, moim_type, moim_id                                                  │
│  match_id, room_status, activated_at, chat_expires_at                       │
│  last_message_at, created_at, updated_at                                    │
│  CHECK: GROUP → moim_type + moim_id 필수                                     │
│  CHECK: DATING_DM → match_id 필수                                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │                              │
         │ 1:N                          │ 1:N
         ▼                              ▼
┌──────────────────────┐      ┌─────────────────┐
│ chat_room_           │      │    messages     │
│ participants         │      │    (메시지)      │
├──────────────────────┤      ├─────────────────┤
│ id (PK)              │      │ id (PK, BIGINT) │
│ room_id (FK)         │      │ room_id (FK)    │
│ user_id              │      │ sender_id       │
│ role                 │      │ type            │
│ joined_at            │      │ content (JSONB) │
│ left_at              │      │ is_announcement │
│ last_read_message_id │◄─ ─ ─│ is_blinded      │
└──────────────────────┘      │ original_content│
  읽음 처리: last_read_        │ blinded_at      │
  message_id 이하는            │ blind_reason    │
  모두 읽음으로 처리            │ is_suspicious   │
                              │ sent_at         │
                              └─────────────────┘


┌─────────────────┬───────────────────────┐
│ notification_   │ room_notification_    │
│ settings        │ settings              │
├─────────────────┼───────────────────────┤
│ id (PK)         │ id (PK)               │
│ user_id (UQ)    │ room_id (FK)          │
│ chat_notif_     │ user_id               │
│ enabled         │ enabled               │
│ updated_at      │ updated_at            │
└─────────────────┴───────────────────────┘


┌─────────────────┐      ┌─────────────────┐
│   profanity     │      │   audit_log     │
│   (금칙어)       │      │  (감사 로그)     │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK, BIGINT) │
│ word (UQ)       │      │ admin_id        │
│ match_type      │      │ action_type     │
│ case_sensitive  │      │ target_type     │
│ created_at      │      │ target_id       │
│ updated_at      │      │ reason          │
└─────────────────┘      │ created_at      │
                         └─────────────────┘
```

---

## 인덱스 전략 요약

| 테이블 | 주요 인덱스 | 용도 |
|--------|------------|------|
| `chat_rooms` | `type`, `(moim_type, moim_id)`, `match_id`, `last_message_at` | 채팅방 조회/목록 정렬 |
| `chat_room_participants` | `room_id`, `user_id`, `(room_id, user_id)` | 참여자 조회, 읽음 처리 |
| `messages` | `(room_id, id)`, `content->'images'` (GIN) | 커서 기반 페이지네이션, 이미지 모아보기 |

---

## 데이터 보관 정책 (SRS 6.5.6 기준 — 3단계)

메시지는 **30일(사용자 조회) → 90일(백오피스 운영 DB) → 1년(S3 Cold Storage)** 3단계로 관리한다. **모든 채팅 종류 공통**(데이팅 DM·문토 DM·소셜링·클럽·챌린지). 클럽 완전 마이그레이션으로 이관된 메시지도 동일 정책을 따른다(이관=데이터 보존, 사용자 조회는 공통 30일).

| 데이터 | 보관/조회 | 저장 위치 | 정리 방법 |
|--------|----------|----------|----------|
| 메시지 — 사용자 조회 | 30일 | 운영 DB | **삭제 아님** — 조회 시 최근 30일만 반환(앱/웹) |
| 메시지 — 백오피스 검색 | 90일 | 운영 DB | 90일 경과 시 운영 DB에서 삭제(사전 S3 아카이빙) |
| 메시지 — 로우데이터 | 1년 | S3 Cold Storage | 1년 경과 시 S3 자동 삭제 |
| 만료된 채팅방 (데이팅 DM) | 만료 후 30일 | 운영 DB | `chat_expires_at` 기준 정리 |
| 탈퇴 사용자 데이터 | 탈퇴 후 7일 | — | 외부 user 테이블 연동 |
| 감사 로그(audit_log) | 별도 결정 | 운영 DB | 백오피스 관리 |

> "사용자 조회 30일"은 **삭제가 아니라 조회 범위 제한**(애플리케이션 레벨 필터)이다. 실제 운영 DB 삭제는 90일 경과 + S3 아카이빙 완료 후 수행한다.

### 데이터 정리 쿼리

```sql
-- 1) 사용자 조회 제한(30일): 삭제가 아니라 "조회 쿼리에서 필터"
--    예) 앱/웹 메시지 목록: WHERE room_id = :roomId
--          AND sent_at >= EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - (30 * 24*60*60*1000)
--    (백오피스 조회는 이 필터 없이 90일까지 조회)

-- 2) 90일 경과 메시지: 운영 DB에서 삭제 (사전 S3 아카이빙 완료 전제)
DELETE FROM messages
WHERE sent_at < EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - (90 * 24 * 60 * 60 * 1000);
-- (S3 아카이브의 1년 경과분은 S3 Lifecycle 정책으로 자동 삭제)

-- 만료된 데이팅 DM 상태 업데이트
UPDATE chat_rooms 
SET room_status = 'EXPIRED'
WHERE type = 'DATING_DM' 
  AND chat_expires_at < EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
  AND room_status != 'EXPIRED';

-- 만료 후 30일 지난 채팅방 삭제
DELETE FROM chat_rooms 
WHERE room_status = 'EXPIRED' 
  AND chat_expires_at < EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - (30 * 24 * 60 * 60 * 1000);
```

---

## 보안 고려사항

1. **외부 참조**: `user_id`는 외부 시스템(user 테이블) 참조, 외래키 제약 없음
2. **애플리케이션 레벨 무결성**: 사용자 존재 여부는 애플리케이션에서 확인
3. **사용자 연결 상태**: Redis String에서 관리 (DB 저장 안함)
   - `SET connected_users:{userId} {socketId}`: 연결된 사용자 관리
   - `SET active_room:{userId} {roomId}`: 현재 보고 있는 채팅방
   - 온라인 여부: `EXISTS connected_users:{userId}`로 확인
   - Active/Idle/Offline 상태로 푸시 알림 분기 결정
4. **Socket.IO Room**: Socket.IO 내부에서 관리 (DB 저장 안함)