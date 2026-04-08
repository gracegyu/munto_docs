# Swagger

```yaml
openapi: 3.0.0
info:
  title: 체험단 (Trial) API
  version: 1.0.0
  description: |
    시간 필드는 Unix Timestamp (밀리초 단위)를 사용한다.
    페이지네이션은 커서 기반이며, count/before/after 파라미터를 사용한다.

tags:
  - name: Trial Product
  - name: Trial Ticket
  - name: Trial Recruitment
  - name: Trial Socialing
  - name: Trial Apply
  - name: Trial Attendance
  - name: Trial Review
  - name: Trial Member
  - name: Trial Admin

paths:
  /api/v1/trial/products:
    get:
      tags: [Trial Product]
      summary: 초대권 상품 목록 조회
      parameters:
        - name: recruitType
          in: query
          schema:
            type: string
            enum: [FIRST_COME, APPROVAL]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/TrialProduct'

  /api/v1/trial/tickets:
    get:
      tags: [Trial Ticket]
      summary: 초대권 구매 내역 조회
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: status
          in: query
          schema:
            type: string
            enum: [ACTIVE, EXHAUSTED, EXPIRED, REFUNDED]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialTicket'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Trial Ticket]
      summary: 초대권 구매
      description: Order.trialProductId에 구매한 상품 ID를 기록한다.
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [productId, bootpayReceiptId]
              properties:
                productId:
                  type: integer
                bootpayReceiptId:
                  type: string
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrialTicket'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/tickets/summary:
    get:
      tags: [Trial Ticket]
      summary: 초대권 보유 현황 요약
      description: 남은 체험단 초대권 카드 UI에 사용한다.
      security:
        - bearerAuth: []
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalRemaining:
                    type: integer
                    description: 총 잔여 초대권 수 (선착순 + 승인제 합산)
                  firstCome:
                    type: object
                    properties:
                      remaining:
                        type: integer
                        description: 선착순 잔여 수
                  approval:
                    type: object
                    properties:
                      remaining:
                        type: integer
                        description: 승인제 잔여 수
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/tickets/{ticketId}:
    get:
      tags: [Trial Ticket]
      summary: 초대권 상세 조회
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrialTicketDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/recruitments:
    get:
      tags: [Trial Recruitment]
      summary: 호스트 체험단 모집 목록 조회
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: status
          in: query
          schema:
            type: string
            enum: [OPEN, CLOSED]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialRecruitmentDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      tags: [Trial Recruitment]
      summary: 체험단 모집 생성
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [socialingId, ticketId, allocatedCount]
              properties:
                socialingId:
                  type: integer
                ticketId:
                  type: integer
                allocatedCount:
                  type: integer
                question:
                  type: string
                minAge:
                  type: integer
                  nullable: true
                maxAge:
                  type: integer
                  nullable: true
                maleMaxCount:
                  type: integer
                  nullable: true
                femaleMaxCount:
                  type: integer
                  nullable: true
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrialRecruitment'
        '400':
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                freeNotAllowed:
                  value: { code: 'TRIAL_FREE_NOT_ALLOWED', message: '유료 소셜링에만 체험단을 설정할 수 있습니다' }
                alreadyExists:
                  value: { code: 'TRIAL_ALREADY_EXISTS', message: '이미 체험단 모집이 설정된 소셜링입니다' }
                insufficientTickets:
                  value: { code: 'TRIAL_INSUFFICIENT_TICKETS', message: '초대권 잔여 수량이 부족합니다' }
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/recruitments/{recruitmentId}:
    get:
      tags: [Trial Recruitment]
      summary: 체험단 모집 상세 조회
      security:
        - bearerAuth: []
      parameters:
        - name: recruitmentId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrialRecruitmentDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      tags: [Trial Recruitment]
      summary: 체험단 모집 종료
      description: 모임 3일 전부터는 종료해도 초대권이 소진된다.
      security:
        - bearerAuth: []
      parameters:
        - name: recruitmentId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  ticketsConsumed:
                    type: boolean
                  returnedCount:
                    type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/socialings:
    get:
      tags: [Trial Socialing]
      summary: 체험단 소셜링 목록 조회
      description: 기본 정렬(munto 알고리즘). 별도 정렬 옵션 없음.
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: categoryId
          in: query
          schema:
            type: integer
        - name: regionId
          in: query
          schema:
            type: integer
        - name: startDate
          in: query
          schema:
            type: integer
            description: 시작 날짜 필터 (Unix ms)
        - name: endDate
          in: query
          schema:
            type: integer
            description: 종료 날짜 필터 (Unix ms)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialSocialingListItem'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/socialings/{socialingId}:
    get:
      tags: [Trial Socialing]
      summary: 체험단 소셜링 상세 조회 (웹뷰에서 호출)
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrialSocialingDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/eligible:
    get:
      tags: [Trial Socialing]
      summary: 체험단 대상 유저 여부 조회
      description: 가입 30일 이내 + 유료 모임 참여 0회
      security:
        - bearerAuth: []
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  eligible:
                    type: boolean
                  reason:
                    type: string
                    nullable: true
                    enum: [OVER_30_DAYS, HAS_PAID_PARTICIPATION]
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/socialings/{socialingId}/apply:
    post:
      tags: [Trial Apply]
      summary: 체험단 신청
      description:  SocialingMember를 grade=TRIAL로 생성
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [bootpayReceiptId]
              properties:
                bootpayReceiptId:
                  type: string
                recruitAnswer:
                  type: string
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  memberId:
                    type: integer
                  status:
                    type: string
                    enum: [APPROVE, REQUEST]
                  orderId:
                    type: integer
        '400':
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                notEligible:
                  value: { code: 'TRIAL_NOT_ELIGIBLE', message: '체험단 대상 조건을 충족하지 않습니다' }
                soldOut:
                  value: { code: 'TRIAL_SOLD_OUT', message: '체험단 모집이 마감되었습니다' }
                identityRequired:
                  value: { code: 'TRIAL_IDENTITY_REQUIRED', message: '본인인증이 필요합니다' }
                alreadyApplied:
                  value: { code: 'TRIAL_ALREADY_APPLIED', message: '이미 체험단에 신청하였습니다' }
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/socialings/{socialingId}/approve/{memberId}:
    post:
      tags: [Trial Apply]
      summary: 체험단 승인 (호스트)
      description: 초대권 1장 소진. 선정 후 취소 불가. 24시간 내 미선정 시 자동 취소.
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
        - name: memberId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  remainingTickets:
                    type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/socialings/{socialingId}/reject/{memberId}:
    post:
      tags: [Trial Apply]
      summary: 체험단 거절 (호스트)
      description: 거절 시 유저 결제 전액 환불.
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
        - name: memberId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/socialings/{socialingId}/attendance/{memberId}:
    post:
      tags: [Trial Attendance]
      summary: 참여 확인 (호스트)
      description: 참여 확인 후 유저가 리뷰 작성 가능.
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
        - name: memberId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/trial/socialings/{socialingId}/review:
    post:
      tags: [Trial Review]
      summary: 체험단 리뷰 작성
      description: 작성 즉시 80% 부분환불. 모임 종료 후 7일 이내.
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [content]
              properties:
                content:
                  type: string
                photos:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  reviewId:
                    type: integer
                  refundAmount:
                    type: integer
                  refundStatus:
                    type: string
                    enum: [REFUNDED]
        '400':
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                notAttended:
                  value: { code: 'TRIAL_NOT_ATTENDED', message: '참여 확인이 완료되지 않았습니다' }
                expired:
                  value: { code: 'TRIAL_REVIEW_EXPIRED', message: '리뷰 작성 기한(7일)이 초과되었습니다' }
                alreadyReviewed:
                  value: { code: 'TRIAL_ALREADY_REVIEWED', message: '이미 리뷰를 작성하였습니다' }
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/trial/socialings/{socialingId}/members:
    get:
      tags: [Trial Member]
      summary: 체험단 멤버 목록 조회 (호스트)
      security:
        - bearerAuth: []
      parameters:
        - name: socialingId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/TrialMember'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/admin/trial/tickets:
    get:
      tags: [Trial Admin]
      summary: 초대권 판매 내역 조회
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: hostId
          in: query
          schema:
            type: integer
        - name: status
          in: query
          schema:
            type: string
            enum: [ACTIVE, EXHAUSTED, EXPIRED, REFUNDED]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialTicketDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/admin/trial/tickets/{ticketId}/refund:
    post:
      tags: [Trial Admin]
      summary: 초대권 환불 처리
      security:
        - bearerAuth: []
      parameters:
        - name: ticketId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  refundAmount:
                    type: integer
                  refundRate:
                    type: number
        '400':
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                alreadyUsed:
                  value: { code: 'TRIAL_TICKET_ALREADY_USED', message: '사용이 시작된 초대권은 환불할 수 없습니다' }
                expired:
                  value: { code: 'TRIAL_TICKET_EXPIRED', message: '만료된 초대권은 환불할 수 없습니다' }
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/admin/trial/socialings:
    get:
      tags: [Trial Admin]
      summary: 체험단 모임 목록 관리
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: status
          in: query
          schema:
            type: string
            enum: [OPEN, CLOSED]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialRecruitmentDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/admin/trial/refunds:
    get:
      tags: [Trial Admin]
      summary: 환급 내역 조회
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/count'
        - $ref: '#/components/parameters/before'
        - $ref: '#/components/parameters/after'
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, REFUNDED, EXPIRED, NOT_ATTENDED, MANUAL_REFUNDED]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/CursorPaginationMeta'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/TrialRefundItem'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/admin/trial/refunds/{refundId}/manual:
    post:
      tags: [Trial Admin]
      summary: 수동 환급 처리
      security:
        - bearerAuth: []
      parameters:
        - name: refundId
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reason]
              properties:
                reason:
                  type: string
                amount:
                  type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  refundAmount:
                    type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    count:
      name: count
      in: query
      schema:
        type: integer
        default: 20
      description: 조회 건수 (기본값 20)
    before:
      name: before
      in: query
      schema:
        type: string
      description: 이전 페이지 커서
    after:
      name: after
      in: query
      schema:
        type: string
      description: 다음 페이지 커서

  responses:
    Unauthorized:
      description: 인증 실패
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Forbidden:
      description: 권한 없음
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: 리소스 없음
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    BadRequest:
      description: 잘못된 요청
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  schemas:
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string

    CursorPaginationMeta:
      type: object
      properties:
        meta:
          type: object
          properties:
            prevCursor:
              type: string
              nullable: true
            nextCursor:
              type: string
              nullable: true

    TrialProduct:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        quantity:
          type: integer
        price:
          type: integer
        listPrice:
          type: integer
          nullable: true
        recruitType:
          type: string
          enum: [FIRST_COME, APPROVAL]

    TrialTicket:
      type: object
      properties:
        id:
          type: integer
        productId:
          type: integer
        recruitType:
          type: string
          enum: [FIRST_COME, APPROVAL]
        totalCount:
          type: integer
        usedCount:
          type: integer
        returnedCount:
          type: integer
        remainingCount:
          type: integer
        expiredAt:
          type: integer
          description: 만료일 (Unix ms)
        status:
          type: string
          enum: [ACTIVE, EXHAUSTED, EXPIRED, REFUNDED]
        createdAt:
          type: integer
          description: 구매일 (Unix ms)

    TrialTicketDetail:
      allOf:
        - $ref: '#/components/schemas/TrialTicket'
        - type: object
          properties:
            product:
              $ref: '#/components/schemas/TrialProduct'
            recruitments:
              type: array
              items:
                $ref: '#/components/schemas/TrialRecruitment'

    TrialRecruitment:
      type: object
      properties:
        id:
          type: integer
        socialingId:
          type: integer
        ticketId:
          type: integer
        recruitType:
          type: string
          enum: [FIRST_COME, APPROVAL]
        allocatedCount:
          type: integer
        usedCount:
          type: integer
        status:
          type: string
          enum: [OPEN, CLOSED]
        createdAt:
          type: integer
          description: Unix ms

    TrialRecruitmentDetail:
      allOf:
        - $ref: '#/components/schemas/TrialRecruitment'
        - type: object
          properties:
            socialing:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string
                startDate:
                  type: integer
                  description: Unix ms
                price:
                  type: integer
            host:
              type: object
              properties:
                id:
                  type: integer
                nickname:
                  type: string

    TrialSocialingListItem:
      type: object
      properties:
        socialingId:
          type: integer
        name:
          type: string
        startDate:
          type: integer
          description: Unix ms
        price:
          type: integer
        refundAmount:
          type: integer
        location:
          type: string
        categoryName:
          type: string
        coverImage:
          type: string
        hostNickname:
          type: string
        remainingSlots:
          type: integer

    TrialSocialingDetail:
      allOf:
        - $ref: '#/components/schemas/TrialSocialingListItem'
        - type: object
          properties:
            introduce:
              type: string
            recruitType:
              type: string
              enum: [FIRST_COME, APPROVAL]
            question:
              type: string
              nullable: true
            maxPerson:
              type: integer
            currentMemberCount:
              type: integer
            trialMemberCount:
              type: integer
            hostProfile:
              type: object
              properties:
                id:
                  type: integer
                nickname:
                  type: string
                profileImage:
                  type: string
            refundPolicy:
              type: string

    TrialMember:
      type: object
      properties:
        memberId:
          type: integer
        userId:
          type: integer
        nickname:
          type: string
        profileImage:
          type: string
        status:
          type: string
          enum: [REQUEST, APPROVE, REJECT, CANCEL]
        attended:
          type: boolean
        reviewed:
          type: boolean
        refundStatus:
          type: string
          enum: [PENDING, REFUNDED, EXPIRED, NOT_ATTENDED]
          nullable: true
        appliedAt:
          type: integer
          description: Unix ms
        recruitAnswer:
          type: string
          nullable: true

    TrialRefundItem:
      type: object
      properties:
        id:
          type: integer
        userId:
          type: integer
        nickname:
          type: string
        socialingId:
          type: integer
        socialingName:
          type: string
        orderPrice:
          type: integer
        refundAmount:
          type: integer
        status:
          type: string
          enum: [PENDING, REFUNDED, EXPIRED, NOT_ATTENDED, MANUAL_REFUNDED]
        refundedAt:
          type: integer
          nullable: true
          description: Unix ms
        createdAt:
          type: integer
          description: Unix ms

```