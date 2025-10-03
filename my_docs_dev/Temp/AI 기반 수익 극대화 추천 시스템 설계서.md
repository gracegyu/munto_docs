# AI 기반 수익 극대화 추천 시스템 설계서

작성자: 전규현 (CEO 의견 반영)

대상 독자: 개발팀, 데이터 분석가, 기획팀

최종 수정일: 2025-10-02

---

## 1. 목표 및 핵심 과제

### 1.1 Executive Summary

기존 AI 문서는 "좋아요 확률 예측", "친구 수락 확률 예측" 같은 **개별 예측 모델**만 다루고 있어, 이를 어떻게 조합해야 수익이 극대화되는지 불명확했습니다. 이 문서는 **수익 최적화 AI 모델(Level 3)**을 새롭게 설계하여, 각 사용자에게 "될 듯 말 듯한" 경험을 개인화하여 제공함으로써 탐색 기간을 연장하고 재화 소비를 극대화합니다. Contextual Bandit 알고리즘을 사용하여 사용자 상태에 따라 10-15개 전략 중 최적을 자동 선택하며, 이탈 위험 사용자에게는 빠른 성공 경험을, 안정적 사용자에게는 재화 소비 유도 전략을 적용합니다. Phase 1-2 (Month 0-9)에서 데이터 수집 및 Level 2 개발, Phase 3-4 (Month 9-18)에서 Level 3 적용하며, 예상 효과는 **ARPU +25%, LTV +33%, 탐색 기간 2배 연장**입니다.

### 1.2 최종 목표

**수익 극대화 (Revenue Maximization)**

단순한 매칭 성공률 최적화가 아닌, 사용자당 생애 가치(LTV, Lifetime Value)를 극대화하는 것이 목표입니다.

### 1.3 핵심 딜레마

**"완벽한 매칭" vs "지속적인 탐색"**

```
시나리오 A: 완벽한 매칭 최적화
- 첫 추천에서 이상적인 상대 제공
- 빠른 커플 성사 (1-2주)
- 재화 소비: 20-30개
- 서비스 이탈
→ 단기 수익만 발생

시나리오 B: 적절한 긴장감 유지
- "될 듯 말 듯한" 매칭 경험 제공
- 중장기 탐색 과정 (1-3개월)
- 재화 소비: 100-200개
- 만족스러운 매칭 후 이탈
→ 수익 극대화 달성

시나리오 C: 과도한 지연
- 매칭 가능성 낮은 프로필 과다 노출
- 피로감 누적 (1개월 내)
- 재화 소비: 10-20개
- 실망 후 조기 이탈
→ 수익 감소
```

**최적 지점 찾기**: 시나리오 B를 달성하되, 시나리오 C로 빠지지 않도록 이탈 위험을 실시간 감지하고 조정하는 것이 핵심입니다.

### 1.4 수익 극대화의 정의

**수익 = Σ(사용자별 재화 소비량) × (재화당 가격) × (리텐션)**

구성 요소:

1. **재화 소비 빈도**: 프로필 조회, 슈퍼좋아요, 친구 신청, 채팅 활성화 등
2. **탐색 기간**: 서비스 이용 기간 (짧으면 재화 소비 적음, 길면 피로도 증가)
3. **리텐션**: 이탈하지 않고 지속 사용
4. **최종 만족도**: 결국 좋은 매칭으로 이어져야 재가입 및 추천 가능

**핵심 인사이트**:

- 너무 빠른 성공 → 수익 감소
- 너무 느린 성공 → 이탈 증가 → 수익 감소
- **최적 구간**: "노력하면 성공할 수 있다"는 희망을 유지하면서 적절한 탐색 기간 확보

---

### 1.5 개발 단계 (Phase) 개요

시스템은 18개월에 걸쳐 단계적으로 발전합니다:

**Phase 1 (Month 0-3): 기반 구축**

- Level 1 전통적 박스 시스템 프로덕션 배포
- 기본 로그 수집 시스템 구축
- 3개월간 데이터 축적

**Phase 2 (Month 3-9): Level 2 개발**

- 데이터 분석 및 모델 설계 (Month 3-6)
- 핵심 2개 모델 개발: 친구 수락 확률, 이탈 확률 (Month 6-9)
- 접근 1 적용 (숫자 피처만, XGBoost)

**Phase 3 (Month 9-12): Level 2 검증**

- A/B 테스트 및 점진적 롤아웃
- 목표: ARPU +15-20%
- 필요시 접근 2 적용 검토 (Image 추가)

**Phase 4 (Month 12-18): Level 3 개발 및 적용**

- 전략 정의 및 Contextual Bandit 개발 (Month 12-15)
- A/B 테스트 및 롤아웃 (Month 15-18)
- 목표: ARPU +25-35% (총합)

**Phase 5 (Month 18+): 지속 개선**

- 주간 자동 재학습
- 전략 최적화
- 접근 3 연구 (선택)

**참고**: 개발 로드맵 상세는 [데이팅 서비스 AI 접목 개발 로드맵](./데이팅%20서비스%20AI%20접목%20개발%20로드맵.md) 참조

---

## 2. AI 시스템 전체 아키텍처

### 2.1 계층 구조

```
┌─────────────────────────────────────────────────────┐
│           Level 3: 수익 최적화 의사결정 모델          │
│  "이 사용자에게 지금 어떤 프로필을 어떤 순서로 보여줄까?"  │
│         → 수익 극대화를 위한 전략적 의사결정            │
└─────────────────────────────────────────────────────┘
                          ↓ (활용)
┌─────────────────────────────────────────────────────┐
│         Level 2: 개별 행동 예측 모델 (Tactical)        │
│  - 좋아요 확률 예측                                    │
│  - 친구 신청 확률 예측                                 │
│  - 친구 수락 확률 예측                                 │
│  - 채팅 응답 확률 예측                                 │
│  - 데이트 신청 확률 예측                               │
│  - 7일/30일 이탈 확률 예측                            │
└─────────────────────────────────────────────────────┘
                          ↓ (활용)
┌─────────────────────────────────────────────────────┐
│        Level 1: 기본 점수 및 특성 계산 (Traditional)   │
│  - 매력도 점수 (Desirability)                         │
│  - 활동성 점수 (Engagement)                          │
│  - 수익유발 점수 (Monetization)                       │
│  - 프로필 완성도, 거리, 나이 등 기본 필터              │
└─────────────────────────────────────────────────────┘
```

### 2.2 핵심 철학

**Level 1-2는 "예측"에 집중하고, Level 3는 "의사결정"에 집중합니다.**

- **Level 1 (Traditional)**: 과거 데이터 기반 집계 점수
- **Level 2 (Prediction)**: "A가 B에게 좋아요를 누를 확률은 0.73"
- **Level 3 (Optimization)**: "A의 수익을 극대화하려면 지금 B, C, D 순서로 보여줘야 함"

**기존 AI 문서의 한계**: Level 2까지만 정의되어 있음. Level 3 (수익 최적화)가 누락되어 있어, 개별 예측을 어떻게 조합해야 할지 불명확.

---

## 3. 예측 모델 전체 구조

### 3.1 개별 행동 예측 모델 (Level 2)

기존 [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)에 상세히 정의된 모델들:

| 모델명                | 예측 대상                 | 활용 목적                  |
| --------------------- | ------------------------- | -------------------------- |
| 좋아요 확률 예측      | P(A가 B를 좋아요)         | 매력도 평가, 노출 우선순위 |
| 친구 신청 확률 예측   | P(A가 B에게 친구 신청)    | 재화 소비 예측             |
| 친구 수락 확률 예측   | P(B가 A의 친구 신청 수락) | 매칭 성공률 예측           |
| 채팅 응답 확률 예측   | P(B가 A의 채팅에 응답)    | 관계 발전 가능성           |
| 데이트 신청 확률 예측 | P(A가 B에게 데이트 신청)  | 고가치 행동 예측           |
| 이탈 확률 예측        | P(A가 7일/30일 내 이탈)   | 리텐션 관리                |

**중요**: 이 모델들은 "개별 행동의 확률"만 예측할 뿐, "수익 최적화"를 직접 다루지 않습니다.

**Note**: Level 2 모델들의 구체적인 학습 방법론(알고리즘 선택, 하이퍼파라미터 튜닝, 피처 엔지니어링 등)은 Phase 2 (Month 6-9) 모델 개발 시점에 별도 문서로 작성 예정입니다. Phase 1에서는 Input/Output 명세와 데이터 수집 전략 정의로 충분하며, 데이터만 제대로 수집되면 나중에 다양한 ML 알고리즘을 시도하며 최적의 방법을 찾을 수 있습니다.

---

### 3.1.2 멀티모달 입력 처리 (Text + Image)

**핵심 문제**: Level 2 예측 모델의 입력에는 텍스트(프로필 정보)와 이미지(사진)가 모두 포함됩니다. 어떻게 함께 처리할까?

**주요 고민사항**:

```
1. Image 전처리:
   - 리사이즈: 어떤 크기? (256×256? 512×512?)
   - 가로/세로 사진 통일: 어떻게?
   - 컬러 vs 흑백: 정보 손실은?

2. Text 전처리:
   - 자기소개, MBTI, 관심사 등
   - 임베딩 방법?

3. 통합:
   - Text와 Image를 어떻게 합치나?
   - 모델 아키텍처는?
```

---

**해결 방안: 3가지 접근법**

**접근 1: Image 없이 시작 (간단, 권장 - 초기 적용)**

```
Input: Text/숫자 피처만
- 나이, 성별, MBTI
- 거리, 관심사 개수
- 활동 이력 (로그인 빈도, 좋아요 횟수)
- 과거 수락률, 응답률

모델: 전통적 ML (XGBoost, LightGBM)

장점:
- 즉시 구현 가능
- 빠른 추론 (10-20ms)
- 해석 가능

예상 성능:
- 친구 수락 예측: AUC 0.75-0.80
- 이탈 예측: AUC 0.75-0.80
- 충분히 유용함

전략:
- 즉시 구현 (Level 2 모델 개발 시작 시점)
- 성능 검증 후 Image 추가 검토
```

**접근 2: Image Embedding 추가 (중간, 선택 - 중기 적용)**

```
1. Image 전처리:
   크기: 224×224 (표준 CNN 입력 크기)
   - ResNet, EfficientNet 사전학습 모델 사용
   - 가로/세로 무관: Center crop + resize
   - 컬러 유지 (RGB 3채널)

2. Image → 중간 표현 (Embedding):
   사전학습 모델로 이미지를 숫자 벡터로 변환:
   - ResNet-50 사용
   - 마지막 FC layer 제거
   - 중간 출력: 512차원 벡터 (이것은 Output이 아님!)

   예:
   사진 (1080×1920, RGB)
     → Resize to 224×224
     → ResNet-50 (중간 표현 추출)
     → 512차원 벡터 [0.23, -0.45, 0.67, ...]
     → 이것은 "사진의 특징을 숫자로 표현한 것"
     → 아직 예측 결과 아님!

3. Text → 중간 표현 (Embedding):
   - 자기소개를 숫자 벡터로 변환
   - Sentence-BERT 사용
   - 중간 출력: 768차원 벡터 (이것도 Output 아님!)

4. 모든 피처 통합 (최종 Input 생성):

   최종 Input = [
     숫자 피처 (우리가 정의, 예: 50차원):
       [28,      // 사용자 A 나이
        26,      // 사용자 B 나이
        3.5,     // 거리 (km)
        5,       // 공통 관심사 개수
        0.75,    // A의 매력도 점수
        0.68,    // B의 수익유발 점수
        12,      // A의 로그인 빈도
        0.35,    // A의 과거 수락률
        ...]     // 총 50개 (증가 가능!)

     Image 특징 (512차원, 고정):
       [0.23, -0.45, 0.67, ...]  ← 사진을 숫자로 변환 (ResNet)

     Text 특징 (768차원, 고정):
       [0.15, 0.88, -0.32, ...]  ← 자기소개를 숫자로 변환 (BERT)
   ]

   Total: 50 + 512 + 768 = 1330차원

   **중요**:
   - 숫자 피처: 우리가 정의하고 추가 가능 (50 → 100 가능)
   - Image/Text 임베딩: 사전학습 모델이 결정 (512, 768 고정)

5. 예측 모델 선택:

   **접근 1 (숫자만) 적용 시: XGBoost 권장**

   Input: 숫자 피처만 (50차원)
   모델: XGBoost 또는 LightGBM
   Output: 확률 값

   이유:
   - 정형 데이터에 최적
   - 빠른 학습 및 추론 (5-10ms)
   - 피처 중요도 명확 (해석 가능)

   예상 성능: AUC 0.75-0.80

   **접근 2 (Image 포함) 적용 시: Neural Network 권장**

   Input: 1330차원 (숫자 50 + Image 512 + Text 768)
   모델: Neural Network
   Output: 확률 값

   이유:
   - 복잡한 상호작용 학습
   - XGBoost도 가능하지만 NN이 더 나음
   - 비선형 관계 포착

   예상 성능: AUC 0.85-0.90

   아키텍처:
   Input (1330차원)
     → Dense(512, ReLU)
     → Dropout(0.3)
     → Dense(256, ReLU)
     → Dropout(0.2)
     → Dense(128, ReLU)
     → Dense(3, Softmax)

   Output (3차원): [0.65, 0.15, 0.20] = [좋아요, 슈퍼좋아요, 싫어요]
```

**모델 선택 가이드**:

| 접근   | Input                      | 모델           | 이유                   |
| ------ | -------------------------- | -------------- | ---------------------- |
| 접근 1 | 숫자만 (50차원)            | XGBoost        | 정형 데이터 최적, 빠름 |
| 접근 2 | 숫자+Image+Text (1330차원) | Neural Network | 복잡한 상호작용 학습   |

**중요한 구분**:

512차원 벡터 (Image Embedding):

- 역할: 사진을 숫자로 표현 (중간 단계)
- 의미: 각 차원은 사진의 특징 (자동 학습됨)
- 용도: 예측 모델의 Input 피처

최종 Output (우리가 정의):

- 역할: 실제 예측 결과
- 의미: 좋아요/슈퍼좋아요/싫어요 확률
- 용도: 프로필 분류 및 추천 결정

**접근 3: End-to-End Multi-modal (고급, 연구 단계 - 장기 적용)**

**핵심 차이**: 접근 2는 "사전학습 모델로 임베딩 추출 → NN", 접근 3은 "Image와 Text를 직접 입력 → CNN+BERT+예측 모델을 한 번에 학습"

아키텍처:

```
┌─────────────┐  ┌──────────────┐
│   Image     │  │     Text     │
│ (224×224×3) │  │  (Profile)   │
└─────────────┘  └──────────────┘
       ↓                 ↓
┌─────────────┐  ┌──────────────┐
│ CNN Encoder │  │ BERT Encoder │
│ (ResNet-50) │  │              │
└─────────────┘  └──────────────┘
       ↓                 ↓
┌─────────────┐  ┌──────────────┐
│ 512-dim     │  │  768-dim     │
└─────────────┘  └──────────────┘
       ↓                 ↓
       └─────────┬───────┘
                 ↓
       ┌──────────────────┐
       │  Fusion Layer    │
       │  (Dense + Concat)│
       └──────────────────┘
                 ↓
       ┌──────────────────┐
       │  Prediction Head │
       └──────────────────┘
                 ↓
          확률 값 (0.73)
```

장점:

- 이미지와 텍스트 상호작용 학습
- 최고 성능

단점:

- 복잡도 높음
- 학습 시간 김 (수일-수주)
- 대량 데이터 필요 (10만+ 이미지)

---

**이미지 전처리 상세**

**1. 크기 통일**:

```python
# 권장 방식
def preprocess_image(image_path):
    """
    모든 이미지를 224×224×3으로 통일
    """
    img = Image.open(image_path)

    # 1. 짧은 쪽을 224로 resize
    img.thumbnail((224, 224))

    # 2. Center crop으로 224×224 추출
    width, height = img.size
    left = (width - 224) / 2
    top = (height - 224) / 2
    img_cropped = img.crop((left, top, left + 224, top + 224))

    # 3. RGB 유지 (컬러)
    if img_cropped.mode != 'RGB':
        img_cropped = img_cropped.convert('RGB')

    # 4. 정규화 [0, 255] → [0, 1]
    img_array = np.array(img_cropped) / 255.0

    return img_array  # (224, 224, 3)
```

**2. 컬러 vs 흑백**:

```
질문: 흑백으로 바꿔도 선택은 동일한가?

답변: 아니오. 컬러 유지 필수!

이유:
- 피부톤, 옷 색상, 배경 분위기 → 중요한 정보
- 흑백 변환 시 정보 손실 30-40%
- 사전학습 모델도 RGB 기준 (ImageNet)
- 성능 차이: 컬러 AUC 0.85 vs 흑백 AUC 0.75

결론: 반드시 RGB 3채널 유지
```

**3. 크기 선택 (224×224 권장)**:

```
옵션 비교:

128×128:
- 장점: 빠른 추론 (5ms)
- 단점: 얼굴 디테일 손실
- 성능: AUC 0.75

224×224: (권장)
- 장점: 충분한 디테일, 표준 사이즈
- 추론 시간: 15ms (허용 범위)
- 성능: AUC 0.85
- 사전학습 모델 대부분 지원

512×512:
- 장점: 최고 품질
- 단점: 추론 느림 (50ms), 메모리 많이 사용
- 성능: AUC 0.86 (224 대비 +1%만 향상)

권장: 224×224 (성능/속도 균형)
```

---

**접근 2 상세: 어떻게 통합하나?**

접근 2를 적용할 때 Image + Text + 숫자를 통합하는 구체적 방법:

```python
# 접근 2의 구현 (Early Fusion 방식)

# 1. 이미지 임베딩 추출 (오프라인, 하루 1회)
image_embedding = resnet50.encode(image_224x224)  # (512,)

# 2. 텍스트 임베딩 추출 (오프라인)
text_embedding = sentence_transformer.encode(bio)  # (768,)

# 3. 숫자 피처
numeric_features = [age, distance, mbti_encoded, ...]  # (50,)

# 4. 모두 결합
combined_input = np.concatenate([
    numeric_features,     # (50,)
    image_embedding,      # (512,)
    text_embedding        # (768,)
])  # 총 1330차원

# 5. Neural Network 학습
model = build_neural_network(input_dim=1330, output_dim=3)
model.fit(X=combined_input, y=labels)

# Output: [좋아요 확률, 슈퍼좋아요 확률, 싫어요 확률]
```

**참고**: Late Fusion(모달리티별 별도 모델), Attention-based Fusion 등 다른 통합 방식도 있지만, Early Fusion(단순 결합)이 구현이 간단하고 충분히 효과적입니다.

---

**권장 로드맵**

**Phase 2 (Month 6-9): Text/숫자만**

```
Input: 나이, 거리, MBTI, 활동 이력, 과거 수락률
모델: XGBoost
성능: AUC 0.75-0.80
충분성: 이것만으로도 +15% ARPU 가능
```

**Phase 3 (Month 9-12): Image Embedding 추가 (선택)**

```
Image → ResNet-50 → 512차원 임베딩
Text → Sentence-BERT → 768차원 임베딩
통합: Concatenation
모델: XGBoost 또는 Neural Net
성능: AUC 0.85+ (Text만 대비 +5-10%)

추가 작업:
- 모든 사진 224×224 resize 및 임베딩 (1-2일, 배치 작업)
- 임베딩 캐시 (Redis)
```

**Phase 4+ (장기): End-to-End Multi-modal (선택)**

```
필요 조건:
- 이미지 데이터 10만+ 장
- GPU 인프라
- 전담 팀

예상 추가 효과: +2-5% (미미)
```

---

**최종 권장사항**

**우선순위**:

1. **Phase 2**: Text/숫자 피처만 (필수)
   - 가장 빠르고 효과적
   - Image 없어도 충분한 성능
2. **Phase 3**: Image Embedding 추가 (선택)
   - 조건: Phase 2 성공 시
   - 예상 개선: +5-10%
3. **Phase 4+**: End-to-End Multi-modal (연구)
   - 장기 과제
   - 우선순위 낮음

**핵심 통찰**:

```
사용자 선택에 영향을 주는 요소:
1. 프로필 사진 (60-70%)  ← 중요하지만
2. 나이, 거리 (20-25%)     ← 이것만으로도
3. MBTI, 관심사 (5-10%)    ← 충분한 예측 가능
4. 활동성, 수락률 (5%)

Image 임베딩 추가 시:
- 성능 향상: +5-10% (크지 않음)
- 복잡도 증가: 2-3배
- 추론 시간: +10-20ms

결론:
- Phase 2는 Image 없이 시작 (빠르고 충분)
- Phase 3에서 필요시 추가
- 완벽주의보다 빠른 가치 창출
```

---

**이미지 처리 기술 상세 (Phase 3 이후 참고)**

**1. Resize 전략**:

```python
# 방법 1: Center Crop (권장)
def center_crop_resize(image, target_size=224):
    """
    중앙 부분을 정사각형으로 자르고 resize
    얼굴이 중앙에 있다고 가정
    """
    width, height = image.size
    min_dim = min(width, height)

    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = left + min_dim
    bottom = top + min_dim

    cropped = image.crop((left, top, right, bottom))
    resized = cropped.resize((target_size, target_size))

    return resized  # (224, 224, 3)

# 방법 2: Padding (대안)
def pad_and_resize(image, target_size=224):
    """
    비율 유지하며 resize 후 패딩
    정보 손실 최소화
    """
    # 짧은 쪽을 224로 맞춤
    image.thumbnail((target_size, target_size))

    # 검은색 배경에 중앙 배치
    background = Image.new('RGB', (target_size, target_size), (0, 0, 0))
    offset = ((target_size - image.width) // 2,
              (target_size - image.height) // 2)
    background.paste(image, offset)

    return background

권장: Center Crop (얼굴이 중앙에 있고, 모델이 배경에 혼란 안 받음)
```

**2. 사전학습 모델 선택**:

```
ResNet-50 (권장):
- 입력: 224×224×3
- 출력: 2048차원 → FC로 512차원 축소
- 추론 시간: 15ms (CPU), 3ms (GPU)
- 사전학습: ImageNet
- 장점: 안정적, 검증됨

EfficientNet-B0 (대안):
- 입력: 224×224×3
- 출력: 1280차원
- 추론 시간: 20ms (CPU)
- 장점: 더 높은 정확도

MobileNet-V2 (경량):
- 입력: 224×224×3
- 출력: 1280차원
- 추론 시간: 5ms (CPU)
- 장점: 매우 빠름
- 단점: 정확도 약간 낮음

권장: ResNet-50 (성능/속도 균형)
```

**3. Embedding 캐싱**:

```python
# 이미지 임베딩은 변하지 않으므로 캐시

# 1. 배치로 모든 사진 임베딩 생성 (하루 1회)
for user in all_users:
    for photo in user.photos:
        embedding = resnet50.encode(photo)
        redis.set(f"img_emb:{photo.id}", embedding, ttl=7days)

# 2. 추론 시 캐시 사용
def predict(user_a, user_b):
    # 임베딩 조회 (Redis)
    emb_a = redis.get(f"img_emb:{user_a.main_photo_id}")
    emb_b = redis.get(f"img_emb:{user_b.main_photo_id}")

    # 텍스트 피처
    features = [age_a, age_b, distance, ...]

    # 결합
    input_vector = concat([features, emb_a, emb_b])

    # 예측
    prob = model.predict(input_vector)

    return prob

추론 시간: 5ms (캐시 히트) vs 20ms (캐시 미스)
```

---

**FAQ**

**Q1: 사진이 여러 장인데 어떻게 처리?**

A: 메인 사진만 사용 (Phase 2-3) 또는 평균 임베딩 (Phase 4+)

```python
# Phase 2-3: 메인 사진만
main_photo_embedding = resnet50.encode(user.main_photo)

# Phase 4+ (선택): 모든 사진 평균
embeddings = [resnet50.encode(photo) for photo in user.photos]
avg_embedding = np.mean(embeddings, axis=0)  # (512,)
```

**Q2: 흑백 사진은?**

A: RGB로 변환 (3채널 복사)

```python
if image.mode == 'L':  # 흑백
    image = image.convert('RGB')  # 같은 값 3채널로
```

**Q3: 사진 품질이 다양한데?**

A: 괜찮음. ResNet은 다양한 품질에 강건함

```
저화질 (720p) vs 고화질 (4K):
→ 224×224로 resize 하면 차이 거의 없음
→ 성능 영향 < 2%
```

**Q4: 가로 vs 세로 사진 문제?**

A: Center Crop으로 해결

```
가로 (1920×1080) → Center crop → (1080×1080) → Resize → (224×224)
세로 (1080×1920) → Center crop → (1080×1080) → Resize → (224×224)

→ 모두 동일한 정사각형으로 통일
→ 얼굴이 중앙에 있다고 가정 (프로필 사진 특성)
```

---

**최종 권장사항**

**즉시 (Phase 2)**:

- Image 없이 Text/숫자 피처만 사용
- XGBoost 또는 LightGBM
- 빠르고 효과적

**선택 (Phase 3)**:

- ResNet-50 Image Embedding 추가
- 224×224, RGB, Center Crop
- 예상 개선 +5-10%

**장기 (Phase 4+)**:

- End-to-End Multi-modal
- 조건부 (데이터 충분, 여유 있을 때만)

**핵심**: Image는 중요하지만, Phase 2는 없이 시작해도 충분합니다. 프로필 사진 원본은 반드시 저장하되, 학습에 당장 사용하지 않아도 됩니다.

---

**중요: 프로필 사진 데이터의 필수성**

Level 2 예측 모델들의 정확도에 가장 큰 영향을 미치는 요소는 **프로필 사진**입니다:

- **좋아요 확률**: 사진의 시각적 매력도가 가장 큰 영향 요소 (추정 기여도 60-70%)
- **친구 수락 확률**: 사진 품질 + 신뢰도가 핵심 (추정 기여도 50-60%)
- **채팅 응답 확률**: 사진 기반 첫인상이 중요 (추정 기여도 40-50%)

따라서 로그 데이터 수집 시 다음 사항이 필수적입니다:

**필수 사항**:

1. **프로필 사진 원본 저장**: S3에 원본 사진 영구 보관 (압축 금지)
2. **사진 메타데이터 기록**:
   - 사진 URL 및 S3 키
   - 업로드 시점
   - 사진 순서 (메인 사진 여부)
   - 승인 상태
3. **이벤트 발생 시점의 사진 스냅샷**:
   - 노출 당시 사용자 A와 B가 어떤 사진을 사용했는지 기록
   - 프로필 사진 변경 이력 추적

**추가 권장 사항**:

1. **사진 특성 추출 (향후)**:
   - 얼굴 감지 및 특성 (나이, 표정, 각도)
   - 배경 분석 (실내/실외, 활동)
   - 사진 품질 (해상도, 조명, 구도)
   - 스타일 (캐주얼, 포멀, 스포츠 등)
2. **사진 변경 이벤트 로깅**:
   - 사진 변경 전후 성과 비교 (좋아요율 변화)
   - A/B 테스트 데이터 축적

**데이터 수집 시 주의사항**:

- 개인정보 보호: 원본 사진은 암호화 저장 및 접근 제어
- 저장 비용 최적화: S3 Intelligent-Tiering 활용
- 데이터 보관 기간: 최소 1년 (학습 및 재현을 위해)

### 3.1.1 확장성 문제 및 해결 방안 (Scalability Challenge)

### 문제 정의

**조합 폭발 문제 (Combinatorial Explosion)**:

```
시나리오:
- 남성 사용자 수: 100,000명
- 여성 사용자 수: 100,000명
- 각 예측 모델당 필요한 추론 횟수: 100,000 × 100,000 = 100억 회

문제점:
1. 실시간 추론 불가능: 100억 회 예측에 수천 시간 소요
2. 스토리지 폭발: 모든 조합의 예측 결과 저장 시 TB급 필요
3. 학습 데이터 희소성: 실제 상호작용은 전체의 0.001% 미만
4. 비용: 추론 API 호출 비용만 수백만 원/일
```

**현실적 제약**:

- 추천 API 응답 시간: 300ms 이내
- 사용자당 추천 생성 시 고려 가능한 후보: 최대 수천 명
- Cold start: 신규 사용자는 상호작용 데이터 전무

---

### 해결 방안 (Industry Standard Approaches)

**방안 1: Two-Stage Retrieval (Candidate Generation → Ranking)**

추천 시스템 산업 표준 접근법:

```
Stage 1: Candidate Generation (후보 생성) - 빠르고 단순
  목표: 100억 → 1,000명으로 축소
  방법:
    - 규칙 기반 필터링 (거리 < 50km, 나이 차이 < 10세)
    - 협업 필터링 (유사 사용자가 좋아한 프로필)
    - 벡터 유사도 검색 (ANN - Approximate Nearest Neighbor)
  시간: 50-100ms

Stage 2: Ranking (정밀 순위 매기기) - 느리지만 정확
  목표: 1,000명 → 최종 10-20명 추천
  방법:
    - Level 2 예측 모델 전체 실행
    - 좋아요/수락/응답 확률 정밀 예측
    - Level 3 수익 최적화 적용
  시간: 100-200ms

총 소요 시간: 150-300ms (목표 충족)
```

**예시**:

- YouTube: Candidate Generation (수백만 → 수백) → Ranking (수백 → 10)
- LinkedIn: 빠른 필터링 → Neural Network Ranking
- Tinder: 지리적 필터 → 협업 필터링 → 최종 스코어링

---

**방안 2: Two-Tower Model (Dual Encoder Architecture)**

사용자와 프로필을 각각 저차원 벡터로 임베딩:

```
User Encoder:
  Input: 사용자 A의 프로필 + 행동 이력
  Output: d차원 벡터 (예: 128차원)
  예: u_A = [0.23, -0.45, 0.67, ..., 0.12]

Profile Encoder:
  Input: 사용자 B의 프로필
  Output: d차원 벡터 (예: 128차원)
  예: v_B = [0.31, -0.22, 0.55, ..., 0.08]

Similarity Score:
  Score(A, B) = u_A · v_B (내적) 또는 코사인 유사도

장점:
- 각 사용자/프로필당 1번만 인코딩 (100,000 + 100,000 = 200,000회)
- 유사도 계산은 단순 벡터 연산 (매우 빠름)
- 총 계산량: O(N + M) vs O(N × M)
```

**구현 예시**:

```python
# 사전 계산 (배치 작업, 하루 1회)
user_embeddings = user_encoder.encode_all_users()  # (100000, 128)
profile_embeddings = profile_encoder.encode_all_profiles()  # (100000, 128)

# 실시간 추론 (사용자 A에게 추천 시)
u_A = user_embeddings[user_A_id]  # (128,)
scores = u_A @ profile_embeddings.T  # (100000,) - 한 번에 10만 개 점수 계산
top_k_indices = np.argsort(scores)[-1000:]  # 상위 1000명 선택

# Stage 2: 1000명에 대해서만 정밀 예측
for candidate in top_k_candidates:
    precise_score = detailed_prediction_model(user_A, candidate)
```

**사용 사례**:

- Google: Two-Tower for YouTube recommendations
- Meta: Dual Encoder for Facebook friend suggestions
- Spotify: User/Track embedding for music recommendations

---

**방안 3: Approximate Nearest Neighbor (ANN) 검색**

벡터 유사도 검색 최적화:

```
라이브러리:
- FAISS (Facebook AI Similarity Search)
- ScaNN (Google)
- Annoy (Spotify)
- HNSW (Hierarchical Navigable Small World)

동작 원리:
1. 모든 프로필을 벡터로 표현 (Two-Tower 출력)
2. ANN 인덱스 구축 (오프라인)
3. 쿼리 시 근사 최근접 이웃 검색
4. 정확도 99%+, 속도는 100-1000배 빠름

예시:
# FAISS 활용
import faiss

# 인덱스 구축 (하루 1회)
index = faiss.IndexFlatIP(128)  # Inner Product
index.add(profile_embeddings)  # (100000, 128)

# 실시간 검색 (사용자 A)
k = 1000
scores, indices = index.search(u_A.reshape(1, -1), k)
# 결과: 상위 1000명을 수 ms 내 검색
```

**성능**:

- 100만 개 벡터에서 상위 1000개 검색: 10-50ms
- 정확도: 95-99% (vs 완전 탐색 100%)

---

**방안 4: Negative Sampling (학습 시)**

학습 단계에서 모든 조합을 사용하지 않음:

```
학습 데이터 구성:
1. Positive samples (실제 상호작용):
   - (A, B, LIKE) - 10,000건
   - (A, C, FRIEND_REQUEST) - 5,000건

2. Negative samples (샘플링):
   - 각 positive sample당 N개의 negative 생성
   - Random sampling 또는 Hard negative mining
   - 예: (A, D, NO_INTERACTION) - 50,000건

학습 데이터:
- Positive: 15,000건
- Negative: 50,000건
- 총 65,000건 (vs 100억 건)

효과:
- 학습 시간: 수일 → 수시간
- 모델 일반화 성능 향상 (과적합 방지)
```

---

### 추천 아키텍처 (통합 솔루션)

```
┌─────────────────────────────────────────────────────┐
│  사용자 A가 추천 요청                                 │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  Stage 1: Candidate Generation                      │
│  방법 1: 규칙 기반 필터링                            │
│    - 거리 < 50km                                     │
│    - 나이 차이 < 10세                                │
│    - 차단/매칭 제외                                  │
│    결과: 100,000 → 10,000명                         │
│                                                      │
│  방법 2: Two-Tower + ANN                            │
│    - User Encoder(A) → u_A (128차원)                │
│    - FAISS로 상위 2,000명 검색                      │
│    결과: 10,000 + 2,000 = 12,000명 (중복 제거)      │
└─────────────────────────────────────────────────────┘
              ↓ (12,000명)
┌─────────────────────────────────────────────────────┐
│  Stage 2: Coarse Ranking                            │
│  - 빠른 휴리스틱 점수 계산                           │
│  - 매력도/활동성 기본 점수                           │
│  - 협업 필터링 점수                                  │
│  결과: 12,000 → 1,000명                             │
└─────────────────────────────────────────────────────┘
              ↓ (1,000명)
┌─────────────────────────────────────────────────────┐
│  Stage 3: Fine-grained Ranking (Level 2 모델)       │
│  - 1,000명에 대해서만 정밀 예측 실행                 │
│  - 좋아요 확률: P(A→B)                               │
│  - 친구 수락 확률: P(B accepts A)                   │
│  - 채팅 응답 확률: P(B responds to A)               │
│  결과: 1,000 → 100명 (상위 점수)                    │
└─────────────────────────────────────────────────────┘
              ↓ (100명)
┌─────────────────────────────────────────────────────┐
│  Stage 4: Revenue Optimization (Level 3)            │
│  - Contextual Bandit 전략 선택                      │
│  - 100명을 티어별로 분류                             │
│  - 최종 10-20명 선택                                 │
└─────────────────────────────────────────────────────┘
              ↓
        최종 추천 리스트
```

**성능 예측**:

- Stage 1: 50ms (규칙 필터) + 30ms (ANN) = 80ms
- Stage 2: 40ms (12,000명 간단한 계산)
- Stage 3: 100ms (1,000명 정밀 예측, 배치 처리)
- Stage 4: 30ms (100명 전략 적용)
- **총계: 250ms** (목표 300ms 달성)

---

### 산업계 사례 연구

**Tinder**:

- Stage 1: Geolocation index (주변 10km)
- Stage 2: Elo rating system (빠른 점수)
- Stage 3: ML model (상위 후보에만 적용)

**LinkedIn (Job Recommendations)**:

- Candidate Generation: 직무/산업 필터 + 협업 필터링
- Ranking: LambdaMART (Learning to Rank)
- Personalization: Contextual Bandit

**Netflix**:

- Item-to-Item CF (빠른 후보 생성)
- Deep Neural Network (상위 1000개 Ranking)
- Contextual Bandit (최종 배치 최적화)

---

### 향후 검토 과제 (Future Work)

**1. Two-Tower 모델 아키텍처 설계**:

- User Encoder 입력 피처 정의 (프로필, 행동 이력, 컨텍스트)
- Profile Encoder 입력 피처 정의 (프로필 정보, 인기도)
- 손실 함수 설계 (Contrastive Loss, Triplet Loss 등)
- 임베딩 차원 결정 (64/128/256)

**2. ANN 인덱스 구축 전략**:

- FAISS vs ScaNN 벤치마크
- 인덱스 업데이트 주기 (실시간 vs 배치)
- 샤딩 전략 (사용자 수 증가 대비)

**3. 학습 데이터 샘플링 전략**:

- Negative sampling 비율 (1:3, 1:5, 1:10)
- Hard negative mining (거절당한 프로필 활용)
- Positive sample 가중치 (SUPER_LIKE > LIKE)

**4. 캐싱 전략**:

- 사용자 임베딩 캐시 (Redis, TTL: 1시간)
- 프로필 임베딩 캐시 (Redis, TTL: 24시간)
- Top-K 후보 캐시 (사용자별 일일 갱신)

**5. 성능 모니터링**:

- Stage별 지연 시간 추적
- ANN 정확도 vs 속도 트레이드오프
- 캐시 히트율 모니터링

---

### 권장 구현 순서

**초기 (Phase 1-2, Month 0-9)**:

- 규칙 기반 필터링만 사용 (Stage 1-2)
- 후보 수: 10,000명 → 정밀 예측 불가, 간단한 점수로만 Ranking
- 목표: 데이터 수집 집중

**중기 (Phase 3-4, Month 9-18)**:

- Two-Tower 모델 개발 및 ANN 인덱스 구축 (선택)
- Stage 1-2 고도화: 100,000 → 1,000명
- Stage 3 도입: 1,000명에 대해 Level 2 정밀 예측

**장기 (Phase 5+, Month 18+)**:

- 전체 4-Stage 파이프라인 완성 (선택)
- 실시간 임베딩 업데이트
- 멀티 리전 배포 및 확장

---

### 기술 스택 (확장성 해결)

**Vector Search DB/라이브러리** (벡터 유사도 검색 전용):

| 이름         | 타입        | 특징                                   | 비용               | 권장           |
| ------------ | ----------- | -------------------------------------- | ------------------ | -------------- |
| **FAISS**    | 라이브러리  | Meta 오픈소스, CPU/GPU 지원, 가장 빠름 | 무료               | ✅ 권장 (초기) |
| **Pinecone** | Managed DB  | 완전 관리형, 자동 스케일링             | 유료 ($70/월~)     | Phase 4+       |
| **Milvus**   | 오픈소스 DB | 분산 벡터 DB, 대규모 데이터            | 무료 (인프라 비용) | Phase 5+       |
| **Weaviate** | 오픈소스 DB | 벡터 + 메타데이터 통합 검색            | 무료               | 대안           |
| **Qdrant**   | 오픈소스 DB | Rust 기반, 빠름                        | 무료               | 대안           |

**사용 예시** (FAISS):

```python
import faiss
import numpy as np

# 1. 인덱스 생성 (초기 1회)
dimension = 128  # 임베딩 차원
index = faiss.IndexFlatIP(dimension)  # Inner Product (코사인 유사도)

# 2. 모든 사용자 벡터 추가
all_user_embeddings = np.array([...])  # (100000, 128)
index.add(all_user_embeddings)

# 3. 유사도 검색 (실시간, 매우 빠름)
query_vector = user_A_embedding  # (128,)
k = 1000  # 상위 1000명
scores, indices = index.search(query_vector.reshape(1, -1), k)

# 결과: 0.01초 만에 10만 명 중 상위 1000명 검색
```

**전체 흐름 정리** (오해 방지):

```
배치 작업 (하루 1회):
1. PostgreSQL → 남성 10만 명, 여성 10만 명 조회
2. Two-Tower → 각각 128차원 벡터 변환
3. FAISS 인덱스 생성 (남성용, 여성용 각각)
4. 메모리 또는 S3 저장

실시간 추천 (사용자 A가 요청):
1. FAISS 검색:
   - 사용자 A (남성) → 여성 10만 명과 비교 (1회)
   - 유사도 높은 상위 1000명 선정
   - 시간: 0.01초
   - 아직 AI 예측 모델 사용 안 함! (후보 선정만)

2. Level 2 AI 예측 모델 (여기서 사용!):
   - 1000명 각각에 대해 정밀 예측
   - "A가 B를 좋아할 확률", "B가 수락할 확률" 계산
   - 시간: 0.1초 (1000명 × 0.0001초)

3. Level 3 전략 적용:
   - 1000명을 높은/중간/낮은 그룹 분류
   - 전략 비율로 샘플링
   - 최종 10-20명 추천

총 시간: 0.2초
```

**중요한 이해**:

```
FAISS의 역할:
- 10만 명 → 1000명으로 빠르게 줄이기 (유사도만)
- AI 예측 아님, 단순 벡터 유사도
- "후보 생성" 단계

Level 2 AI 모델의 역할:
- 1000명 → 정밀 평가 (좋아요/수락 확률)
- 여기가 진짜 AI 예측
- "정밀 순위 매기기" 단계

→ FAISS로 빠르게 후보 선정 후,
   AI 모델로 정밀 예측 (100배 효율)
```

**FAISS vs Pinecone 비교**:

| 항목            | FAISS                     | Pinecone                |
| --------------- | ------------------------- | ----------------------- |
| **배치 작업**   | 필요 (하루 1회)           | 필요 (하루 1회)         |
| 배치 내용       | 임베딩 생성 + 인덱스 빌드 | 임베딩 생성 + DB upsert |
| **실시간 검색** | 메모리에서 검색           | API 호출로 검색         |
| 인프라 관리     | 직접 (EC2, Lambda)        | Pinecone이 자동         |
| 확장성          | 수동 (EC2 늘림)           | 자동 스케일링           |
| 비용            | 무료 (인프라만)           | $70/월~                 |
| 복잡도          | 중간 (직접 구현)          | 낮음 (API만)            |

**핵심 차이**:

```
공통점:
- 둘 다 배치로 임베딩 미리 생성 필요
- 둘 다 실시간 검색 (0.01-0.02초)

차이점:
- FAISS: 메모리/S3 관리 직접
- Pinecone: DB가 자동 관리 (편함)
```

**배치 작업 비교**:

```python
# FAISS (직접 관리)
# 하루 1회 Lambda 또는 EC2
embeddings = generate_all_embeddings()  # PostgreSQL 조회
index = faiss.IndexFlatIP(128)
index.add(embeddings)
faiss.write_index(index, 's3://bucket/index.faiss')

# Pinecone (관리형)
# 하루 1회 Lambda
embeddings = generate_all_embeddings()  # PostgreSQL 조회
pinecone_index.upsert(vectors=embeddings)  # API 호출
```

**결론**: Pinecone도 배치 필요. 차이는 인프라 관리를 Pinecone이 대신 해준다는 것.

---

**멀티 서버 환경에서 FAISS 메모리 공유 문제**

**문제 상황**:

```
ECS에 여러 Task 실행:
- API 서버 Task 1 (메모리 공간 A)
- API 서버 Task 2 (메모리 공간 B)
- API 서버 Task 3 (메모리 공간 C)
- 배치 작업 Task (별도 메모리)

문제: 각 Task는 별도 메모리 → 공유 안 됨
```

**해결 방법**:

**방법 1: 각 Task가 시작 시 S3에서 로드 (권장, Phase 1-3)**

```python
# ECS Task 시작 시 (1회만, 초기화)
def on_startup():
    # S3에서 인덱스 다운로드
    s3.download_file('bucket', 'index.faiss', '/tmp/index.faiss')

    # 메모리에 로드
    global faiss_index
    faiss_index = faiss.read_index('/tmp/index.faiss')
    print("FAISS 인덱스 로드 완료")

# 추론 API (매 요청마다)
@app.get("/recommendations")
def recommend(user_id):
    # 이미 메모리에 있는 인덱스 사용
    scores, indices = faiss_index.search(user_vector, k=1000)
    ...

장점:
- 구현 간단
- 각 Task가 독립적

단점:
- Task 시작 시 로드 시간 (5-10초, 1회만)
- 메모리 중복 (Task마다 동일 인덱스)
```

**방법 2: EFS (공유 파일 시스템) 사용**

```python
# EFS 마운트
/mnt/efs/faiss/index.faiss

# 각 Task가 동일 파일 접근
def on_startup():
    faiss_index = faiss.read_index('/mnt/efs/faiss/index.faiss')

장점:
- 파일 공유 (중복 저장 없음)

단점:
- EFS 비용 추가
- I/O 속도 S3보다 약간 느림
```

**방법 3: Redis에 임베딩 저장 (대안)**

```python
# 배치: Redis에 각 사용자 임베딩 저장
for user_id, embedding in embeddings:
    redis.set(f"emb:{user_id}", embedding.tobytes())

# API: Redis에서 필요한 것만 조회
def get_candidates(user_a):
    # 기본 필터링 (PostgreSQL)
    candidate_ids = db.query("SELECT id FROM users WHERE ...")  # 1000명

    # Redis에서 임베딩 조회
    embeddings = [redis.get(f"emb:{id}") for id in candidate_ids]

    # NumPy로 유사도 계산
    scores = np.dot(user_a_embedding, embeddings.T)

장점:
- 분산 환경에 적합
- 실시간 업데이트 가능

단점:
- FAISS보다 느림 (0.1초 vs 0.01초)
- Redis 메모리 비용
```

**방법 4: Pinecone (관리형 DB)**

```python
# 각 Task가 API 호출
results = pinecone_index.query(
    vector=user_a_embedding,
    top_k=1000
)

장점:
- 메모리 공유 문제 없음 (외부 DB)
- 자동 스케일링
- 관리 불필요

단점:
- 유료 ($70/월~)
- API 호출 지연 (+5-10ms)
```

**최종 권장**:

| Phase     | 환경                | 권장 방법                 | 이유                |
| --------- | ------------------- | ------------------------- | ------------------- |
| Phase 1-2 | Lambda 또는 EC2 1대 | FAISS + S3                | 단순, 무료          |
| Phase 3   | ECS (소규모)        | FAISS + S3 (각 Task 로드) | 로드 시간 무시 가능 |
| Phase 4+  | ECS (대규모)        | Pinecone                  | 관리 편의, 확장성   |

**핵심 이해**:

```
"공유"의 의미:

S3에 index.faiss 파일 1개 (공유됨)
  ↓ 다운로드
Task 1 메모리: index.faiss 복사본 A
Task 2 메모리: index.faiss 복사본 B
Task 3 메모리: index.faiss 복사본 C

→ 파일은 공유, 메모리는 각자 복사본
→ Task 간 메모리 공유는 안 됨 (불가능)
→ 각 Task가 독립적으로 검색
```

**메모리 사용량**:

```
인덱스 크기: 약 50MB (10만 명 × 128차원 × 4바이트)
Task 3개 실행 시: 50MB × 3 = 150MB

→ 작은 용량, 문제없음
```

**배치 작업 실행 환경 (Lambda 제약 고려)**

**Lambda 제약사항**:

```
실행 시간: 최대 15분
메모리: 최대 10GB
임시 스토리지: 최대 10GB

10만 명 임베딩 생성 예상 시간:
- CPU: 30-60분 (Lambda 불가능)
- GPU: 5-10분 (Lambda 불가능, GPU 미지원)

100만 명:
- CPU: 5-10시간 (Lambda 불가능)
→ Lambda로는 불가능!
```

**배치 작업 실행 옵션**:

| 방법                     | 10만 명      | 100만 명     | 비용 | 복잡도 | 권장     |
| ------------------------ | ------------ | ------------ | ---- | ------ | -------- |
| **Lambda**               | ❌ 15분 초과 | ❌ 불가능    | 저렴 | 낮음   | ✗ 비권장 |
| **ECS Fargate**          | ✅ 30-60분   | ✅ 5-10시간  | 중간 | 중간   | ✅ 권장  |
| **SageMaker Processing** | ✅ GPU 5분   | ✅ GPU 30분  | 높음 | 낮음   | Phase 4+ |
| **EC2 Cron**             | ✅ 제한 없음 | ✅ 제한 없음 | 저렴 | 중간   | 대안     |

**권장 배치 아키텍처**:

```
[배치 작업 - ECS Fargate Scheduled Task]

EventBridge (Cron):
  - 매일 새벽 2시 트리거
  ↓
ECS Fargate Task 실행:
  - 컨테이너: Python + Two-Tower 모델
  - 메모리: 4GB
  - CPU: 2 vCPU
  ↓
작업 흐름:
  1. PostgreSQL → 10만 명 조회
  2. Two-Tower 모델 → 임베딩 생성 (30분)
  3. FAISS 인덱스 빌드 (1분)
  4. S3 업로드 (index_20240115.faiss)
  5. SNS 알림 발행 (선택)
  ↓
Task 종료 (비용은 실행 시간만)
```

**BE 인덱스 동기화**:

```python
# BE (ECS Task, 상시 실행)

# 방법 1: SNS 알림 받기 (권장)
@sns_handler
def on_index_updated(message):
    """배치가 완료되면 SNS로 알림"""
    new_version = message['version']  # "20240115"

    # 백그라운드에서 새 인덱스 로드
    threading.Thread(target=reload_index, args=(new_version,)).start()

def reload_index(version):
    # S3에서 다운로드
    s3.download_file('bucket', f'index_{version}.faiss', '/tmp/new_index.faiss')

    # 메모리에 로드
    new_index = faiss.read_index('/tmp/new_index.faiss')

    # 글로벌 변수 원자적 교체
    global faiss_index
    faiss_index = new_index

    print(f"인덱스 업데이트 완료: {version}")

# 방법 2: 주기적 체크 (대안)
def check_new_index_every_30min():
    while True:
        latest = s3.head_object('bucket', 'index_latest.txt')['Metadata']['version']
        if latest != current_version:
            reload_index(latest)
        time.sleep(1800)  # 30분

# 방법 3: Task 재시작 (단순, Phase 1-2)
# 배치 완료 후:
aws ecs update-service --force-new-deployment
# → 새 Task가 최신 인덱스 로드
```

**100만 명 확장 시**:

```
배치 작업 변경:
- ECS Fargate: 16GB 메모리, 4 vCPU
- SageMaker Processing: GPU 사용 (30분)
- 또는 분산 처리 (10개 배치 병렬)

BE는 동일:
- 인덱스 크기: 500MB (100만 × 128차원 × 4바이트)
- Task당 500MB → Task 3개 = 1.5GB
- 여전히 작음, 문제없음
```

**최종 권장**:

| 규모       | 배치 실행                  | BE 동기화 | 비고      |
| ---------- | -------------------------- | --------- | --------- |
| 10만 명    | ECS Fargate                | SNS 알림  | Phase 1-3 |
| 100만 명   | SageMaker Processing (GPU) | SNS 알림  | Phase 4+  |
| 1000만+ 명 | Pinecone                   | 자동      | Phase 5+  |

**배치 → BE 알림 상세 (SNS 권장)**

**1. SNS Topic 생성**:

```
Topic: faiss-index-updated
구독자: BE API 서버들 (HTTP Endpoint 또는 SQS)
```

**2. 배치 작업에서 SNS 발행**:

```python
# ECS Fargate 배치 작업 (하루 1회)

def main():
    # 1. 임베딩 생성
    embeddings = generate_all_embeddings()

    # 2. FAISS 인덱스 빌드
    index = faiss.IndexFlatIP(128)
    index.add(embeddings)

    # 3. S3에 업로드 (버전 관리)
    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    s3_key = f'faiss/index_{version}.faiss'

    faiss.write_index(index, '/tmp/index.faiss')
    s3.upload_file('/tmp/index.faiss', 'bucket', s3_key)

    # 4. SNS 발행
    sns.publish(
        TopicArn='arn:aws:sns:ap-northeast-2:account:faiss-index-updated',
        Subject='FAISS Index Updated',
        Message=json.dumps({
            'version': version,
            's3_key': s3_key,
            'user_count': len(embeddings),
            'timestamp': datetime.now().isoformat()
        })
    )

    print(f"배치 완료 및 SNS 발행: {version}")
```

**3. BE에서 SNS 수신 (HTTP Endpoint)**:

```python
# NestJS BE (ECS Task)

@Controller('webhooks')
export class WebhookController {

  @Post('faiss-update')
  async handleFaissUpdate(@Body() snsMessage: any) {
    // SNS 메시지 파싱
    const message = JSON.parse(snsMessage.Message);
    const version = message.version;
    const s3Key = message.s3_key;

    console.log(`FAISS 인덱스 업데이트 알림: ${version}`);

    // 백그라운드에서 인덱스 리로드
    this.faissService.reloadIndexInBackground(version, s3Key);

    return { status: 'accepted' };
  }
}

// FAISS Service
@Injectable()
export class FaissService {
  private faissIndex: any;
  private currentVersion: string;

  async reloadIndexInBackground(version: string, s3Key: string) {
    // 백그라운드 스레드에서 실행 (요청 처리 방해 안 함)
    setTimeout(async () => {
      try {
        // S3 다운로드
        await s3.downloadFile('bucket', s3Key, '/tmp/new_index.faiss');

        // Python 자식 프로세스로 FAISS 로드
        const newIndex = await this.loadFaissIndex('/tmp/new_index.faiss');

        // 원자적 교체
        this.faissIndex = newIndex;
        this.currentVersion = version;

        console.log(`인덱스 업데이트 완료: ${version}`);
      } catch (error) {
        console.error('인덱스 로드 실패:', error);
      }
    }, 0);
  }
}
```

**4. SNS 구독 설정**:

```
BE 배포 시 (CDK 또는 Terraform):

SNS Topic 생성:
- Name: faiss-index-updated
- Type: Standard

Subscription 생성:
- Protocol: HTTPS
- Endpoint: https://api.dating.com/webhooks/faiss-update
- 또는 SQS + Worker 패턴
```

**핵심**:

- Lambda ❌ (15분 제한)
- **ECS Fargate Scheduled Task** ✅
- **SNS로 BE에 알림** (권장)
- BE는 백그라운드에서 인덱스 리로드 (다운타임 없음)

**권장 아키텍처**:

- Phase 1-3: FAISS + S3 + ECS Fargate + SNS
- Phase 4+: Pinecone (배치, 동기화 자동)

**Two-Tower 모델**:

- TensorFlow Recommenders (Google)
- PyTorch (커스텀 구현)
- LightGBM (빠른 프로토타입)

**캐싱 & 저장**:

- Redis (임베딩 캐시)
- S3 (임베딩 벡터 백업)
- DynamoDB (후보 목록 캐시)

---

**결론**: 조합 폭발 문제는 추천 시스템의 근본적 도전이며, 산업계에서는 Multi-Stage Retrieval과 Two-Tower 아키텍처로 해결합니다. 우리도 동일한 패턴을 따라 단계적으로 구현하면 됩니다.

---

### 로그 수집 전략에 대한 영향

**Q: 해결 방안 선택에 따라 현재 로그 구조를 변경해야 하는가?**

**A: 아니오. 기본 로그 구조는 변경 불필요**

**이유**:

1. **기본 로그는 모든 방안에서 공통으로 필요**:

   - 사용자 프로필 스냅샷 (User A, User B)
   - 행동 이벤트 (LIKE, PASS, FRIEND_REQUEST 등)
   - 결과 이벤트 (ACCEPTED, MATCHED, CHAT_STARTED 등)
   - 컨텍스트 정보 (시간, 위치, 세션)

   → 이는 어떤 ML 아키텍처를 선택하든 학습에 필수

2. **추가 데이터는 나중에 보완 가능**:

   - Two-Tower 사용 시 임베딩 벡터를 추가로 저장하면 유용
   - 하지만 원본 데이터만 있으면 임베딩은 재계산 가능
   - 따라서 현재는 원본 데이터 수집에만 집중

3. **Forward Compatibility (미래 호환성)**:
   - [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)에서 "전체 User 모델을 스냅샷으로 저장"하는 이유가 바로 이것
   - 미래에 어떤 피처를 사용할지 모르므로, 모든 정보를 보관
   - 나중에 필요한 피처만 추출하여 사용

**향후 추가 고려사항** (Phase 3 이후):

```json
// 기본 로그 (현재 - 필수)
{
  "event_type": "EXPOSURE",
  "user_snapshot": { /* 전체 프로필 */ },
  "target_snapshot": { /* 전체 프로필 */ },
  "context": { /* 시간, 위치 등 */ }
}

// Two-Tower 도입 시 추가 (선택, Phase 3-4에서)
{
  "user_embedding": [0.23, -0.45, ...],  // 128차원
  "target_embedding": [0.31, -0.22, ...],
  "embedding_version": "v2.1",
  "computed_at": "2024-01-15T19:30:00Z"
}
```

**결론**: Phase 1-2에서는 기존 로그 구조 그대로 사용하고, 원본 데이터(특히 프로필 사진)를 최대한 보존하는 것이 최선입니다. 임베딩 등 추가 정보는 Phase 3 이후 필요 시 추가하면 됩니다.

### 3.2 수익 최적화 모델 (Level 3) - 핵심 신규 모델

**모델명**: Revenue Optimization Policy (수익 최적화 정책 모델)

**목적**: 주어진 사용자 A에게 현재 시점에서 어떤 프로필을 어떤 순서로 노출할지 결정하여, A의 예상 생애 수익(Expected LTV)을 극대화

**접근 방식**: 강화학습 (Reinforcement Learning) 또는 Contextual Multi-Armed Bandit

---

### 3.3 Level 1, 2, 3 통합 관계 (중요!)

**Q: Level 3가 있으면 Level 1, 2는 필요 없나요?**

**A: 아니요! Level 1, 2, 3는 **모두 필수**이며 서로 **의존적**으로 작동합니다.**

**3계층 역할 구분**:

```
Level 1 (전통적 박스 점수 계산):
- 역할: 각 사용자의 기본 평가 점수 계산
- 계산: 4개 박스 점수 (매력도, 활동성, 수익유발, 지출)
- 입력: DB 테이블 (userCrushExpressions, friendRequests, currencyTransactions 등)
- 출력: 각 사용자마다 4개 점수
  예: 사용자 A = [0.75, 0.82, 0.68, 0.55]

Level 2 (개별 확률 예측):
- 역할: "사용자 A가 프로필 B를 얼마나 좋아할까?" 예측
- 입력: (A 프로필, B 프로필, 컨텍스트)
- 출력: 확률 값
  예: 좋아요 확률 0.73, 수락 확률 0.65, 응답 확률 0.72

Level 3 (전략 선택 / 수익 최적화):
- 역할: "사용자 A에게 어떤 타입의 프로필을 얼마나 노출할까?" 결정
- 입력: A의 상태 벡터 (Level 1 점수 포함!)
  예: context_A = [0.75, 0.82, 0.68, 0.55, 15, 85, ...]
- 출력: 전략 선택
  예: Balanced - 높은 30% / 중간 50% / 탐색 20%
```

**Level 1이 필수인 이유**:

```
Level 3의 Context 벡터 구성:
context_A = [
  0.75,  // [0] attractiveness_score ← Level 1 계산
  0.82,  // [1] engagement_score ← Level 1 계산
  0.68,  // [2] revenue_trigger_score ← Level 1 계산
  0.55,  // [3] spending_score ← Level 1 계산
  0.25,  // [10] churn_7d_probability ← Level 2 예측
  ...
]

Level 1 없이는:
- Context 벡터를 만들 수 없음
- Level 3가 전략 선택 불가
```

**3계층 의존 관계**:

```
Level 1 (기반)
   ↓ (4개 박스 점수 제공)
Level 3 (의사결정) + Level 2 (평가)
   ↓ (함께 작동)
최종 추천
```

**통합 작동 흐름 (Level 1 → 2 → 3 순차 협업)**:

```
1. 사용자 A가 추천 요청
   ↓
2. Level 1: 사용자 A의 4개 박스 점수 계산 ← Level 1 사용!
   입력: DB 집계 (받은 좋아요, 로그인 횟수, 친구 수락률, 재화 소비 등)
   계산: [전통적인 박스 시스템](../../munto_docs/전통적인%20박스%20시스템.md) 공식 적용
   출력:
   - attractiveness_score = 0.75 (좋아요×0.7 + 슈퍼좋아요×1.0) / 평가수
   - engagement_score = 0.82 (접속빈도×0.4 + 평가비율×0.4 + 완성도×0.2)
   - revenue_trigger_score = 0.68 (친구수락률×0.3 + 좋아요응답×0.2 + 채팅응답×0.5)
   - spending_score = 0.55 (총결제액×0.5 + 재화빈도×0.3 + 다양성×0.2)
   ↓
3. Context 벡터 구성 (Level 1 결과 포함)
   context_A = [0.75, 0.82, 0.68, 0.55, 15, 85, 45, 0.35, ...]
   - 첫 4개 값 = Level 1 박스 점수
   - 나머지 = DB 집계 + Level 2 이탈 예측 등
   ↓
4. Level 3: 전략 선택 (Context 사용)
   입력: context_A
   계산: θ_2^T · context_A = 31.9 (최고)
   출력: 전략_2 (Balanced) 선택
   → "높은 30% / 중간 50% / 탐색 20%"
   ↓
5. 후보 프로필 1000명 필터링 (거리, 나이 등)
   ↓
6. Level 2: 각 후보 프로필 평가 ← Level 2 사용!
   1000명 각각에 대해:
   - 좋아요 확률 예측: B는 0.78, C는 0.45, D는 0.22, ...
   - 친구 수락 확률 예측: B는 0.65, C는 0.40, D는 0.15, ...
   ↓
7. 프로필 그룹 분류 (Level 2 결과 활용)
   - 높은 그룹 (확률 > 0.7): B, E, F, ... (100명)
   - 중간 그룹 (0.4-0.7): C, G, H, ... (400명)
   - 탐색 그룹 (< 0.4): D, I, J, ... (500명)
   ↓
8. Level 3 전략 비율로 샘플링
   - 높은 그룹에서 3명 (30%)
   - 중간 그룹에서 5명 (50%)
   - 탐색 그룹에서 2명 (20%)
   ↓
9. 최종 10명 추천 생성
```

**각 Level의 필요성**:

```
Level 1 없으면:
- Context 벡터의 핵심 피처(4개 박스 점수) 계산 불가
- Level 3가 전략 선택 못 함

Level 2 없으면:
- 각 프로필의 매칭 확률을 모름
- "높은", "중간", "낮은" 그룹 분류 불가
- Level 3 전략 실행 못 함

Level 3 없으면:
- 단순히 Level 2 확률 높은 순서로 추천
- 모든 사용자에게 동일한 방식 (개인화 없음)
- 수익 최적화 안 됨 (빠른 성공 → 조기 이탈)

→ 3계층 모두 필수!
```

**비유**:

```
Level 1 = 신체검사 (기본 건강 지표)
- 키, 몸무게, 혈압, 혈당 측정
- 결과: [170cm, 70kg, 120/80, 95mg/dL]

Level 2 = 정밀 검사 (특정 질병 예측)
- "이 사람이 당뇨병에 걸릴 확률 0.15"
- "이 사람이 고혈압에 걸릴 확률 0.25"

Level 3 = 의사 (치료 전략 결정)
- 신체검사 결과(Level 1) + 정밀검사(Level 2) 종합
- "이 환자는 식이요법 70% + 운동 30% 처방"

→ 셋 다 필요함!
```

**Level 1 계산 상세** ([전통적인 박스 시스템](../../munto_docs/전통적인%20박스%20시스템.md) 참조):

```
매력도 박스:
attractiveness_score = (슈퍼좋아요 × 1.0 + 좋아요 × 0.7 + 싫어요 × 0.0) / 전체 평가 수

활동성 박스:
engagement_score = (접속 빈도 × 0.4) + (평가·액션 비율 × 0.4) + (프로필 완성도 × 0.2)

수익유발 박스:
revenue_trigger_score = (친구 신청 수락률 × 0.3) + (좋아요 응답률 × 0.2) + (채팅 응답률 × 0.5)

지출 박스:
spending_score = (총 결제 금액 정규화 × 0.5) + (재화 사용 빈도 × 0.3) + (과금 액션 다양성 × 0.2)

데이터 출처:
- userCrushExpressions: 좋아요, 슈퍼좋아요, 싫어요
- friendRequests: 친구 신청, 수락
- chatRooms: 채팅 응답
- currencyTransactions: 재화 소비
- storePurchases: 결제 내역
- user: 로그인 이력
- userProfilePhotos: 프로필 완성도
```

---

## 4. 수익 최적화 모델 상세 설계

### 4.1 문제 정의

**의사결정 문제**:

- 매 추천 시점마다, 사용자 A에게 노출할 N명의 프로필 리스트를 선택
- 목표: A의 향후 90일간 예상 총 재화 소비량 최대화
- 제약: A가 피로감으로 이탈하지 않도록 유지

**수학적 표현**:

```
Maximize: E[Revenue(A, 90일)]
Subject to:
  - P(Churn_7d | A) < 0.3  (7일 이탈 확률 30% 미만 유지)
  - P(Churn_30d | A) < 0.5 (30일 이탈 확률 50% 미만 유지)
  - 매칭 성공률 > 최소 기준 (완전히 희망 없는 상황 방지)
```

### 4.2 목표 함수 (Reward Function)

**중요 용어 정리**:

```
Reward (보상) = 회사 입장에서의 수익 지표

명확히:
- 사용자가 재화를 소비 → Reward 증가 (회사 수익 ↑)
- 사용자가 이탈 → Reward 감소 (회사 손실 ↑)
- "고객에게 주는 보상" ✗
- "회사가 얻는 수익" ✓

AI 학습에서 Reward는 "목표 달성 정도"를 의미
우리의 목표 = 수익 극대화 → Reward = 수익
```

**단기 수익 (Immediate Revenue)**:

```
R_immediate(t) =
  + 프로필 조회 재화 × α1
  + 슈퍼좋아요 재화 × α2
  + 친구 신청 재화 × α3
  + 채팅 활성화 재화 × α4
  + 데이트 신청 재화 × α5

실제 예시:
- 슈퍼좋아요 1회 (1재화) → +1
- 친구 신청 1회 (4재화) → +4
- 채팅 활성화 (10재화) → +10
→ 단기 수익 = 15
```

**장기 수익 (Long-term Revenue)**:

```
R_longterm =
  + 사용자 리텐션 보너스 (7일 유지 시 +β1, 30일 유지 시 +β2)
  + 최종 매칭 성공 보너스 (+β3)
  - 조기 이탈 페널티 (-β4)
  - 과도한 거절 경험 페널티 (-β5)

실제 예시:
- 7일 유지 → +10 (미래 수익 기대값)
- 매칭 성공 1건 → +5 (만족도 → 지속 이용 → 미래 수익)
- 이탈 발생 → -20 (미래 수익 완전 손실)
→ 장기 수익 = 10 + 5 = 15
```

**총 수익 (Total Revenue / Reward)**:

```
Total_Reward = Σ(R_immediate(t)) + R_longterm

실제 예시:
= 15 (즉시 재화 소비) + 15 (장기 가치) = 30

해석: 이 전략으로 7일간 평균 30의 수익 창출
```

**용어 사용 지침**:

- 기술 문서: "보상(Reward)" 사용 (AI/ML 표준 용어)
- 비즈니스 문서: "수익", "매출 기여도" 사용

### 4.3 Input 정의

**사용자 A의 상태 (State)**:

```json
{
  "user_profile": {
    "user_id": "usr_123",
    "gender": "MALE",
    "age": 28,
    "attractiveness_score": 0.75,
    "engagement_score": 0.82,
    "monetization_score": 0.68,
    "days_since_join": 15,
    "is_new_user": false
  },
  "user_behavior_history": {
    "total_profiles_viewed": 120,
    "total_likes_sent": 45,
    "total_super_likes_sent": 8,
    "total_friend_requests_sent": 12,
    "total_friend_requests_accepted": 3,
    "total_matches": 3,
    "total_currency_spent": 85,
    "avg_session_duration_minutes": 25,
    "sessions_last_7d": 12,
    "like_to_view_ratio": 0.375,
    "friend_request_success_rate": 0.25,
    "chat_activation_rate": 0.67
  },
  "current_session_context": {
    "session_start_time": "2024-01-15T19:30:00Z",
    "profiles_viewed_today": 12,
    "likes_given_today": 3,
    "super_likes_given_today": 1,
    "current_tab": "discovery",
    "time_of_day": "evening",
    "day_of_week": "Monday"
  },
  "frustration_signals": {
    "consecutive_rejections": 5,
    "days_without_match": 7,
    "unanswered_messages": 3,
    "declining_session_trend": true,
    "low_response_rate_last_week": 0.15
  },
  "predicted_churn": {
    "churn_7d_probability": 0.25,
    "churn_30d_probability": 0.45,
    "risk_level": "medium"
  },
  "current_wallet": {
    "total_balance": 45,
    "paid_balance": 30,
    "free_balance": 15
  }
}
```

**후보 프로필 풀 (Candidate Pool)**:

```json
{
  "candidates": [
    {
      "user_id": "usr_456",
      "attractiveness_score": 0.82,
      "responsiveness_score": 0.75,
      "distance_km": 3.5,
      "age_difference": 2,
      "common_interests": 5,
      "predicted_like_probability": 0.78,
      "predicted_friend_accept_probability": 0.65,
      "predicted_chat_response_probability": 0.72,
      "match_tier": "high"
    }
    // ... 수백~수천 명의 후보
  ]
}
```

### 4.4 Output 정의

**추천 프로필 리스트 (Optimized Recommendation)**:

```json
{
  "recommendation": {
    "user_id": "usr_123",
    "recommendation_id": "rec_20240115_123",
    "generated_at": "2024-01-15T19:30:00Z",
    "strategy": "balanced_exploration",
    "profiles": [
      {
        "rank": 1,
        "profile_id": "usr_789",
        "exposure_reason": "high_success_high_spend",
        "expected_immediate_revenue": 15,
        "expected_longterm_value": 85,
        "predicted_actions": {
          "will_like": 0.72,
          "will_friend_request": 0.45,
          "will_match": 0.58
        }
      },
      {
        "rank": 2,
        "profile_id": "usr_456",
        "exposure_reason": "moderate_success_retention",
        "expected_immediate_revenue": 8,
        "expected_longterm_value": 65,
        "predicted_actions": {
          "will_like": 0.65,
          "will_friend_request": 0.35,
          "will_match": 0.48
        }
      },
      {
        "rank": 3,
        "profile_id": "usr_321",
        "exposure_reason": "exploration_learning",
        "expected_immediate_revenue": 3,
        "expected_longterm_value": 25,
        "predicted_actions": {
          "will_like": 0.35,
          "will_friend_request": 0.15,
          "will_match": 0.22
        }
      },
      {
        "rank": 4,
        "profile_id": "usr_654",
        "exposure_reason": "high_match_quick_win",
        "expected_immediate_revenue": 12,
        "expected_longterm_value": 95,
        "predicted_actions": {
          "will_like": 0.88,
          "will_friend_request": 0.75,
          "will_match": 0.82
        },
        "note": "이탈 위험 감지, 빠른 성공 경험 제공"
      }
    ],
    "strategy_explanation": {
      "user_state": "moderate_frustration",
      "churn_risk": "medium",
      "action": "mix_high_and_moderate_success",
      "ratio": "high_25%_moderate_50%_exploration_25%"
    },
    "expected_total_revenue_90d": 450,
    "confidence_score": 0.78
  }
}
```

### 4.5 의사결정 전략

**중요**: 실제로는 10-15개의 **구체적인 전략**을 사용합니다 (5.2 Step 1 참조). 아래 4개는 전략을 분류하는 **큰 카테고리**일 뿐입니다.

**전략 카테고리 (Strategy Categories)**:

1. **Exploitation 계열** (수익 집중)

   - 예시 전략: Revenue_Aggressive, Male_Revenue_Max
   - 특징: 재화 소비 유도가 높은 프로필 위주 노출

2. **Balanced 계열** (균형)

   - 예시 전략: Balanced, Engagement_Boost
   - 특징: 성공 경험과 탐색의 균형

3. **Retention 계열** (리텐션 우선)

   - 예시 전략: Retention_Safe, Quick_Win, Female_Retention
   - 특징: 빠른 성공 경험 제공, 긍정 피드백 극대화

4. **Exploration 계열** (탐색)
   - 예시 전략: Exploration_Heavy, Premium_Mix
   - 특징: 다양한 프로필 노출하여 선호 패턴 학습

**실제 사용**: 사람이 각 카테고리에서 2-4개씩 구체적인 전략을 만들어 총 10-15개를 준비합니다. 자세한 내용은 5.2 Step 1 참조.

### 4.6 성별 차등 전략

**남성 사용자 (과금 주체)**:

- 주로 사용되는 전략: Revenue_Aggressive, Male_Revenue_Max, Balanced
- 탐색 기간 목표: 1-3개월
- 재화 소비 목표: 150-300개
- 핵심 지표: 재화 소비율, 친구 신청 빈도

**여성 사용자 (리텐션 중심)**:

- 주로 사용되는 전략: Female_Retention, Retention_Safe, Quick_Win
- 초기 전략: 고품질 남성 프로필 다수 노출 (첫 1-2주)
- 핵심 지표: 리텐션, 친구 수락률, 채팅 응답률

**신규 사용자 (성별 무관)**:

- 초기 전략: Exploration_Heavy, Quick_Win (첫 2주)
- 이후 전략: AI가 데이터 기반으로 자동 선택
- 목표: 빠른 성공 경험으로 서비스 가치 체감

**Note**: AI는 위 가이드라인을 따르지 않고, 각 사용자의 실제 상태(context)를 보고 최적 전략을 선택합니다. 위 내용은 일반적인 경향성을 설명한 것입니다.

---

## 5. 수익 최적화 모델 학습 방법

### 5.1 학습 접근 방식

**Option 1: 강화학습 (Reinforcement Learning)**

**환경 설정**:

- State: 사용자 A의 현재 상태 (프로필, 행동 이력, 세션 컨텍스트)
- Action: N명의 프로필 리스트 선택
- Reward: 90일간 총 재화 소비 + 리텐션 보너스 - 이탈 페널티
- Policy: 주어진 State에서 최적의 Action 선택

**학습 알고리즘**:

- Deep Q-Network (DQN) 또는 Policy Gradient (PPO, A3C)
- Exploration vs Exploitation: ε-greedy 또는 Upper Confidence Bound (UCB)

**장점**:

- 장기 수익 최적화에 적합
- 다양한 시나리오에 대한 유연한 대응

**단점**:

- 학습 데이터 대량 필요 (수개월~1년)
- 실시간 환경에서 안정성 확보 어려움
- Cold start 문제

---

**Option 2: Contextual Multi-Armed Bandit (추천)**

**환경 설정**:

- Context: 사용자 A의 현재 상태
- Arms: 각 프로필 또는 프로필 조합 전략
- Reward: 즉시 재화 소비 + 단기 리텐션 신호 (7일)

**학습 알고리즘**:

- LinUCB (Linear Upper Confidence Bound)
- Thompson Sampling
- Contextual Thompson Sampling

**장점**:

- 실시간 학습 및 적용 가능
- 데이터 효율적 (RL보다 빠른 수렴)
- Exploration/Exploitation 자동 균형
- Cold start 문제 해결 용이

**단점**:

- 장기 보상 모델링 제한적
- 복잡한 시퀀스 의사결정은 어려움

**권장 사항**: Phase 1에서는 **Contextual Bandit**으로 시작, 충분한 데이터 확보 후 Phase 2에서 강화학습으로 전환

### 5.2 Contextual Bandit 상세 설계

**Algorithm: Thompson Sampling with Bayesian Regression**

---

### Level 3 학습 과정 이해하기

**핵심 질문: "전략이란 무엇인가?"**

**답변**: 전략은 "어떤 타입의 프로필을 얼마나 노출할지"를 정의하는 **프로필 분포 정책**입니다.

```
전략 예시:
- 전략_2 (Balanced): "높은 매칭률 30% / 중간 50% / 탐색 20%"
- 전략_4 (Revenue_Aggressive): "재화 소비 유도 70% / 매칭률 고려 30%"
```

**Contextual Bandit의 핵심 개념**:

```
1. 여러 전략 준비 (예: 10개) - 사람이 미리 정의
2. 각 사용자마다 실시간으로 최적 전략 선택 - AI가 자동 선택
   - 사용자 A (이탈 위험 높음) → Retention_Safe
   - 사용자 B (안정적) → Revenue_Aggressive
   - 사용자 C (신규) → Exploration
   같은 시점에 다른 전략이 다른 사용자에게 적용됨!

3. 각 사용자의 결과 관찰 (7일간 실제 수익)
   - A + Retention_Safe → 수익 25 (재화 15개 + 리텐션 보너스)
   - B + Revenue_Aggressive → 수익 45 (재화 35개 + 리텐션 보너스)
   - C + Exploration → 수익 15 (재화 10개 + 리텐션 보너스)

4. 학습 데이터 축적
   - "이탈 위험 높을 때 Retention_Safe 효과적"
   - "안정적일 때 Revenue_Aggressive 효과적 (수익 45로 가장 높음)"

5. 가중치 θ_k 자동 업데이트 - AI가 자동 학습
   - 전략을 바꾸는 게 아니라
   - "어떤 상황에 어떤 전략이 좋은지" 학습

장점:
- 각 사용자에게 최적 전략 개인화
- 이탈 방지 + 수익 극대화 동시 달성
- 실시간 적응
```

**핵심 비유**:

```
Contextual Bandit = 도구 상자
- 10개 도구(전략)를 준비해둠 (사람이 설계)
- AI가 상황에 맞는 도구를 자동 선택
- 모든 도구가 필요할 때 사용됨
- 도구를 바꾸지 않고, "언제 어떤 도구를 쓸지" 학습
```

---

**수익이 가장 증가하는 방향으로 어떻게 학습하는가?**

**답변**: Level 3 모델은 "어떤 사용자 상태에서 어떤 전략을 선택했을 때 실제로 재화 소비가 많았는지" 패턴을 경험을 통해 학습합니다.

**구체적 예시**:

```
시나리오:
- 사용자 A: 남성, 28세, 가입 15일차, 재화 잔액 45개, 최근 거절 5회 연속
- 시점: 2024-01-15 저녁 7시

Step 1: 현재 상태 파악 (Context 벡터 생성)

context_A = [
  // [0-3] 4개 박스 점수 (Level 1 전통적 계산 - 가장 중요)
  0.75,   // [0] attractiveness_score (매력도 박스)
          //     = (받은 좋아요 42개×0.7 + 슈퍼좋아요 8개×1.0) / 전체 평가 60개
          //     = (29.4 + 8.0) / 60 = 0.623 → 상위 25% 정규화 = 0.75

  0.82,   // [1] engagement_score (활동성 박스)
          //     = 접속빈도(12일/15일)×0.4 + 평가비율(45/120)×0.4 + 프로필완성도(5/6)×0.2
          //     = 0.80×0.4 + 0.375×0.4 + 0.833×0.2
          //     = 0.32 + 0.15 + 0.167 = 0.637 → 상위 18% 정규화 = 0.82

  0.68,   // [2] revenue_trigger_score (수익유발 박스)
          //     = 친구수락률(8/12)×0.3 + 좋아요응답률(35/42)×0.2 + 채팅응답률(15/18)×0.5
          //     = 0.667×0.3 + 0.833×0.2 + 0.833×0.5
          //     = 0.200 + 0.167 + 0.417 = 0.784 → 중간값 보정 = 0.68

  0.55,   // [3] spending_score (지출 박스)
          //     = 총결제금액(50,000원/100,000원목표)×0.5 + 재화사용빈도(85개/15일)×0.3 + 액션다양성(4/6종류)×0.2
          //     = 0.5×0.5 + 5.67×0.3 + 0.667×0.2
          //     = 0.25 + 1.70 + 0.133 = 2.08 → 정규화 = 0.55

  // [4-6] 활동 이력
  15,     // [4] days_since_join (가입 후 15일: 2024-01-01 가입 → 01-15)
  85,     // [5] total_currency_spent (총 85개 재화 소비)
  45,     // [6] currency_balance (현재 45개 보유: 구매 130개 - 사용 85개)

  // [7-9] 성공률 지표 (행동 효율성)
  0.35,   // [7] like_success_rate (맞좋아요 42건 / 보낸 좋아요 120건)
  0.25,   // [8] friend_request_success_rate (수락 3건 / 신청 12건)
  0.67,   // [9] chat_activation_rate (활성화 2건 / 매칭 3건)

  // [10-12] 이탈 위험 (Level 2 예측 모델 결과)
  0.25,   // [10] churn_7d_probability (7일 이탈 예측 확률 - AI 모델)
  0.45,   // [11] churn_30d_probability (30일 이탈 예측 확률 - AI 모델)
  0.35,   // [12] frustration_score (좌절도: 거절률 0.75 × 무응답률 0.4 = 0.30)

  // [13-15] 최근 행동 패턴
  5,      // [13] consecutive_rejections (연속 거절 5회)
  12,     // [14] sessions_last_7d (최근 7일 세션 12회)
  25,     // [15] avg_session_duration_minutes (평균 세션 25분)

  // [16-18] 상호작용 비율
  0.375,  // [16] like_to_view_ratio (좋아요 45건 / 조회 120건)
  3,      // [17] total_matches (총 매칭 3건)
  7,      // [18] days_without_new_match (마지막 매칭: 2024-01-08 → 7일 경과)

  // [19-21] 사용자 타입 (원-핫 인코딩)
  0,      // [19] is_new_user (15일 이상이므로 0)
  1,      // [20] is_male (남성)
  0,      // [21] is_high_spender (85개는 중간 수준, 200개 이상이 high)

  // [22-26] 시간/세션 컨텍스트
  19,     // [22] hour_of_day (현재 19시)
  1,      // [23] is_evening (18-23시)
  1,      // [24] day_of_week (월요일: 0=일, 1=월)
  0,      // [25] is_weekend (주말 아님)
  0.42,   // [26] session_progress (현재 세션에서 본 프로필 12/28)

  // ... 총 50-100차원까지 확장 가능
]

각 값의 계산 방법:
- attractiveness_score (매력도 박스): (좋아요×0.7 + 슈퍼좋아요×1.0) / 전체 평가 수
  출처: userCrushExpressions 테이블 집계

- engagement_score (활동성 박스): 접속빈도×0.4 + 평가비율×0.4 + 프로필완성도×0.2
  출처: user.lastLoginAt, userCrushExpressions, userProfilePhotos 테이블

- revenue_trigger_score (수익유발 박스): 친구수락률×0.3 + 좋아요응답률×0.2 + 채팅응답률×0.5
  출처: friendRequests, userCrushExpressions, chatRooms 테이블

- spending_score (지출 박스): 총결제액×0.5 + 재화사용빈도×0.3 + 액션다양성×0.2
  출처: currencyTransactions, storePurchases 테이블

- like_success_rate: (맞좋아요) / (보낸 좋아요) = 42/120 = 0.35
- friend_request_success_rate: (수락) / (신청) = 3/12 = 0.25
- churn_7d_probability: Level 2 이탈 예측 모델의 결과값

Step 2: 어떤 전략을 선택할까? (Bandit 선택)
  전략 2 (Balanced) 선택됨
  → 높은 매칭률 30% / 중간 50% / 탐색 20%

Step 3: 전략에 따라 프로필 노출
  - 10명 추천: 3명(높은) + 5명(중간) + 2명(탐색)

Step 4: 7일간 사용자 A의 실제 행동 관찰
  Day 1: 슈퍼좋아요 1회 (1재화), 친구 신청 1회 (4재화)
  Day 2: 친구 신청 수락됨, 채팅 활성화 (10재화)
  Day 3-7: 추가 탐색, 좋아요 3회 (무료)

  총 재화 소비: 15개
  리텐션: 7일 유지 (+10 보너스)
  매칭 성공: 1회 (+5 보너스)

  최종 수익 (Reward): 15 + 10 + 5 = 30
  * Reward = 회사가 얻은 수익 지표 (고객에게 준 보상 아님!)

Step 5: 학습 데이터 기록
  (context_A, 전략_2, reward=30) 저장
  * reward = 회사 수익 (재화 15개 + 리텐션 보너스 15 = 30)

Step 6: 모델 업데이트
  "context_A와 유사한 사용자에게 전략_2를 선택하면 평균 30의 수익"
  → 전략_2의 가중치(θ_2) 업데이트
```

**여러 사용자 경험 축적**:

```
케이스 1: context_A → 전략_2 → 수익 30 (재화 15개 + 보너스)
케이스 2: context_B (유사) → 전략_2 → 수익 35 (재화 20개 + 보너스)
케이스 3: context_C (유사) → 전략_4 → 수익 50 (재화 40개 + 보너스) ← 가장 높음
케이스 4: context_D (유사) → 전략_5 → 수익 20 (재화 10개 + 보너스)
...

학습 결과:
- context_A 유사 사용자에게는 전략_4가 최고 성과 (수익 50)
- 앞으로 유사한 사용자가 오면 전략_4 우선 선택
- AI는 "유사한 상태에서 전략_4가 회사 수익을 극대화"함을 학습
```

---

### Input / Output 명세

**Input (학습 시)**:

```
Training Data:
[
  {
    "context": [0.75, 0.82, 15, 85, 45, 0.35, ...],  // 사용자 상태 벡터
    "strategy_id": 2,                                  // 선택한 전략
    "reward": 30.0                                     // 7일간 실제 수익
  },
  {
    "context": [0.68, 0.79, 8, 45, 60, 0.42, ...],
    "strategy_id": 5,
    "reward": 20.0
  },
  ...
  // 수천~수만 개의 학습 샘플
]
```

**Output (학습 결과)**:

```
Learned Model:
{
  "strategy_1": {
    "weights": [0.23, -0.15, 0.08, ...],  // θ_1 (50-100차원)
    "expected_reward_function": "θ_1^T · context"
  },
  "strategy_2": {
    "weights": [0.31, -0.08, 0.12, ...],  // θ_2
    "expected_reward_function": "θ_2^T · context"
  },
  ...
}

추론 시 사용:
  새로운 사용자 X가 오면
  → context_X 추출
  → 각 전략의 예상 보상 계산: θ_k^T · context_X
  → 가장 높은 보상의 전략 선택
```

**Input (추론 시)**:

```json
{
  "user_context": {
    "attractiveness_score": 0.75,
    "engagement_score": 0.82,
    "days_since_join": 15,
    "total_currency_spent": 85,
    "currency_balance": 45,
    "like_success_rate": 0.35,
    "churn_7d_probability": 0.25,
    "consecutive_rejections": 5
    // ... 총 50-100개 피처
  }
}
```

**Output (추론 시)**:

```json
{
  "selected_strategy": {
    "strategy_id": 4,
    "strategy_name": "Revenue_Aggressive",
    "expected_reward": 42.5,
    "profile_distribution": {
      "high_match_rate": 0.25,
      "medium_match_rate": 0.35,
      "high_spend_induction": 0.4
    }
  },
  "alternative_strategies": [
    { "strategy_id": 2, "expected_reward": 38.2 },
    { "strategy_id": 5, "expected_reward": 35.7 }
  ]
}
```

---

### 수익(Reward) 계산 상세

**중요**: Reward = 회사가 얻는 수익 (고객에게 주는 보상 아님)

**실제 로그에서 수익 계산하는 방법**:

```python
def calculate_reward(user_id, exposure_id, observation_period_days=7):
    """
    특정 노출 이벤트 이후 7일간의 수익(Reward) 계산

    Reward = 회사가 얻는 수익 지표
           = (사용자의 재화 지출) + (리텐션 가치) + (매칭 가치) - (이탈 손실)
    """
    # 1. 재화 소비 집계 (기본 로그에서 추출)
    currency_logs = get_currency_usage_logs(
        user_id=user_id,
        start_time=exposure_timestamp,
        end_time=exposure_timestamp + 7days
    )

    immediate_revenue = 0
    for log in currency_logs:
        if log.action_type == "SUPER_LIKE":
            immediate_revenue += 1
        elif log.action_type == "FRIEND_REQUEST":
            immediate_revenue += 4
        elif log.action_type == "FRIEND_REQUEST_WITH_MESSAGE":
            immediate_revenue += 6
        elif log.action_type == "CHAT_ACTIVATION":
            immediate_revenue += 10
        # ... 기타 재화 소비 행동

    # 2. 리텐션 보너스
    retention_bonus = 0
    if user_still_active_after_7_days(user_id, exposure_timestamp):
        retention_bonus = 10

    # 3. 매칭 성공 보너스
    match_bonus = 0
    matches = get_matches(user_id, exposure_timestamp, 7days)
    match_bonus = len(matches) * 5

    # 4. 페널티
    penalty = 0
    if user_churned_within_7_days(user_id, exposure_timestamp):
        penalty = -20

    consecutive_rejections = count_consecutive_rejections(user_id, exposure_timestamp, 7days)
    if consecutive_rejections > 10:
        penalty -= 5

    # 5. 최종 보상
    total_reward = immediate_revenue + retention_bonus + match_bonus + penalty

    return total_reward

# 예시 결과 (회사 수익)
exposure_1 → reward = 15 + 10 + 5 + 0 = 30 (재화 15개 소비 + 리텐션 + 매칭)
exposure_2 → reward = 25 + 10 + 10 + 0 = 45 (재화 25개 소비 + 리텐션 + 매칭 2건)
exposure_3 → reward = 5 + 0 + 0 + (-20) = -15 (재화 5개만 소비 후 이탈 → 회사 손실)
```

---

### 학습 데이터 생성 과정

**실제 운영 로그 → 학습 데이터 변환**:

```
[DynamoDB 원시 로그]

1. Exposure Event (2024-01-15):
   user_id: usr_123
   exposure_id: exp_789
   strategy: 전략_2
   context: [0.75, 0.82, 15, ...]
   profiles_shown: [usr_456, usr_789, ...]

2. Action Events (2024-01-15 ~ 01-22):
   exposure_id: exp_789
   - SUPER_LIKE → usr_456 (1재화)
   - FRIEND_REQUEST → usr_456 (4재화)
   - FRIEND_ACCEPTED → usr_456
   - CHAT_ACTIVATION → usr_456 (10재화)
   - LIKE → usr_789 (무료)

3. User Activity (2024-01-15 ~ 01-22):
   - Day 1-7: 활동 지속
   - Matches: 1건
   - Churn: false

[7일 후 배치 작업]

4. Reward Computation:
   exposure_id: exp_789
   immediate_revenue: 15
   retention_bonus: 10
   match_bonus: 5
   penalty: 0
   → total_reward: 30

[학습 데이터로 변환]

Training Sample:
{
  "context": [0.75, 0.82, 15, 85, 45, 0.35, ...],
  "action": 2,  // 전략_2
  "reward": 30.0
}

→ S3에 Parquet 파일로 저장
→ 주간 배치로 모델 재학습
```

---

### Bandit 모델의 Input/Output (명확한 정리)

**학습 시 (Training)**:

```
Input:
- X: Context 행렬 (N개 샘플 × D차원)
  예: [[0.75, 0.82, 15, ...], [0.68, 0.79, 8, ...], ...]

- A: Action 벡터 (N개 샘플)
  예: [2, 5, 2, 4, 1, ...]  (각 샘플이 어떤 전략을 선택했는지)

- R: Reward 벡터 (N개 샘플)
  예: [30.0, 20.0, 45.0, -15.0, 25.0, ...]  (실제 관찰된 보상)

Output (학습 결과):
- θ_1, θ_2, ..., θ_K: 각 전략의 가중치 벡터
  예: θ_2 = [0.31, -0.08, 0.12, 0.05, ...]

- 해석: "context의 2번째 피처(engagement_score)가 높으면 전략_2의 보상이 낮아짐 (-0.08)"
```

**추론 시 (Inference / 실시간 서빙)**:

```
Input:
- context_new: 새로운 사용자의 상태 벡터 (D차원)
  예: [0.80, 0.75, 20, 120, 30, 0.40, ...]

Process:
1. 각 전략별 예상 보상 계산:
   E_1 = θ_1^T · context_new = 25.3
   E_2 = θ_2^T · context_new = 38.7  ← 최대
   E_3 = θ_3^T · context_new = 22.1
   ...

2. 최고 보상 전략 선택:
   selected_strategy = 2 (Balanced)

Output:
- strategy_id: 2
- strategy_name: "Balanced"
- expected_reward: 38.7
- profile_distribution: {high: 0.3, medium: 0.5, exploration: 0.2}
```

**핵심 이해**:

1. **Output은 "전략 선택"이지 "수익 값" 자체가 아닙니다**
2. **학습은 과거 경험에서 "어떤 상황에 어떤 전략이 수익이 좋았는지" 패턴을 찾습니다**
3. **기존 로그만으로 충분합니다**: 재화 소비 이력이 모두 기록되어 있으므로 보상 계산 가능

---

**Step 1: 후보 전략 정의 (사람이 사전에 정의)**

**Q: 전략은 몇 개 만드나요? 누가 만드나요?**

**A: 사람이 미리 5-15개 정도를 수동으로 정의합니다. AI는 만들지 않습니다.**

**전략 정의 주체 및 방법**:

```
누가: 기획자 + 데이터 분석가
언제: 시스템 구축 초기 (Phase 1)
개수: 5-15개 (너무 적으면 선택지 부족, 너무 많으면 학습 느림)
변경: 분기별 1-2회 리뷰 후 추가/삭제 가능

AI의 역할:
- 전략을 만들지 않음
- 주어진 전략 중 "어떤 상황에 어떤 전략이 좋은지" 학습
- 각 사용자에게 최적 전략 자동 선택
```

**전략 정의 예시** (10개):

```
전략 1: High_Success_Focus
  - 목적: 매칭 성공 경험 제공
  - 분포: 높은 매칭률 60% / 중간 30% / 탐색 10%
  - 적합 대상: 이탈 위험 높음, 좌절감 높음

전략 2: Balanced
  - 목적: 성공과 탐색의 균형
  - 분포: 높은 30% / 중간 50% / 탐색 20%
  - 적합 대상: 일반 사용자

전략 3: Exploration_Heavy
  - 목적: 다양한 프로필 탐색
  - 분포: 높은 20% / 중간 30% / 탐색 50%
  - 적합 대상: 신규 사용자, 선호 패턴 불명확

전략 4: Revenue_Aggressive
  - 목적: 재화 소비 극대화
  - 분포: 재화 유도 높은 프로필 70% / 매칭률 고려 30%
  - 적합 대상: 안정적, 재화 많음, 활발함

전략 5: Retention_Safe
  - 목적: 이탈 방지 최우선
  - 분포: 높은 매칭률 80% / 중간 20%
  - 적합 대상: 이탈 위험 매우 높음

전략 6: Premium_Mix
  - 목적: 고매력 프로필 경험 제공
  - 분포: 상위 10% 매력도 40% / 중간 40% / 탐색 20%
  - 적합 대상: 고액 지출자, VIP

전략 7: Quick_Win
  - 목적: 빠른 성공 경험
  - 분포: 높은 수락률 프로필 90% / 기타 10%
  - 적합 대상: 첫 매칭 전 사용자, 긴급 리텐션

전략 8: Engagement_Boost
  - 목적: 활동 촉진
  - 분포: 높은 응답률 프로필 60% / 중간 30% / 탐색 10%
  - 적합 대상: 세션 빈도 낮음, 활동 저하

전략 9: Male_Revenue_Max (남성 전용)
  - 목적: 남성 과금 극대화
  - 분포: 수익유발 높은 여성 60% / 매력도 높은 여성 30% / 탐색 10%
  - 적합 대상: 남성, 재화 많음, 안정적

전략 10: Female_Retention (여성 전용)
  - 목적: 여성 리텐션 극대화
  - 분포: 고품질 남성 70% / 중간 20% / 탐색 10%
  - 적합 대상: 여성, 신규 또는 이탈 위험

총 10개 전략 (고정)
```

**전략 설계 가이드라인**:

1. **다양성 확보**: 극단적 전략부터 중도 전략까지 다양하게
2. **목적 명확화**: 각 전략의 비즈니스 목적 명시
3. **성별 고려**: 남성/여성 전용 전략 포함
4. **리스크 분산**: 안전한 전략 + 공격적 전략 혼합

**전략 개수 결정**:

```
너무 적으면 (K=3):
- 선택지 부족 → 개인화 제한
- 극단적 상황 대응 어려움

적절함 (K=5-15):
- 다양한 상황 커버
- 학습 속도와 성능 균형

너무 많으면 (K=30+):
- 학습 데이터 분산 → 수렴 느림
- 유지보수 복잡도 증가
- 비슷한 전략 간 차이 불명확
```

**전략 수정 프로세스**:

```
초기 (Phase 1 시작 시):
- 기획팀이 10개 전략 정의
- 각 전략의 분포 비율 설정
- 3개월간 고정 운영

분기별 리뷰 (Phase 1 이후):
- 각 전략의 사용 빈도 분석
- 거의 선택 안 되는 전략 제거 또는 수정
- 새로운 니즈 발견 시 전략 추가
- 예: "주말 전용 전략" 추가

중요:
- AI는 전략을 만들지 않음
- AI는 주어진 전략 중 선택만 함
- 전략 자체는 사람의 비즈니스 판단
```

**전략 vs 가중치 θ_k 관계 정리**:

```
전략 (Strategy):
- 사람이 정의
- 고정 개수 (예: 10개)
- "높은 30% / 중간 50% / 탐색 20%" 같은 분포 정책
- 변경: 분기별 1-2회 수동 리뷰

가중치 θ_k (Weights):
- AI가 학습
- 각 전략마다 하나씩 (10개 전략 → 10개 가중치 벡터)
- "전략_k가 어떤 상황에서 좋은지" 나타냄
- 변경: 주간 단위 자동 재학습
```

**Step 2: Context 벡터 구성**

사용자 A의 상태를 D차원 벡터로 표현 (각 값의 의미와 계산 방법):

```
x_A = [
  // [0-3] 4개 박스 점수 (Level 1 전통적 계산 - 가장 중요한 피처)
  0.75,   // attractiveness_score (매력도 박스): (좋아요×0.7 + 슈퍼좋아요×1.0) / 전체평가
  0.82,   // engagement_score (활동성 박스): 접속빈도×0.4 + 평가비율×0.4 + 완성도×0.2
  0.68,   // revenue_trigger_score (수익유발 박스): 친구수락률×0.3 + 좋아요응답×0.2 + 채팅응답×0.5
  0.55,   // spending_score (지출 박스): 총결제액×0.5 + 재화빈도×0.3 + 다양성×0.2

  // [4-6] 활동 이력
  15,     // days_since_join: 가입 후 일수 (2024-01-01 가입 → 01-15 = 15일)
  85,     // total_currency_spent: 누적 재화 소비량
  45,     // currency_balance: 현재 재화 잔액

  // [7-9] 성공률 지표
  0.35,   // like_success_rate: 맞좋아요 42건 / 보낸 좋아요 120건
  0.25,   // friend_request_success_rate: 수락 3건 / 신청 12건
  0.67,   // chat_activation_rate: 활성화 2건 / 매칭 3건

  // [10-12] 이탈 위험 (Level 2 예측 모델 결과)
  0.25,   // churn_7d_probability: 7일 이탈 예측 확률
  0.45,   // churn_30d_probability: 30일 이탈 예측 확률
  0.35,   // frustration_score: 좌절도 (거절률 + 무응답률 기반)

  // [13-15] 최근 행동 패턴
  5,      // consecutive_rejections: 연속 거절 횟수
  12,     // sessions_last_7d: 최근 7일 세션 수
  25,     // avg_session_duration_minutes: 평균 세션 시간

  // [16-18] 상호작용 비율
  0.375,  // like_to_view_ratio: 좋아요 45건 / 조회 120건
  3,      // total_matches: 총 매칭 건수
  7,      // days_without_new_match: 마지막 매칭 후 경과 일수

  // [19-21] 사용자 타입 (원-핫 인코딩)
  0,      // is_new_user: 신규 사용자 여부 (15일 이상이므로 0)
  1,      // is_male: 남성 여부
  0,      // is_high_spender: 고액 지출자 여부 (85개는 중간 수준)

  // [22-26] 시간/세션 컨텍스트
  19,     // hour_of_day: 현재 시각 (19시)
  1,      // is_evening: 저녁 시간대 여부
  1,      // day_of_week: 월요일 (0=일요일, 1=월요일)
  0,      // is_weekend: 주말 여부
  0.42,   // session_progress: 현재 세션에서 본 프로필 비율 (12/28)

  // ... 총 50-100차원까지 확장 가능
]

실제 값 예시 (27차원):
context_A = [0.75, 0.82, 0.68, 0.55, 15, 85, 45, 0.35, 0.25, 0.67,
             0.25, 0.45, 0.35, 5, 12, 25, 0.375, 3, 7,
             0, 1, 0, 19, 1, 1, 0, 0.42]
```

**각 값의 출처**:

| 인덱스 | 필드명                      | 값    | 계산 방법                                      | 데이터 출처                          |
| ------ | --------------------------- | ----- | ---------------------------------------------- | ------------------------------------ |
| 0      | attractiveness_score        | 0.75  | (좋아요×0.7 + 슈퍼좋아요×1.0) / 전체평가       | userCrushExpressions                 |
| 1      | engagement_score            | 0.82  | 접속빈도×0.4 + 평가비율×0.4 + 완성도×0.2       | user, userCrushExpressions, photos   |
| 2      | revenue_trigger_score       | 0.68  | 친구수락률×0.3 + 좋아요응답×0.2 + 채팅응답×0.5 | friendRequests, chatRooms            |
| 3      | spending_score              | 0.55  | 총결제액×0.5 + 재화빈도×0.3 + 다양성×0.2       | currencyTransactions, storePurchases |
| 4      | days_since_join             | 15    | 현재 - 가입일                                  | user.createdAt                       |
| 5      | total_currency_spent        | 85    | SUM(amount) WHERE type=SPEND                   | currencyTransactions                 |
| 6      | currency_balance            | 45    | balance                                        | userWallets                          |
| 7      | like_success_rate           | 0.35  | 상호좋아요 / 보낸좋아요                        | userCrushExpressions                 |
| 8      | friend_request_success_rate | 0.25  | ACCEPTED / SENT                                | friendRequests                       |
| 9      | chat_activation_rate        | 0.67  | 활성화 / 매칭                                  | chatActivations, matches             |
| 10     | churn_7d_probability        | 0.25  | Level 2 이탈 예측 모델                         | ML 모델 추론                         |
| 11     | churn_30d_probability       | 0.45  | Level 2 이탈 예측 모델                         | ML 모델 추론                         |
| 12     | frustration_score           | 0.35  | 거절률 × 무응답률                              | 계산값                               |
| 13     | consecutive_rejections      | 5     | 최근 연속 거절                                 | friendRequests                       |
| 14     | sessions_last_7d            | 12    | 최근 7일 로그인                                | user.lastLoginAt 로그                |
| 15     | avg_session_duration        | 25    | 평균 세션(분)                                  | 세션 로그                            |
| 16     | like_to_view_ratio          | 0.375 | 좋아요 / 조회                                  | userCrushExpressions, profileViews   |
| 17     | total_matches               | 3     | 총 매칭                                        | matches                              |
| 18     | days_without_new_match      | 7     | 현재 - 마지막 매칭일                           | matches                              |
| 19     | is_new_user                 | 0     | days_since_join < 14                           | 계산값                               |
| 20     | is_male                     | 1     | gender == MALE                                 | user.gender                          |
| 21     | is_high_spender             | 0     | total_spent > 200                              | 계산값                               |
| 22     | hour_of_day                 | 19    | 현재 시각                                      | 요청 시점                            |
| 23     | is_evening                  | 1     | 18-23시                                        | 계산값                               |
| 24     | day_of_week                 | 1     | 요일 (0=일)                                    | 요청 시점                            |
| 25     | is_weekend                  | 0     | 주말 여부                                      | 계산값                               |
| 26     | session_progress            | 0.42  | 본 프로필 / 목표                               | 세션 상태                            |

**Step 3: 각 전략별 기대 보상 모델링**

각 전략 k에 대해 선형 회귀 모델:

```
E[Reward | x_A, 전략_k] = θ_k^T · x_A

여기서 θ_k는 전략 k의 파라미터 벡터 (학습을 통해 얻어진 가중치)
```

**실제 계산 예시** (전략\_2: Balanced):

```
학습을 통해 얻어진 가중치 (θ_2):
θ_2 = [
  3.5,    // [0] attractiveness_score: 매력도 높으면 Balanced에서 보상 ↑
  2.2,    // [1] engagement_score: 활동성 높으면 보상 ↑
  4.0,    // [2] revenue_trigger_score: 수익유발 높으면 보상 ↑↑
  1.5,    // [3] spending_score: 지출 성향 있으면 보상 ↑
  0.3,    // [4] days_since_join: 가입 오래될수록 약간 ↑
  0.1,    // [5] total_currency_spent: 누적 소비 많으면 약간 ↑
  0.2,    // [6] currency_balance: 잔액 많으면 약간 ↑
  5.0,    // [7] like_success_rate: 성공률 매우 중요
  6.0,    // [8] friend_request_success_rate: 친구 수락률 매우 중요
  3.0,    // [9] chat_activation_rate: 채팅 전환율 중요
  -12.0,  // [10] churn_7d_probability: 이탈 위험 높으면 보상 ↓↓↓
  -6.0,   // [11] churn_30d_probability: 장기 이탈 위험도 고려
  -4.0,   // [12] frustration_score: 좌절감 높으면 ↓
  -2.5,   // [13] consecutive_rejections: 연속 거절 많으면 ↓
  0.5,    // [14] sessions_last_7d: 세션 많으면 약간 ↑
  0.3,    // [15] avg_session_duration: 세션 길면 약간 ↑
  1.0,    // [16] like_to_view_ratio: 적극성 있으면 ↑
  1.5,    // [17] total_matches: 매칭 경험 있으면 ↑
  -1.0,   // [18] days_without_new_match: 오래 못 만나면 ↓
  -5.0,   // [19] is_new_user: 신규는 Balanced 부적합 (탐색 필요)
  2.5,    // [20] is_male: 남성에게 더 적합
  1.0,    // [21] is_high_spender: 고액 지출자에게 적합
  0.05,   // [22] hour_of_day: 시각 영향 미미
  0.8,    // [23] is_evening: 저녁 시간대 약간 유리
  0.3,    // [24] day_of_week: 요일 영향 작음
  0.5,    // [25] is_weekend: 주말 약간 유리
  -0.2    // [26] session_progress: 세션 진행도 영향 미미
]

예상 보상 계산:
E[Reward | x_A, 전략_2] = θ_2^T · x_A
  = 3.5×0.75 + 2.2×0.82 + 4.0×0.68 + 1.5×0.55 + 0.3×15 + 0.1×85 + 0.2×45
    + 5.0×0.35 + 6.0×0.25 + 3.0×0.67 + (-12.0)×0.25 + (-6.0)×0.45 + (-4.0)×0.35
    + (-2.5)×5 + 0.5×12 + 0.3×25 + 1.0×0.375 + 1.5×3 + (-1.0)×7
    + (-5.0)×0 + 2.5×1 + 1.0×0 + 0.05×19 + 0.8×1 + 0.3×1 + 0.5×0 + (-0.2)×0.42

  = 2.625 + 1.804 + 2.72 + 0.825 + 4.5 + 8.5 + 9.0
    + 1.75 + 1.5 + 2.01 + (-3.0) + (-2.7) + (-1.4)
    + (-12.5) + 6.0 + 7.5 + 0.375 + 4.5 + (-7.0)
    + 0 + 2.5 + 0 + 0.95 + 0.8 + 0.3 + 0 + (-0.084)

  = 31.9 (전략_2의 예상 보상)

다른 전략들:
- 전략_1 (High_Success_Focus): θ_1^T · x_A = 28.5
- 전략_2 (Balanced): θ_2^T · x_A = 31.9 ← 최고
- 전략_4 (Revenue_Aggressive): θ_4^T · x_A = 25.7 (이탈 위험 때문에 낮음)
- 전략_5 (Retention_Safe): θ_5^T · x_A = 30.2

→ 전략_2 선택!

해석:
- 사용자 A는 이탈 위험이 있지만(churn_7d=0.25),
  수익유발 점수(0.68)와 친구수락률(0.25)이 괜찮아서
  Balanced 전략이 가장 높은 보상 예상
- Revenue_Aggressive는 이탈 위험 패널티로 점수 하락
- Retention_Safe는 안전하지만 수익 잠재력이 Balanced보다 낮음
```

**가중치의 의미**:

- 양수 가중치: 해당 피처 값이 높을수록 이 전략의 보상이 증가
  - 예: attractiveness_score에 +2.5 → 매력도 높은 사용자에게 Balanced가 효과적
- 음수 가중치: 해당 피처 값이 높을수록 이 전략의 보상이 감소
  - 예: churn_7d_probability에 -10.0 → 이탈 위험 높으면 Balanced는 부적합

**학습 과정**:

- 초기: θ_2 = [0, 0, 0, ...] (모름)
- 경험 축적: "Balanced를 선택했더니 보상 30"
- 학습: θ_2 업데이트 → 어떤 context에서 Balanced가 좋은지 학습
- 수천 번 반복 후: θ_2가 안정화 → 최적 가중치 발견

**Step 4: Thompson Sampling으로 전략 선택**

```
1. 각 전략 k에 대해, 현재까지의 데이터로 θ_k의 사후 분포 (Posterior) 계산
   - 사전 분포: θ_k ~ N(0, σ²I)
   - 관측 데이터: (context, 전략_k, reward) 쌍들
   - 사후 분포: θ_k ~ N(μ_k, Σ_k)

2. 각 전략 k에 대해 θ_k를 사후 분포에서 샘플링
   θ̃_k ~ N(μ_k, Σ_k)

3. 가장 높은 기대 보상을 주는 전략 선택
   k* = argmax_k (θ̃_k^T · x_A)

4. 선택된 전략 k*에 따라 프로필 리스트 구성
```

**Step 5: 보상 관찰 및 모델 업데이트**

```
1. 사용자 A에게 전략 k*에 따른 프로필 노출
   → exposure_id 생성 및 로그 기록

2. 7일 동안 A의 행동 자동 수집 (기존 로그 시스템)
   - currencyTransactions 테이블에서 재화 소비 집계
   - matches 테이블에서 매칭 성사 확인
   - user 테이블에서 마지막 활동 시간 확인

3. 7일 후 배치 작업으로 보상 자동 계산:
   reward = sum(재화 소비) + retention_bonus + match_bonus - penalties

4. 학습 데이터 자동 생성:
   (context_A, strategy_k*, reward) → DynamoDB rewards 테이블 저장

5. 주간 배치로 모델 자동 재학습:
   - S3에서 최근 1개월 학습 데이터 로드
   - 베이지안 회귀로 각 θ_k 업데이트
   - 새 모델을 SageMaker Endpoint에 배포
```

**핵심 통찰**:

```
전통적 지도학습과의 차이:

지도학습:
  Input: (사진, 프로필) → Output: 좋아요 확률 0.73
  목표: 예측 정확도

Bandit 학습:
  Input: (사용자 상태, 전략) → Output: 예상 수익 38.7
  목표: 실제 수익 극대화

핵심 차이:
- 지도학습: 정답 라벨을 맞추는 것
- Bandit: 행동의 결과(수익)를 최대화하는 것
```

### 5.3 Level 1 + 2 + 3 통합 작동 방식 (전체 시스템)

**핵심**: 3개 계층이 **모두 함께 작동**합니다. 어느 하나라도 없으면 시스템 작동 불가.

**통합 아키텍처**:

```
┌─────────────────────────────────────────────┐
│  사용자 A가 추천 요청                         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Level 1: 4개 박스 점수 계산 (필수!)          │
│  - DB 집계 → 전통적 공식 적용                 │
│  - attractiveness: 0.75                      │
│  - engagement: 0.82                          │
│  - revenue_trigger: 0.68                     │
│  - spending: 0.55                            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Context 벡터 구성 (Level 1 결과 포함)        │
│  context_A = [0.75, 0.82, 0.68, 0.55,       │
│               15, 85, 45, 0.35, ...]         │
│  - 첫 4개: Level 1 박스 점수                 │
│  - 나머지: DB 집계, Level 2 이탈예측          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Level 3: Contextual Bandit (전략 선택)       │
│  - 입력: context_A                            │
│  - 계산: θ_2^T · context_A = 31.9 (최고)     │
│  - 출력: 전략_2 (Balanced)                    │
│          "높은 30% / 중간 50% / 탐색 20%"      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  후보 필터링 (거리, 나이 등)                  │
│  100,000명 → 1,000명                         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Level 2: 각 후보 확률 예측 (필수!)           │
│  1,000명 각각:                                │
│  - B: 좋아요 0.78, 수락 0.65                 │
│  - C: 좋아요 0.45, 수락 0.40                 │
│  - D: 좋아요 0.22, 수락 0.15                 │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  그룹 분류 (Level 2 결과 활용)                │
│  - 높은 (>0.7): 100명                         │
│  - 중간 (0.4-0.7): 400명                      │
│  - 탐색 (<0.4): 500명                         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Level 3 전략 비율로 샘플링                   │
│  - 높은: 3명 (30%)                            │
│  - 중간: 5명 (50%)                            │
│  - 탐색: 2명 (20%)                            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  최종 추천 리스트 (10명)                      │
└─────────────────────────────────────────────┘
```

**3계층 역할 요약**:

| Level | 역할 | 입력 | 출력 | 데이터 출처 |
| --- | --- | --- | --- | --- |
| **Level 1** | 기본 점수 계산 | DB 집계 | 4개 박스 점수 | userCrushExpressions, friendRequests, currencyTransactions, storePurchases, user 테이블 등 |
| **Level 2** | 개별 확률 예측 | A+B 프로필 | 매칭 확률 | [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md) 참조 |
| **Level 3** | 전략 선택 | Context (Level 1 포함) | 전략 (분포 비율) | 경험 학습 (Bandit) |

**핵심 의존성**:

```
Level 1 → Level 3:
  4개 박스 점수를 Context 벡터에 제공
  Level 1 없으면 Context 만들 수 없음

Level 2 → 그룹 분류:
  각 프로필 평가하여 높음/중간/낮음 분류
  Level 2 없으면 그룹 나눌 수 없음

Level 3 → 샘플링:
  전략에 따른 비율 결정
  Level 3 없으면 수익 최적화 안 됨

→ 3계층 모두 필수적으로 필요!
```

**각 Level 단독 사용 시 문제점**:

```
Level 1만:
- 4개 점수로 단순 랭킹 → 개인화 없음, 수익 최적화 안 됨

Level 1 + 2만:
- 확률 높은 순서로 추천 → 빠른 매칭 → 조기 이탈 → 수익 감소

Level 1 + 2 + 3 (완전체):
- 개인화된 전략 선택 → 수익 극대화 + 이탈 방지
```

**요약**: Level 1, 2, 3는 **모두 필수**이며, 각자 고유한 역할을 수행하며 협업합니다.

---

### 3.4 Level 1 가중치 최적화 가능성 검토

**Q: AI를 이용해서 Level 1의 가중치를 최적화할 수 있나요?**

**A: 가능합니다. 두 가지 접근 방식이 있습니다.**

**접근 1: 간접 최적화 (현재 제안 방식 - 권장)**

Level 3 Bandit이 **이미 Level 1 박스의 최적 조합을 학습하고 있습니다**:

```
전통적인 박스 시스템의 종합 점수:
개인 점수 = (매력도 × W1) + (활동성 × W2) + (수익유발 × W3) + (지출 × W4)

예: W1=0.3, W2=0.2, W3=0.3, W4=0.2 (고정 가중치)

---

Level 3 Bandit의 학습:
context_A = [0.75, 0.82, 0.68, 0.55, ...]
            ↑     ↑     ↑     ↑
            매력도 활동성 수익  지출

θ_2 = [3.5, 2.2, 4.0, 1.5, ...]
       ↑    ↑    ↑    ↑
       매력도 활동성 수익 지출 가중치

→ Level 3가 "전략_2에서는 수익유발(4.0)이 가장 중요하고,
   매력도(3.5)가 두 번째, 활동성(2.2)이 세 번째" 자동 학습

→ 이것이 사실상 W1, W2, W3, W4의 최적 조합을 찾는 것!
```

**장점**:

- Level 1 공식은 고정 (단순, 해석 가능)
- Level 3가 4개 박스의 최적 조합을 자동 학습
- 전략별로 다른 조합 가능 (개인화)
- 추가 작업 불필요

**단점**:

- 각 박스 내부 가중치는 고정예: 활동성 박스의 (접속빈도×0.4 + 평가비율×0.4 + 완성도×0.2)

---

**접근 2: 직접 최적화 (복잡하지만 가능)**

각 박스 내부의 가중치도 AI로 최적화:

```
매력도 박스:
현재: (슈퍼좋아요 × 1.0 + 좋아요 × 0.7 + 싫어요 × 0.0) / 전체

AI 최적화: (슈퍼좋아요 × W_super + 좋아요 × W_like + 싫어요 × W_dislike) / 전체
          W_super, W_like, W_dislike를 학습으로 찾기

활동성 박스:
현재: 접속빈도×0.4 + 평가비율×0.4 + 완성도×0.2

AI 최적화: 접속빈도×W_freq + 평가비율×W_action + 완성도×W_profile
          W_freq, W_action, W_profile을 학습으로 찾기

... 수익유발, 지출 박스도 동일
```

**최적화 방법**:

1. **Grid Search (격자 탐색)**:

   ```
   W_super = [0.8, 1.0, 1.2]
   W_like = [0.5, 0.7, 0.9]
   W_dislike = [0.0, -0.2, -0.5]

   → 3×3×3 = 27개 조합 A/B 테스트
   → 최고 수익 조합 선택

   장점: 간단, 확실
   단점: 조합 수 폭발 (10개 가중치면 3^10 = 59,049개)
   ```

2. **Bayesian Optimization (베이지안 최적화)**:

   ```
   목표: 수익을 최대화하는 가중치 조합 찾기
   방법:
   - 몇 개 조합 테스트
   - 결과 보고 다음 테스트할 조합 스마트하게 선택
   - 반복

   장점: 효율적 (100-200회 시도로 최적값 근사)
   단점: 구현 복잡, 시간 소요 (2-3개월)
   ```

3. **Gradient-based Optimization (경사하강법)**:

   ```
   목표 함수: f(W) = 예상 수익
   방법:
   - 미분 가능한 형태로 변환
   - Gradient Descent로 최적 가중치 탐색

   장점: 빠른 수렴
   단점: 국소 최적값 위험, 미분 불가능한 부분 처리 어려움
   ```

**추천 방안**:

```
Phase 1-2 (Month 0-9):
- Level 1 가중치 고정 (수동 설정)
- Level 2 개발 집중
- 이유: 단순성, 빠른 배포

Phase 3-4 (Month 9-18):
- Level 1 가중치 고정 유지
- Level 3 개발 및 적용
- 4개 박스 중요도는 Level 3가 자동 학습 중

Phase 5+ (Month 18+, 선택적):
- 필요시 Bayesian Optimization으로 Level 1 박스 내부 가중치 최적화
- 예: 활동성 박스에서 "접속빈도 vs 평가비율" 최적 비율 찾기
- 조건: Level 3가 안정화된 후
```

**접근 2의 추가 문제점**:

```
문제: Level 1 가중치 변경 시 연쇄 효과 발생

1. Level 1 가중치 변경
   활동성 박스: 접속빈도×0.4 → 0.5로 변경
   ↓
2. 모든 사용자의 활동성 점수 변경
   사용자 A: 0.82 → 0.85로 변경
   ↓
3. Context 벡터 변경
   context_A = [0.75, 0.82, ...] → [0.75, 0.85, ...]
   ↓
4. Level 3 재학습 필요!
   기존 학습 데이터: (context=[0.75, 0.82, ...], 전략_2, reward=30)
   새로운 데이터: context가 바뀌었으므로 과거 데이터 재계산 필요
   ↓
5. Level 2도 영향 받을 수 있음
   입력에 Level 1 점수 사용하는 경우 재학습 필요

결과:
→ Level 1 가중치 한 번 변경할 때마다
→ 전체 시스템 재학습 (수주 소요)
→ 매우 비효율적!
```

**복잡도 및 비용 비교**:

| 접근          | 최적화 대상      | 파라미터 수           | 복잡도 | 재학습 비용      | 해석 가능성 | 권장      |
| ------------- | ---------------- | --------------------- | ------ | ---------------- | ----------- | --------- |
| 접근 1 (간접) | Level 3만 학습   | ~30개 (θ 가중치)      | 낮음   | 주간 자동        | 높음        | ✅ 권장   |
| 접근 2 (직접) | Level 1 + 3 학습 | ~50개 (박스 내부 + θ) | 높음   | 매번 전체 재학습 | 중간        | ⚠️ 비추천 |

**시간/비용 추정**:

```
접근 1 (간접):
- Level 1 가중치: 고정 (변경 없음)
- Level 3 학습: 주간 자동 (몇 시간)
- 총 비용: 낮음

접근 2 (직접):
- Level 1 가중치 변경: 1회
- 모든 사용자 점수 재계산: 1-2일
- 과거 Context 벡터 재계산: 2-3일
- Level 3 전체 재학습: 1-2일
- Level 2 영향 확인 및 재학습: 1-2주
- 총 비용: 2-3주 + 엔지니어링 리소스
```

**결론 및 권장사항**:

1. **Phase 1-4 (Month 0-18)**: Level 1 가중치 고정

   - 이유: 단순성, 빠른 배포, 충분한 성능
   - Level 3가 4개 박스의 최적 조합을 자동 학습

2. **Phase 5+ (Month 18+, 선택)**: Level 1 내부 가중치 최적화

   - 조건: Level 3 성능이 안정화되고, 추가 개선 필요 시
   - 방법: Bayesian Optimization
   - 예상 개선: +5-10% (미미할 수 있음)

3. **가능성**: 기술적으로 100% 가능하나, 복잡도 대비 효과가 크지 않을 수 있음

**핵심 통찰**:

```
Level 3가 이미 간접 최적화 수행 중:

전략_2의 가중치:
θ_2 = [3.5, 2.2, 4.0, 1.5, ...]
      ↑    ↑    ↑    ↑
      매력도 활동성 수익 지출

이것이 사실상:
"전략_2를 쓸 때는 수익유발이 가장 중요(4.0),
 매력도가 두 번째(3.5), 지출이 네 번째(1.5)"

→ Level 1의 W1, W2, W3, W4를 동적으로 조정하는 효과!
```

---

## 6. 학습 데이터 수집 전략

### 6.1 필수 로깅 데이터

**6.1.1 노출 이벤트 (Exposure Event)**

```json
{
  "event_type": "EXPOSURE",
  "event_id": "exp_123456",
  "timestamp": "2024-01-15T19:30:00Z",
  "user_id": "usr_123",
  "session_id": "ses_789",
  "strategy_applied": "balanced",
  "profiles_shown": [
    {
      "profile_id": "usr_456",
      "rank": 1,
      "tier": "high",
      "predicted_like_prob": 0.78,
      "predicted_match_prob": 0.65
    }
  ],
  "user_state_snapshot": {
    // 사용자 A의 전체 상태 (4.3 Input 참조)
  }
}
```

**6.1.2 행동 이벤트 (Action Event)**

```json
{
  "event_type": "ACTION",
  "exposure_id": "exp_123456",
  "timestamp": "2024-01-15T19:35:00Z",
  "user_id": "usr_123",
  "target_user_id": "usr_456",
  "action_type": "LIKE",
  "currency_spent": 0,
  "action_details": {
    "decision_time_seconds": 23,
    "profile_view_duration_seconds": 45
  }
}
```

**6.1.3 결과 이벤트 (Outcome Event)**

```json
{
  "event_type": "OUTCOME",
  "exposure_id": "exp_123456",
  "user_id": "usr_123",
  "target_user_id": "usr_456",
  "timestamp": "2024-01-16T10:00:00Z",
  "outcome_type": "FRIEND_ACCEPTED",
  "match_established": true,
  "total_currency_spent_for_this_match": 10
}
```

**6.1.4 보상 집계 이벤트 (Reward Aggregation)**

7일 단위로 각 노출 세션의 최종 보상 계산:

```json
{
  "event_type": "REWARD_AGGREGATION",
  "exposure_id": "exp_123456",
  "user_id": "usr_123",
  "observation_period_days": 7,
  "total_currency_spent": 35,
  "matches_established": 2,
  "chat_activated": 1,
  "user_retained": true,
  "user_churned": false,
  "computed_reward": 42.5,
  "reward_breakdown": {
    "immediate_revenue": 35,
    "retention_bonus": 10,
    "churn_penalty": 0,
    "rejection_penalty": -2.5
  }
}
```

### 6.2 데이터 저장 구조

**DynamoDB 테이블 설계**:

**exposures 테이블**:

```
PK: USER#{user_id}
SK: EXP#{timestamp}#SESSION#{session_id}
Attributes:
  - exposure_id
  - strategy_applied
  - profiles_shown (list)
  - user_state_snapshot (map)
  - reward (초기 null, 7일 후 업데이트)
  - reward_computed_at
TTL: 90일
```

**actions 테이블**:

```
PK: EXPOSURE#{exposure_id}
SK: ACTION#{timestamp}#TARGET#{target_user_id}
Attributes:
  - user_id
  - action_type
  - currency_spent
  - outcome (초기 null, 결과 발생 시 업데이트)
TTL: 90일
```

**rewards 테이블** (학습용):

```
PK: MONTH#{year-month}
SK: EXPOSURE#{exposure_id}
Attributes:
  - user_id
  - context_vector (list of numbers)
  - strategy_id
  - total_reward
  - computed_at
보관: 영구 (학습 데이터)
```

### 6.3 실시간 파이프라인

```
사용자 액션 발생
  ↓
API 서버에서 이벤트 기록
  ↓
DynamoDB (exposures/actions)
  ↓ (비동기)
Kinesis Data Stream
  ↓
Lambda (실시간 집계)
  ↓
Redis (중간 집계 캐시)

[매일 자정 배치]
  ↓
Lambda (7일 보상 계산)
  ↓
DynamoDB rewards 테이블 업데이트
  ↓
S3 (학습 데이터 백업)
  ↓
SageMaker (주간 재학습)
```

---

## 7. 단계별 구현 로드맵

**참고**: 이 섹션은 기술 구현 관점의 로드맵입니다. 전체 프로젝트 로드맵은 [데이팅 서비스 AI 접목 개발 로드맵](./데이팅%20서비스%20AI%20접목%20개발%20로드맵.md) 참조

### 초기 단계 (Phase 1-2, Month 0-9): 데이터 수집 + Level 2 기본 모델

**목표**: 학습 데이터 확보 및 핵심 예측 모델 개발

**구현 내용**:

1. **Level 1 (Traditional)** 완전 구현
   - 매력도/활동성/수익유발/지출 점수 계산
   - 기본 필터링 (거리, 나이, 활동성)
2. **Level 2 핵심 모델** 개발 (접근 1: 숫자 피처만)
   - 친구 수락 확률 예측 (최우선)
   - 이탈 확률 예측
   - 모델: XGBoost
3. **데이터 로깅** 완전 구현
   - 모든 노출/행동/결과 이벤트 100% 수집
   - 최소 3개월 데이터 확보

**산출물**:

- Level 2 모델 2개 (프로덕션)
- 10만+ 행동 이벤트

**목표 성과**: ARPU +15-20%

---

### 중기 단계 (Phase 3-4, Month 9-18): Level 3 개발 + 수익 최적화

**목표**: Contextual Bandit 개발 및 수익 극대화

**구현 내용**:

1. **Level 3 Bandit** 개발
   - 10-15개 전략 정의
   - Thompson Sampling 구현
   - 보상 계산 시스템
2. **Level 2 고도화** (선택)
   - 접근 2 적용 (Image Embedding 추가)
   - Two-Tower 모델 도입 (확장성)
3. **통합 시스템**
   - Level 1 + 2 + 3 완전 통합
   - 자동 재학습 파이프라인

**목표 성과**: ARPU +25-35% (총합)

---

### 장기 단계 (Phase 5+, Month 18+): 지속 개선

**목표**: 시스템 안정화 및 고도화

**구현 내용**:

1. **자동화** 완성
   - 주간 자동 재학습
   - 성능 모니터링 및 자동 조정
2. **고도화** (선택)
   - 접근 3 (End-to-End Multi-modal) 연구
   - 강화학습 전환 검토
   - 추가 Level 2 모델

**예상 추가 효과**: +5-10%

---

## 8. 수익 최적화 핵심 메커니즘

### 8.1 적응적 난이도 조절 (Adaptive Difficulty)

**게임 디자인 원리 차용**:

- 너무 쉬우면 지루함 → 이탈
- 너무 어려우면 좌절 → 이탈
- **적절한 도전**: 노력하면 성공 가능 → 몰입

**데이팅 적용**:

```
IF 최근 7일 매칭 성공률 < 10% THEN
  → 더 쉬운 프로필 노출 (높은 매칭률 60%로 증가)

ELSE IF 최근 7일 매칭 성공률 > 40% THEN
  → 더 어려운 프로필 노출 (탐색 비율 40%로 증가)
  → 재화 소비 유도 증가

ELSE
  → 현재 전략 유지
```

### 8.2 긴급 리텐션 개입 (Churn Prevention)

**이탈 위험 시그널 감지**:

```
High Risk Signals:
- churn_7d_probability > 0.4
- consecutive_rejections > 8
- days_without_match > 14
- declining_session_frequency (3일 연속 감소)
- low_response_rate < 0.2

→ 즉시 Retention_Safe 전략 강제 적용
→ 높은 매칭률 프로필 80% 노출
→ "새로운 추천이 도착했어요!" 푸시 발송
→ 무료 재화 지급 이벤트 제공
```

### 8.3 수익 가속화 (Revenue Acceleration)

**고가치 사용자 식별**:

```
High Value Signals:
- currency_balance > 100
- avg_spending_per_week > 30
- churn_probability < 0.2
- engagement_score > 0.8

→ Revenue_Aggressive 전략 적용
→ 재화 소비 유도 프로필 70% 노출
→ 슈퍼좋아요 유도 프로필 우선 배치
→ 프리미엄 테마별 추천 제안
```

### 8.4 성별 차등 최적화

**남성 (과금 주체)**:

- 기본 전략: Revenue_Aggressive
- 목표 탐색 기간: 60-90일
- 재화 소비 목표: 200-400개
- 핵심 KPI: 재화 소비율, 세션 빈도

**여성 (리텐션 중심)**:

- 기본 전략: Retention_Safe
- 초기 2주: 높은 품질 남성 80% 노출
- 핵심 KPI: 리텐션, 친구 수락률, 활성도

**신규 사용자 (성별 무관)**:

- 첫 7일: Retention_Safe (빠른 성공 경험)
- 8-14일: Balanced
- 15일 이후: 데이터 기반 전략 선택

---

## 9. 예상 성과 및 검증 방법

### 9.1 핵심 지표 (North Star Metrics)

**수익 지표**:

- 사용자당 평균 재화 소비 (ARPU)
- 사용자당 생애 가치 (LTV)
- 재화 구매 전환율

**참여 지표**:

- 7일/30일 리텐션
- 평균 세션 시간
- 주간 활성 사용자 (WAU)

**품질 지표**:

- 최종 매칭 성공률
- 사용자 만족도 (NPS)
- 재가입률

### 9.2 A/B 테스트 설계

**그룹 분할**:

- Control (40%): 규칙 기반 전략
- Treatment A (30%): Bandit without Level 2 models
- Treatment B (30%): Bandit with Level 2 models

**측정 기간**: 최소 30일

**성공 기준**:

- ARPU: +25% 이상
- 30일 리텐션: -5% 이내 (감소 허용 범위)
- 최종 매칭률: -10% 이내
- 통계적 유의성: p < 0.05

### 9.3 예상 개선 목표

**Phase 1-2 (Level 2 적용) 개선**:

```
베이스라인 (Level 1만):
- ARPU: 12,000원
- LTV: 45,000원
- 7일 리텐션: 65%
- 30일 리텐션: 45%

Level 2 적용 후:
- ARPU: 15,000원 (+25%)
- LTV: 60,000원 (+33%)
- 7일 리텐션: 68% (+5%)
- 30일 리텐션: 50% (+11%)
```

**Phase 3-4 (Level 3 추가) 개선**:

```
Level 2 대비:
- ARPU: 15,000원 → 18,500원 (+23%)
- LTV: 60,000원 → 85,000원 (+42%)
- 탐색 기간: 30일 → 50일 (+67%)
```

---

## 10. 리스크 및 대응 방안

### 10.1 주요 리스크

**리스크 1: 수익 최적화가 사용자 경험을 해칠 위험**

- 증상: 매칭 품질 저하, 부정적 리뷰 증가
- 대응: 매칭 성공률 하한선 설정 (최소 15% 유지)
- 모니터링: NPS, 리뷰 감성 분석

**리스크 2: 학습 데이터 부족으로 모델 성능 저하**

- 증상: 예측 정확도 낮음, 수렴 느림
- 대응: 최소 3개월 데이터 확보 후 모델 적용
- 대응: Cold start 시 규칙 기반 폴백

**리스크 3: 모델 편향 (성별, 외모 등)**

- 증상: 특정 그룹 과다/과소 노출
- 대응: Fairness constraint 추가
- 모니터링: 그룹별 노출 분포 주간 점검

**리스크 4: 과최적화 (Overfitting)**

- 증상: 과거 패턴에만 의존, 새 트렌드 반영 실패
- 대응: Exploration 비율 최소 10% 유지
- 대응: 주기적 모델 재학습

### 10.2 안전장치 (Guardrails)

**하드 제약 조건**:

```
1. 이탈 확률 상한: P(Churn_7d) < 0.35
2. 최소 매칭 성공률: 15% 이상
3. 최대 연속 거절: 10회 초과 시 강제 개입
4. 재화 소비 속도: 주간 50개 초과 시 경고
```

**모니터링 대시보드**:

- 실시간 전략별 성과 추적
- 이상 패턴 자동 감지 (급격한 이탈률 증가 등)
- 슬랙 알림 (Critical 지표 임계값 초과 시)

---

## 11. 기술 스택 및 인프라

### 11.1 모델 개발

**개발 환경**:

- Python 3.10+
- TensorFlow / PyTorch (예측 모델)
- Scikit-learn (Bandit 알고리즘)
- Pandas, NumPy (데이터 처리)

**학습 인프라**:

- AWS SageMaker (모델 학습 및 배포)
- SageMaker Pipelines (MLOps)
- S3 (학습 데이터 저장)

### 11.2 추론 서빙

**실시간 API**:

- SageMaker Endpoint (예측 모델)
- Lambda + DynamoDB (Bandit 전략 선택)
- Redis (추천 결과 캐싱, TTL: 1시간)

**응답 시간 목표**:

- Level 2 예측: 50ms 이내
- Level 3 전략 선택: 30ms 이내
- 캐시 히트 시: 10ms 이내
- 총 End-to-End: 300ms 이내

### 11.3 모니터링 및 운영

**모델 성능 모니터링**:

- CloudWatch Metrics (예측 정확도, 응답시간)
- 주간 성과 리포트 (전략별 ARPU, 리텐션)
- 월간 재학습 및 성능 검증

**A/B 테스트 프레임워크**:

- 사용자 ID 해싱 기반 그룹 할당
- 실시간 지표 집계
- 통계적 유의성 자동 검증

---

## 12. 결론 및 Next Steps

### 12.1 핵심 요약

**기존 AI 문서의 강점**:

- Level 2 개별 예측 모델의 Input/Output 명세가 매우 상세함
- 데이터 수집 전략이 체계적으로 정리됨

**기존 문서의 한계**:

- Level 3 "수익 최적화" 의사결정 로직이 누락됨
- 개별 예측을 어떻게 조합할지 불명확
- "될 듯 말 듯한 경험"을 어떻게 구현할지 구체적 방법론 부재

**이 문서의 기여**:

- Level 3 수익 최적화 모델 설계 제시
- Contextual Bandit 접근 방식 제안
- 적응적 난이도 조절 메커니즘 정의
- 이탈 방지 안전장치 설계

### 12.2 즉시 착수 가능한 작업

**우선순위 1 (즉시 시작, Phase 1)**:

1. 데이터 로깅 시스템 구축
   - DynamoDB 테이블 설계 및 구현
   - 기본 이벤트 수집 (VIEW, LIKE, MATCH 등)
   - 로그 품질 모니터링

**우선순위 2 (Month 3-6, Phase 2 초기)**:

2. 데이터 분석 및 Level 2 모델 계획
   - EDA 및 피처 엔지니어링
   - 모델 우선순위 결정
   - 개발 계획서 작성

**우선순위 3 (Month 6-9, Phase 2)**:

3. Level 2 핵심 모델 2개 개발
   - 친구 수락 확률 예측 (XGBoost)
   - 이탈 확률 예측 (XGBoost)

### 12.3 의사결정 필요 사항

**검토 필요**:

1. Phase 3에서 Level 2 고도화 여부: Image 추가 or Level 3로 바로 진행?
2. Phase 4에서 Bandit vs RL 선택: Bandit 먼저 시작 (제안)
3. 보상 함수 가중치: 단기 수익 vs 장기 리텐션 비율
4. 윤리적 가이드라인: 수익 최적화 vs 사용자 복지 균형점

**리소스 요구사항**:

- 데이터 사이언티스트 1명 (전담, AI 도구 활용)
- 총 예산: 약 2억원 (18개월)
  - 인건비: 1.5억원
  - 인프라: 2,500만원
  - AI 도구: 1,500만원
  - 기타: 1,000만원

상세 계획은 [데이팅 서비스 AI 접목 개발 로드맵](./데이팅%20서비스%20AI%20접목%20개발%20로드맵.md) 참조

---

## 부록 A: 용어 정리

**수익 극대화 (Revenue Maximization)**: 사용자당 재화 소비량을 최대화하되, 리텐션과 최종 만족도를 유지하는 것

**생애 가치 (LTV, Lifetime Value)**: 한 사용자가 서비스 이용 기간 동안 지출하는 총 금액

**이탈 확률 (Churn Probability)**: 특정 기간 내 사용자가 서비스를 떠날 확률

**Contextual Bandit**: 사용자 상태(Context)를 고려하여 최적 행동(Arm)을 선택하는 온라인 학습 알고리즘

**Exploration vs Exploitation**: 새로운 전략 탐색 (Exploration) vs 현재 최선 전략 활용 (Exploitation)의 균형

**Thompson Sampling**: 베이지안 방식으로 Exploration/Exploitation을 자동 균형하는 Bandit 알고리즘

**강화학습 (RL, Reinforcement Learning)**: 시행착오를 통해 장기 보상을 최대화하는 의사결정 학습 방법

**적응적 난이도 (Adaptive Difficulty)**: 사용자 상태에 따라 매칭 난이도를 동적으로 조절하는 메커니즘

---

## 부록 B: 기존 AI 문서와의 관계

**기존 [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)**:

- 범위: Level 2 개별 예측 모델 (좋아요, 친구 수락, 채팅 응답 등)
- 기여: 상세한 Input/Output 명세, 로그 수집 전략
- 활용: 본 문서의 Level 2 모델로 그대로 사용

**이 문서 "AI 기반 수익 극대화 추천 시스템 설계서"**:

- 범위: Level 3 수익 최적화 의사결정 모델
- 기여: 수익 극대화를 위한 전략 선택 로직, Bandit/RL 설계
- 관계: 기존 문서의 Level 2 모델들을 입력으로 활용

**통합 구조**:

```
[기존 문서] Level 2 예측 모델들
              ↓
[이 문서] Level 3 수익 최적화 모델
              ↓
        최종 추천 생성
```

---

## 부록 C: 참고 문헌 및 관련 문서

**관련 내부 문서**:

- [AI활용 박스 시스템](../../munto_docs/AI활용%20박스%20시스템.md)
- [전통적인 박스 시스템](../../munto_docs/전통적인%20박스%20시스템.md)
- [데이팅 추천 알고리즘 SRS vs 대표 의견 비교 보고서](../개발_자료_보고서/데이팅%20추천%20알고리즘%20SRS%20vs%20대표%20의견%20비교%20보고서.md)
- [데이팅 추천 알고리즘 요약본 (경영자용)](<../개발_자료_보고서/데이팅%20추천%20알고리즘%20요약본%20(경영자용).md>)
- [데이팅 추천 알고리즘 이슈 종합 보고서 (개념·실행안)](<../개발_자료_보고서/데이팅%20추천%20알고리즘%20이슈%20종합%20보고서%20(개념·실행안).md>)

**학술 참고 자료**:

- Contextual Bandits: "A Contextual-Bandit Approach to Personalized News Article Recommendation" (Li et al., 2010)
- Thompson Sampling: "Analysis of Thompson Sampling for the Multi-armed Bandit Problem" (Agrawal & Goyal, 2012)
- Reinforcement Learning: "Deep Reinforcement Learning for List-wise Recommendations" (Chen et al., 2018)

**산업 사례**:

- Netflix: Contextual Bandit for content recommendation
- Spotify: Multi-armed Bandit for playlist generation
- LinkedIn: RL for job recommendations
