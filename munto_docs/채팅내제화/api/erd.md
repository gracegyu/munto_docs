# 채팅 서비스 ERD

본 문서는 채팅 서비스의 데이터베이스 스키마를 정의합니다.
상세 요구사항은 [SRS 문서](./srs.md)를 참조하세요.

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

-- 신고 사유 (SRS 7.6.3 참조)
CREATE TYPE report_type AS ENUM (
    'SPAM',             -- 스팸/광고
    'PROFANITY',        -- 욕설
    'SEXUAL_CONTENT',   -- 성적 표현
    'HARASSMENT',       -- 괴롭힘
    'EXTERNAL_LINK',    -- 외부 링크 (자동 신고)
    'OTHER'             -- 기타
);

-- 신고 대상 타입
CREATE TYPE report_target_type AS ENUM (
    'MESSAGE',  -- 메시지 신고
    'USER'      -- 사용자 신고
);

-- 신고 처리 상태 (SRS 7.8.1 참조)
CREATE TYPE report_status_type AS ENUM (
    'PENDING',      -- 대기 중
    'REVIEWING',    -- 검토 중
    'RESOLVED',     -- 처리 완료
    'REJECTED'      -- 반려됨
);

-- 금칙어 일치 타입 (SRS 7.8.4 참조)
CREATE TYPE profanity_match_type AS ENUM (
    'PARTIAL',  -- 부분 일치
    'EXACT'     -- 완전 일치
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
    
    -- 그룹 채팅방 메타데이터 (SRS 7.2.1.1)
    socialing_id INT,                                       -- 소셜링 ID
    club_id INT,                                            -- 클럽 ID (향후)
    challenge_id INT,                                       -- 챌린지 ID (향후)
    
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
        CHECK (type != 'GROUP' OR (socialing_id IS NOT NULL OR club_id IS NOT NULL OR challenge_id IS NOT NULL)),
    CONSTRAINT chk_dating_room_meta
        CHECK (type != 'DATING_DM' OR match_id IS NOT NULL)
);

-- 인덱스
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_socialing_id ON chat_rooms(socialing_id);
CREATE INDEX idx_chat_rooms_club_id ON chat_rooms(club_id);
CREATE INDEX idx_chat_rooms_challenge_id ON chat_rooms(challenge_id);
CREATE INDEX idx_chat_rooms_match_id ON chat_rooms(match_id);
CREATE INDEX idx_chat_rooms_room_status ON chat_rooms(room_status);
CREATE INDEX idx_chat_rooms_chat_expires_at ON chat_rooms(chat_expires_at);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `type` | GROUP (소셜링/클럽/챌린지), DM (개인), DATING_DM (데이팅) |
| `socialing_id`, `club_id`, `challenge_id` | 그룹 채팅방의 경우 하나 필수 |
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

### 4. reports (신고)

메시지 및 사용자 신고 정보를 저장합니다.

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reporter_id INT,                                        -- 신고자 ID (NULL이면 자동 신고)
    target_type report_target_type NOT NULL,                -- MESSAGE 또는 USER
    target_id INT NOT NULL,                                 -- 메시지 ID 또는 사용자 ID
    report_type report_type NOT NULL,                       -- 신고 사유
    reason TEXT,                                            -- 상세 내용 (최대 500자)
    evidence_urls JSONB,                                    -- 증거 URL 목록 (최대 5개)
    report_number VARCHAR(50) UNIQUE NOT NULL,              -- 접수 번호 (예: RPT-20240101-001)
    status report_status_type NOT NULL DEFAULT 'PENDING',   -- 처리 상태
    is_auto BOOLEAN NOT NULL DEFAULT FALSE,                 -- 자동 신고 여부
    created_at BIGINT NOT NULL,                             -- 접수 시간 (Unix time ms)
    reviewed_at BIGINT,                                     -- 검토 시작 시간 (Unix time ms)
    resolved_at BIGINT                                      -- 처리 완료 시간 (Unix time ms)
);

-- 인덱스
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_is_auto ON reports(is_auto);
CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_created_at ON reports(created_at);
```

**필드 설명:**

| 필드 | 설명 |
|------|------|
| `is_auto` | TRUE이면 외부 링크 자동 신고 |
| `reporter_id` | 자동 신고 시 NULL |
| `evidence_urls` | 스크린샷 등 증거 자료 URL 배열 |

---

### 5. blocks (차단)

사용자 간 차단 정보를 저장합니다.

```sql
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    blocker_id INT NOT NULL,                                -- 차단한 사용자 ID
    blocked_id INT NOT NULL,                                -- 차단당한 사용자 ID
    blocked_at BIGINT NOT NULL,                             -- 차단 시간 (Unix time ms)
    
    CONSTRAINT unique_blocker_blocked UNIQUE (blocker_id, blocked_id)
);

-- 인덱스
CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);
```

**설명:**
- 차단 시 해당 사용자와의 모든 채팅방 나가기 처리
- 차단된 사용자와의 새 채팅방 생성 방지

---

### 6. notification_settings (채팅 알림 설정)

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

### 7. room_notification_settings (채팅방별 알림 설정)

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

### 8. profanity (금칙어)

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

## ERD 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              chat_rooms                                      │
│  (채팅방)                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  id (PK)                                                                    │
│  type: GROUP | DM | DATING_DM                                               │
│  title, socialing_id, club_id, challenge_id                                 │
│  match_id, room_status, activated_at, chat_expires_at                       │
│  last_message_at, created_at, updated_at                                    │
│  CHECK: GROUP → socialing/club/challenge_id 중 하나 필수                     │
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
  모두 읽음으로 처리            │ sent_at         │
                              └─────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                             독립 테이블                                       │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│    reports      │     blocks      │ notification_   │ room_notification_    │
│    (신고)        │    (차단)        │ settings        │ settings              │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│ id (PK)         │ id (PK)         │ id (PK)         │ id (PK)               │
│ reporter_id     │ blocker_id      │ user_id (UQ)    │ room_id (FK)          │
│ target_type     │ blocked_id      │ chat_notif_     │ user_id               │
│ target_id       │ blocked_at      │ enabled         │ enabled               │
│ report_type     │                 │ updated_at      │ updated_at            │
│ reason          │                 │                 │                       │
│ evidence_urls   │                 │                 │                       │
│ report_number   │                 │                 │                       │
│ status          │                 │                 │                       │
│ is_auto         │                 │                 │                       │
│ created_at      │                 │                 │                       │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘


┌─────────────────┐
│   profanity     │
│   (금칙어)       │
├─────────────────┤
│ id (PK)         │
│ word (UQ)       │
│ match_type      │
│ case_sensitive  │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## 인덱스 전략 요약

| 테이블 | 주요 인덱스 | 용도 |
|--------|------------|------|
| `chat_rooms` | `type`, `socialing_id`, `match_id`, `last_message_at` | 채팅방 조회/목록 정렬 |
| `chat_room_participants` | `room_id`, `user_id`, `(room_id, user_id)` | 참여자 조회, 읽음 처리 |
| `messages` | `(room_id, id)`, `content->'images'` (GIN) | 커서 기반 페이지네이션, 이미지 모아보기 |
| `reports` | `status`, `is_auto`, `created_at` | 신고 목록 조회 |

---

## 데이터 보관 정책 (SRS 6.5.6 참조)

| 데이터 | 보관 기간 | 정리 방법 |
|--------|----------|----------|
| 메시지 | 30일 | `sent_at` 기준 정기 삭제 |
| 만료된 채팅방 (데이팅 DM) | 만료 후 30일 | `chat_expires_at` 기준 정기 삭제 |
| 탈퇴 사용자 데이터 | 탈퇴 후 7일 | 외부 user 테이블 연동 |
| 신고 데이터 | 별도 결정 | 백오피스 관리 |

### 데이터 정리 쿼리

```sql
-- 30일 지난 메시지 삭제
DELETE FROM messages 
WHERE sent_at < EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - (30 * 24 * 60 * 60 * 1000);

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
