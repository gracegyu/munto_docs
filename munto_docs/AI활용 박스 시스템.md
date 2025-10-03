# **AI 기반 추천/발견 알고리즘 시스템**

## **문서 개요**

- **목적**: AI 예측 모델 기반 매칭 알고리즘 구현 전략 및 데이터 파이프라인 설계
- **범위**: 예측 모델 정의, Input/Output 명세, 로그 수집 전략, 전통적 알고리즘과의 통합
- **대상**: 기획자, 데이터 분석가, 개발팀

---

## **1. AI 예측 모델 개요**

### **1.1 핵심 접근 방식**

- ✅ **구체적인 예측 모델** 단위로 정의
- ✅ 각 모델의 **명확한 Input/Output** 명세
- ✅ 전통적 계산식의 **특정 구간을 예측 모델로 치환**
- ✅ 로그 수집을 통한 미래 Input 변경 대비

**예시**

```
전통적 방식:
수익유발 점수 = (친구 신청 수락률 × 0.3) + (좋아요 응답률 × 0.2) + ...

AI 방식:
수익유발 점수 = (친구 수락 확률 예측 모델 결과 × 0.3) + (좋아요 응답 확률 예측 모델 결과 × 0.2) + ...

```

### **1.2 예측 모델 vs 전통적 계산식**

**전통적 계산식**

- 과거 데이터 기반 비율 계산
- 예: 친구 신청 수락률 = 수락 수 / 받은 수

**AI 예측 모델**

- 미래 행동 확률 예측
- 예: "A가 B의 친구 신청을 수락할 확률"
- 컨텍스트를 고려한 동적 예측

### **1.3 통합 전략**

**Phase 1: 전통적 계산식만 사용**

- 현재: 모든 박스가 수식 기반

**Phase 2: 하이브리드 (일부 예측 모델 도입)**

- 핵심 지표만 예측 모델로 전환
- 예: 친구 수락 확률, 좋아요 확률 등
- 나머지는 전통적 계산식 유지

**Phase 3: AI 중심 (대부분 예측 모델)**

- 대부분의 지표를 예측 모델로 전환
- 전통적 계산식은 보조 역할

---

## **2. 예측 모델 목록 및 정의**

### **2.0 예측 모델 전체 개요**

본 시스템에서 구현할 AI 예측 모델들은 다음과 같습니다:

| 모델명 | 목적 | 주요 활용 |
| --- | --- | --- |
| **좋아요 확률 예측** | 유저 A가 유저 B를 보고 좋아요를 누를 확률 | 매력도 박스 계산, 노출 우선순위 |
| **친구 신청 확률 예측** | 유저 A가 유저 B에게 친구 신청을 할 확률 | 수익유발 박스, 재화 소비 예측 |
| **친구 수락 확률 예측** | 유저 B가 유저 A의 친구 신청을 수락할 확률 | 수익유발 박스 핵심 지표 |
| **채팅 응답 확률 예측** | 유저 B가 유저 A의 채팅에 응답할 확률 | 활동성/수익유발 박스, 매칭 품질 |
| **데이트 신청 확률 예측** | 유저 A가 유저 B에게 데이트 신청을 할 확률 | 지출 박스 핵심 예측, 수익 극대화 |
| **이탈 확률 예측** | 유저가 7일/30일 내 이탈할 확률 | 리텐션 전략, 신규유저 가중치 |

**전환 우선순위**: 친구 수락 확률 → 좋아요 확률 → 채팅 응답 확률 → 나머지 모델 순

---

### **2.1 좋아요 확률 예측 모델**

### **2.1.1 모델 목적**

유저 A가 유저 B를 보고 좋아요를 누를 확률 예측

### **2.1.2 Input 정의**

**유저 A 프로필 스냅샷 (행동 주체)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델을 그대로 저장// 예: User 엔티티의 모든 필드// - 기본 정보 (ID, 나이, 성별, 위치 등)// - 프로필 콘텐츠 (사진, 자기소개, 관심사 등)// - 활동 통계 (좋아요 준 횟수, 평균 사용 시간 등)// - 현재 점수 (매력도, 활동성 등)},
  "current_session_context": {
    "session_start_time": "2024-01-15T19:30:00Z",
    "profiles_viewed_today": 12,
    "likes_given_today": 2,
    "current_tab": "discovery"
  }
}

```

**유저 B 프로필 스냅샷 (대상)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델을 그대로 저장// 예: User 엔티티의 모든 필드// - 기본 정보 (ID, 나이, 성별, 위치 등)// - 프로필 콘텐츠 (사진, 자기소개, 관심사 등)// - 인기도 통계 (받은 좋아요, 평균 조회 시간 등)// - 현재 점수 (매력도, 수익유발 등)}
}

```

**컨텍스트 특성**

```json
{
  "interaction_context": {
    "timestamp": "2024-01-15T19:30:00Z",
    "day_of_week": "Monday",
    "hour": 19,
    "position_in_feed": 3,
    "tab": "discovery",
    "distance_km": 5.2
  }
}

```

**중요**: 유저 프로필 스냅샷은 이벤트 발생 시점의 **전체 User 모델**을 그대로 저장합니다. 이는 미래에 Input 변경 시에도 과거 데이터를 재활용할 수 있게 합니다.

### **2.1.3 Output 정의**

```json
{
  "prediction": {
    "will_like_probability": 0.73,
    "confidence_score": 0.85,
    "model_version": "like_predictor_v2.1",
    "inference_time_ms": 45
  }
}

```

### **2.1.4 활용 방식**

- 전통적 방식의 "좋아요 비율"을 예측 확률로 대체
- 매력도 박스 계산 시 반영

---

### **2.2 친구 신청 확률 예측 모델**

### **2.2.1 모델 목적**

유저 A가 유저 B에게 친구 신청을 할 확률 예측

### **2.2.2 Input 정의**

**유저 A 프로필 스냅샷**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 친구 신청 이력// - 결제 이력// - 재화 사용 패턴}
}

```

**유저 B 프로필 스냅샷**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 친구 신청 수락률// - 응답 시간 통계// - 수익유발 점수}
}

```

**상호작용 히스토리**

```json
{
  "interaction_history": {
    "mutual_like": true,
    "mutual_like_time": "2024-01-15T19:35:00Z",
    "time_since_match_hours": 0.5,
    "messages_exchanged": 0,
    "profile_views_count": 3,
    "last_interaction_time": "2024-01-15T19:35:00Z"
  }
}

```

### **2.2.3 Output 정의**

```json
{
  "prediction": {
    "will_send_request_probability": 0.45,
    "optimal_timing_hours": 2.5,
    "expected_success_rate": 0.68,
    "model_version": "friend_request_v1.5"
  }
}

```

### **2.2.4 활용 방식**

- 수익유발 박스 계산 시 반영
- 남성 유저의 재화 소비 예측에 활용

---

### **2.3 친구 수락 확률 예측 모델**

### **2.3.1 모델 목적**

유저 B가 유저 A의 친구 신청을 수락할 확률 예측

### **2.3.2 Input 정의**

**유저 A 프로필 스냅샷 (신청자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 프로필 품질 (사진, 자기소개)// - 매력도 점수// - 과거 신청 성공률}
}

```

**유저 B 프로필 스냅샷 (수락자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 친구 수락 패턴// - 현재 친구 수 / 대기 중인 요청 수// - 최근 활동 시간}
}

```

**친구 신청 상세**

```json
{
  "request_details": {
    "has_message": true,
    "message_length": 45,
    "message_text": "안녕하세요! 프로필이 인상적이네요",
    "request_time": "2024-01-15T20:00:00Z",
    "time_since_match_hours": 0.5
  }
}

```

### **2.3.3 Output 정의**

```json
{
  "prediction": {
    "will_accept_probability": 0.78,
    "expected_response_time_hours": 4.5,
    "confidence_level": "high",
    "model_version": "friend_accept_v2.0"
  }
}

```

### **2.3.4 활용 방식**

- 수익유발 박스의 핵심 지표로 활용
- 여성 유저 평가 시 중요 지표

---

### **2.4 채팅 응답 확률 예측 모델**

### **2.4.1 모델 목적**

유저 B가 유저 A의 채팅 메시지에 응답할 확률 예측

### **2.4.2 Input 정의**

**유저 A 프로필 스냅샷 (발신자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 메시징 스타일 (평균 메시지 길이, 이모지 사용률)// - 응답률 및 응답 시간// - 활동성 점수}
}

```

**유저 B 프로필 스냅샷 (수신자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 응답 패턴 (시간대별 응답률, 평균 응답 시간)// - 활성 대화 수// - 메시지 응답 활동성}
}

```

**메시지 및 관계 컨텍스트**

```json
{
  "message_content": {
    "length": 35,
    "has_question": true,
    "sentiment": "friendly",
    "has_emoji": true,
    "message_time": "2024-01-15T20:30:00Z",
    "time_of_day": "evening"
  },
  "relationship_context": {
    "friend_since_days": 3,
    "messages_exchanged": 12,
    "avg_conversation_length": 8,
    "last_message_time": "2024-01-15T18:00:00Z",
    "time_since_last_message_hours": 2.5
  }
}

```

### **2.4.3 Output 정의**

```json
{
  "prediction": {
    "will_respond_probability": 0.82,
    "expected_response_time_minutes": 20,
    "conversation_continuation_probability": 0.75,
    "model_version": "chat_response_v1.8"
  }
}

```

### **2.4.4 활용 방식**

- 수익유발 박스 및 활동성 박스에 반영
- 매칭 품질 평가 지표로 활용

---

### **2.5 데이트 신청 확률 예측 모델**

### **2.5.1 모델 목적**

유저 A가 유저 B에게 데이트 신청을 할 확률 및 예상 금액 예측

### **2.5.2 Input 정의**

**유저 A 프로필 스냅샷 (신청자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 데이트 신청 이력 (횟수, 평균 금액, 성공률)// - 결제 이력 및 지출 패턴// - 선호 장소 및 가격대// - 지출 점수}
}

```

**유저 B 프로필 스냅샷 (수신자)**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 데이트 수락 패턴 (수락률, 평균 응답 시간)// - 선호 가격대 및 장소// - 수익유발 점수}
}

```

**관계 발전 컨텍스트**

```json
{
  "relationship_stage": {
    "friend_duration_days": 10,
    "messages_exchanged": 45,
    "conversation_quality_score": 0.78,
    "mutual_interest_indicators": {
      "shared_photos": 3,
      "long_conversations": 5,
      "daily_interaction": true}
  }
}

```

### **2.5.3 Output 정의**

```json
{
  "prediction": {
    "will_send_request_probability": 0.68,
    "optimal_timing_days": 3,
    "expected_amount": 52000,
    "success_probability": 0.72,
    "model_version": "date_request_v2.2"
  }
}

```

### **2.5.4 활용 방식**

- 지출 박스의 핵심 예측 지표
- 수익 극대화 전략 수립에 활용

---

### **2.6 이탈 확률 예측 모델**

### **2.6.1 모델 목적**

유저가 앞으로 7일/30일 내 이탈할 확률 예측

### **2.6.2 Input 정의**

**유저 프로필 스냅샷**

```json
{
  "user_profile_snapshot": {
// 전체 유저 프로필 모델 (User 엔티티)// 특히 중요한 필드:// - 활동 패턴 (세션 횟수, 평균 사용 시간, 마지막 로그인)// - 참여도 지표 (좋아요, 매칭, 메시지 응답률)// - 성공 경험 (매칭 수, 친구 수, 데이트 성사)// - 부정적 경험 (거절 횟수, 무응답 메시지 수)// - 활동성 점수}
}

```

**활동 추세 컨텍스트**

```json
{
  "activity_trends": {
    "last_7d_sessions": 12,
    "last_30d_sessions": 58,
    "session_trend": "decreasing",
    "avg_session_duration_change": -0.25,
    "last_login": "2024-01-14T15:00:00Z",
    "days_since_last_login": 1.5
  },
  "engagement_changes": {
    "likes_given_trend": "stable",
    "matches_trend": "decreasing",
    "message_response_rate_change": -0.15,
    "profile_update_frequency": "low"
  },
  "negative_signals": {
    "rejection_count_last_7d": 8,
    "unanswered_messages_count": 12,
    "failed_date_requests": 3,
    "no_matches_days": 5
  }
}

```

### **2.6.3 Output 정의**

```json
{
  "prediction": {
    "churn_7d_probability": 0.35,
    "churn_30d_probability": 0.62,
    "risk_level": "medium",
    "key_factors": ["decreasing_engagement", "recent_rejections"],
    "recommended_actions": ["boost_profile", "send_notification"],
    "model_version": "churn_predictor_v3.0"
  }
}

```

### **2.6.4 활용 방식**

- 리텐션 전략 수립
- 신규 유저 가중치 조정
- 맞춤형 알림 및 프로모션 제공

---

## **3. 로그 수집 전략**

### **3.1 현재 수집 필요 로그**

### **3.1.1 기본 원칙**

- **모든 이벤트를 기록**: 미래 Input 변경에 대비
- **프로필 스냅샷 저장**: 당시의 상태를 정확히 보존
- **컨텍스트 정보 포함**: 시간, 위치, 세션 정보 등

### **3.1.2 핵심 이벤트 로그**

**프로필 조회 이벤트 (VIEW)**

```json
{
  "event_type": "VIEW",
  "timestamp": "2024-01-15T19:30:00Z",
  "actor_id": "usr_123",
  "target_id": "usr_456",
  "context": {
    "tab": "discovery",
    "position": 3,
    "session_id": "ses_xyz789",
    "device": "iOS",
    "location": "seoul_gangnam"
  },
  "metrics": {
    "view_duration_ms": 3450,
    "scroll_depth": 0.75,
    "photos_viewed": [1, 2, 3],
    "bio_read": true},
  "actor_snapshot": {
    "age": 28,
    "gender": "M",
    "profile_completeness": 0.90,
    "photos": ["url1", "url2"],
    "bio": "...",
    "current_scores": {
      "desirability": 0.76,
      "engagement": 0.82
    }
  },
  "target_snapshot": {
    "age": 26,
    "gender": "F",
    "profile_completeness": 0.95,
    "photos": ["url1", "url2", "url3"],
    "bio": "카페 탐방을 즐기는 디자이너",
    "current_scores": {
      "desirability": 0.82,
      "responsiveness": 0.65
    }
  }
}

```

**좋아요 이벤트 (LIKE)**

```json
{
  "event_type": "LIKE",
  "timestamp": "2024-01-15T19:35:00Z",
  "actor_id": "usr_123",
  "target_id": "usr_456",
  "details": {
    "like_type": "normal",
    "decision_time_ms": 2340,
    "viewed_before": true,
    "view_count": 1,
    "time_since_view_ms": 5000
  }
}

```

**매칭 이벤트 (MATCH)**

```json
{
  "event_type": "MATCH",
  "timestamp": "2024-01-15T20:00:00Z",
  "user_a_id": "usr_123",
  "user_b_id": "usr_456",
  "match_type": "mutual_like",
  "time_to_match_hours": 0.5
}

```

**친구 신청 이벤트 (FRIEND_REQUEST)**

```json
{
  "event_type": "FRIEND_REQUEST",
  "timestamp": "2024-01-15T20:30:00Z",
  "sender_id": "usr_123",
  "receiver_id": "usr_456",
  "details": {
    "has_message": true,
    "message_length": 45,
    "message_text": "안녕하세요! 프로필이 인상적이네요",
    "cost": 4,
    "time_since_match_hours": 0.5
  }
}

```

**친구 수락 이벤트 (FRIEND_ACCEPT)**

```json
{
  "event_type": "FRIEND_ACCEPT",
  "timestamp": "2024-01-16T08:00:00Z",
  "acceptor_id": "usr_456",
  "requester_id": "usr_123",
  "details": {
    "response_time_hours": 11.5,
    "pending_requests_count": 7
  }
}

```

**메시지 이벤트 (MESSAGE)**

```json
{
  "event_type": "MESSAGE",
  "timestamp": "2024-01-16T10:00:00Z",
  "sender_id": "usr_123",
  "receiver_id": "usr_456",
  "details": {
    "message_length": 35,
    "has_question": true,
    "has_emoji": true,
    "sentiment": "friendly",
    "conversation_turn": 5
  }
}

```

**결제 이벤트 (PAYMENT)**

```json
{
  "event_type": "PAYMENT",
  "timestamp": "2024-01-16T15:00:00Z",
  "user_id": "usr_123",
  "details": {
    "payment_type": "date_request",
    "amount": 50000,
    "target_user_id": "usr_456",
    "payment_method": "card",
    "venue": "sushi_omakase"
  }
}

```

### **3.2 로그 포맷 정의**

### **3.2.1 DynamoDB 테이블 구조**

**원시 이벤트 테이블 (raw_events)**

```
PK: DAILY#{date}
SK: TS#{timestamp}#USER#{user_id}#ACT#{action}
TTL: 7일

```

**학습용 페어 테이블 (training_pairs)**

```
PK: MONTH#{year-month}
SK: PAIR#{user_a}#{user_b}#DAY#{day}
보관: 영구

```

**집계 특성 테이블 (aggregated_features)**

```
PK: USER#{user_id}
SK: AGG#{period}#{date}
보관: 90일

```

### **3.2.2 S3 저장 구조**

**원시 로그 백업**

```
s3://dating-logs/raw_events/
  year=2024/
    month=01/
      day=15/
        hour=19/
          events_20240115_19_part001.json.gz

```

**학습 데이터셋**

```
s3://dating-ml/training_data/
  dataset_v1/
    train/
      like_prediction/
        pairs_2024_01.parquet
    validation/
    test/

```

### **3.3 데이터 수집 파이프라인**

### **3.3.1 실시간 수집**

```
클라이언트 앱
  ↓ (이벤트 발생)
API 서버
  ↓ (즉시 처리)
DynamoDB (raw_events)
  ↓ (비동기)
S3 백업

```

### **3.3.2 배치 처리**

```
DynamoDB (raw_events)
  ↓ (일 1회, 야간 배치)
Lambda / Glue Job
  ↓ (페어 재구성)
DynamoDB (training_pairs)
  ↓ (주 1회)
S3 (parquet 변환)
  ↓
SageMaker 학습

```

### **3.4 로그 품질 관리**

### **3.4.1 필수 검증 항목**

- 필수 필드 존재 여부
- 타임스탬프 유효성
- 유저 ID 형식 검증
- JSON 스키마 준수

### **3.4.2 데이터 정합성**

- 중복 이벤트 제거
- 순서 보장 (타임스탬프 기준)
- 관계 일관성 (예: MATCH는 양쪽 LIKE 이후)

### **3.4.3 모니터링**

- 로그 수집 실패율
- 지연 시간 (event → storage)
- 데이터 볼륨 추이
- 스키마 변경 감지

---

## **4. 전통적 알고리즘과의 통합**

### **4.1 통합 아키텍처**

### **4.1.1 Phase 1: 전통적 계산식만**

**수익유발 박스 계산 예시**

```
수익유발 점수 =
  (친구 신청 수락률 × 0.3) +
  (좋아요 응답률 × 0.2) +
  (채팅 응답률 × 0.3) +
  (데이트 신청 수락률 × 0.2)

여기서:
- 친구 신청 수락률 = 과거 수락 횟수 / 과거 받은 횟수
- 좋아요 응답률 = 과거 맞좋아요 / 과거 받은 좋아요

```

### **4.1.2 Phase 2: 하이브리드 (일부 AI 모델 도입)**

**수익유발 박스 계산 예시**

```
수익유발 점수 =
  (친구 수락 확률 예측 모델 결과 × 0.3) +  ← AI 모델
  (좋아요 응답률 × 0.2) +                   ← 전통적 방식
  (채팅 응답 확률 예측 모델 결과 × 0.3) +   ← AI 모델
  (데이트 신청 수락률 × 0.2)                ← 전통적 방식

핵심 지표만 AI 모델로 대체
나머지는 기존 계산식 유지

```

### **4.1.3 Phase 3: AI 중심 (대부분 예측 모델)**

**수익유발 박스 계산 예시**

```
수익유발 점수 =
  수익유발 통합 예측 모델(
    유저 A 특성,
    유저 B 특성,
    컨텍스트 정보
  )

대부분의 지표가 AI 예측 모델로 전환
전통적 계산식은 폴백 용도로만 유지

```

### **4.2 예측 결과 캐싱 전략**

### **4.2.1 유저 레벨 캐싱**

**대상**: 유저별 집계 특성 (자주 변경되지 않음)

```
캐시 키: "user_features:{user_id}:{date}"
TTL: 24시간

로직:
1. 캐시에서 유저 특성 조회
2. 있으면 → 캐시된 값 사용
3. 없으면 → 계산 후 캐시 저장

```

**캐싱 대상 예시**

- 최근 30일 좋아요 비율
- 평균 응답 시간
- 매력도 점수
- 활동성 점수

### **4.2.2 페어 레벨 캐싱**

**대상**: 유저 페어별 예측 결과 (실시간 계산 필요, 단기 캐싱)

```
캐시 키: "prediction:{user_a}:{user_b}:{model_name}:{hour}"
TTL: 1시간

로직:
1. 같은 세션 내 동일 페어 조회 시 캐시 사용
2. 시간 단위로 캐시 갱신
3. 컨텍스트 변화 시 재계산

```

**캐싱 대상 예시**

- 좋아요 확률 예측 결과
- 친구 수락 확률 예측 결과
- 채팅 응답 확률 예측 결과

### **4.3 A/B 테스트 프레임워크**

### **4.3.1 모델 버전 관리**

**유저 그룹 분할**

```
유저 ID 기반 해싱으로 그룹 할당
- Group A (50%): 전통적 계산식 사용
- Group B (50%): AI 예측 모델 사용

그룹 결정:
1. 유저 ID를 해싱
2. 0~49 → Group A (전통적 방식)
3. 50~99 → Group B (AI 모델)

```

**모델 선택 로직**

```
IF 유저가 Group A 소속:
  전통적 계산식 사용
ELSE IF 유저가 Group B 소속:
  AI 예측 모델 v2.0 사용

```

### **4.3.2 성과 측정**

**그룹별 비교 지표**

```
Group A (전통적 방식):
- 매칭 성공률: 15%
- 유저당 평균 매출: 12,000원
- 7일 리텐션: 65%

Group B (AI 모델):
- 매칭 성공률: 18% (+20% 개선)
- 유저당 평균 매출: 14,500원 (+21% 개선)
- 7일 리텐션: 68% (+5% 개선)

```

**측정 기간**

- 최소 2주 이상 운영
- 통계적 유의성 확보
- 계절성 고려

### **4.4 폴백 메커니즘**

### **4.4.1 AI 모델 실패 시**

**기본 원칙**: AI 모델이 실패해도 서비스는 정상 작동

```
예측 요청:
  TRY:
    AI 모델로 예측 시도
    예측 결과 반환
  CATCH (에러 발생):
    에러 로그 기록
    전통적 계산식으로 폴백
    계산 결과 반환

```

**폴백 트리거**

- AI 모델 응답 시간 초과 (>100ms)
- 모델 서버 에러
- 예측 결과 이상값 (0 미만, 1 초과)

### **4.4.2 신규 유저 처리**

**데이터 부족 시 전통적 방식 사용**

```
IF 유저의 총 이벤트 수 < 10:
  전통적 계산식 사용
  (과거 데이터 부족으로 AI 예측 불가능)
ELSE:
  AI 예측 모델 사용
  (충분한 데이터 확보)

```

**최소 데이터 요구량**

- 좋아요 예측: 최소 5회 평가 이력
- 친구 수락 예측: 최소 3회 친구 신청 수신
- 채팅 응답 예측: 최소 2회 대화 경험

---

## **5. 구현 로드맵**

### **5.1 Phase 1 (0~3개월): 로그 수집 및 기반 구축**

- **주요 작업**
    - 이벤트 로깅 시스템 구축
    - DynamoDB 테이블 설계 및 구현
    - S3 백업 파이프라인 구축
    - 데이터 품질 모니터링 대시보드
- **목표**
    - 모든 이벤트 100% 수집
    - 최소 1개월 이상의 학습 데이터 확보

### **5.2 Phase 2 (3~6개월): 첫 번째 AI 모델 개발**

- **주요 작업**
    - 좋아요 확률 예측 모델 개발
    - 친구 수락 확률 예측 모델 개발
    - 하이브리드 통합 구현
    - A/B 테스트 프레임워크 구축
- **목표**
    - 2개 핵심 모델 프로덕션 배포
    - 전통적 방식 대비 성과 검증

### **5.3 Phase 3 (6~12개월): 전체 모델 확장**

- **주요 작업**
    - 나머지 예측 모델 개발
    - 자동 재학습 파이프라인 구축
    - 모델 성능 최적화
    - 엣지 추론 도입 검토
- **목표**
    - 모든 핵심 지표 AI 모델 전환
    - 30% 이상 비즈니스 지표 개선

---

## **6. 예상 효과**

### **6.1 정량적 개선 목표**

**모델 정확도**

- 좋아요 예측: 75% → 88% (17% 개선)
- 친구 수락 예측: 70% → 85% (21% 개선)
- 이탈 예측: 65% → 82% (26% 개선)

**비즈니스 지표**

- 매칭 성공률: 15% → 21% (40% 개선)
- ARPU: 12,000원 → 16,500원 (38% 개선)
- 7일 리텐션: 65% → 73% (12% 개선)
- 30일 리텐션: 45% → 56% (24% 개선)

### **6.2 정성적 효과**

**사용자 경험**

- 더 정확한 매칭으로 실망 감소
- 성공 가능성 높은 프로필 우선 노출
- 시간 낭비 최소화

**운영 효율성**

- 자동화된 최적화
- 데이터 기반 의사결정
- 빠른 실험 및 검증