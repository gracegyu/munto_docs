```yaml
openapi: 3.0.3
info:
  title: 데이팅 알고리즘 v2 API
  description: |
    데이팅 노출 알고리즘 SRS v2의 4.4.2~4.4.3 API 상세 스키마.
    기존 API는 내부 점수 산출 로직만 변경되며 인터페이스는 유지된다.
  version: 2.0.0

servers:
  - url: https://api.dating.munto.kr
    description: Production
  - url: http://localhost:3000
    description: Development

tags:
  - name: Matching
    description: 매칭 관련 API
  - name: Recommendation
    description: 추천/발견 카드 조회
  - name: Profile
    description: 프로필 조회
  - name: Safety
    description: 신고/차단

paths:
  /matching/impression:
    post:
      tags: [Matching]
      summary: 카드 조회 확인 (impression)
      description: |
        클라이언트가 추천/발견 카드를 실제로 화면에 표시했음을 서버에 알린다.
        WEBB-1143으로 구현 완료.

        **호출 시점:**
        - 추천/발견 탭에서 카드가 유저 뷰포트에 표시된 시점
        - 프로필 상세 페이지 진입 시점

        **중복 처리:**
        - 동일 대상 중복 호출 시에도 모두 DB 적재
        - 알고리즘 집계 시 유니크 기준: viewerId + targetUserId + DATE(createdAt)

        **알고리즘 활용:**
        - 노출 카운팅 기준 (SRS 7.7)
        - 빠른 패스 감지: crush.createdAt - impression.createdAt ≤ 3초 (SRS 7.4.3)
        - 중복 제외 기준: impression 기록 있는 유저 영구 제외 (SRS 7.5.5)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ImpressionRequest'
            example:
              targetUserId: 12345
      responses:
        '201':
          description: impression 기록 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ImpressionResponse'
              example:
                id: 98765
                viewerId: 11111
                targetUserId: 12345
                createdAt: "2026-03-27T08:00:00.000Z"
        '400':
          description: 잘못된 요청
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                statusCode: 400
                error: "INVALID_TARGET_USER"
                message: "targetUserId가 유효하지 않습니다"
        '401':
          description: 인증 실패
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                statusCode: 401
                error: "UNAUTHORIZED"
                message: "인증 토큰이 없거나 만료되었습니다"
        '404':
          description: 유저 없음
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                statusCode: 404
                error: "USER_NOT_FOUND"
                message: "targetUserId에 해당하는 유저를 찾을 수 없습니다"

  /recommendation:
    get:
      tags: [Recommendation]
      summary: 추천 카드 조회
      description: |
        현재 사이클의 추천 카드 4명을 조회한다.

        **v2 내부 변경 (API 영향 없음):**
        - 기존: RecommendationQueue 테이블에서 조회
        - v2: CycleQueue 테이블에서 tabType = RECOMMENDATION 조회
      security:
        - bearerAuth: []
      responses:
        '200':
          description: 추천 카드 목록
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CardListResponse'
              example:
                cards:
                  - userId: 12345
                    nickname: "닉네임"
                    age: 27
                    photos: ["https://cdn.munto.kr/photo1.jpg"]
                    education: "UNIVERSITY"
                    job: "개발자"
                    height: 175
                    mbti: "ENFP"
                    introduction: "안녕하세요"
                    keywords: ["여행", "독서"]
                    interests: ["카페", "영화"]
                cycleNumber: 2
                expiresAt: "2026-03-27T16:00:00.000Z"
        '401':
          $ref: '#/components/responses/Unauthorized'

  /explore:
    get:
      tags: [Recommendation]
      summary: 발견 카드 조회
      description: |
        현재 사이클의 발견 카드 4명을 조회한다.

        **v2 내부 변경 (API 영향 없음):**
        - 기존: ExploreQueue 테이블에서 조회 (누적 방식)
        - v2: CycleQueue 테이블에서 tabType = DISCOVERY 조회 (대체 방식)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: 발견 카드 목록
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CardListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /matching/crush:
    post:
      tags: [Matching]
      summary: 호감 표현 (LIKE / SUPER_LIKE / DISLIKE)
      description: |
        대상 유저에게 호감을 표현한다. DISLIKE = 패스.

        **알고리즘 활용:**
        - LIKE (가중치 0.5): 긍정 인터랙션 → k, n 모두 증가
        - SUPER_LIKE (가중치 1.0): 긍정 인터랙션 → k, n 모두 증가
        - DISLIKE (가중치 0.1): 부정 인터랙션 → n만 증가
        - 빠른 패스 판정: DISLIKE.createdAt - impression.createdAt ≤ 3초 (SRS 7.4.3)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CrushRequest'
            example:
              targetUserId: 12345
              expressionType: "LIKE"
      responses:
        '201':
          description: 호감 표현 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CrushResponse'
              example:
                id: 55555
                userId: 11111
                targetUserId: 12345
                expressionType: "LIKE"
                createdAt: "2026-03-27T08:00:03.000Z"
        '400':
          description: 잘못된 요청
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                invalidTarget:
                  summary: 유효하지 않은 대상
                  value:
                    statusCode: 400
                    error: "INVALID_TARGET_USER"
                    message: "targetUserId가 유효하지 않습니다"
                invalidType:
                  summary: 유효하지 않은 표현 유형
                  value:
                    statusCode: 400
                    error: "INVALID_EXPRESSION_TYPE"
                    message: "expressionType은 LIKE, SUPER_LIKE, DISLIKE 중 하나여야 합니다"
                alreadyExpressed:
                  summary: 이미 표현함
                  value:
                    statusCode: 400
                    error: "ALREADY_EXPRESSED"
                    message: "이미 호감을 표현한 유저입니다"
        '401':
          $ref: '#/components/responses/Unauthorized'

  /profile/{userId}:
    get:
      tags: [Profile]
      summary: 프로필 상세 조회
      description: |
        대상 유저의 프로필 상세를 조회한다.

        **알고리즘 활용:**
        - 프로필 조회 = 긍정 인터랙션 (가중치 0.2)
      security:
        - bearerAuth: []
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: integer
          description: 조회 대상 유저 ID
      responses:
        '200':
          description: 프로필 상세
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProfileResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          description: 유저 없음
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /safety/report:
    post:
      tags: [Safety]
      summary: 유저 신고
      description: |
        대상 유저를 신고한다.

        **알고리즘 활용:**
        - 부정 시그널 — 즉시 노출 제한 (restrictionTrigger = REPORT)
        - 프로필 변경으로 해제 불가, 운영팀 수동 해제만 가능 (SRS 7.4.4)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReportRequest'
            example:
              targetUserId: 12345
              reason: "INAPPROPRIATE_PHOTO"
              description: "부적절한 사진입니다"
      responses:
        '201':
          description: 신고 접수 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /safety/block-user:
    post:
      tags: [Safety]
      summary: 유저 차단
      description: |
        대상 유저를 차단한다. 양방향 제외 (내가 차단한 사람 + 나를 차단한 사람).

        **알고리즘 활용:**
        - 부정 시그널 — 즉시 노출 제한 (restrictionTrigger = REPORT)
        - 프로필 변경으로 해제 불가, 운영팀 수동 해제만 가능 (SRS 7.4.4)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockRequest'
            example:
              targetUserId: 12345
      responses:
        '201':
          description: 차단 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: 문토 액세스 토큰

  responses:
    Unauthorized:
      description: 인증 실패
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            statusCode: 401
            error: "UNAUTHORIZED"
            message: "인증 토큰이 없거나 만료되었습니다"

  schemas:
    ErrorResponse:
      type: object
      required: [statusCode, error, message]
      properties:
        statusCode:
          type: integer
          description: HTTP 상태 코드
        error:
          type: string
          description: 에러 코드
        message:
          type: string
          description: 에러 메시지

    ImpressionRequest:
      type: object
      required: [targetUserId]
      properties:
        targetUserId:
          type: integer
          description: 노출된 상대방 유저 ID

    ImpressionResponse:
      type: object
      properties:
        id:
          type: integer
          description: impression 레코드 ID
        viewerId:
          type: integer
          description: 뷰어 유저 ID (토큰에서 추출)
        targetUserId:
          type: integer
          description: 대상 유저 ID
        createdAt:
          type: string
          format: date-time
          description: 서버 수신 시각

    CardListResponse:
      type: object
      properties:
        cards:
          type: array
          items:
            $ref: '#/components/schemas/CardItem'
          description: 카드 목록 (최대 4명)
        cycleNumber:
          type: integer
          description: 당일 사이클 번호 (1/2/3)
        expiresAt:
          type: string
          format: date-time
          description: 현재 사이클 만료 시각

    CardItem:
      type: object
      properties:
        userId:
          type: integer
        nickname:
          type: string
        age:
          type: integer
        photos:
          type: array
          items:
            type: string
            format: uri
        education:
          type: string
          enum: [HIGH_SCHOOL, COLLEGE, UNIVERSITY, GRADUATE, OTHER]
        job:
          type: string
        height:
          type: integer
        mbti:
          type: string
          enum: [ENFP, ENFJ, ENTP, ENTJ, ESFP, ESFJ, ESTP, ESTJ, INFP, INFJ, INTP, INTJ, ISFP, ISFJ, ISTP, ISTJ]
        introduction:
          type: string
          nullable: true
        keywords:
          type: array
          items:
            type: string
        interests:
          type: array
          items:
            type: string

    CrushRequest:
      type: object
      required: [targetUserId, expressionType]
      properties:
        targetUserId:
          type: integer
          description: 대상 유저 ID
        expressionType:
          type: string
          enum: [LIKE, SUPER_LIKE, DISLIKE]
          description: 호감 표현 유형

    CrushResponse:
      type: object
      properties:
        id:
          type: integer
          description: crush expression 레코드 ID
        userId:
          type: integer
          description: 뷰어 유저 ID
        targetUserId:
          type: integer
          description: 대상 유저 ID
        expressionType:
          type: string
          enum: [LIKE, SUPER_LIKE, DISLIKE]
        createdAt:
          type: string
          format: date-time

    ProfileResponse:
      type: object
      properties:
        userId:
          type: integer
        nickname:
          type: string
        age:
          type: integer
        height:
          type: integer
        education:
          type: string
        schoolName:
          type: string
          nullable: true
        religion:
          type: string
        drinking:
          type: string
        smoking:
          type: string
        mbti:
          type: string
        togetherActivity:
          type: string
        job:
          type: string
        introduction:
          type: string
          nullable: true
        photos:
          type: array
          items:
            type: string
            format: uri
        keywords:
          type: array
          items:
            type: string
        interests:
          type: array
          items:
            type: string

    ReportRequest:
      type: object
      required: [targetUserId, reason]
      properties:
        targetUserId:
          type: integer
          description: 신고 대상 유저 ID
        reason:
          type: string
          enum: [INAPPROPRIATE_PHOTO, SPAM, HARASSMENT, FAKE_PROFILE, OTHER]
          description: 신고 사유
        description:
          type: string
          nullable: true
          description: 상세 설명

    ReportResponse:
      type: object
      properties:
        id:
          type: integer
        reporterId:
          type: integer
        targetUserId:
          type: integer
        reason:
          type: string
        createdAt:
          type: string
          format: date-time

    BlockRequest:
      type: object
      required: [targetUserId]
      properties:
        targetUserId:
          type: integer
          description: 차단 대상 유저 ID

    BlockResponse:
      type: object
      properties:
        id:
          type: integer
        userId:
          type: integer
        targetUserId:
          type: integer
        createdAt:
          type: string
          format: date-time

```