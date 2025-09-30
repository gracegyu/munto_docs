
# **vuetext - Vue.js Gettext Extractor**

## **개요**

vuetext는 Vue.js 애플리케이션의 국제화(i18n)를 위한 텍스트 추출 도구입니다. 기존 xgettext의 한계를 극복하고, Vue 컴포넌트의 모든 영역에서 번역이 필요한 텍스트를 정확하게 추출합니다.

## **배경 및 기존 도구의 한계**

Vue.js 애플리케이션의 국제화를 위해 다양한 텍스트 추출 도구를 시도했으나, 각 도구마다 여러 가지 한계점이 존재했습니다. 이러한 제한사항들이 vuetext 개발의 직접적인 동기가 되었습니다.

### **기존 시도했던 도구들과 문제점**

1. **GNU xgettext**
    - **문제점**:
        - Vue.js의 SFC(Single File Components) 파일 형식(.vue)을 이해하지 못함
        - JavaScript 템플릿 문법(`{{ t('메시지') }}`) 인식 불가
        - Vue 디렉티브 내부 번역 함수(`v-if="condition && t('메시지')"`) 추출 실패
        - HTML 태그 속성 내 번역 함수(`:title="t('제목')"`) 인식 불가
    - **한계**: 기본적으로 C, C++, PHP 등 전통적인 언어에 최적화되어 있으며, JavaScript 및 Vue.js의 현대적인 구문을 처리하는 데 한계가 있음
2. **easygettext**
    - **문제점**:
        - Vue 2에 최적화되어 있어 Vue 3 구문 일부 지원 불가
        - `<script setup>` 구문 인식 불가
        - Composition API 내부 번역 함수 호출 추출 실패
        - TypeScript 지원 미흡
        - 복잡한 표현식 내 번역 함수 호출 인식 불가
    - **한계**: Vue 3로의 마이그레이션과 TypeScript 도입 시 활용도가 크게 떨어짐
3. **vue-i18n-extract**
    - **문제점**:
        - gettext 형식(PO/POT)과의 호환성 부족
        - 특정 Vue-i18n 라이브러리에 강하게 의존
        - 커스텀 번역 함수 지원 미흡
        - 대규모 프로젝트에서 성능 이슈 발생
    - **한계**: Vue-i18n 프레임워크에 특화되어 있어 다른 번역 시스템과 통합이 어려움
4. **i18next-parser**
    - **문제점**:
        - Vue.js 템플릿 처리에 특화되지 않음
        - Vue 컴포넌트 구조 이해 부족
        - 템플릿과 스크립트 간 컨텍스트 전환 시 추적 불가
        - gettext 형식과의 호환성 문제
    - **한계**: React 등 다른 프레임워크에 더 적합하며 Vue.js의 특수성을 고려하지 않음
5. **babel-plugin-i18n**
    - **문제점**:
        - 빌드 타임에만 작동하여 개발 중 즉각적인 피드백 부족
        - Vue SFC 내 템플릿 영역 처리 불가
        - 복잡한 설정 필요
        - 개발 도구 통합이 어려움
    - **한계**: JavaScript 코드만 처리 가능하고 Vue 템플릿 처리가 불가능함
6. **manual-extraction**
    - **문제점**:
        - 시간 소모적이고 오류 발생 가능성 높음
        - 코드 변경 시 번역 관리 어려움
        - 일관성 유지 어려움
        - 개발자 간 협업 시 혼란 초래
    - **한계**: 프로젝트 규모가 커질수록 관리가 불가능해짐

### **결론**

위와 같은 기존 도구들의 한계로 인해, Vue.js 애플리케이션에 특화된 새로운 텍스트 추출 도구의 필요성이 대두되었습니다. vuetext는 이러한 한계를 극복하고 Vue.js의 모든 구성 요소에서 번역 가능한 문자열을 정확하게 추출하는 것을 목표로 개발되었습니다.

## **Input**

### **지원하는 파일 형식**

- `.vue` 파일 (Single File Components)
- `.js` 파일
- `.ts` 파일

### **추출 대상**

1. Template 영역
    - 태그 내부의 `t()` 함수 호출
    
    ```
    <template>
      <div>{{ t('Hello World') }}</div>
      <n-button>{{ t('Click me') }}</n-button>
      <n-modal :title="t('Confirm')" />
    </template>
    
    ```
    
2. Script 영역
    - 일반 `t()` 함수 호출
    - Computed 속성 내의 `t()` 함수 호출
    
    ```
    <script setup>
    const message = t('Welcome')
    const computedMessage = computed(() => t('Hello'))
    </script>
    
    ```
    

### **설정 옵션**

- 입력 디렉토리 지정
- 출력 파일 경로 지정
- 파일 패턴 설정 (예: glob 패턴)
- 무시할 파일/디렉토리 설정
- 함수명 설정 (기본값: 't')

## **기술적 제약사항**

vuetext는 다양한 Vue.js 코드 패턴에서 번역 문자열을 추출하지만, 현재 버전에서는 일부 복잡한 구문 처리에 제한이 있습니다. 이 제약사항은 Vue 컴포넌트의 복잡한 템플릿 표현식과 JavaScript/TypeScript의 고급 기능 사용에서 기인합니다.

### **템플릿 영역 제약사항**

1. **조건부 렌더링과 삼항 연산자**
    - 삼항 연산자 내부의 `t()` 함수 호출은 AST 파서에서 인식하지 못할 수 있습니다.
    - 제약 사항 예시:
        
        ```
        <template>
          <div>{{ isActive ? t('활성화됨') : t('비활성화됨') }}</div>
        </template>
        
        ```
        
    - 표현식이 중첩되거나 복잡해질수록 추출 정확도가 떨어집니다.
2. **줄 바꿈과 코드 형식화**
    - Prettier 등의 코드 형식화 도구에 의해 여러 줄로 분리된 `t()` 함수 호출은 정규식 파서가 인식하지 못할 수 있습니다.
    - 제약 사항 예시:
        
        ```
        <template>
          <div>{{ t('여러 줄에 걸친 메시지 텍스트') }}</div>
        </template>
        
        ```
        
3. **변수 대입 및 복합 표현식**
    - 복잡한 표현식 내에서의 번역 함수 호출은 AST 분석 과정에서 추출이 어려울 수 있습니다.
    - 제약 사항 예시:
        
        ```
        <template>
          <div>{{ formatMessage(t('메시지'), user.name) }}</div>
          <div>{{ getGreeting() + ' ' + t('환영합니다') }}</div>
        </template>
        
        ```
        
4. **템플릿 리터럴 형식의 메시지**
    - 중괄호를 포함하는 템플릿 문자열은 정규식 파서에서 정확히 추출하기 어려울 수 있습니다.
    - 제약 사항 예시:
        
        ```
        <template>
          <div>{{ t(`{count} 개의 항목이 선택됨`) }}</div>
          <div>{{ t('선택된 날짜: {start} ~ {end}') }}</div>
        </template>
        
        ```
        

### **스크립트 영역 제약사항**

1. **복잡한 함수 내 호출**
    - 깊게 중첩된 함수나 콜백 내부의 번역 함수 호출은 추출이 어려울 수 있습니다.
    - 제약 사항 예시:
        
        ```jsx
        const processData = (items) => {
          return items.map((item) => {
            return {
              ...item,
              label: item.isSpecial ? t('특별 항목') : t('일반 항목'),
            }
          })
        }
        
        ```
        
2. **동적 키 호출**
    - 변수나 표현식을 사용한 동적 번역 키는 정적 분석 시 추출할 수 없습니다.
    - 제약 사항 예시:
        
        ```jsx
        const key = isError ? 'error.message' : 'success.message'
        const message = t(key)
        
        ```
        
3. **비표준 호출 패턴**
    - 커스텀 래퍼 함수나 비표준 호출 패턴의 경우 추출이 제한될 수 있습니다.
    - 제약 사항 예시:
        
        ```jsx
        const translate = (msg, ...args) => t(msg, ...args)
        const message = translate('번역된 메시지')
        
        ```
        

### **해결책과 대안**

이러한 제약사항을 해결하기 위해 다음과 같은 기술적 접근 방법이 구현되어 있습니다:

1. **두 단계 파싱 전략**
    - AST 기반 파서와 정규식 기반 파서를 병행하여 정확도를 높입니다.
    - AST 파서에서 놓친 패턴을 정규식 파서로 보완합니다.
2. **휴리스틱 분석**
    - 복잡한 표현식에서 번역 함수 호출을 감지하기 위한 휴리스틱 알고리즘을 적용합니다.
    - 자주 사용되는 패턴에 대한 분석 규칙을 구현합니다.
3. **수동 보완 메커니즘**
    - 자동 추출이 어려운 메시지를 위한 수동 등록 메커니즘(`knownMissingMessages` 배열)을 제공합니다.
    - 추출이 어려운 메시지를 위한 별도의 마커 함수(`tMsg()` 등)를 지원합니다.
4. **코드 스타일 가이드**
    - 추출 도구가 잘 작동하는 코드 패턴을 권장합니다.
    - 복잡한 표현식을 계산된 속성으로 분리하거나 Prettier 설정을 조정하는 방법을 제안합니다.

## **Output**

### **생성 파일**

1. POT 파일 (템플릿)
    
    ```
    msgid ""
    msgstr ""
    "Project-Id-Version: PACKAGE VERSION\n"
    "Report-Msgid-Bugs-To: \n"
    "POT-Creation-Date: 2024-03-22 10:00+0900\n"
    "PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\n"
    "Last-Translator: FULL NAME <EMAIL@ADDRESS>\n"
    "Language-Team: LANGUAGE <LL@li.org>\n"
    "Language: \n"
    "MIME-Version: 1.0\n"
    "Content-Type: text/plain; charset=UTF-8\n"
    "Content-Transfer-Encoding: 8bit\n"
    
    #: src/components/Example.vue:5
    msgid "Hello World"
    msgstr ""
    
    #: src/components/Example.vue:6
    msgid "Click me"
    msgstr ""
    
    ```
    
2. JSON 파일 (선택적)
    
    ```json
    {
      "Hello World": "",
      "Click me": "",
      "Confirm": ""
    }
    
    ```
    

### **메타데이터**

- 파일 위치 정보
- 주석 (번역자를 위한 컨텍스트 정보)
- 복수형 정보 (해당하는 경우)

### **오류 처리**

- 중복된 메시지 ID 감지
- 문법 오류 보고
- 누락된 번역 감지

## **명령줄 인터페이스**

`vuetext` 도구는 GNU `xgettext`와 호환되는 명령줄 인터페이스를 제공합니다. 기본 사용법은 다음과 같습니다:

```
vuetext [option] [inputfile] ...

```

### **필수 옵션**

### **입력 파일 위치 관련 옵션**

- `inputfile ...`
    - 입력 파일 경로. 여러 파일을 지정할 수 있습니다.
- `f file`, `-files-from=file`
    - 입력 파일 목록이 포함된 파일 경로.
- `D directory`, `-directory=directory`
    - 입력 파일을 검색할 디렉토리 경로. 여러 디렉토리를 지정할 수 있습니다.

### **출력 파일 위치 관련 옵션**

- `d name`, `-default-domain=name`
    - 출력 파일명을 `name.po`로 지정 (기본값: `messages.po`).
- `o file`, `-output=file`
    - 출력 파일 경로를 지정 (기본값: `name.po` 또는 `messages.po`).
- `p dir`, `-output-dir=dir`
    - 출력 파일을 저장할 디렉토리 경로.

### **키워드 관련 옵션**

- `k[keywordspec]`, `-keyword[=keywordspec]`
    - 추출할 키워드 지정. 기본값은 `t`.
    - `keywordspec`의 형식:
        - `id`: 함수 `id`의 첫 번째 인자에서 문자열 추출
        - `id:argnum`: 함수 `id`의 `argnum`번째 인자에서 문자열 추출
        - `id:argnum1,argnum2`: 함수 `id`의 복수형 처리

### **주석 관련 옵션**

- `c[tag]`, `-add-comments[=tag]`
    - `tag`로 시작하는 주석 블록을 출력 파일에 포함. `tag` 없이 사용하면 모든 주석 블록을 포함.

### **출력 형식 관련 옵션**

- `-no-location`
    - 출력 파일에 `#: filename:line` 형식의 위치 정보를 포함하지 않음.
- `n`, `-add-location=type`
    - 위치 정보 포함 방식 지정:
        - `full`: 파일명과 줄 번호 모두 포함 (기본값)
        - `file`: 파일명만 포함
        - `never`: 위치 정보 미포함 (`-no-location`과 동일)
- `-strict`
    - 엄격한 Uniforum 표준을 준수하는 PO 파일 생성.
- `-properties-output`
    - Java ResourceBundle 형식의 `.properties` 파일 생성.
- `-json-output`
    - JSON 형식의 출력 파일 생성 (vuetext 전용 옵션).
- `-force-po`
    - 추출된 메시지가 없어도 출력 파일 생성.
- `i`, `-indent`
    - 출력 파일에 들여쓰기 적용.
- `w number`, `-width=number`
    - 출력 파일의 최대 줄 너비 지정.
- `-no-wrap`
    - 긴 메시지 줄을 여러 줄로 나누지 않음.
- `s`, `-sort-output`
    - 출력 내용을 메시지 ID 기준으로 정렬.
- `F`, `-sort-by-file`
    - 출력 내용을 파일 위치 기준으로 정렬.

### **프로젝트 정보 관련 옵션**

- `-package-name=package`
    - 출력 파일 헤더에 패키지 이름 지정.
- `-package-version=version`
    - 출력 파일 헤더에 패키지 버전 지정.
- `-msgid-bugs-address=email@address`
    - 번역 문제 보고를 위한 이메일 주소 지정.

### **Vue 관련 추가 옵션 (vuetext 전용)**

- `-vue-template-only`
    - Vue 파일의 템플릿 영역만 처리.
- `-vue-script-only`
    - Vue 파일의 스크립트 영역만 처리.
- `-extract-attributes`
    - HTML 태그의 속성값도 추출 (기본적으로 활성화).
- `-attributes=attr1,attr2,...`
    - 추출할 속성 이름 목록 지정 (기본값: `title,placeholder,label,aria-label`).

### **예제**

Vue.js 프로젝트에서 번역 문자열을 추출하는 예:

```bash
vuetext -o messages.pot \
        --add-comments=TRANSLATORS: \
        --keyword=t --keyword=i18n.t:1 \
        --directory=src \
        src/components/*.vue src/views/*.vue

```

Vue 컴포넌트와 JavaScript 파일에서 번역 문자열을 추출하는 예:

```bash
vuetext -o messages.pot \
        --files-from=filelist.txt \
        --output-dir=locales \
        --add-location=file \
        --json-output

```

## **향후 계획**

1. 복수형 지원
2. 컨텍스트 지원
3. 번역자 주석 지원
4. Vue Router i18n 지원
5. Pinia Store i18n 지원