# 프롬프트 관리 가이드 (Prompt-as-Code)

## 배경

AI 개발 체인에서는 **Claude CLI, Cursor, Figma MCP** 등 다양한 AI 도구를 사용합니다. 이때 단계별로 사용하는 프롬프트가 일관되지 않으면 결과 품질이 달라지고, 재현성(reproducibility)이 떨어집니다. 따라서 프롬프트를 **코드처럼 Git으로 관리**하는 것이 핵심입니다.

---

## 핵심 원칙

1. **프롬프트도 코드다**
   - 버전관리, 리뷰, 테스트가 필요합니다.
   - 수정 이력과 영향 범위를 추적할 수 있어야 합니다.
2. **중앙 레포 + 프로젝트별 오버라이드**
   - 중앙 레포: 공용 프롬프트(예: SRS, Swagger, Test Code 생성 템플릿)
   - 프로젝트 레포: 해당 프로젝트에 특화된 프롬프트만 오버라이드
3. **자동화된 품질 관리**
   - 프롬프트 Lint: 누락·금칙어 체크
   - 출력 검증: JSON Schema·Regex 검증
   - 회귀 평가: 샘플 입력/출력으로 안정성 보장

---

## 운영 모델

### 중앙 레포 구조 예 (상세)

```
ai-prompts/
  README.md
  CHANGELOG.md
  .gitignore
  .editorconfig
  CODEOWNERS
  package.json | pyproject.toml      # (선택) 패키지 배포 시
  .github/workflows/
    prompt-ci.yml                    # lint + eval + schema 검증 CI
  docs/                              # 공용 프롬프트 템플릿(Front Matter 포함)
    srs/                             # SRS 초안/보일러플레이트/체크리스트
    api-design/                      # REST/GraphQL, DTO, 에러모델 설계
    fe-codegen/                      # FE 코드생성 프롬프트
    be-codegen/                      # BE 코드생성 프롬프트
    test-gen/                        # Unit/E2E 테스트 생성
    doc-review/                      # 문서 리뷰/요약/교정
  styles/
    tone.md                          # 문체/용어/금칙어 가이드
    format-json.md                   # JSON 포맷 가드레일
  snippets/
    security.md                      # 보안/PII/AAA 주의문 스니펫
    i18n.md                          # 다국어(i18n) 가이드 스니펫
  guards/
    json-schema/                     # 출력 스키마 모음(예: rest-spec.json)
    regex/                           # 금지패턴/형식 검사 규칙
  evals/
    datasets/                        # 입력/정답(골든) 세트
    scenarios/                       # 페르소나/엣지케이스
    promptfoo.yaml                   # (예시) 프롬프트 평가 구성
  tools/
    claude-cli/                      # 공통 wrapper 스크립트/옵션
    cursor/                          # Cursor용 스크립트/설정
    mcp/                             # MCP 도구/프롬프트
  scripts/
    render.ts                        # 템플릿 변수 바인딩
    lint.ts                          # 프롬프트 Lint
    eval.ts                          # 자동 평가 러너

```

### 파일/폴더 설명 (핵심)

- **docs/**: 실제 "프롬프트 템플릿"이 위치. 각 파일은 **YAML Front Matter**(id, version, owner, model, output_schema, inputs 등)와 **본문 템플릿**(Handlebars/Jinja)을 포함합니다.
  - 예: `docs/api-design/rest-api-spec.md` → OpenAPI 산출을 강제, `guards/json-schema/rest-spec.json`로 출력 검증.
- **styles/**: 톤·용어·포맷의 **가드레일 문서**. 모든 템플릿에서 참조.
- **snippets/**: 보안 경고, i18n 지침 등 **반복 삽입 스니펫**.
- **guards/**: JSON Schema/Regex로 **출력 계약**을 고정. 계약 변경은 **MAJOR** 버전.
- **evals/**: 회귀시험을 위한 **골든 세트**와 시나리오. CI에서 성능 퇴행 감지.
- **tools/**: 모델/CLI 구동 **공통 스크립트** 모음.
- **scripts/**: 렌더·린트·평가 **자동화 유틸리티**.
- **.github/workflows/**: PR/머지 시 **Lint/Eval/Schema** 파이프라인 실행.

> 버전전략: 중앙 레포는 SemVer. 프로젝트는 태그(예: ai-prompts@v1.8.0)로 핀 고정 후 필요 시 업그레이드.

---

### 프로젝트 레포 구조 예 (상세)

```
<project>/
  docs/                             # 프로젝트 전용 문서(SRS 등)
  ai/
    prompts/
      overrides/                    # 중앙 템플릿 오버라이드(동일 경로로 그림자화)
        api-design/rest-api-spec.md # 예: 프로젝트 사양에 맞춘 변경본
      env/
        defaults.json               # 공통 변수(회사/팀 표준 값)
        dev.json                    # 환경별 덮어쓰기(선택)
        prod.json                   # 환경별 덮어쓰기(선택)
    .promptrc                       # 모델/토큰/캐시/출력경로 등 공통 옵션
  tools/
    claude/                         # 중앙 tools/claude-cli 포함(vendor/submodule)
  .github/workflows/
    prompt-ci.yml                   # Lint + Eval + Schema 검증

```

### 파일/폴더 설명 (핵심)

- **docs/**: SRS/디자인 문서 등 **사람이 읽는 산출물** 유지. 프롬프트와 구분.
- **ai/prompts/overrides/**: 중앙 `docs/`의 동일 경로를 **오버라이드**합니다. 파일명이 동일하면 **프로젝트 사본이 우선** 적용됩니다.
- **ai/prompts/env/**: 템플릿 변수 바인딩용 **입력값 세트**. 기본값(`defaults.json`)에 환경별 파일로 덮어쓰기.
- **.promptrc**: 공통 모델(예: `claude-3-7-sonnet`), 토큰 한도, 캐시 디렉토리, 출력 디렉토리 등을 지정.
- **tools/claude/**: 공통 래퍼 스크립트를 프로젝트에 **vendor**하거나 **submodule**로 연결.
- **.github/workflows/prompt-ci.yml**: PR 시 렌더→린트→스키마검증→평가 순으로 자동 실행.

> 중앙 포함 방식: 규모/선호에 따라 git submodule(정밀 고정), git subtree(싱크 용이), 또는 사내 패키지(NPM/PyPI)로 배포하여 ai-prompts@^1.x 형태로 참조 가능합니다.

---

## 개발자 가이드 (요약)

- 프롬프트는 반드시 **Git에 등록**하고 **리뷰 절차**를 거친다.
- 프로젝트 내에 임시로 작성된 프롬프트는 중앙 레포로 이관하거나 오버라이드 구조로 유지한다.
- PR 시 변경된 프롬프트의 **Before/After 예시 출력**을 포함한다.
- CI에서 **Lint + Schema 검증 + E2E 평가**를 자동 실행한다.

---

## Claude CLI 연동 패턴

### 1) 렌더 + 호출 (스크립트)

```bash
# 1) 템플릿 렌더링
node scripts/render.js \
  --template docs/api-design/rest-api-spec.md \
  --vars ai/prompts/env/defaults.json \
  --out .tmp/prompt.md

# 2) Claude CLI 호출 및 스키마 검증
claude messages create \
  --model claude-3-7-sonnet \
  --input-file .tmp/prompt.md \
  --max-tokens 4000 \
  --output-json | node scripts/schema-validate.js guards/json-schema/rest-spec.json

```

### 2) 체인 매핑

- **SRS → Swagger → FE/BE 코드 생성 → 테스트 생성 → 문서화**
- 이전 단계 산출물을 다음 단계 프롬프트의 **컨텍스트**로 주입하여 파이프라인화.

---

## 기대 효과

- **재현성**: 언제, 어떤 프롬프트로 결과가 나왔는지 추적 가능
- **일관성**: 모든 팀/프로젝트가 공용 규칙을 준수
- **품질 보장**: 자동 평가를 통해 결과 안정성 확보

---

## 결론

프롬프트는 단순 텍스트가 아닌 **코드 자산**입니다.

- **Git으로 관리**하고,
- **중앙 레포 + 프로젝트 오버라이드 모델**을 적용하며,
- **CI 검증 체계**를 붙이는 것이 가장 효율적이고 안정적인 운영 방식입니다.
