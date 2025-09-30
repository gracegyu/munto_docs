## 목적

Nest.js 프로젝트에서 API 명세와 실제 코드 구현 간의 일관성을 보장하기 위해 Swagger(OpenAPI) 기반 명세를 중심으로 AI를 활용하는 자동화 및 검증 프로세스를 정의한다. 이 문서는 Swagger 명세 + DBML → 코드 생성 → Swagger 데코레이터 기반 자동 생성 결과 비교 → 재구현 반복이라는 AI 기반 프로세스를 제안한다.

---

## 1. 프로세스 개요

### Step 1: Swagger 명세 + DBML 초안 작성

- OpenAPI 3.0 포맷의 Swagger 명세를 먼저 설계한다.
- 이 작업은 AI를 통해 자연어 요청(예: "사용자 등록 API 만들어줘")을 기반으로 자동 생성 가능하다.
- Swagger Editor, SwaggerHub 또는 AI 기반 YAML 생성기(ChatGPT, Claude 등)를 사용.

### Step 2: AI를 이용한 Nest.js 코드 생성

- Swagger 명세를 기반으로 Nest.js 컨트롤러, DTO, 서비스 템플릿 코드를 AI에게 요청해 자동 생성.
- 이때 Swagger 데코레이터(`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`)를 명세대로 반영해야 함.
- Claude CLI, ChatGPT (Cursor 통합), Copilot Chat 등이 가능.

### Step 3: Unit Test 코드 자동 생성 및 TDD 적용

- Swagger 명세 기반으로 jest 테스트 자동 생성
- 정상 케이스, 예외 케이스, 경계 조건 등을 사양 기반으로 명확히 정의
- 구현 전에 테스트를 작성하여 TDD(테스트 주도 개발) 프로세스를 적용 가능
- 테스트 실패 시 AI를 통해 코드 수정 요청 및 반복

### Step 4: E2E 테스트 자동 생성

- `supertest` 및 `@nestjs/testing`을 기반으로 실제 요청 흐름을 테스트
- Swagger 명세에 정의된 example 및 응답 스펙 기반으로 시나리오를 구성
- Swagger 문서와 구현이 어긋날 경우 즉시 검출 가능
- CI 환경에서도 자동 실행되도록 구성 가능

### Step 5: Nest.js에서 Swagger 데코레이터로 문서 자동 생성

- `@nestjs/swagger`를 통해 Swagger 문서를 자동 생성한다.
- `/docs` 등의 경로로 Swagger UI를 통해 확인 가능.

### Step 6: 원본 Swagger 명세와 자동 생성된 Swagger 문서 비교

- 자동 생성된 Swagger JSON과 원본 YAML 스펙을 비교.
- AI 기반 도구 또는 Swagger diff 도구 (예: [swagger-diff](https://www.npmjs.com/package/swagger-diff))를 사용.
- 차이가 나는 경우, DTO 또는 데코레이터가 잘못 작성되었을 가능성이 높음.

### Step 7: 테스트와 Swagger 결과 통합 검증

- Unit Test, E2E Test 실행 결과와 Swagger diff를 종합적으로 검토
- 테스트 실패 + Swagger diff 결과를 기반으로 AI에 자동 수정 요청
- 모든 테스트가 통과하고 문서가 일치할 때까지 반복
- TDD와 명세 기반 구현의 일관성 확보

### Step 8: 불일치 항목 수정 및 AI를 통한 반복 개선

- 불일치 항목을 AI에게 설명하고 수정된 코드를 재요청
- 이 과정을 자동화하면 완전 자동화된 Swagger 기반 TDD 스타일 개발도 가능

---

## 2. Claude CLI vs Cursor 활용 비교

| 항목                       | Claude CLI                 | Cursor (ChatGPT 기반)                    |
| -------------------------- | -------------------------- | ---------------------------------------- |
| 명세 기반 코드 생성 정확도 | 매우 높음 (명세 입력 가능) | 높음 (명세 구조화 필요)                  |
| 반복 수정 자동화           | Bash 스크립트로 가능       | 수동 반복 필요 (단축키 자동화 가능)      |
| JSON Diff 분석             | 외부 스크립트 통합 필요    | 눈으로 비교하거나 GPT에게 비교 요청 가능 |
| 코드 템플릿 구조 유지      | 좋음                       | 대화 기반으로 점진적 개선                |
| 테스트 코드 자동화         | 가능                       | 가능                                     |
| CI 연동 가능성             | 높음 (자동화에 유리)       | 낮음 (대화형 기반)                       |

---

## 3. 추천 Best Practice 프로세스 (AI 기반 Swagger 중심 개발)

1. **초기 설계 단계**
   - 기능 명세를 작성하고 이를 자연어로 AI에 전달하여 Swagger 스펙(YAML)을 생성
   - SwaggerHub 또는 Swagger Editor에서 검토 및 수정
2. **코드 생성 단계**
   - Swagger YAML을 Claude CLI 또는 Cursor에 입력하여 Nest.js 코드 자동 생성
   - Swagger 데코레이터가 명세와 정확히 일치하는지 확인
3. **Swagger UI 확인 및 Diff 분석**
   - Nest.js의 SwaggerModule로 `/docs` 문서 자동 생성
   - 원본 YAML과 Nest.js에서 생성된 Swagger JSON을 비교
4. **Unit Test 및 E2E Test 작성 및 검증**
   - AI가 Swagger 명세 기반으로 jest Unit Test, supertest 기반 E2E Test를 자동 생성
   - 테스트 우선 작성(TDD) 원칙을 적용하고 실패하는 구현을 개선
   - 테스트 결과는 명세 일관성 검증에도 활용됨
5. **차이 분석 및 개선 반복**
   - 차이가 나는 부분을 AI에게 설명하고 해당 DTO 또는 데코레이터 수정 요청
   - 반복하면서 문서, 코드, 테스트 간 완전한 동기화 추구
6. **CI 연동 (선택)**
   - `swagger-cli validate`, `jest`, `supertest`, `swagger-diff` 등을 통해 명세 및 테스트 일치 여부 자동 검증

---

## 4. 결론 및 기대 효과

- Swagger 기반으로 먼저 스펙을 정의하고 AI를 통해 코드, 테스트, 검증 루프를 반복함으로써 API 구현 품질과 문서 정확도를 모두 확보할 수 있음
- TDD 원칙을 자동화된 방식으로 적용하여 테스트 커버리지를 높이고 회귀 오류 방지
- 테스트 기반의 사양 검증을 통해 실서비스 배포 전에 대부분의 오류를 사전 제거 가능
- 이 방식은 명세 기반 개발(Spec-First) + TDD + AI 기반 코드 생성 전략의 결합으로 고품질 API 개발을 구현함

---

## 참고 도구 및 기술 스택

- Nest.js + @nestjs/swagger
- Swagger Editor / SwaggerHub
- Claude CLI (Anthropic)
- Cursor (ChatGPT 기반 IDE)
- Swagger Diff 툴: `swagger-diff`, `openapi-diff`, `swagger-cli validate`
- 테스트 도구: `jest`, `supertest`, `@nestjs/testing`
- GitHub Actions / Jenkins를 통한 CI 검증 자동화
