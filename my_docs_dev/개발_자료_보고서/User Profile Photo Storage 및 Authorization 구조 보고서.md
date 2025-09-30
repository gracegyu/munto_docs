# User Profile Photo Storage 및 Authorization 구조 보고서

## 문서 목적

- **목표**: `userProfilePhotos` 테이블과 S3 저장 구조를 정비하여, **Lambda@Edge/CloudFront 기반 권한 검증**이 효율적으로 동작할 수 있도록 설계 기준을 수립한다.
- **효과**: 경로 기반 인가 처리 단순화, Signed Cookie 스코프 발급 용이성, 운영·보안 정합성 확보.

---

## 1. 문제 배경

현재 스키마에는 `photoUrl`(S3 전체 URL)이 저장된다. 하지만:

- CloudFront/Lambda@Edge는 요청 시점에 **S3 Key(path)**만 보고 권한 판별을 수행해야 한다.
- `photoUrl`만 저장 시, L@E는 어떤 사용자의 어떤 슬롯인지 파악하기 어려움 → 매 요청 DB 조회 필요 → 오버헤드↑.

---

## 2. 개선 원칙

### (1) S3 Key 규칙화

- **버킷 예시**: `s3://munto-prod-profiles`
- **Key 규칙**:
    
    ```
    profiles/{targetUserId}/photo/{photoId}-{version}.{ext}
    
    ```
    
    - `targetUserId`: 프로필 주인 ID
    - `photoId`: 내부 PK 또는 업로드 UUID
    - `version`: 교체 시 증가(캐시 무효화) → 덮어쓰기가 없다면 version은 필요 없다.
    - `ext`: 확장자 (jpg/png/webp)
- CloudFront URL: `https://img.munto.kr/profiles/{targetUserId}/photos/{photoId}-{version}.{ext}`

> 장점: L@E가 URL만 보고 {targetUserId} 추출 가능 → 곧바로 권한 확인/Scope 쿠키 발급.
> 

### (2) DB 스키마 운영 방침

- **fileKey**를 단일 진실원(Source of Truth)으로 관리.
- `photoUrl`은 선택 필드(衍生 값): `CF_DOMAIN + fileKey`로 생성.

### 제안 스키마

```sql
ALTER TABLE userProfilePhotos
  MODIFY fileKey VARCHAR(255) NOT NULL COMMENT 'S3 object key (규칙화)',
  MODIFY photoUrl VARCHAR(500) NULL COMMENT 'Derived: CDN 도메인 + fileKey';

```

- 기존 인덱스 `(userId, photoOrder)` 유니크 유지.
- 정합성 기준은 항상 `fileKey`.

### (3) 업로드 프로세스

- Presigned POST/PUT 정책에서 **규칙화된 프리픽스만 허용**.
- 서버 업서트 시 반드시 규칙에 맞는 `fileKey` 생성·검증.
- 정규식 검증 예: `^profiles/[0-9a-z-]+/photos/[1-6]/`.

---

## 3. Authorization 처리 영향

### (1) L@E 권한 판별

- 요청 경로: `/profiles/12345/photos/2/abc-1.jpg`
- 정규식 파싱으로 `targetUserId=12345` 추출.
- 이후 `/authorize(userId, scope=/profiles/12345/*)` 호출 또는 경로 스코프 쿠키로 검증.

### (2) Signed Cookie 활용

- 경로 스코프 쿠키: `/profiles/{targetUserId}/*`
- 최초 한 번 인가 후, 동일 유저 프로필 이미지 다수 요청 시 **BE 미호출**.

---

## 4. 마이그레이션 가이드

1. **신규 업로드부터 강제 적용**: `fileKey` NOT NULL + 규칙 기반 생성.
2. **기존 데이터 백필**: `photoUrl` → 파서로 `fileKey` 역산, 불가능 시 재업로드.
3. **운영 검증**: BE 저장 시 정규식 검증 + URL 인코딩·대소문자 통일.

---

## 5. Q&A

- **Q. `photoUrl` 완전히 제거해야 하나?**
    - A. 필수 아님. 다만 핵심 로직은 `fileKey` 기준으로 처리. `photoUrl`은 파생 필드.
- **Q. CloudFront 경로만 보고 소유자 파악 가능한가?**
    - A. 네, 규칙화된 경로 덕분에 `{targetUserId}`를 추출 가능.
- **Q. 추후 Prefix-scoped Signed Cookie 적용에 문제는?**
    - A. 전혀 없음. 오히려 `/profiles/{targetUserId}/*` 한 줄로 스코프 발급 가능 → BE 부하 감소.

---

## 6. 결론

- `fileKey`를 진실원으로 삼아 **경로 규칙화**를 반드시 진행.
- `photoUrl`은 필요 시衍生 값으로 유지 가능.
- 이렇게 하면 **L@E 인가 단순화**, **쿠키 기반 최적화**, **보안·운영 일관성**을 모두 충족할 수 있음.