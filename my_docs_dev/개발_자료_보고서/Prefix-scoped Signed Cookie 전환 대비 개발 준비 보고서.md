# Prefix-scoped Signed Cookie 전환 대비 개발 준비 보고서

## 문서 목적

- **목표**: 현재 "매 요청 Lambda@Edge 인가" 구현 단계에서, 향후 **Prefix-scoped CloudFront Signed Cookie**로 원활히 전환할 수 있도록 **사전 준비 항목과 설계 기준**을 체계화한다.
- **효과**: 전환 시 **지연/비용 감소**, **BE 부하 절감**, **운영 단순화**를 달성하며, 데이팅/VoD 양 서비스에 공통 적용 가능한 기반을 마련한다.

---

## 지금 개발 시 반드시 반영할 핵심 설계(요약)

> 한 페이지 가이드 — 나중에 쿠키로 전환해도 코드/인프라 갈아엎지 않게 해주는 결정들
> 

### A. 인터페이스/계약 (변경 불가 원칙)

1. **인가 API** `POST /authorize`
- 요청: `{ userId, path?: "/profiles/{targetUserId}/*" | "/local-courses/{courseId}/lectures/*", resourceKey?: string, clientMeta?: {...} }`
- 응답(allow): `{ decision:"allow", scope?: string, ttlSec?: number, cookie?: { policyBase64, signature, keyPairId } }`
- 응답(deny): `{ decision:"deny", reason }`
- 상태코드: `200`(allow/deny 모두 본문으로 표현), 네트워크 오류시 L@E가 **403 Fail-Closed**
1. **쿠키 스키마(선정 고정)**
- 이름: `CloudFront-Policy`, `CloudFront-Signature`, `CloudFront-Key-Pair-Id`
- 속성: `Domain=.munto.kr; Path=<정확히 스코프 경로>; Secure; HttpOnly; SameSite=None`
1. **경로 스코프 표준화(정규화 필수)**
- Dating: `/profiles/{targetUserId}/`
- VOD: `/local-courses/{courseId}/lectures/`

> BE·L@E·클라이언트 모두 같은 규칙 사용(슬래시, 대소문자, URL 인코딩 포함)
> 

### B. 캐시/엣지 정책 (나중에 그대로 재사용)

1. **Cache Policy**: `Authorization`, `Cookie`, `Expires/Signature/Key-Pair-Id` **캐시 키 제외**
2. **Viewer-Request만 사용**: L@E 트리거는 **Viewer-Request** 한 곳으로 고정(인증/인가 전처리 일원화)
3. **타임아웃/실패 정책**: BE 타임아웃 300–500ms, 재시도 0–1, 실패시 **즉시 403**(Fail-Closed)

### C. 키/보안 (초기부터 위치 고정)

1. **Key Group 준비**: CloudFront **Public Key + Key Group** 등록, 배포에 **Trusted Key Groups** 연결
2. **서명 책임자**: **BE만** Private Key 보관·서명(엣지 금지). KMS/HSM 사용 및 **키 롤오버 런북** 작성

### D. TTL 기준(초기 디폴트 확정)

1. Dating 쿠키 TTL **12–24h**, VOD 쿠키 TTL **10–30m**

> 환불/회수 즉시성 요구에 따라 조정; 긴급 차단은 키 롤오버로 강제 무효화
> 

### E. 클라이언트 공통 처리(웹/앱)

1. **만료 전 갱신**: 남은 TTL이 T<60s면 `/authorize` 재호출 → 새 쿠키/동일 스코프 재발급
2. **앱 쿠키 지원**: 모바일 HTTP 클라이언트에 쿠키 저장소 사용(불가 시 `Cookie:` 수동 주입). 플레이어 제약 경로는 **Signed URL 보완**
3. **에러 핸들링**: 401/403 수신 시 1회 자동 재발급 시도 후 실패 유지(루프 방지)

---

## 개발 시 반드시 감안할 핵심 사항

### 1. 인프라/보안 원칙

- **S3는 OAC 필수**, 퍼블릭 접근 금지. 모든 다운로드는 CF 경유.
- **Cache Policy**에서 `Authorization`, `JWT`, `Cookie`, `Expires/Signature/Key-Pair-Id`는 **캐시 키 제외**(파편화 방지).
- 기본 실패 동작은 **Fail-Closed(403)**.

### 2. 키 관리 체계

- CloudFront **Key Group + Public Key**를 미리 생성해 배포에 연결.
- **Private Key는 반드시 BE 전용**(KMS/HSM 보관), 엣지 배포 금지.
- 추후 **키 롤오버 전략** 적용 가능하도록 구조 준비.

### 3. BE 인가 API 설계

- 엔드포인트는 `POST /authorize`로 고정.
- **응답 스키마에 쿠키 옵션 필드를 예약**해 두어야 함:
    
    ```json
    { decision: "allow"|"deny", scope?: "/profiles/<id>/*", ttlSec?: 600, cookie?: { policyBase64, signature, keyPairId } }
    
    ```
    
- 현재는 `decision`만 사용하되, 추후 쿠키 필드를 그대로 확장 가능.

### 4. 쿠키 발급 패턴 대비

- BE가 직접 `Set-Cookie`를 내려주는 **A-1 패턴**을 기본 가정.
- L@E에서 BE 호출 후 302 리다이렉트와 함께 쿠키를 내려주는 **A-2 패턴**도 지원 가능하도록 고려.
- **Private Key는 반드시 BE**에서만 사용, L@E는 단순 전달.

### 5. 쿠키 정책/TTL

- **Domain**: `.munto.kr`, **Path**는 최소 범위.
- **TTL 설계**:
    - Dating: `/profiles/<targetUserId>/*` → 12~24h (환불 없음).
    - VOD: `/local-courses/<id>/lectures/*` → 10–30m (환불 즉시성 고려).
- **속성**: `Secure; HttpOnly; SameSite=None`.

### 6. 클라이언트 연동 고려

- **웹**: 브라우저 쿠키 자동 전송 → 특별 대응 불필요.
- **앱**: 쿠키 자동 처리 지원 여부 확인 필요. 불가 시 수동 `Cookie:` 헤더 주입 로직 설계.
- 쿠키 만료 시 **재발급 API 호출** 경로 확보.

### 7. 모니터링/운영 기준

- L@E 실행 수, p95/99 Latency, 비용.
- `/authorize` QPS/지연/에러율.
- CloudFront Hit Ratio, 403 비율, S3 전송량.
- 경보 룰은 미리 정의: 예) Hit Ratio < 80%, L@E p95 > 150ms.

### 8. 전환 전략(Feature Flag)

- **flag=off**: 100% L@E 인가 (현 단계).
- **flag=canary**: 일부 경로만 쿠키 발급.
- **flag=on**: 기본 쿠키 기반, 특수 경로만 L@E 유지.

---

## 결론

- 지금은 **L@E 매 요청 인가**로 단순하게 시작.
- 하지만 위 핵심 사항을 개발 구조에 반영하면, 추후 **Prefix-scoped Signed Cookie**로 무중단·저비용 전환 가능.
- 특히 **API 응답 스키마, 키 관리, 클라이언트 쿠키 처리 구조**는 반드시 초기부터 반영해야 한다.