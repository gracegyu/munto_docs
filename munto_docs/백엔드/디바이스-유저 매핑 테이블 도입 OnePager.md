## **Project Description**

현재 디바이스 ID(UDID)와 유저 ID의 매핑 정보는 CloudWatch API 로그에만 존재합니다. 이로 인해 다중 계정 어뷰징 탐지 시 S3 Export → PostgreSQL 임포트 과정을 거쳐야 하며, 164GB 로그 처리에 26시간 이상이 소요됩니다.

**디바이스–유저 관계를 DB에 구조화**하여 즉시 조회 가능하게 만드는 것이 1단계 목표입니다. 디바이스를 독립 엔티티(Device 테이블)로 관리하고, 로그인 시 이벤트 로그(UserDeviceLog 테이블)를 자동 기록합니다.

### **현재 상태**

디바이스-유저 매핑 정보를 저장하는 테이블이 존재하지 않습니다.

- 디바이스 ID는 API 요청 헤더에 포함되어 CloudWatch 로그에만 기록됨
- 어뷰징 분석 시 CloudWatch 로그를 S3로 Export 후 별도 DB에 임포트하여 분석
- 이번 브로커 탐지 분석에서 164GB 로그 처리에 26시간+ 소요

```
로그인/회원가입 → CloudWatch 로그에만 기록 (DB 저장 없음)
                      ↓
                  (분석 필요 시)
                      ↓
        S3 Export → 로컬 PostgreSQL 임포트 → 쿼리 분석
```

### **목표 상태**

Device 테이블(디바이스 엔티티)과 UserDeviceLog 테이블(로그인 이벤트 기록)을 Production DB에 추가하고, 로그인 시 자동 기록합니다.

```
로그인 → Device UPSERT (최초/최근 활동 갱신) + UserDeviceLog INSERT (이벤트 기록) → 즉시 쿼리 분석 가능
```

| **항목**       | **현재**                   | **개선 후**                 |
| -------------- | -------------------------- | --------------------------- |
| 디바이스 관리  | 없음                       | Device 테이블 (독립 엔티티) |
| 로그인 이력    | CloudWatch 로그만          | UserDeviceLog 테이블        |
| 분석 소요 시간 | 26시간+ (로그 임포트 필요) | 수 초 (바로 쿼리)           |
| 실시간 탐지    | 불가                       | 가능                        |

### **단계별 범위**

| **단계**     | **범위**                        | **설명**                                                                  |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| 1단계 (이번) | device–user 관계 DB 구조화      | Device 테이블 + UserDeviceLog 테이블 도입, 로그인 시 자동 기록, 즉시 조회 |
| 2단계 (향후) | 위변조 탐지 및 신뢰도 기반 정책 | is_flagged/trust_score 활용, 자동 차단 로직, 메타베이스 대시보드          |

---

## **Business and Marketing Justification**

### **1. 브로커 어뷰징 실시간 탐지**

최근 분석에서 발견된 브로커링 현황:

- **686개 기기 공유 그룹** (3개 이상 계정이 동일 기기 공유)
- **최대 298개 계정**이 단일 기기에서 운영
- **944개 소셜링**에서 조직적 다중 신청 패턴

현재는 사후 분석만 가능하지만, DB 테이블 도입 시 **신규 브로커 계정 생성 즉시 탐지** 및 **자동 알림/차단** 구현이 가능합니다.

### **2. 운영팀 업무 효율화**

| **항목**       | **현재**     | **개선 후**           |
| -------------- | ------------ | --------------------- |
| 분석 소요 시간 | 26시간+      | 수 초                 |
| 분석 주기      | 필요 시 수동 | 실시간 자동           |
| 담당자 개입    | 개발팀 필요  | 운영팀 직접 조회 가능 |

### **3. 법적 증거 수집 간소화**

어뷰징 관련 법적 조치 시 증거 데이터를 DB에서 바로 추출할 수 있어, CloudWatch 로그 수집 과정이 불필요해집니다.

---

## **Risk Assessment**

### **전제 조건 (리스크 수용)**

이번 1단계에서는 **일반 사용자 환경에서 클라이언트가 제공하는 device_id 값을 신뢰한다는 전제**로 진행합니다. device_id 위변조 탐지 및 대응은 이번 범위에서 제외하며, 2단계 고도화에서 다룹니다.

- iOS IDFV: 앱 삭제/재설치 시 변경 가능하나 일반 사용 환경에서는 안정적
- Android ID: 공장 초기화 시 변경 가능하나 일반 사용 환경에서는 고유값 유지
- 루팅/탈옥 기기에서의 위변조는 2단계에서 대응 예정

### **리스크가 낮은 이유**

| **항목**              | **설명**                                         |
| --------------------- | ------------------------------------------------ |
| 기존 로직 변경 최소화 | 로그인 성공 후 UPSERT(Device) + INSERT(Log) 추가 |
| 성능 영향 미미        | 단순 UPSERT + INSERT 쿼리, 1ms 미만              |
| 롤백 간단             | 기록 코드 제거로 즉시 롤백 가능                  |
| 기존 서비스 무관      | 신규 테이블이므로 기존 기능에 영향 없음          |

### **잠재적 리스크**

| **리스크**       | **대응 방안**                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| 데이터 증가      | 일 6.4만 건 기준, 90일 보관 시 약 580만 행. 정기 삭제로 관리                                                |
| 개인정보 (IP)    | IP는 어뷰징 탐지 목적으로 수집하며, 90일 보관 후 삭제. 개인정보 처리방침에 수집 목적 및 보관 기간 명시 필요 |
| device_id 위변조 | 1단계에서는 리스크 수용. 2단계에서 대응                                                                     |
| INSERT 실패 시   | 로그인 트랜잭션과 분리하여 INSERT 실패해도 로그인에 영향 없음                                               |

---

## **Resource and Scheduling Details**

### **작업 범위 및 일정 (1단계)**

| **단계** | **작업 내용**                                            | **예상 소요** |
| -------- | -------------------------------------------------------- | ------------- |
| 1        | DB 스키마 설계 및 마이그레이션 (Device + UserDeviceLog)  | 0.5일         |
| 2        | 로그인 API에 기록 로직 추가 (Device UPSERT + Log INSERT) | 0.5일         |
| 3        | 기존 로컬 DB 데이터 마이그레이션                         | 0.5일         |
| **합계** |                                                          | **1.5일**     |

### **향후 확장 (2단계)**

| **작업**            | **설명**                                          |
| ------------------- | ------------------------------------------------- |
| is_flagged 활용     | 이상 디바이스 플래그 기반 자동 알림/차단 로직     |
| trust_score 산출    | 디바이스 신뢰도 점수 기반 정책 (위변조 탐지 포함) |
| 메타베이스 대시보드 | 실시간 어뷰징 모니터링 대시보드                   |

### **인력**

- 백엔드 개발자 1명

---

## **Technical Description**

### **테이블 설계**

유저와 디바이스는 **다대다 관계**입니다.

- 한 유저가 여러 기기 사용 (핸드폰 교체, 여러 기기 보유 등)
- 한 기기에서 여러 유저 활동 (브로커 어뷰징, 가족 공유 등)

디바이스를 **독립 엔티티**(Device 테이블)로 관리하고, 로그인 이벤트는 UserDeviceLog 테이블에 기록합니다.

- 디바이스 → 유저들: 기기 공유 그룹 탐지
- 유저 → 디바이스들: 브릿지 계정 탐지

**Device 테이블** — 디바이스 엔티티 (UPSERT)

```sql
CREATE TABLE device (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL UNIQUE,
    device_type VARCHAR(10) NOT NULL,     -- 'IOS' | 'ANDROID'
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- 2단계 확장 영역 (이번 단계에서는 사용하지 않음)
    -- is_flagged BOOLEAN DEFAULT FALSE,  -- 이상 디바이스 여부
    -- trust_score SMALLINT,              -- 디바이스 신뢰도 점수 (0~100)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_device_device_id ON device(device_id);
```

**UserDeviceLog 테이블** — 로그인 이벤트 기록 (INSERT)

```sql
CREATE TABLE user_device_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "User"(id),
    device_pk BIGINT NOT NULL REFERENCES device(id),
    app_version VARCHAR(20),
    ip VARCHAR(45),                       -- 어뷰징 탐지 목적, 90일 보관 후 삭제
    logged_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_device_log_device_pk ON user_device_log(device_pk);   -- 기기별 유저 조회
CREATE INDEX idx_user_device_log_user_id ON user_device_log(user_id);       -- 유저별 기기 조회
CREATE INDEX idx_user_device_log_logged_at ON user_device_log(logged_at);   -- 기간별 조회 및 데이터 정리
```

**MVP 수집 정보**:

| **필드**    | **출처**        | **목적**                                                                          |
| ----------- | --------------- | --------------------------------------------------------------------------------- |
| device_id   | 클라이언트 헤더 | 다중 계정 탐지 (Device 테이블 관리)                                               |
| user_id     | 인증 토큰       | 유저-디바이스 매핑                                                                |
| device_type | 클라이언트 헤더 | OS 구분 (IOS/ANDROID)                                                             |
| app_version | 클라이언트 헤더 | 버전별 패턴 분석                                                                  |
| logged_at   | 서버 시간       | 로그인 시각 기록                                                                  |
| ip          | 요청 IP         | 어뷰징 탐지 보조. 개인정보 해당 가능하므로 90일 보관 후 삭제, 수집 목적 명시 필요 |

### **데이터 흐름**

```
[클라이언트]
    │
    │ 로그인 요청 (Header: X-Device-Id, X-Device-Type, X-App-Version)
    ▼
[Auth Controller]
    │
    │ 인증 성공
    ▼
[Auth Service]
    │
    ├── 기존 로직 (토큰 발급 등)
    │
    └── DeviceService.recordLogin()
            │
            ├── 1. Device UPSERT
            │     device_id로 조회 → 없으면 INSERT, 있으면 last_seen_at 갱신
            │
            └── 2. UserDeviceLog INSERT
                  user_id, device_pk, app_version, ip, logged_at 기록
```

**기록 방식**:

- 로그인 성공 시마다 Device UPSERT + UserDeviceLog INSERT
- Device 테이블: 디바이스 최초/최근 활동 시점 관리 (first_seen_at / last_seen_at)
- UserDeviceLog 테이블: 매 로그인 이력을 보관하여 로그인 빈도, 시간대 패턴 분석 가능
- 회원가입 후에도 로그인 과정을 거치므로 별도 기록 불필요

### **주요 조회 쿼리**

**1. 기기 공유 그룹 탐지** (3개 이상 계정 공유 기기)

```sql
SELECT d.device_id, COUNT(DISTINCT l.user_id) as user_count
FROM user_device_log l
JOIN device d ON l.device_pk = d.id
WHERE l.logged_at > NOW() - INTERVAL '90 days'
GROUP BY d.device_id
HAVING COUNT(DISTINCT l.user_id) >= 3
ORDER BY user_count DESC;
```

**2. 특정 유저의 기기 사용 이력**

```sql
SELECT d.device_id, d.device_type, l.ip,
       MIN(l.logged_at) as first_login, MAX(l.logged_at) as last_login,
       COUNT(*) as login_count
FROM user_device_log l
JOIN device d ON l.device_pk = d.id
WHERE l.user_id = :userId
GROUP BY d.device_id, d.device_type, l.ip
ORDER BY last_login DESC;
```

**3. 특정 기기에서 활동한 유저 목록**

```sql
SELECT l.user_id, l.ip,
       MIN(l.logged_at) as first_login, MAX(l.logged_at) as last_login,
       COUNT(*) as login_count
FROM user_device_log l
JOIN device d ON l.device_pk = d.id
WHERE d.device_id = :deviceId
GROUP BY l.user_id, l.ip
ORDER BY last_login DESC;
```

**4. 브릿지 계정 탐지** (여러 기기에서 활동한 유저)

```sql
SELECT l.user_id, COUNT(DISTINCT l.device_pk) as device_count
FROM user_device_log l
WHERE l.logged_at > NOW() - INTERVAL '90 days'
GROUP BY l.user_id
HAVING COUNT(DISTINCT l.device_pk) >= 5
ORDER BY device_count DESC;
```

**5. 동일 IP에서 다중 계정 탐지**

```sql
SELECT l.ip, COUNT(DISTINCT l.user_id) as user_count,
       COUNT(DISTINCT l.device_pk) as device_count
FROM user_device_log l
WHERE l.logged_at > NOW() - INTERVAL '90 days'
GROUP BY l.ip
HAVING COUNT(DISTINCT l.user_id) >= 3
ORDER BY user_count DESC;
```

### **데이터 보관 정책**

- **보관 기간**: 90일 (어뷰징 분석에 충분한 기간)
- **정리 방식**: 스케줄러에서 user_device_log.logged_at 기준 90일 이전 데이터 삭제 (일 1회). Device 테이블은 삭제하지 않음
- **IP 보관**: 어뷰징 탐지 목적으로 수집하며, 90일 경과 후 로그 삭제 시 함께 삭제
- **예상 데이터량** (2026-01-01 ~ 2026-01-08 로그 기반 산출):
  - 일 평균 로그인: 약 6.4만 건 (OAuth 5.5만 + 문토 로그인 0.9만)
  - 90일 보관: 약 **580만 행** (UserDeviceLog)
  - Device 테이블: MAU 기준 약 **10만 행** (누적, 삭제하지 않음)
