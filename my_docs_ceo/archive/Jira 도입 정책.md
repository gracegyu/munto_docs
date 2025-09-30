# 현황 분석

- 현재 사용법
    - 프로젝트
        - 🌑 Munto App : 사용 중단
        - 🌑 Munto BE : 사용 중단
        - ❌ Munto Design : 빈 프로젝트
        - 🌕 Munto 개발팀 : 사용중
            - WBS와 중복해서 의미 없이 관리하는 듯
        - 🌑 Munto Team : 사용 중단
        - 🌑 문토01 : 사용 중단
    - 사용법
        - 제목 수준으로 간단히 관리
        - 칸반 보드로 관리함
        - 제대로 관리하지 않음
- AS-IS
    - Slack, Notion으로 일부 개발 요청이 분산되어 있다.
    - 업무의 가시성이 낮고, 요청 사항 추적이 어렵다.
- TO-BE
    - 모든 개발 요청 및 회사의 모든 Issue를 Jira로 통합하여 효율적인 업무 흐름을 구축하고 생산성을 향상시킨다.
    - WBS vs. Jira
        - 프로젝트는 WBS로 관리
        - 이슈는 Jria로 관리
    - 기존 프로젝트 모두 정리하고 새로 도입
        - 서비스 별
            - Web
            - App
        - Component로 구분
            - Backend, Frontend
    - Classic workflow를 사용한다.
        - 이슈 상태의 세심한 관리
        - 원하면 Kanban view로 볼 수도 있다.
- 이슈란 추적이 필요한 작업 단위
    - 개발 요청 (버그, 기능추가)
    - 운영 지원 (고객 문의, 시스템 장애)
    - 내부 업무 (인사, 재무, 마케팅)
    - 기능 추가 아이디어
    - 기술 검토 항목
- 이슈가 아닌 것들은?
    - 주간 업무 보고
    - 고객 활동 보고소
    - 회의록
        - 회의 결과로 인해 이슈가 생성될 수 있다.
    - 참고용 문서
- 왜 Issue가 추적되어야 하는가?
    - 업무 요청이 제대로 추적되지 않으면 다음과 같은 문제가 발생함:
        - 업무 요청이 누락될 가능성이 있음
            - Slack에서 이루어진 요청이 기록되지 않거나 담당자가 배정되지 않으면 해결되지 않을 수 있음.
        - 진행 상황을 파악하기 어려움
            - 업무 요청이 어디까지 진행되었는지, 어떤 문제가 있는지 명확하지 않음.
        - 우선순위가 불명확함
            - 여러 요청이 동시에 들어오면 어떤 작업을 먼저 해야 하는지 결정하기 어려움.
        - 책임 소재가 불명확함
            - 누가 어떤 업무를 담당하고 있는지, 일정이 어떻게 조정되는지 관리가 어려움.
    - Jira를 사용하면 각 Issue가 언제 생성되었고, 누가 담당하고 있으며, 현재 어떤 상태인지 추적할 수 있어 업무 진행의 가시성이 크게 향상됨.
- 도입 로드맵
    - 1차. 모든 개발자/UI/CS 에서 사용한다.
        - 개발에 대한 요청 관리
    - 2차. 전 직원이 사용한다. (가능하면 빨리)
        - 개발에 대한 요청 관리
    - 3차. 모든 Issue는 Jira로 관리한다.
        - Jira의 필요성, 편리성을 충분히 공감하면, 개발 요청 외에도 모든 업무 이슈를 Jira로 관리한다.
- 계획
    - Jira 설정 수정
    - 개발자, CS, UI 대상 Jira 사용 교육: 1시간 (2/28 예정)
    - 추후 전직원 대상 Jira 사용 교육: 1시간 (추후 확정)
    - Jira 사용을 계속 모니터링하면서 코치
- [Pricing](https://www.atlassian.com/ko/software/jira/pricing)
    - 10명까지 무료
    - 10명을 초과하면 $8.6 / 인원*월
    - 예)
        - 11명 : $94.6 / 월 = 135,000원
        - 20명 : $172 / 월 = 270,000원

# Jira 구축 방안

## 프로젝트/컴포넌트 구분

- Munto App(Flutter)
    - 인증 (Authentication)
    - 프로필 (Profile)
    - 소셜링 (Socialing)
    - 클럽 (Club)
    - 채팅 (Chat)
    - 피드 (Feed)
    - 결제 (Payment)
    - 알림 (Notification)
    - 미디어 (Media)
    - 설정 (Settings)
    - …
- Munto Web Frontend
    - 메인 화면
    - 소셜링
    - 클럽
    - 챌린지
    - 라운지
    - 장소
    - 회원
    - 주말 추천
    - 공통 UI
    - 인증
    - …
- Munto Web Backend
    - 인증
    - Database
    - 푸시 알림
    - …
- 사업·운영
- 기획·디자인
- 마케팅
- CX팀

## Version 관리

- Munto App(Flutter) 프로젝트는 버전 관리가 필요하다.
- 

## Workflow

- Classic workflow vs. Modern workflow
    - classic workflow는
        - resolved와 closed가 구분된다.
        - 담당자가 일을 마쳤어도, Reporter가 확인을 해야 closed 된다.
        - 개발자는 버그를 수정했어도 test를 완료해야 closed 된다.
- Classic workflow로 통일한다.

## 이슈 Type

- 버그
- 새기능
- 개선
- 작업
- 하위작업
- 에픽, 스토리는 WBS로 대체한다.
    - 

## Report Form

- 자유로운 입력 vs. 규격화된 폼 사용
- 프로젝트에 따라서 폼을 다르게 할 수 있다.

| Item | Contents |
| --- | --- |
| Background |  |
| Purpose |  |
| Process(including request items) |  |
| Considerable factors |  |
| Resulting Image |  |

## Dashboard

- 역할별 표준 Dashboard를 제작하여 제공한다.

## TODO

- Github과 연동하기