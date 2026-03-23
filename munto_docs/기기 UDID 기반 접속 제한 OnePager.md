# 기기 UDID 기반 접속 제한 OnePager

분류: SRS
작성자: 홍진영
최초 작성일: 2026년 3월 23일 오후 12:24
최근 수정일: 2026년 3월 23일 오후 1:00
문서 상태: Active
생성 일시: 2026년 3월 23일 오후 12:24
최종 편집자: 홍진영

# Project Name

**기기 UDID 기반 접속 제한 정책 백엔드 구현**

(DeviceUserActivation · DeviceAccessDenyLog · 인증 경로 연동)

[https://munto.atlassian.net/browse/WEBB-1179](https://munto.atlassian.net/browse/WEBB-1179)

---

## Date

**2026-03-23**

---

## Submitter Info

| 항목 | 내용 |
| --- | --- |
| 이름 | 홍진영 |
| 팀 | 개발팀 |

---

## Project Description

네이티브 앱에서 전달하는 `x-device-id`(IDFV / ANDROID_ID, 문서상 UDID)를 기준으로 **단일 디바이스당 허용 계정 수(Notion 3-1)** 및 **단일 계정당 허용 기기 수**를 제한한다. 웹 브라우저는 식별자 미수집으로 본 정책 적용 범위에서 제외한다.

 정책 판정의 단일 소스로 **`DeviceUserActivation`** 테이블을 도입하고, 
기존 **`UserDeviceLog`** 는 로그인 이벤트 로그·통계(WEBB-928)용으로 유지한다.
 탈퇴 시 Activation은 `deletedAt` 등으로 처리하고, **탈퇴일 기준 30일 경과 후 Activation 행 삭제**로 디바이스 슬롯 장기 점유를 방지한다.
 동일 전화번호에 대한 **탈퇴 후 30일 이내 신규 가입 제한**은 기존 전화/탈퇴 도메인과 연동한다.

 차단 시도는 **`DeviceAccessDenyLog`**(DB) 또는 운영 정책에 따라 구조화 로그(CloudWatch)로 남길 수 있으며, 본 문서 Technical Description 은 **DB 적재** 기준으로 스키마를 기술한다.

**참고 문서:** [Notion — UDID 기반 접속 제한 정책](https://www.notion.so/UDID-326e2bc7639d8055976df300842c9aca?pvs=21)

---

## Business and Marketing Justification

- **어뷰징 완화:**
    - 동일 기기 다중 계정·브로커성 다기기 접속을 제한하여 소셜링 등 유료·모임 서비스의 공정성과 호스트·일반 사용자 신뢰를 보호한다.
- **정책 투명성:**
    - 앱 내 안내 문구·에러 코드([Notion 5장](https://www.notion.so/UDID-326e2bc7639d8055976df300842c9aca?pvs=21), 수치 PM 확정)와 맞추어 사용자에게 거부 사유를 전달할 수 있다.
- **운영 분리:**
    - [Notion 4장](https://www.notion.so/UDID-326e2bc7639d8055976df300842c9aca?pvs=21)에 해당하는 기존 위반 계정 소급·영구정지 등은 **별도 배치/어드민**으로 두고, 본 프로젝트는 **신규 시도에 대한 예방적 가드**에 집중한다.

---

## Risk Assessment

| 위험 | 내용 | 완화 |
| --- | --- | --- |
| 식별자 한계 | IDFV/ANDROID_ID는 재설치 등으로 변경 가능 | 문서 전제와 동일 — 절대 불변 식별자가 아님을 전제로 한 운영 신호로 사용 |
| 오차단 | 가족·기기 교체 등 정상 사용자 영향 | 임계값(2계정/2기기)은 Notion 통계 기반; 플래그·시행일로 단계적 롤아웃 |
| 웹 미적용 | 브라우저는 정책 미적용 | 제품 정책으로 명시; 앱만 강제 |
| 데이터 일관성 | 가입 경로에서 기존 `afterLogin` 미호출 | 모든 로그인·가입 성공 경로에서 `UserDeviceLog` + `DeviceUserActivation` 동기화 |
| 탈퇴·슬롯 | 탈퇴/30일 삭제 타이밍 불일치 | `revokedAt` + 스케줄 삭제 설계, 전화 유예와 AND 조건 문서화 |
| 성능 | 거부·성공 시 추가 쓰기 | 인덱스 설계, Deny 로그는 비동기(실패 시 로그인 차단은 유지) 검토 |

---

## Resource and Scheduling Details

| 구분 | 내용 |
| --- | --- |
| 백엔드 | Prisma 마이그레이션, `DeviceAccessPolicyService`, `AuthUserService` / `AuthUserV2Service`·탈퇴·스케줄러 연동 |
| 스케줄러 | `apps/scheduler` — 탈퇴 후 30일 `DeviceUserActivation` 삭제 배치 |
| 클라이언트 | `x-device-id`·에러 코드에 따른 안내 문구(Notion 5장과 수치 정합) |
| QA | 경계 케이스(2/2 슬롯, 90일, 탈퇴, deviceId 없음) |
| PM | Notion 5장 알림 문구 숫자(2/2) 확정 |

**산출 일정:**

| 구간 | 기간 | 포함·목표 | 시작일 T 기준 |
| --- | --- | --- | --- |
| 개발 | 1주 | 스키마·(선택)백필·도메인·인증·스케줄러·Swagger/i18n 순서 → 스테이징에서 **정책 가동 가능** | **T+1주** |
| QA | 1주 | 스테이징 검증·회귀·클라이언트 연동 → 프로덕션 반영 승인 | **T+2주**  |
| 운영 안정화 | 3주 | 프로덕션 모니터링·30일 배치·지표·CS | **T+2주~T+5주** |

**운영:** 

- 30일 삭제 배치 실패 시 알림
- 시행 직후 403·Deny 건수 모니터링.

리스크: 

- 지연 시 시행일 연기·플래그 OFF 롤백.

---

## Technical Description

### 시스템 개요

- **입력:**
    - HTTP 헤더 `x-device-id`, `RequestContextInterceptor`
- **판정:**
    - `DeviceAccessPolicyService` — 토큰 발급·유저 생성 **전** 검사.
- **성공 시:**
    - `UserDeviceLog` INSERT(기존),
    - `DeviceUserActivation` UPSERT(`lastUsedAt` 갱신).
- **실패 시:**
    - HTTP 403 + 정책용 에러 코드;
    - `DeviceAccessDenyLog` INSERT.

---

### 관련 Database 스키마

### 기존 (참고) — `Device`, `UserDeviceLog`

현재 [`libs/prisma/schema.prisma`](https://www.notion.so/munto/libs/prisma/schema.prisma) 에 정의됨.

```
/// 디바이스 엔티티 - 독립적인 디바이스 관리 테이블
model Device {
  id             BigInt   @id @default(autoincrement())
  deviceUniqueId String   @unique @db.VarChar(100)
  deviceType     String   @db.VarChar(10)
  firstSeenAt    DateTime @default(now())
  lastSeenAt     DateTime @default(now()) @updatedAt
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  userDeviceLogs UserDeviceLog[]
  // deviceUserActivations DeviceUserActivation[]
  // deviceAccessDenyLogs DeviceAccessDenyLog[]

  @@index([deviceUniqueId])
}

model UserDeviceLog {
  id         BigInt   @id @default(autoincrement())
  userId     Int
  deviceId   BigInt
  appVersion String?  @db.VarChar(20)
  ip         String?  @db.VarChar(45)
  loggedAt   DateTime @default(now())
  createdAt  DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  device Device @relation(fields: [deviceId], references: [id])

  @@index([deviceId])
  @@index([userId])
  @@index([loggedAt])
}
```

### 신규(안)

### DeviceUserActivation

정책 상태 전용. 필드명은 구현 시 팀 컨벤션에 맞게 조정 가능.

```
/// 유저-디바이스 정책 바인딩 (접속 제한 판정용)
model DeviceUserActivation {
  id         BigInt    @id @default(autoincrement())
  userId     Int /// User FK 없음 — 스냅샷 id (탈퇴·유저 삭제와 독립, `deletedAt`/배치로 정리)
  deviceId   BigInt  /// 바인딩 레코드 최초 생성 시각
  createdAt  DateTime  @default(now()) @db.Timestamptz(3)
  lastUsedAt DateTime  @default(now()) @db.Timestamptz(3) /// 마지막 사용 시각(갱신)
  deletedAt  DateTime? @db.Timestamptz(3) /// 탈퇴 등 소프트 삭제; null 이면 집계에 포함
  updatedAt  DateTime  @updatedAt @db.Timestamptz(3)

  /// Device 삭제 시 해당 바인딩 행도 함께 삭제 (DB ON DELETE CASCADE)
  device Device @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId])
  @@index([deviceId])
  @@index([userId])
  @@index([deletedAt])
}
```

`User` 모델에는 **역방향 relation 을 두지 않음** (FK 없음). 
`Device` 모델에만 `deviceUserActivations DeviceUserActivation[]` 추가. 
(`Device` 삭제 시 `DeviceUserActivation` 은 **Cascade** 로 제거.)

**운영 규칙 (코드/배치):**

- 정책 집계: `WHERE deletedAt IS NULL`
- 탈퇴: 해당 `userId` 행에 `deletedAt = now()`
- 30일 후: `deletedAt <= now() - 30d` 인 행 **하드 삭제**

### DeviceAccessDenyLog

차단 시도 감사·CS용

- **`User` 와는 relation 없음** — `userId` 는 스냅샷만.
- **`Device` 와는 선택적 relation** — `Device` 행이 이미 있으면 `deviceId` 로 연결하고,
 **`onDelete: Cascade`** 로 기기 삭제 시 거부 로그도 함께 삭제.
- `Device` UPSERT 전 거부 등으로 `deviceId` 를 아직 못 쓰는 경우에는 `deviceId` null·`deviceUniqueId` 만 기록.

```
model DeviceAccessDenyLog {
  id               BigInt   @id @default(autoincrement())
  userId           Int?     /// 가입 전 거부 시 null 가능 (User FK 없음)
  deviceUniqueId   String?  @db.VarChar(100) /// 헤더 기준 (deviceId 없을 때 식별용)
  deviceId         BigInt?  /// Device 행 연결 시; null 이면 relation 없음
  /// 거부 사유 코드 — 앱 상수·API 에러 코드와 동일 값 권장
  reason           String   @db.VarChar(64)
  attemptedAt      DateTime @default(now()) @db.Timestamptz(3)
  clientIp         String?  @db.VarChar(45)
  userAgent        String?  @db.VarChar(512)
  createdAt        DateTime @default(now()) @db.Timestamptz(3)

  device Device? @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceUniqueId])
  @@index([deviceId])
  @@index([attemptedAt])
}
```

`Device` 모델에 `deviceAccessDenyLogs DeviceAccessDenyLog[]` 관계 추가.

**`reason` 예시 값:** `DEVICE_ACCOUNT_LIMIT`(3-1), `ACCOUNT_DEVICE_LIMIT`(3-2).

---

### Swagger (OpenAPI) 추가·변경 안

**대상:** 기존 인증 API — 예: [`AuthUserController`](https://www.notion.so/munto/apps/api/src/auth/auth-user.controller.ts), [`AuthUserV2Controller`](https://www.notion.so/munto/apps/api/src/auth/v2/auth-user.v2.controller.ts) 의 로그인·회원가입 관련 엔드포인트.

**공통:** 정책 위반 시 **HTTP 403 Forbidden**, 응답 바디는 프로젝트 표준 에러 포맷(`HttpExceptionFilter`, i18n 키)에 맞춤.

### 추가할 응답 정의(예시)

| 항목 | 내용 |
| --- | --- |
| 상태 코드 | `403` |
| 에러 코드(예시) | 해당 기기 내 부적절한 접속 패턴이 감지되어  로그인할 수 없습니다. |
| 설명 | 기기당 허용 계정 수 초과 |

### Nest/Swagger 데코레이터 예시 (개념)

```tsx
// 로그인·회원가입 메서드에 부가
@ApiResponse({
  status: 403,
  description:
    '디바이스 접속 정책 위반 (기기당 계정 수 또는 계정당 기기 수 초과). 클라이언트는 에러 코드에 따라 Notion 5장과 일치하는 안내 문구 표시.',
  schema: {
    example: {
      statusCode: 403,
      message: 'DEVICE_ACCOUNT_LIMIT',
      error: 'Forbidden',
    },
  },
})
```

- 실제 `message` / i18n 키는 기존 API 에러 응답 스타일에 맞출 것.
- **회원가입**(`POST /v2/auth/join`, `POST /v2/auth/register` 등)과 **로그인**(`POST .../login` 계열) 모두 동일 403 스펙을 문서화한다.
- Swagger UI: 로컬 API 서버 기준 `http://localhost:3000/_d` (프로젝트 [CLAUDE.md](https://www.notion.so/munto/CLAUDE.md) 기준)에서 확인.

---

### 환경 변수

- `DEVICE_ACCESS_POLICY_ENABLED`
- `DEVICE_ACCESS_POLICY_EFFECTIVE_AT` (ISO8601)

---

---

<aside>
🔁

## **변경 이력**

</aside>

| **버전** | **일자** | **변경자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0.0 | 26.03.23 | 홍진영 | 최초 작성 |
|  |  |  |  |

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