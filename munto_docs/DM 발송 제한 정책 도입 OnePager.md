# DM 발송 제한 정책 도입 OnePager

분류: SRS
작성자: 김범진
최근 수정일: 2026년 3월 9일 오후 2:56
최초 작성일: 2026년 3월 5일 오전 10:56
문서 상태: Active
생성 일시: 2026년 3월 5일 오전 10:56
최종 편집자: 김범진

## Project Name

DM 발송 제한 정책 (쿼터제) 도입

## Date

2026-03-05

## Submitter Info

김범진

## Project Description

무분별한 DM 발송을 제한하여 서비스 건전성을 확보하고 스팸을 방지하기 위한 쿼터제를 도입한다. 

사용자가 DM을 보낼 수 있는 고유 수신자 수를 일간/주간/월간 단위로 제한하며, 모임 참여 멤버·팔로워 등 서비스 내 관계가 있는 수신자는 제한에서 제외한다.

### 쿼터 제한 조건

- 일 10명 / 주 50명 / 월 100명 (하위 단위 합 > 상위 단위로 점진적 강화)
- 제한 대상: DM 발송만 차단 (수신은 가능)

### 제한 제외 대상

- 모임 그룹 채팅
- 본인 모임 참여한 멤버
- 본인 모임 참여했던 멤버
- 본인 모임 찜한 멤버
- 나를 팔로우하는 멤버

### 차단해야 하는 케이스

DM 쿼터 차단은 채팅방 존재 여부에 따라 **두 가지 케이스**로 나눠서 처리해야 한다.

[피그마 링크] [https://www.figma.com/design/CAql5x1tM0PfXUc1zMcibf/채팅?node-id=3586-13989&p=f&t=K3qPmZp5xKFKYYSo-0](https://www.figma.com/design/CAql5x1tM0PfXUc1zMcibf/%EC%B1%84%ED%8C%85?node-id=3586-13989&p=f&t=K3qPmZp5xKFKYYSo-0)

### Case 1. 신규 채팅방 (수신자와 기존 채팅방 없음)

- **차단 시점**: 채팅방 진입 전 (채팅방 자체가 만들어지면 안 됨)
- **동작**: 프로필 등에서 "채팅하기" 탭 시, 쿼터 초과인 경우 채팅방을 생성하지 않고 다이얼로그 안내
- **필요 정보**: 이 수신자와 채팅방이 존재하지 않음 + 쿼터 잔여량

### Case 2. 기존 채팅방 (수신자와 이미 채팅방 있음)

- **차단 시점**: 메시지 전송 버튼 (채팅방에는 진입 가능하나, 메시지 발송이 차단됨)
- **동작**: 기존 채팅방에 들어가서 메시지를 보내려 할 때, 이 수신자가 이번 기간에 아직 카운팅되지 않았고 쿼터가 초과된 경우 전송 차단 + 다이얼로그 안내
- **필요 정보**: 이 수신자가 현재 기간에 이미 카운팅된 수신자인지 + 쿼터 잔여량

두 케이스 모두 채팅방 존재 여부·쿼터 카운팅 기록을 판단해야 하므로, 서버 DB에서 DM 채널 정보와 쿼터 기록을 관리하는 것이 필수적이다.

## Business and Marketing Justification

- 무분별한 DM 스팸으로 인한 사용자 이탈 및 신고 증가 방지
- 건전한 커뮤니케이션 환경 조성으로 서비스 신뢰도 향상
- 모임 참여·팔로우 등 서비스 내 관계 기반 소통은 유지하여 유저 활동 저해 최소화

## Risk Assessment

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| `ClubLike`, `ChallengeLike` 테이블 인덱스 부재 | 제외 조건 쿼리 시 풀스캔 발생 | `userId` 인덱스 추가 (운영 DB 마이그레이션 필요) |
| BE 장애 시 DM 불가 | 1안 채택 시 BE가 SPOF | ~~Fail-open 정책 검토 (장애 시 발송 허용 + 모니터링)~~
Fail-closed 정책 적용(기존 그룹 채팅과 동일한 정책 적용) |
| 쿼터 수치 변경 시 코드 배포 필요 | 운영 유연성 저하 | `dm_quota_policies` 테이블로 DB 관리 |

## Resource and Scheduling Details

TBD

## Technical Description

### 현재 구조

현재 DM은 클라이언트(앱)에서 Sendbird SDK를 통해 직접 채널을 생성하고 메시지를 발송하는 구조이며, 백엔드는 Sendbird Webhook으로 `group_channel:message_send` 이벤트만 수신하여 푸시 알림을 처리하고 있다. 발송 카운팅 및 제한 로직은 백엔드·Sendbird 양쪽 모두 없다.

### 구현 방식 비교

| 항목 | 1안. S2S | 2안 변형. Webhook | 3안. BE 체크 |
| --- | --- | --- | --- |
| 구조 | 앱→BE API→Sendbird 채널 생성→URL 반환 | 앱→SDK 채널 생성→Webhook→초과 시 삭제 | 앱→BE 체크→통과 시 앱이 SDK로 생성 |
| 보안 | 완전 차단 | 사실상 차단 (레이스 윈도우 있음) | API 우회 가능 |
| UX | 명확 (사전 다이얼로그) | 애매 (방 생성→삭제, 안내 별도 처리) | 명확 (사전 다이얼로그) |
| 데이팅 구조 통일 | 가능 (동일 S2S 패턴) | 불일치 | 불일치 |
| SoT 관리 | DB 기반 | DB 기반
Webhook 유실 시 불일치 | 체크만, 발송은 앱 재량 |
| 운영 안정성 | 높음 | 중간 (삭제 실패/레이스 모니터링) | 낮음 (우회 탐지 필요) |

2안은 원래 Sendbird의 "Before Message Send" 웹훅으로 사전 차단하는 방식을 의도했으나, Sendbird에 해당 웹훅이 존재하지 않아 `group_channel:create`·`group_channel:message_send` 이벤트로 사후 삭제하는 변형 방식을 선택했다.

### Case별 차단 방식 상세

[피그마 링크] [https://www.figma.com/design/CAql5x1tM0PfXUc1zMcibf/채팅?node-id=3586-14248&t=K3qPmZp5xKFKYYSo-0](https://www.figma.com/design/CAql5x1tM0PfXUc1zMcibf/%EC%B1%84%ED%8C%85?node-id=3586-14248&t=K3qPmZp5xKFKYYSo-0)

### Case 1 (신규 채팅방)

- **1안 (S2S)**: 앱→BE API 호출 → 쿼터 초과 시 채널 미생성 + 에러 응답 → 클라이언트 다이얼로그
- **2안 (Webhook)**: 앱→SDK 채널 생성 → 웹훅 수신 → 초과 시 채널 삭제 (UX 상으로 노출될 수 있으나 실사용 영향 적음)
- **3안 (BE 체크)**: 앱→BE 쿼터 확인 API → 초과 시 클라이언트 다이얼로그, SDK 우회 시 차단 불가

### Case 2 (기존 채팅방)

- **1안 (S2S)**: 채팅 전송 가능 여부 조회 API 호출 → 전송 불가한 경우 에러 응답 → 클라이언트 다이얼로그
- **2안 (Webhook)**: `group_channel:message_send` 웹훅 수신 → 쿼터 초과 판단 → 메시지 삭제 + 푸시 미발송. 스팸 대상의 채팅방을 수신자가 열고 있을 확률은 사실상 없으므로 수신자 UX 영향 거의 없음. 발송자 안내는 삭제 후 앱 푸시로 처리
- **3안 (BE 체크)**: 앱에서 전송 전 BE 쿼터 확인 → 초과 시 다이얼로그. SDK 우회 시 차단 불가

### 결론: 1안 (S2S)

보안·UX·운영 안정성·구조 단순성 관점에서 가장 합리적이라고 생각합니다.

- **Case 1 (신규 채팅방)**: 앱→BE API→쿼터 체크→통과 시 Sendbird 채널 생성→URL 반환. 초과 시 에러 응답→클라이언트 다이얼로그
- **Case 2 (기존 채팅방)**: 메시지 전송도 BE API 경유로 변경. 채팅방 진입 시 쿼터 체크→통과 시 Sendbird Platform API로 메시지 발송. 초과 시 에러 응답→클라이언트 다이얼로그

2안은 메시지 삭제 실패·웹훅 유실 등 실패 케이스가 늘어난다. 1안은 쿼터 판단이 BE API 1곳에 집중되어 단순하며, 데이팅 백엔드의 S2S 구조와도 통일된다.

- 쿼터 수치는 `dm_quota_policies` 테이블로 DB 관리
- 운영자/CS 계정은 `dm_quota_exceptions` 테이블로 화이트리스트 처리
- 제외 조건 판단은 EXISTS 쿼리 사용
- `ClubLike`·`ChallengeLike` 테이블에 `userId` 인덱스 추가 선행 필요

### API 정의

### 1. DM 채널 생성 (Case 1)

```
POST /api/v1/dm/channel
```

**Request Body**:

```json
{
  "targetUserId": 12345
}
```

**Response 201 (성공)**:

```json
{
  "channelUrl": "sendbird_group_channel_xxxxx",
}
```

**Response 200 (이미 존재하는 채널)**:

```json
{
  "channelUrl": "sendbird_group_channel_xxxxx",
}
```

**Response 429 (쿼터 초과)**:

```json
{
  "statusCode": 429,
  "message": "DM quota exceeded",
  "error": "TooManyRequests",
  "data": {
    "quotaType": "DAILY",
    "limit": 10,
    "used": 10,
    "resetsAt": "2026-03-06T00:00:00Z"
  }
}
```

| HTTP Status | 코드 | 의미 | 클라이언트 처리 |
| --- | --- | --- | --- |
| 201 | - | 채널 생성 성공 | chatUrl로 채팅방 진입 |
| 200 | - | 채널 이미 존재 | 기존 chatUrl로 채팅방 진입 |
| 429 | `DM_QUOTA_EXCEEDED` | 쿼터 초과 | 다이얼로그 표시 |
| 400 | `INVALID_TARGET_USER` | 존재하지 않는 유저 | 에러 안내 |
| 403 | `USER_BLOCKED` | 차단된 유저 | 에러 안내 |

### 2. DM 전송 가능 여부 확인 (Case 2)

```
GET /api/v1/dm/quota/check?targetUserId=12345
```

**Response 200 (전송 가능)**: Body 없음

**Response 429 (쿼터 초과)**:

```json
{
  "statusCode": 429,
  "message": "DM quota exceeded",
  "error": "TooManyRequests",
  "data": {
    "quotaType": "DAILY",
    "limit": 10,
    "used": 10,
    "resetsAt": "2026-03-06T00:00:00Z"
  }
}
```

| HTTP Status | 코드 | 의미 | 클라이언트 처리 |
| --- | --- | --- | --- |
| 200 | - | 전송 가능 | Sendbird SDK로 메시지 전송 |
| 429 | `DM_QUOTA_EXCEEDED` | 쿼터 초과 | 다이얼로그 표시 |

### 테이블 구조

```sql
-- DM 채널 기록
CREATE TABLE dm_channel (
  id          SERIAL       PRIMARY KEY,
  from_user_id INT         NOT NULL REFERENCES "User"(id),
  to_user_id   INT         NOT NULL REFERENCES "User"(id),
  chat_url     VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_channel_from_user ON dm_channel (from_user_id);
CREATE UNIQUE INDEX idx_dm_channel_from_to ON dm_channel (from_user_id, to_user_id);

-- 쿼터 정책
CREATE TYPE dm_quota_period AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE dm_quota_policies (
  id          SERIAL          PRIMARY KEY,
  period      dm_quota_period NOT NULL UNIQUE,
  limit_count INT             NOT NULL
);

INSERT INTO dm_quota_policies (period, limit_count) VALUES
  ('DAILY', 10),
  ('WEEKLY', 50),
  ('MONTHLY', 100);

-- 쿼터 예외 화이트리스트
CREATE TABLE dm_quota_exceptions (
  id      SERIAL       PRIMARY KEY,
  user_id INT          NOT NULL REFERENCES "User"(id),
  reason  VARCHAR(255) NOT NULL
);

CREATE INDEX idx_dm_quota_exceptions_user ON dm_quota_exceptions (user_id);
```

### 쿼터 체크 성능 추정

**Step 1. dm_channel에서 수신자 목록 조회**

```sql
SELECT DISTINCT toUserId FROM dm_channel
WHERE fromUserId = ? AND createdAt >= ?;
```

| 항목 | 값 |
| --- | --- |
| 스캔 범위 | 제한 없음 (제외 대상 포함 전체 DM 기록, 활발한 유저는 수백 행 가능) |
| 사용 인덱스 | `idx_from_user (fromUserId)` |
| 예상 응답 시간 | **< 1ms** |

**Step 2. 수신자 목록(최대 100명)에 대해 제외 대상 배치 체크**

수신자 ID 목록을 `IN (...)` 으로 한 번에 조회하여 제외 대상 여부를 판단한다.

| 제외 조건 | 조회 테이블 | 사용 인덱스 | 스캔 범위 |
| --- | --- | --- | --- |
| 나를 팔로우하는 멤버 | `UserFollow` | `@@unique([followingUserId, followedUserId])` | 수신자당 1행 (유니크 조회) |
| 같은 모임 참여(한/했던) 멤버 | `SocialingMember` | `@@index([userId])` | 유저 참여 모임 수 × 모임당 멤버 수 |
| 같은 클럽 참여 멤버 | `ClubMember` | `@@index([userId])` | 유저 참여 클럽 수 × 클럽당 멤버 수 |
| 같은 챌린지 참여 멤버 | `ChallengeMember` | `@@index([userId])` | 유저 참여 챌린지 수 × 챌린지당 멤버 수 |
| 모임 찜한 멤버 | `SocialingLike` | `@@unique([userId, socialingId])` | 유저의 찜 수 |
| 클럽 찜한 멤버 | `ClubLike` | `@@index([userId])` (추가 필요) | 유저의 찜 수 |
| 챌린지 찜한 멤버 | `ChallengeLike` | `@@index([userId])` (추가 필요) | 유저의 찜 수 |
- ~~활발한 유저(월 300명 DM) 기준 **10~50ms**~~
- ~~Redis 불필요, PostgreSQL 인덱스만으로 충분~~
- `~~ClubLike`·`ChallengeLike` 테이블에는 현재 `userId` 인덱스가 없으므로 사전 마이그레이션 필요~~

### **Fail-closed 정책 및 모니터링 운영 방안**

DM 채널 URL도 그룹 채팅(소셜링, 클럽, 챌린지)과 동일하게 **서버 API로만 발급**한다. 

클라이언트는 Sendbird SDK로 직접 채널을 생성하지 않으므로, **Fail-closed** 정책을 적용한다.

**Fail-closed 동작 방식**:

- 클라이언트는 채널 생성 API를 호출하고, 서버가 쿼터 검증 후 Sendbird API로 채널 생성·조회하여 URL을 반환한다.
- 채널 생성 API가 **타임아웃 또는 5xx 응답**을 반환하면, 클라이언트는 URL을 받지 못해 **DM 채팅 진입이 불가**하다.
- 즉, BE 장애 시에는 그룹 채팅과 동일하게 DM 기능이 차단된다.

### Redis 확장성 고려

초기에는 DB만으로 충분하지만, 데이터 적재량 증가에 따른 성능 저하 시 Redis 기반 카운팅 레이어를 추가할 수 있도록 설계한다.

**확장 전략**:

```
Phase 1 (초기): DB only
  - dm_channel 테이블 + 인덱스로 쿼터 카운팅
  - 10~50ms 응답 시간

Phase 2 (성능 저하 감지 시): DB + Redis Cache
  - Redis에 유저별 쿼터 카운트 캐싱 (key: dm_quota:{userId}:{period})
  - TTL: DAILY=24h, WEEKLY=7d, MONTHLY=30d
  - Write-through: 채널 생성 시 DB 기록 + Redis INCR 동시 수행
  - Cache miss 시 DB에서 COUNT 조회 후 Redis에 적재
  - DB는 여전히 SoT (Source of Truth) 유지
```

**Phase 2 전환 기준**:

- 쿼터 체크 API p99 응답 시간이 **100ms 초과** 시
- dm_channel 테이블 행 수 **50만 행 초과** 시

서비스 레이어에서 쿼터 체크 로직을 인터페이스로 분리하여, Phase 1 → Phase 2 전환 시 구현체만 교체할 수 있도록 한다.

### **모니터링 알람 체계**

| **모니터링 항목** | **임계값** | **알람 채널** | **대응** |
| --- | --- | --- | --- |
| 채널 생성 API 응답 시간 (p99) | > 500ms | Slack #alert | 쿼리 최적화 / Redis 레이어 도입 검토 |
| 채널 생성 API 에러율 | > 1% | Slack #alert | 장애 확인 및 복구 |
| 일간 쿼터 초과 유저 수 | 모니터링 전용 | Metabase 대시보드 | 쿼터 수치 조정 검토 |
| dm_channel 테이블 행 수 | > 100만 행 | Slack #infra | 파티셔닝 / 아카이빙 검토 |

### 인덱스 추가 작업 주의사항

`ClubLike`·`ChallengeLike` 테이블에 `userId` 인덱스 추가는 운영 DB에 직접 영향을 주므로 아래 절차를 따른다.

- **작업 시간**: 트래픽이 가장 낮은 새벽 시간대 (03:00~05:00 권장)
- **작업 방식**: `CREATE INDEX CONCURRENTLY`로 테이블 락 없이 생성
- **사전 확인**: 대상 테이블 행 수 및 예상 소요 시간 확인
- **롤백 계획**: 인덱스 생성 실패 또는 성능 저하 시 `DROP INDEX CONCURRENTLY`로 제거

```sql
-- 락 없이 인덱스 생성 (운영 DB 영향 최소화)
CREATE INDEX CONCURRENTLY idx_club_like_user ON "ClubLike" ("userId");
CREATE INDEX CONCURRENTLY idx_challenge_like_user ON "ChallengeLike" ("userId");
```