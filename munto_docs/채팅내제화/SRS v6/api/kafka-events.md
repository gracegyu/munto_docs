# Kafka 이벤트 명세서

채팅 서비스의 **크로스 서비스(서버 간) Kafka 이벤트** 규약입니다.
상세 요구사항은 [SRS 문서](../srs.md)를 참조하세요. (§4.4 외부 인터페이스, §7.6.6 신고, §7.8.4 계정 제재 연동)

> 채팅 *내부* 푸시 fan-out은 Redis Streams를 사용하며(이 문서 대상 아님 — SRS §5/§2.2.2), 본 문서는 **앱 백엔드·계정 서버 ↔ 채팅 서비스** 간 Kafka 이벤트만 다룬다. Kafka 송수신 주체는 **채팅 웹소켓 서비스**이며 REST 채팅 백엔드는 관여하지 않는다.

---

## 1. 공통 규약

| 항목 | 값 |
|------|-----|
| 메시지 브로커 | Kafka (기존 보유 MSK 재사용) |
| 환경 분리 | **토픽명에 prefix 없음** — 환경은 별도 MSK 클러스터(dev/prod)로 분리 (기존 컨벤션) |
| 직렬화 | JSON (UTF-8) |
| 멱등성 | 모든 이벤트에 `eventId`(UUID) 포함 — 소비 측 중복 처리 방지 |
| 스키마 버전 | `schemaVersion`(정수, 시작값 1) 필드로 진화 관리 |
| 시각 표기 | Unix epoch milliseconds (정수) |
| 네이밍 컨벤션 | 크로스 서비스 도메인 이벤트 = kebab-case `{entity}-{action}-event` (기존 `user-delete-event` 계열), 버전 suffix 없음 |

> 네이밍 근거: 기존 `user-delete-event`(kebab-case, 환경 prefix·버전 suffix 없음, 클러스터로 환경 분리) 패턴을 따른다.

---

## 2. 토픽 요약

| 토픽 | 방향(채팅 기준) | 생산자 | 소비자 | 용도 |
|------|----------------|--------|--------|------|
| `user-sanction-event` | in (consume) | 문토 계정/백엔드 · dating-backend (서비스별) | 채팅 웹소켓 | 계정 제재 상태 전파 → 채팅 접근 차단·소켓 강제 종료 |
| `chat-auto-report-dating` | out (produce) | 채팅 웹소켓 | dating-backend | 채팅 자동 신고(금칙어·외부링크) |
| `chat-auto-report-munto` | out (produce) | 채팅 웹소켓 | munto-backend | 채팅 자동 신고(금칙어·외부링크) |

> **자동 신고는 서비스별 토픽 분리** — 소비자가 dating/munto로 갈리므로 라우팅을 토픽으로 처리한다. **제재는 단일 토픽 + `service` 필드** — 생산자가 계정 서버 한 곳이라 단일 토픽이 단순하다.

---

## 3. `user-sanction-event` (제재 — 채팅이 consume)

**각 서비스 백엔드**가 사용자를 제재/해제할 때 발행한다 — **MUNTO 제재는 문토 계정/백엔드, DATING 제재는 dating-backend**가 자기 `service`로 같은 토픽에 produce한다. 채팅 웹소켓 서비스가 소비해 denylist를 갱신하고, 접속 중인 소켓을 강제 종료한다(SRS §7.8.4). 제재는 **서비스별**이다(데이팅 제재 ≠ 문토 제재). 계정 전체 차단이 필요하면 각 서비스가 자기 `service`로 각각 발행한다.

- **생산자**: 문토 계정/백엔드(service=MUNTO), dating-backend(service=DATING)
- **Consumer group**: `munto-chat-sanction-consumer-group` (채팅 웹소켓)
- **파티션 키**: `userId` (유저별 순서 보장)
- **소비 동작**: 1회 소비 후 권위 denylist 갱신 → Redis Pub/Sub로 전 웹소켓 노드 fanout → 로컬 캐시 갱신 + 해당 유저 소켓 disconnect

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| `eventId` | string(UUID) | ✓ | 멱등성 키 |
| `schemaVersion` | integer | ✓ | 시작값 1 |
| `userId` | integer | ✓ | muntoUserId |
| `service` | enum | ✓ | `DATING` \| `MUNTO` — 제재가 적용되는 서비스 |
| `action` | enum | ✓ | `SUSPEND`(일시정지) \| `PERMABAN`(영구정지) \| `RELEASE`(해제) |
| `expiresAt` | integer\|null | ✓ | 일시정지 만료 시각(ms). `PERMABAN`/`RELEASE`는 `null` |
| `reason` | string\|null | – | 사유(로그·안내용) |
| `occurredAt` | integer | ✓ | 제재 발생 시각(ms) |

```json
{
  "eventId": "9f2c...",
  "schemaVersion": 1,
  "userId": 12345,
  "service": "DATING",
  "action": "SUSPEND",
  "expiresAt": 1719200000000,
  "reason": "외부 채팅방 유도",
  "occurredAt": 1718600000000
}
```

> **해제도 같은 토픽**에 `action: "RELEASE"`로 발행한다. 채팅은 이를 받아 denylist에서 해당 `(userId, service)` 엔트리를 제거한다. 일시정지는 `expiresAt` 기반 지연 만료(self-healing)도 병행한다.

---

## 4. `chat-auto-report-{service}` (자동 신고 — 채팅이 produce)

채팅 웹소켓 서비스가 금칙어·외부 링크를 탐지하면(메시지는 동기 블라인드 처리) 해당 서비스 토픽에 발행한다. 각 앱 백엔드가 소비해 자기 신고 시스템에 등록한다(SRS §7.6.6). 채팅 서버는 신고를 저장하지 않는다.

- **토픽**: `chat-auto-report-dating` / `chat-auto-report-munto`
- **Consumer group**: dating-backend → `dating-chat-report-consumer-group`, munto-backend → `munto-chat-report-consumer-group`
- **파티션 키**: `senderId` (동일 사용자 이벤트 순서 보장)
- **DLQ**: `chat-auto-report-dating-dlq` / `chat-auto-report-munto-dlq` (소비 실패 시 — 신고 유실 방지)

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| `eventId` | string(UUID) | ✓ | 멱등성 키 |
| `schemaVersion` | integer | ✓ | 시작값 1 |
| `service` | enum | ✓ | `DATING` \| `MUNTO` (토픽과 일치, 검증용) |
| `roomId` | integer | ✓ | 채팅방 ID |
| `messageId` | integer(int64) | ✓ | 대상 메시지 ID (messages.id = BIGSERIAL) |
| `senderId` | integer | ✓ | 신고 대상(발신자) muntoUserId |
| `detectionType` | enum | ✓ | `PROFANITY` \| `EXTERNAL_LINK` (이미지는 SRS 7.6.5 도입 시 추가) |
| `messageText` | string | – | 탐지된 메시지 내용(검토용) |
| `detectedAt` | integer | ✓ | 탐지 시각(ms) |

```json
{
  "eventId": "1ab4...",
  "schemaVersion": 1,
  "service": "DATING",
  "roomId": 5567,
  "messageId": 889012,
  "senderId": 12345,
  "detectionType": "EXTERNAL_LINK",
  "messageText": "외부 링크 포함 메시지...",
  "detectedAt": 1718600000000
}
```

> 자동 신고는 **시스템 신고자**(사람 아님)이며 클라이언트 사용자 신고(앱 백엔드 직접 호출)와 별개 경로다. 소비 측은 `eventId`로 중복을 제거한다.

---

## 5. 운영 메모

- **retention**: 노드 재시작 시 offset 재생으로 denylist를 복구할 수 있도록 충분히 설정(예: 7일 이상). 단 부팅 스냅샷 + 주기 reconciliation이 1차 복구 수단이다(SRS §7.8.4).
- **스키마 진화**: 필드 추가는 하위호환(소비 측 무시 가능). 호환 불가 변경 시 `schemaVersion` 증가.
- **정의 위치(사내)**: munto-backend는 `libs/common/src/push-event/constants/kafka-topics.ts` enum 확장, dating-backend는 `core/integrations/...` 토픽 상수에 추가(기존 컨벤션). `user-sanction-event` producer는 **문토 계정/백엔드와 dating-backend 양쪽**에 추가(서비스별), dating-backend는 자동신고 consumer도 신규.