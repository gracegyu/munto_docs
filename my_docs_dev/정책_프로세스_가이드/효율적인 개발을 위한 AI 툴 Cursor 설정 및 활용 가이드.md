# 효율적인 개발을 위한 AI 툴 Cursor 설정 및 활용 가이드

# 배경

- Cursor를 제대로 설정해야 AI 엔진을 이용하여 개발 효율을 극대화 할 수 있다.
- Cursor 설정을 통일화 하여 프로젝트에 적용한다.

# 스펙 문서를 프로젝트에 포함하기

- 스펙 문서를 AI가 이해하기 쉬운 형태로 작성하여

# Cursor 활용 Process

## 스펙 단계

- Notion으로 초기 아이디어 수집
- SRS 초안을 Notion으로 작성
- srs.md로 변경하여 프로젝트 폴더에 포함
- Cursor를 이용해서 [srs.md](http://srs.md) 검증, 보강, 완성

## 설계 단계

- srs.md를 토대로 Cursor를 이용해서 ERD 작성하여 erd.dbml파일을 프로젝트 폴더에 포함
- srs.md와 erd.dbml을 토대로 Cursor를 이용해서 Swagger를 작성하다.
- Swagger는 api.yaml로 저장하여 프로젝트 폴더에 포함
- 이제 모든 요청에 srs.md, erd.dbml, api.yaml를 포함한다.

## 구현 단계

- srs.md, erd.dbml, api.yaml을 바탕으로 Backend를 AI와 같이 개발한다.
  - 개발하면서 바뀐 내용은 즉시 문서에 반영한다.
- srs.md, api.yaml을 바탕으로 Frontend를 AI와 같이 개발한다.

# 추천 워크플로우

1. 새 기능 요청, 기획
2. 요구사항 분석 → SRS 또는 Onepager
3. DB 스키마 → DBML
4. API 설계 → Swagger
5. Backend 구현

| 단계           | Input                   | Output             | AI 활용 여부 | AI 툴           |
| -------------- | ----------------------- | ------------------ | ------------ | --------------- |
| 기획           | Biz 요구사항, 아이디어  | 기획문서           | 일부         | ChatGPT, Claude |
| 분석 초안      | 기획문서, 아이디어      | SRS(노션)          | 일부         |                 |
| 분석, 설계     | 기획문서, 아이디어, SRS | SRS(md)            | 활용         | Cursor          |
| 분석, 설계     | SRS                     | DBML(DBML)         | 활용         | Cursor          |
| 분석, 설계     | SRS, DBML               | Swagger            | 활용         | Cursor          |
|                |                         |                    |              |                 |
| Backend 구현   | SRS, DBML, Swagger      | Backend 구현       | 활용         | Cursor          |
| unit test 구현 | SRS, DBML, Swagger      | Backend Unit test  | 활용         | Cursor          |
| Frontend 구현  | SRS, Swagger, Figma     | Frontend 구현      | 활용         | Cursor          |
| unit test 구현 | SRS, Swagger, Figma     | Frontend Unit test | 활용         | Cursor          |
|                |                         |                    |              |                 |

# Rule 설정 사례

## 사용자 규칙 (모든 프로젝트 적용)

모든 응답은 반드시 한국어로 작성해야 합니다.

코드 작성 시 처음부터 필요한 주석을 적절히 추가해야 합니다. 특히, 함수 주석은 필수이며, 함수의 역할, 매개변수, 반환값 등을 명확하게 설명해야 합니다.

코드를 수정할 때 요청된 사항만 변경하고, 요청하지 않은 부분은 임의로 수정하지 않습니다. AI가 우연히 발견한 개선 사항이 있어도 사용자의 명확한 요청 없이 변경하지 않습니다. 코드 스타일이나 구조를 바꾸지 않고, 기존 컨벤션을 존중합니다.

기존 로직을 변경하기 전에 반드시 이유를 분석하고, 필요하면 적절한 주석을 추가합니다.

기본적으로 AI는 코드를 임의로 재구성하지 않고, 주어진 요구 사항 내에서만 수정합니다.

소스코드를 수정하더라도 직접 commit 하지는 말아줘. 내가 확인 후 커밋할 거야.

그리고 지시사항 까지만 수행하고 내용을 유추하여 다음 작업을 마음대로 시행하지 말고, 꼭 진행해야 하는 작업은 나에게게 꼭 물어보고 해줘.

## 프로젝트 규칙

각 규칙마다 적용 방법을 지정할 수 있다.

- Always를 지정하면 모든 요청에 적용된다.

### 주석 관련

```markdown
새로운 파일을 생성할 때는 반드시 파일 헤더 주석을 추가해야 합니다. 파일 헤더에는 @file, @description, @author, @copyright, @license, @since 정보를 포함하며, 기본 형식은 아래와 같습니다.

js, ts 파일에는 아래와 같은 형식으로 파일 헤더 주석을 추가합니다.

/\*\*

- @file swagger.ts
- @description Swagger API documentatnd setup
- @author Jeon Gyuhyeon <gracegyu@gmail.com>
- @copyright 2025 Jeon Gyuhyeon. All rights reserved.
- @license Proprietary and confidential
- @since 2025.01.01
-
- This source code is licensed under the Jeon Gyuhyeon license
- that can be found in the LICENSE file. \*/

vue 파일은 아래와 같은 형식으로 파일 헤더 주석을 추가합니다.

 <!--
  @file swagger.vue
  @description Swagger API documentatnd setup
  @author Jeon Gyuhyeon <gracegyu@gmail.com>
  @copyright 2025 Jeon Gyuhyeon. All rights reserved.
  @license Proprietary and confidential
  @since 2025.01.01
 
  This source code is licensed under the Jeon Gyuhyeon license
  that can be found in the LICENSE file.
-->
```

### 일반

```markdown
- 프로젝트의 스펙은 /docs/srs.md 를 참고해
- backend API스펙은 /docs/api.yaml 을 참고해
- 이미 구현된 API의 스펙은 http://localhost:3000/api 를 참고해
- database 구조가 궁금하면 /docs/erd.dbml 을 참고해

- frontend 개발할 때 /src/common에는 공통 모듈이 있어. 이 내용과 같은 코드를 다른곳에서 또 정의하지 말고 이걸 참조해서 써야해.
- frontend 개발할 때 /src/components/common에 공통 컴포넌트가 있어. 이 내용과 같은 코드를 다른곳에서 또 정의하지 말고 이걸 참조해서 써야해.
```

### 명령어 실행

```markdown
- 이 프로젝트에서 서버를 실행할 때는 절대로 npm run start:dev 또는 다른 명령어를 사용하지 말고 오직 pnpm start:local만 사용해야 합니다.
- 백엔드, 프론트엔드, y-websocket을 모두 한꺼번에 실행하는 유일한 방법은 pnpm start:local입니다.
- 백엔드는 cd ~/Documents/Git/abc-wbs/backend && pnpm start:local로 실행해야 합니다.
- 프론트엔드는 cd ~/Documents/Git/abc-wbs/frontend && pnpm start:local로 실행해야 합니다.
- y-websocket는 cd ~/Documents/Git/abc-wbs/y-websocket && pnpm start:local로 실행해야 합니다.
- 어떤 상황에서도 npm run start:dev 명령어를 제안하거나 사용하면 안 됩니다.
```

### 프로그램 가이드

```markdown
- frontend 개발시 데이터를 조회할 때는 /src/store를 이용하고, 여기에 캐싱되지 않은 데이터는 backend에 API를 호출한다.
- frontend 개발시 backend에 API 호출 코드는 /src/api에 작성하고 참조해야한다. 또한 기존에 구현된 API를 최대한 이용한다.
- frontend 개발시 backend 호출 API는 /doc/api.yaml을 참조한다.
```

### 국제화

```markdown
vue 파일에서 화면에 메시지를 표시할려고 할 때는 꼭 t() 함수를 쓰고, t()함수 안에 영어로 적어줘. 디버깅을 위한 console 함수에는 적용할 필요가 없어 < > 이런 태그 안에는 t() 함수를 직접 입력하지 말고 computed에 t() 메시지를 넣어서 참고해야 해.

기존에 한국어로 되어 있는 메시지를 t(영어)로 만들 때는 /locales/en.po, /locales/ko.po에 각각 메시지를 기존에 저장이 안되어 있으면 저장하면돼. /src/locales의 \*.json 파일에는 저장하지마.
```

# AI 모델 선택

- 거의 모든 경우 Claude-3.7-Sonnet이 가장 좋음
- 특별한 경우 다른 AI 모델로 시도

# Yolo 모두 활용

- YOLO 모드는 ‘빠르게 해보자’라는 철학에 따라 생성된 **자동 수정/삽입 모드**입니다.
- YOLO 모드란?
  - 커서가 **사용자에게 물어보지 않고 즉시 수정**을 수행
  - 빠른 프로토타이핑과 실험적 기능 추가에 적합
- YOLO 모드 사용 시 주의사항
  - 반드시 Git 스테이지 전에 결과 확인
  - 신뢰할 수 없는 로직은 직접 검토 후 테스트
  - 전체 흐름을 바꾸는 작업(Yolo Refactor)은 `git diff` 확인 필수

# MCP 이용

- 추천 MCP서버
  - Browser tools
  - Figma
- 자체 개발 MCP서버

# Unit test 이용하기

- Cursor를 이용해서 유닛테스트를 제작하면 시스템을 훨씬 안정적으로 유지할 수 있다.
-
