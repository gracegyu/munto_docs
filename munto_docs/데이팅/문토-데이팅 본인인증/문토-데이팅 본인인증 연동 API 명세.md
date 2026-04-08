# 문토-데이팅 본인인증 연동 API 명세

```jsx
# 문토–데이팅 본인인증 연동 API 

info:
  title: Munto–Dating Identity Snapshot APIs
  version: 0.2.1
  description: |
    본인인증 완료 후 DB에 저장된 스냅샷을 서버 간에 전달하기 위한 조회 계약.
    - ① 연동 DB=데이팅: 데이팅 BE → 문토 `GET .../personal-authentication` (Bearer JWT)
    - ② 연동 DB=문토: 문토 BE → 데이팅 `GET .../internal/.../{datingUserId}` (M2M, datingUserId는 문토 서버가 연동으로 확정)

tags:
  - name: MuntoIdentity
    description: 문토 사용자 본인인증 스냅샷
  - name: DatingIdentityInternal
    description: 데이팅 Internal (M2M 전용)

paths:
  /v3/user/me/personal-authentication:
    get:
      tags: [MuntoIdentity]
      summary: Munto 본인인증 스냅샷 조회
      description: |
        JWT의 subject(문토 userId)에 연결된 PersonalAuthentication 레코드를 조회한다.
        데이팅 백엔드는 임베드 가입 플로우에서 클라이언트가 전달한 Munto 액세스 토큰을
        Authorization 헤더에 그대로 실어 이 API를 호출한다. 
      security:
        - bearerAuth: []
      responses:
        '200':
          description: |
            verified가 true면 인증 완료 사용자. false면 200으로 내릴 수 있음(팀 정책에 따라 404 대체).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonalAuthSnapshot'
              examples:
                verified:
                  value:
                    schemaVersion: 1
                    verified: true
                    hashedCI: "base64EncodedSha256=="
                    name: "홍길동"
                    birth: "19910101"
                    gender: 1
                notVerified:
                  value:
                    schemaVersion: 1
                    verified: false
        '401':
          description: JWT 없음·만료·서명 불일치
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorBody'
        '404':
          description: 미인증 사용자 또는 PersonalAuthentication 미존재(404 정책 채택 시)
        '429':
          description: 레이트 리밋

  /internal/identity-verification/users/{datingUserId}:
    get:
      tags: [DatingIdentityInternal]
      summary: 데이팅 본인인증 스냅샷 조회 (Internal 전용)
      description: |
        datingUserId에 대해 User 및 IdentityVerification에서 스냅샷을 구성한다.
        공인 인터넷에 노출하지 않고, VPC·방화벽·M2M 키로만 접근한다.
        datingUserId는 문토 OAuth 코드 교환 등으로 **서버가 확정한 값**만 허용한다.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: datingUserId
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
      responses:
        '200':
          description: 스냅샷
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonalAuthSnapshot'
        '401':
          description: M2M 인증 실패
        '403':
          description: IP 또는 키 권한 불일치
        '404':
          description: 사용자 없음 또는 verified false에 준하는 상태(정책별)
        '429':
          description: 레이트 리밋

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-Internal-Api-Key
      description: 데이팅에서 발급한 서버 간 키(환경별). 필요 시 HMAC 헤더 추가.

  schemas:
    PersonalAuthSnapshot:
      type: object
      required: [schemaVersion, verified]
      properties:
        schemaVersion:
          type: integer
          description: DTO 버전. 하위 호환 깨질 때 증가.
          example: 1
        verified:
          type: boolean
        hashedCI:
          type: string
          nullable: true
          description: Bootpay unique 기반 문토·데이팅 공통 해시
        name:
          type: string
          nullable: true
        birth:
          type: string
          nullable: true
          description: 팀 합의 포맷(예 YYYYMMDD). Munto PersonalAuthentication.birth와 정합.
        gender:
          type: integer
          nullable: true
          description: Bootpay convention 유지(예 0 여, 1 남 — 최종 매핑표 별첨)

    ErrorBody:
      type: object
      properties:
        statusCode:
          type: integer
        message:
          type: string
        error:
          type: string

```