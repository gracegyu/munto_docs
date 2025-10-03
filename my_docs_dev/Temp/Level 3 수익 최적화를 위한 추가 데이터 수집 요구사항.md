# 단계별 데이터 수집 요구사항 (Level 1, 2, 3)

작성자: 전규현

대상 독자: 백엔드 개발팀, 데이터 엔지니어

최종 수정일: 2025-10-02

관련 문서:

- [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md) - 기본 로그 정의
- [전통적인 박스 시스템](../../munto_docs/전통적인%20박스%20시스템.md) - Level 1 박스 계산
- [AI 기반 수익 극대화 추천 시스템 설계서](./AI%20기반%20수익%20극대화%20추천%20시스템%20설계서.md) - 전체 시스템 설계

---

## 1. 문서 목적

데이팅 추천 시스템은 3단계로 발전합니다:

- **Phase 1**: Level 1만 사용 (전통적 박스 시스템)
- **Phase 2**: Level 1 + 2 사용 (AI 예측 모델 추가)
- **Phase 3**: Level 1 + 2 + 3 사용 (수익 최적화 추가)

**로그는 누적됩니다**: Level 3 적용 시에는 Level 1, 2, 3 로그를 **모두** 남깁니다.

이 문서는 각 단계에서 **추가로** 필요한 로그를 명확히 구분하여 정리합니다.

---

## 2. 단계별 로그 구조

### 2.1 전체 구조 (누적)

```
Phase 1 (Level 1만):
└─ 기본 로그
   - VIEW, LIKE, FRIEND_REQUEST, MATCH, PAYMENT 등

Phase 2 (Level 1 + 2):
├─ 기본 로그 (유지)
└─ Level 2 추가 로그
   - 예측 결과 저장
   - 예측 정확도 추적

Phase 3 (Level 1 + 2 + 3):
├─ 기본 로그 (유지)
├─ Level 2 로그 (유지)
└─ Level 3 추가 로그
   - EXPOSURE (전략 정보)
   - REWARD (수익 계산)
   - Context 벡터
```

**핵심**: 상위 단계로 갈수록 로그가 **추가**됩니다. 기존 로그는 계속 유지됩니다.

### 2.2 단계별 로그 비교표

| 로그 종류                  | Phase 1<br>(Level 1) | Phase 2<br>(Level 1+2) | Phase 3<br>(Level 1+2+3) | 비고                 |
| -------------------------- | -------------------- | ---------------------- | ------------------------ | -------------------- |
| **기본 이벤트**            | ✅ 필수              | ✅ 유지                | ✅ 유지                  | VIEW, LIKE, MATCH 등 |
| VIEW, LIKE, FRIEND_REQUEST | ✅                   | ✅                     | ✅                       | 모든 단계 필수       |
| MATCH, MESSAGE, PAYMENT    | ✅                   | ✅                     | ✅                       | 모든 단계 필수       |
| **Level 2 추가**           | -                    | ✅ 추가                | ✅ 유지                  | 예측 모델용          |
| PREDICTION                 | ✗                    | ✅                     | ✅                       | 예측 결과 검증       |
| MODEL_PERFORMANCE          | ✗                    | ✅                     | ✅                       | 모델 정확도 추적     |
| **Level 3 추가**           | -                    | -                      | ✅ 추가                  | 수익 최적화용        |
| EXPOSURE                   | ✗                    | ✗                      | ✅                       | 전략 + Context       |
| REWARD_AGGREGATION         | ✗                    | ✗                      | ✅                       | 7일 수익 계산        |
| STRATEGY_PERFORMANCE       | ✗                    | ✗                      | ✅                       | 전략별 성과          |

**요약**:

- **Phase 1**: 기본 로그만 (9개 이벤트 타입)
- **Phase 2**: 기본 로그 + Level 2 로그 (11개 이벤트 타입)
- **Phase 3**: 기본 로그 + Level 2 로그 + Level 3 로그 (14개 이벤트 타입)

**로그는 누적**: Phase 3에서는 1, 2, 3 모든 로그를 남깁니다.

---

## 3. Phase 1: 기본 로그 (Level 1 적용 시)

### 3.1 정의 위치

[AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md) 3.1.2 참조

### 3.2 핵심 이벤트

- ✅ VIEW (프로필 조회)
- ✅ LIKE (좋아요)
- ✅ SUPER_LIKE (슈퍼좋아요)
- ✅ PASS (싫어요)
- ✅ FRIEND_REQUEST (친구 신청)
- ✅ FRIEND_ACCEPT (친구 수락)
- ✅ MATCH (매칭)
- ✅ MESSAGE (메시지)
- ✅ PAYMENT (결제)

### 3.3 용도

- Level 1 박스 점수 계산을 위한 DB 집계
- 기본 서비스 운영
- 향후 Level 2, 3의 기반 데이터

### 3.4 충분성

✅ **Phase 1을 위해서는 완벽함** ✅ **Phase 2, 3의 기반 데이터로도 충분**

---

## 4. Phase 2: Level 2 추가 로그

### 4.1 추가 필요성

Level 2 예측 모델 성능 추적 및 개선을 위해 **예측 결과**를 로깅해야 합니다.

### 4.2 추가 로그: PREDICTION (예측 결과)

**목적**: 모델이 예측한 값과 실제 결과를 비교하여 정확도 추적

```json
{
  "event_type": "PREDICTION",
  "prediction_id": "pred_20240115_123456",
  "timestamp": "2024-01-15T19:30:00Z",
  "model_name": "friend_accept_predictor",
  "model_version": "v2.1",

  // 예측 입력
  "input": {
    "from_user_id": "usr_123",
    "to_user_id": "usr_456",
    "context": {
      "time_of_day": "evening",
      "day_of_week": "Monday"
    }
  },

  // 예측 결과
  "prediction": {
    "will_accept_probability": 0.65,
    "confidence_score": 0.85,
    "inference_time_ms": 45
  },

  // 실제 결과 (나중에 업데이트)
  "actual_outcome": null, // 초기 null
  "actual_outcome_time": null,
  "prediction_correct": null
}
```

**업데이트 로직**:

```
친구 신청 시:
- PREDICTION 이벤트 생성
- actual_outcome = null

3일 후 (수락/거절/만료):
- actual_outcome 업데이트
- prediction_correct 계산 (예: |predicted - actual| < 0.2)
```

### 4.3 추가 로그: MODEL_PERFORMANCE (모델 성능)

**목적**: 예측 모델의 정확도 추적

```json
{
  "event_type": "MODEL_PERFORMANCE",
  "date": "2024-01-15",
  "model_name": "friend_accept_predictor",
  "model_version": "v2.1",

  "daily_stats": {
    "total_predictions": 1500,
    "accuracy": 0.78,
    "precision": 0.82,
    "recall": 0.75,
    "f1_score": 0.78,
    "avg_inference_time_ms": 48
  }
}
```

### 4.4 Phase 2 로그 요약

**추가 로그**:

1. PREDICTION (예측 결과 및 검증)
2. MODEL_PERFORMANCE (모델 성능 추적)

**기존 로그**: 모두 유지

**총 로그**: 기본 로그 + Level 2 추가 로그

---

## 5. Phase 3: Level 3 추가 로그

### 5.1 추가 필요성

Level 3 수익 최적화 모델(Contextual Bandit)은 **전략 선택**과 **장기 수익**을 다루므로, 추천 세션 단위의 로그가 필요합니다.

### 5.2 추가 로그 목록

Level 3 적용 시 **추가**되는 로그:

1. **EXPOSURE (노출 이벤트)**: 전략 정보, Context 벡터
2. **REWARD_AGGREGATION (보상 집계)**: 7일간 총 수익
3. **STRATEGY_PERFORMANCE (전략 성과)**: 전략별 누적 성과
4. **CONTEXT_SNAPSHOT (상태 스냅샷)**: Context 벡터 상세

---

### 5.3 EXPOSURE (노출 이벤트) - Level 3 전용

**목적**: 추천 생성 시 어떤 전략을 사용했고, 어떤 프로필들을 노출했는지 기록

**중요성**: Level 3 Bandit 학습의 핵심 입력 데이터

```json
{
  "event_type": "EXPOSURE",
  "exposure_id": "exp_20240115_123456",
  "timestamp": "2024-01-15T19:30:00Z",
  "user_id": "usr_123",
  "session_id": "ses_xyz789",

  // Level 3 전략 정보 (필수)
  "strategy_applied": {
    "strategy_id": 2,
    "strategy_name": "Balanced",
    "profile_distribution": {
      "high_tier_ratio": 0.3,
      "medium_tier_ratio": 0.5,
      "exploration_ratio": 0.2
    },
    "expected_reward": 31.9
  },

  // Context 벡터 (필수 - Level 3 입력)
  "user_context_vector": [0.75, 0.82, 0.68, 0.55, 15, 85, 45, 0.35, 0.25, 0.67, 0.25, 0.45, 0.35, 5, 12, 25, 0.375, 3, 7, 0, 1, 0, 19, 1, 1, 0, 0.42],

  // Context 필드별 설명 (디버깅용, 선택)
  "context_fields": {
    "attractiveness_score": 0.75,
    "engagement_score": 0.82,
    "revenue_trigger_score": 0.68,
    "spending_score": 0.55,
    "days_since_join": 15,
    "total_currency_spent": 85,
    "currency_balance": 45,
    "churn_7d_probability": 0.25,
    "churn_30d_probability": 0.45
    // ... 기타 필드
  },

  // 노출된 프로필 목록 (필수)
  "profiles_shown": [
    {
      "profile_id": "usr_456",
      "rank": 1,
      "tier": "high",
      "predicted_like_prob": 0.78,
      "predicted_friend_accept_prob": 0.65,
      "predicted_chat_response_prob": 0.72
    },
    {
      "profile_id": "usr_789",
      "rank": 2,
      "tier": "medium",
      "predicted_like_prob": 0.55,
      "predicted_friend_accept_prob": 0.42,
      "predicted_chat_response_prob": 0.48
    }
    // ... 10-20명
  ],

  // 탭 정보
  "tab": "discovery", // "recommend" or "discovery"

  // 보상 (초기 null, 7일 후 업데이트)
  "reward": null,
  "reward_computed_at": null
}
```

**기존 로그와의 차이**:

- 기존: 개별 행동 (VIEW, LIKE 등) 중심
- 추가: **추천 세션 전체** 중심 (어떤 전략으로 어떤 프로필 묶음을 노출)

---

### 5.4 REWARD_AGGREGATION (보상 집계 이벤트) - Level 3 전용

**목적**: 특정 노출 이후 7일간의 총 수익 계산 및 기록

**타이밍**: 노출 후 7일째 배치 작업으로 자동 계산

```json
{
  "event_type": "REWARD_AGGREGATION",
  "exposure_id": "exp_20240115_123456",
  "user_id": "usr_123",
  "aggregation_timestamp": "2024-01-22T01:00:00Z",
  "observation_period_days": 7,

  // 수익 구성 (상세)
  "revenue_breakdown": {
    // 재화 소비 상세
    "currency_spent": {
      "super_like": 2, // 2재화
      "friend_request": 1, // 4재화
      "friend_request_with_msg": 0,
      "chat_activation": 1, // 10재화
      "profile_view": 0,
      "total": 16
    },

    // 보너스
    "retention_bonus": 10, // 7일 유지
    "match_bonus": 5, // 매칭 1건

    // 페널티
    "churn_penalty": 0, // 이탈 안 함
    "frustration_penalty": -1 // 연속 거절 3회
  },

  // 최종 보상 (회사 수익)
  "total_reward": 30, // 16 + 10 + 5 - 1

  // 행동 요약
  "action_summary": {
    "profiles_viewed": 15,
    "likes_sent": 5,
    "super_likes_sent": 2,
    "friend_requests_sent": 1,
    "matches_established": 1,
    "chat_activated": 1
  },

  // 사용자 상태 변화
  "user_state_change": {
    "churned": false,
    "still_active": true,
    "last_login_date": "2024-01-21",
    "session_count_7d": 8
  }
}
```

**계산 로직**:

```python
def compute_reward(exposure_id, user_id):
    """
    노출 이후 7일간의 보상 계산
    """
    exposure_time = get_exposure_timestamp(exposure_id)
    end_time = exposure_time + timedelta(days=7)

    # 1. 재화 소비 집계
    currency_logs = query_currency_transactions(
        user_id=user_id,
        start_time=exposure_time,
        end_time=end_time,
        transaction_type='SPEND'
    )
    currency_spent = sum([log.amount for log in currency_logs])

    # 2. 리텐션 체크
    user_active = is_user_active_at(user_id, end_time)
    retention_bonus = 10 if user_active else 0

    # 3. 매칭 체크
    matches = query_matches(
        user_id=user_id,
        start_time=exposure_time,
        end_time=end_time
    )
    match_bonus = len(matches) * 5

    # 4. 이탈 체크
    churn_penalty = -20 if is_churned(user_id, end_time) else 0

    # 5. 좌절감 체크
    rejections = count_consecutive_rejections(user_id, exposure_time, end_time)
    frustration_penalty = -min(rejections // 3, 5)  # 3회당 -1, 최대 -5

    # 최종 보상
    total_reward = (
        currency_spent +
        retention_bonus +
        match_bonus +
        churn_penalty +
        frustration_penalty
    )

    return total_reward
```

---

### 3.3 STRATEGY_PERFORMANCE (전략 성과 추적)

**목적**: 각 전략의 누적 성과 추적 및 모니터링

**타이밍**: 일일 배치로 집계

```json
{
  "event_type": "STRATEGY_PERFORMANCE",
  "date": "2024-01-15",
  "strategy_id": 2,
  "strategy_name": "Balanced",

  // 일일 통계
  "daily_stats": {
    "times_selected": 450, // 선택된 횟수
    "avg_reward": 28.5, // 평균 보상
    "total_revenue": 12825, // 총 수익 (450 × 28.5)
    "user_segments": {
      "new_users": 50,
      "male_users": 320,
      "female_users": 130,
      "high_risk_churn": 80,
      "high_spenders": 120
    }
  },

  // 누적 통계
  "cumulative_stats": {
    "total_selections": 15200,
    "avg_reward_30d": 29.3,
    "avg_reward_90d": 28.1,
    "success_rate": 0.72, // 이탈하지 않은 비율
    "arpu_contribution": 14650 // 이 전략의 ARPU 기여도
  },

  // 성능 트렌드
  "trend": {
    "reward_trend_7d": "increasing", // increasing, stable, decreasing
    "usage_trend_7d": "stable"
  }
}
```

---

### 3.4 CONTEXT_SNAPSHOT (상태 스냅샷)

**목적**: 사용자의 시점별 상태 변화 추적

**활용**: Context 벡터 재계산, 디버깅, 분석

```json
{
  "event_type": "CONTEXT_SNAPSHOT",
  "snapshot_id": "snap_20240115_usr123",
  "timestamp": "2024-01-15T19:30:00Z",
  "user_id": "usr_123",

  // Level 1 박스 점수 (필수)
  "level1_scores": {
    "attractiveness_score": 0.75,
    "engagement_score": 0.82,
    "revenue_trigger_score": 0.68,
    "spending_score": 0.55,

    // 계산 근거 (디버깅용)
    "attractiveness_detail": {
      "received_likes": 42,
      "received_super_likes": 8,
      "received_dislikes": 10,
      "total_evaluations": 60,
      "raw_score": 0.623,
      "normalized_score": 0.75
    },
    "engagement_detail": {
      "login_days": 12,
      "total_days": 15,
      "evaluation_rate": 0.375,
      "profile_completeness": 0.833,
      "raw_score": 0.637,
      "normalized_score": 0.82
    }
    // ... 다른 박스도 동일
  },

  // DB 집계 값
  "activity_metrics": {
    "days_since_join": 15,
    "total_currency_spent": 85,
    "currency_balance": 45,
    "like_success_rate": 0.35,
    "friend_request_success_rate": 0.25,
    "chat_activation_rate": 0.67,
    "consecutive_rejections": 5,
    "sessions_last_7d": 12,
    "avg_session_duration_minutes": 25,
    "total_matches": 3,
    "days_without_new_match": 7
  },

  // Level 2 예측 결과
  "level2_predictions": {
    "churn_7d_probability": 0.25,
    "churn_30d_probability": 0.45,
    "model_version": "churn_v2.1"
  },

  // 최종 Context 벡터
  "context_vector": [0.75, 0.82, 0.68, 0.55, 15, 85, 45, 0.35, 0.25, 0.67, 0.25, 0.45, 0.35, 5, 12, 25, 0.375, 3, 7, 0, 1, 0, 19, 1, 1, 0, 0.42]
}
```

**저장 빈도**:

- 추천 요청마다 생성 (EXPOSURE와 함께)
- 또는 일일 1회 배치로 모든 사용자 스냅샷 생성

---

## 4. 데이터 파이프라인

### 4.1 실시간 수집 (Exposure 시점)

```
사용자가 추천 요청
  ↓
Level 1 박스 점수 계산
  ↓
Context 벡터 생성
  ↓
Level 3 전략 선택
  ↓
EXPOSURE 이벤트 생성 및 저장
  - exposure_id 생성
  - context_vector 포함
  - strategy_applied 기록
  - profiles_shown 기록
  ↓
DynamoDB exposures 테이블에 저장
  ↓ (비동기)
S3 백업 (Parquet)
```

### 4.2 지연 수집 (7일 후)

```
[매일 자정 배치 작업]

7일 전 노출 이벤트 조회
  ↓
각 exposure_id에 대해:
  ↓
  1. 재화 소비 집계 (currencyTransactions 테이블)
  2. 매칭 성사 체크 (matches 테이블)
  3. 리텐션 체크 (user.lastLoginAt)
  4. 이탈 체크
  5. 연속 거절 집계 (friendRequests)
  ↓
보상 계산 (compute_reward 함수)
  ↓
REWARD_AGGREGATION 이벤트 생성
  ↓
DynamoDB 업데이트
  - exposures 테이블: reward 필드 업데이트
  - rewards 테이블: 학습 데이터 저장
  ↓
S3 학습 데이터 백업
  - s3://dating-ml/training/rewards/2024-01/
  - Parquet 형식
  ↓
[주간 배치]
SageMaker 재학습 트리거
```

---

## 5. DynamoDB 테이블 설계

### 5.1 exposures 테이블 (확장)

기존 설계에 **추가** 필요:

```
Table: exposures

PK: USER#{user_id}
SK: EXP#{timestamp}#SESSION#{session_id}

Attributes:
  exposure_id: String (UUID)
  timestamp: Number (Unix timestamp)
  session_id: String

  // Level 3 전용 추가 필드
  strategy_id: Number              ← 추가
  strategy_name: String            ← 추가
  context_vector: List<Number>     ← 추가 (27-100차원)
  expected_reward: Number          ← 추가

  profiles_shown: List<Map>
  user_state_snapshot: Map

  // 보상 (7일 후 업데이트)
  reward: Number                   ← 추가 (초기 null)
  reward_computed_at: Number       ← 추가
  reward_breakdown: Map            ← 추가

Indexes:
  - GSI1: STRATEGY#{strategy_id}#DATE#{date}
    용도: 전략별 성과 조회

  - GSI2: REWARD_STATUS#{computed}#DATE#{date}
    용도: 미계산 보상 조회

TTL: 90일
```

### 5.2 rewards 테이블 (신규)

학습 데이터 전용 테이블:

```
Table: rewards

PK: MONTH#{year-month}
SK: EXPOSURE#{exposure_id}

Attributes:
  exposure_id: String
  user_id: String
  timestamp: Number

  // 학습 데이터 (필수)
  context_vector: List<Number>     // [0.75, 0.82, ...]
  strategy_id: Number               // 2
  total_reward: Number              // 30

  // 분석용 상세 정보
  currency_spent: Number
  retention_bonus: Number
  match_bonus: Number
  penalties: Number

  user_segment: String              // "male_active" 등
  computed_at: Number

보관: 영구 (학습용)
크기 예상: 월 10만 건 × 12개월 = 120만 건
```

### 5.3 strategy_performance 테이블 (신규)

전략별 성과 추적:

```
Table: strategy_performance

PK: STRATEGY#{strategy_id}
SK: DATE#{date}

Attributes:
  strategy_id: Number
  strategy_name: String
  date: String (YYYY-MM-DD)

  times_selected: Number
  avg_reward: Number
  total_revenue: Number
  std_reward: Number

  user_count_by_segment: Map {
    new_users: Number,
    male: Number,
    female: Number,
    high_risk: Number
  }

  success_rate: Number  // 이탈하지 않은 비율

보관: 1년
```

---

## 6. 기존 로그 활용 방법

Level 3는 기존 로그도 **간접적으로** 활용합니다:

### 6.1 보상 계산 시 기존 로그 사용

```
보상 계산 함수에서:

1. currencyTransactions 테이블 조회
   → 7일간 재화 소비량 집계

2. matches 테이블 조회
   → 매칭 성사 건수

3. friendRequests 테이블 조회
   → 연속 거절 횟수

4. user 테이블 조회
   → 마지막 로그인 시간 (리텐션 체크)

→ 기존 테이블을 읽기만 함, 추가 로그 불필요
```

### 6.2 Context 벡터 계산 시 기존 데이터 사용

```
Context 벡터 생성 시:

1. userCrushExpressions 집계
   → like_success_rate 계산

2. friendRequests 집계
   → friend_request_success_rate 계산

3. currencyTransactions 집계
   → total_currency_spent 계산

→ 기존 테이블만으로 충분
```

---

## 7. 추가 구현 필요 사항

### 7.1 배치 작업

**일일 배치 (매일 자정)**:

```python
# 7일 전 노출 이벤트 보상 계산
def daily_reward_computation():
    """
    7일 전 노출들의 보상 계산 및 업데이트
    """
    target_date = datetime.now() - timedelta(days=7)
    exposures = query_exposures_by_date(target_date)

    for exposure in exposures:
        if exposure.reward is None:  # 아직 미계산
            reward = compute_reward(exposure.exposure_id, exposure.user_id)

            # exposures 테이블 업데이트
            update_exposure_reward(exposure.exposure_id, reward)

            # rewards 테이블에 학습 데이터 저장
            save_training_data(
                exposure_id=exposure.exposure_id,
                context=exposure.context_vector,
                strategy_id=exposure.strategy_id,
                reward=reward
            )
```

**주간 배치 (매주 일요일)**:

```python
# 모델 재학습
def weekly_model_retraining():
    """
    최근 1개월 학습 데이터로 Bandit 모델 재학습
    """
    # S3에서 학습 데이터 로드
    training_data = load_from_s3("s3://dating-ml/training/rewards/2024-01/")

    # 각 전략별 θ_k 업데이트
    for strategy_id in range(1, 11):
        strategy_data = training_data[training_data.strategy_id == strategy_id]
        theta_k = bayesian_regression(
            X=strategy_data.context_vector,
            y=strategy_data.total_reward
        )

        # 새 모델 배포
        deploy_to_sagemaker(strategy_id, theta_k)
```

### 7.2 API 수정

**추천 API 수정 필요**:

```python
@app.post("/recommendations")
def get_recommendations(user_id: str):
    # 1. Level 1 박스 점수 계산
    level1_scores = calculate_box_scores(user_id)

    # 2. Context 벡터 생성
    context = build_context_vector(user_id, level1_scores)

    # 3. Level 3 전략 선택
    strategy = select_strategy(context)  ← 추가

    # 4. EXPOSURE 이벤트 생성 ← 추가
    exposure_id = generate_exposure_id()
    save_exposure_event(
        exposure_id=exposure_id,
        user_id=user_id,
        context_vector=context,
        strategy_id=strategy.id
    )

    # 5. 후보 필터링 및 Level 2 예측
    candidates = filter_candidates(user_id)
    scored_candidates = predict_probabilities(user_id, candidates)

    # 6. 전략에 따라 샘플링
    final_recommendations = sample_by_strategy(scored_candidates, strategy)

    # 7. 응답
    return {
        "recommendations": final_recommendations,
        "exposure_id": exposure_id  ← 추가 (클라이언트에 전달)
    }
```

**행동 API 수정 필요**:

```python
@app.post("/actions/like")
def post_like(user_id: str, target_id: str, exposure_id: str):  ← exposure_id 추가
    # 기존 로직
    create_like(user_id, target_id)

    # 추가: exposure_id와 연결
    link_action_to_exposure(exposure_id, "LIKE", target_id)  ← 추가
```

---

## 8. 기존 로그와 추가 로그 비교

| 항목             | 기존 로그 (Level 2용)            | 추가 로그 (Level 3용)         | 비고                |
| ---------------- | -------------------------------- | ----------------------------- | ------------------- |
| **이벤트 단위**  | 개별 행동 (LIKE, FRIEND_REQUEST) | 추천 세션 (EXPOSURE)          | Level 3는 세션 단위 |
| **전략 정보**    | ✗ 없음                           | ✅ strategy_id, strategy_name | 필수                |
| **Context 벡터** | ✗ 없음                           | ✅ context_vector (27차원)    | 필수                |
| **보상 계산**    | ✗ 없음                           | ✅ 7일 후 자동 계산           | 필수                |
| **집계 기간**    | 즉시                             | 7일 지연                      | Bandit 학습 특성    |
| **저장 기간**    | 7일 (DynamoDB TTL)               | 영구 (학습용)                 | 중요                |

**결론**: 기존 로그는 유지하고, Level 3 전용 로그를 **추가**합니다. 서로 보완 관계.

---

## 9. 구현 우선순위

### 우선순위 1 (즉시 필요)

1. **EXPOSURE 이벤트 로깅**

   - 추천 API 수정
   - exposure_id 생성 및 저장
   - context_vector, strategy_id 기록

2. **DynamoDB exposures 테이블 확장**
   - strategy_id, context_vector, reward 필드 추가

### 우선순위 2 (1개월 내)

3. **일일 배치: 보상 계산**

   - 7일 전 노출의 보상 자동 계산
   - REWARD_AGGREGATION 이벤트 생성
   - rewards 테이블에 학습 데이터 저장

4. **행동 API에 exposure_id 연동**
   - LIKE, FRIEND_REQUEST 등에 exposure_id 파라미터 추가
   - 노출과 행동을 연결

### 우선순위 3 (2-3개월 내)

5. **주간 배치: 모델 재학습**

   - S3 학습 데이터 로드
   - Bandit 모델 재학습
   - SageMaker 배포

6. **성과 모니터링 대시보드**
   - 전략별 성과 실시간 추적
   - 이상 패턴 감지

---

## 10. 예상 데이터 볼륨

### 월간 추정

```
가정:
- 활성 사용자: 10,000명
- 일평균 추천 요청: 사용자당 2회
- 월 추천 요청: 10,000 × 2 × 30 = 600,000건

데이터 크기:
- EXPOSURE 이벤트: 600,000건 × 5KB = 3GB
- REWARD_AGGREGATION: 600,000건 × 2KB = 1.2GB
- rewards 학습 데이터: 600,000건 × 1KB = 600MB

월 총합: ~5GB
연 총합: ~60GB

DynamoDB 비용: 월 ~$50
S3 비용: 월 ~$5
```

---

## 11. 검증 및 품질 관리

### 11.1 데이터 품질 체크

**필수 검증 항목**:

```python
def validate_exposure_event(event):
    """EXPOSURE 이벤트 유효성 검증"""
    assert event.exposure_id is not None
    assert event.strategy_id in range(1, 16)  # 1-15
    assert len(event.context_vector) == 27  # 고정 차원
    assert len(event.profiles_shown) > 0
    assert event.user_id is not None
```

**보상 계산 검증**:

```python
def validate_reward(reward):
    """계산된 보상의 합리성 체크"""
    # 너무 극단적인 값 체크
    assert -50 <= reward <= 200

    # 구성 요소 검증
    assert reward_breakdown.currency_spent >= 0
    assert reward_breakdown.retention_bonus in [0, 10, 20]
```

### 11.2 모니터링 지표

**일일 모니터링**:

- 수집된 EXPOSURE 건수 (목표: 일 20,000건)
- 보상 계산 성공률 (목표: 99.9%)
- Context 벡터 차원 일관성 (100%)
- 전략별 선택 분포 (불균형 체크)

**주간 모니터링**:

- 학습 데이터 품질 (결측치, 이상값)
- 전략별 평균 보상 트렌드
- 모델 재학습 성공 여부

---

## 12. 마이그레이션 계획

### 기존 시스템에서 추가 시

**Phase 1: 로그만 수집 (학습 전)**

```
Week 1-2:
- EXPOSURE 이벤트 로깅 구현
- DynamoDB 테이블 스키마 추가
- 데이터 수집만, 학습 안 함

Week 3-4:
- 일일 보상 계산 배치 구현
- 검증 및 모니터링

Week 5-12:
- 데이터 축적 (최소 3개월)
- 품질 모니터링
```

**Phase 2: Bandit 학습 시작**

```
Week 13-14:
- 축적된 데이터로 초기 모델 학습
- 오프라인 검증

Week 15-16:
- A/B 테스트 (10% 트래픽)
- 성과 측정

Week 17+:
- 전체 롤아웃
- 주간 재학습 자동화
```

---

## 13. 결론

### 기존 로그 충분성

[AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)의 로그:

- ✅ Level 2 예측 모델: **완벽하게 충분**
- ❌ Level 3 수익 최적화: **추가 로그 필요**

### 추가 필요 사항 요약

**필수 (Phase 1)**:

1. EXPOSURE 이벤트 로깅
2. Context 벡터 저장
3. 전략 정보 기록
4. 7일 보상 계산

**권장 (Phase 2)**: 5. 전략별 성과 추적 6. Context 스냅샷 (디버깅용)

**선택 (Phase 3)**: 7. 상세 분석 로그 8. 실시간 집계

### 최종 권장

**즉시 착수**:

- DynamoDB exposures 테이블에 strategy_id, context_vector, reward 필드 추가
- 추천 API에서 EXPOSURE 이벤트 로깅
- 일일 배치로 7일 보상 계산

**3개월 데이터 축적 후**:

- Level 3 Bandit 모델 학습 시작
- 주간 자동 재학습 파이프라인 구축

---

## 부록: 빠른 체크리스트

**Level 3 수익 최적화 구현을 위한 체크리스트**:

데이터 수집:

- [ ] EXPOSURE 이벤트 로깅 구현
- [ ] exposure_id 생성 로직
- [ ] Context 벡터 계산 및 저장
- [ ] 전략 선택 로직 (초기 규칙 기반)
- [ ] DynamoDB exposures 테이블 스키마 확장
- [ ] DynamoDB rewards 테이블 생성

배치 작업:

- [ ] 일일 보상 계산 Lambda
- [ ] 주간 모델 재학습 파이프라인
- [ ] S3 백업 자동화

모니터링:

- [ ] CloudWatch 지표 설정
- [ ] 전략별 성과 대시보드
- [ ] 데이터 품질 알림

기존 시스템 수정:

- [ ] 추천 API에 전략 선택 추가
- [ ] 행동 API에 exposure_id 파라미터 추가
- [ ] Level 1 박스 점수 계산 모듈화

---

**최종 답변**: 기존 [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)의 로그는 Level 2를 위해 충분하지만, Level 3를 위해서는 위 내용의 추가 구현이 필요합니다.
