- https://github.com/Munto-dev
- 전체적인 의견
    - 주석이 거의 없음. 주석을 작성하는 관행(습관)은 필요함. 특히,
        - 파일 상단의 개요 주석
        - 함수 설명(목적과 동작)
        - 복잡한 비즈니스 로직
        - 성능 관련 코드
        - API 통합 부분
        - 에러 처리 로직, 중요한 경고
    - README.md 비어있음
    - 테스트 코드 없음
- munto_app
    - FVM을 사용하지 않음
    - FVM을 사용하여 Flutter SDK 버전 관리를 하는 것이 좋음
    - main 브랜치 없이 develop 브랜치에서 작업 - 일반적이지 않음
- muto_web
    - README.md가 있었으면 좋겠음. 아래는 추가가 필요한 내용
        - 환경변수 설정 방법
        - 의존성 패키지 설치 및 실행 방법
        - Docker 이미지 빌드 방법
        - Docker 컨테이너 실행 방법
        - 프로젝트 구조
        - 분석도구 설정 방법 (다른 곳에 문서로 있다면 Link)
            - Google Analytics 설정 방법
            - Facebook Pixel 설정 방법
            - Firebase 이벤트 로깅 설정 방법
        - 배포 방법
            - 배포 환경 설정 방법
            - CI/CD 파이프라인 설명
            - 배포 전 체크리스트
    - 프로젝트 구조
        
        ```jsx
        프로젝트 구조:
        ├── pages/                 # 라우팅
        │   ├── _app.tsx           # 앱 진입점
        │   └── index.tsx          # 메인 페이지
        ├── components/            # 재사용 컴포넌트
        │   └── appbar/            # 상단 네비게이션
        ├── lib/                   # 유틸리티
        │   ├── gtag.ts            # Google Analytics
        │   ├── fmpixel.ts         # Facebook Pixel
        │   └── firebaseConfig.ts  # Firebase 설정
        ├── middleware.ts          # Next.js 미들웨어
        └── next.config.ts         # Next.js 설정
        ```
        
    - 질문
        - SSR 방식 사용? CSR과 하이브리드?
            - 양쪽의 장점을 이용하면 좋음
- PR 현황 분석 (Pull Request 코드 리뷰)
    - [MT/177] 회원가입 기능 구현 #264
        - 28개 커밋. 일반적이지 않게 아주 많은 커밋 포함
        - 리뷰를 누적하면서 업데이트 한듯
    - PR의 comment가 별로 없음
    - PR의 comment를 resolve하지 않음
    - 추후 Jira 이슈와 연동 필요