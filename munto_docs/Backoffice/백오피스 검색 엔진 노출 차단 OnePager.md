# 백오피스 검색 엔진 노출 차단 OnePager

분류: SRS
작성자: 김범진
최근 수정일: 2026년 3월 4일 오후 2:11
최초 작성일: 2026년 3월 4일 오전 10:30
문서 상태: Active
생성 일시: 2026년 3월 4일 오전 10:30
최종 편집자: 전동인

## Project Name

백오피스 사이트 검색 엔진(SEO) 노출 차단

## Date

2026-03-04

## Submitter Info

- 김범진

---

## Project Description

### 배경

2026년 3월 4일 CX 제보를 통해, 구글에서 '문토 어드민'을 검색했을 때 백오피스 사이트가 검색 결과에 노출되고 실제 접속까지 가능한 상황이 확인되었습니다. 시크릿 모드에서도 동일하게 검색 및 페이지 접속이 가능하며, 상세 카테고리 클릭 시 로그인 화면으로 이동하는 것이 확인되었습니다.

### 목표

관리자 전용 백오피스 사이트가 일반 사용자에게 검색·노출되지 않도록 차단합니다. 또한 URL을 직접 입력해 접근하는 미인증 사용자는 로그인 페이지로 리다이렉트하여 페이지 구조가 노출되지 않도록 합니다.

### 범위

- **백오피스 V1** (Parcel + 바닐라 HTML)
- 백오피스 **V2** (Next.js 15)

---

## Business and Marketing Justification

### 대안 비교

| 대안 | 설명 | 장점 | 단점 | 비용/공수 |
| --- | --- | --- | --- | --- |
| **SEO 차단** | robots.txt, noindex meta, X-Robots-Tag로 검색엔진 크롤링·인덱싱 차단 | 구현 간단, 1~2시간 내 적용 가능, 추가 인프라 불필요 | 검색엔진에 대한 권고 수준. URL을 직접 아는 사람은 접속 가능 | 낮음 |
| **IP 화이트리스트** | 사무실·VPN 등 특정 IP만 접근 허용 | 강력한 물리적 차단 | 인프라/방화벽 설정 필요. 재택·외근 시 IP 변경 대응 필요 | 중간 |
| **VPN 필수** | 사내 VPN 접속 없이는 백오피스 접속 불가 | 강력한 차단, 네트워크 레벨 보호 | VPN 인프라 필요, 사용자 편의성 저하 | 높음 |
| **로그인** | 관리자 ID/PW 인증 후 접근 
**이미 적용 중** | 데이터 접근은 보호됨 | URL 직접 입력 시 로그인 전에도 페이지 껍데기 노출됨 | - |

### 권장 방향

- **현재**: 로그인(Basic Auth)은 적용되어 있어 데이터 접근은 보호됨
- **1차**: SEO 차단 + 미인증 리다이렉트 적용 — 검색 노출·페이지 껍데기 노출 해결
- **2차(선택)**: 장기적으로 IP 화이트리스트 또는 VPN 필수 접속 검토 — 물리적 접근 제한이 필요해질 경우

---

## Risk Assessment

| 대안 | 리스크 | 수준 | 대응 |
| --- | --- | --- | --- |
| **SEO 차단** | 검색엔진에 대한 권고 수준이라 강제력 없음. 악의적 봇은 무시 가능. URL을 직접 알고 있으면 접속 가능 | Low | 정상 검색엔진(Google 등)은 준수. 이미 인덱싱된 페이지는 제거 요청 |
| **IP 화이트리스트** | 사무실 IP 변경 시 접속 차단. 재택·외근·출장 시 IP 미등록으로 업무 불가 | Medium | IP 변경 시 사전 등록 프로세스. VPN 터널을 통한 고정 IP로 대체 검토 |
| **VPN 필수** | VPN 장애 시 백오피스 전체 접근 불가. VPN 인프라 운영·관리 부담 | Medium | VPN 이중화, 장애 대응 절차 수립 |
| **현재 로그인 (Basic Auth)** | 이미 적용 중. 별도 리스크 없음 | - | - |

---

## Resource and Scheduling Details

| 항목 | 내용 |
| --- | --- |
| **예상 공수** | 2~3시간 (SEO 차단 + V1 header 리다이렉트 + V2 Middleware 포함) |
| **필요 인력** | 프론트엔드 개발자 1명 |
| **의존성** | 없음 (단독 작업 가능) |
| **배포** | V1, V2 각 환경 배포 시 반영 |
| **사후 조치** | 이미 인덱싱된 페이지는 Google Search Console을 통해 URL 제거 요청 필요 (수일~수주 소요) |

---

## Technical Description

### 1. robots.txt 추가

**위치**: `public/robots.txt` (V1: 빌드 결과물 루트, V2: `public/robots.txt`)

```
User-agent: *
Disallow: /
```

- 모든 검색엔진 봇에 대해 전체 경로 크롤링 금지 요청

### 2. Meta robots 태그

**V1**: 각 HTML 파일의 `<head>` 내 추가 (또는 공통 head include가 있다면 해당 파일에)

```html
<meta name="robots" content="noindex, nofollow">
```

**V2**: `pages/_app.tsx`의 `<Head>` 내 추가

```tsx
<meta name="robots" content="noindex, nofollow" />
```

- 페이지 단위 인덱싱·팔로우 차단

### 3. X-Robots-Tag HTTP 헤더 (V2 전용)

**위치**: `next.config.ts`의 `headers()` 함수

```tsx
headers: async () => [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ],
  },
],
```

- HTTP 응답 레벨에서 검색엔진에 인덱싱 금지 지시 (meta 태그보다 우선 적용 가능)

### 4. 미인증 접근 리다이렉트

**V1 (Parcel + 정적 HTML)**

- Parcel 빌드로 정적 HTML 산출, Middleware 없음
- 공통 include인 `header.html` 맨 앞에 인라인 스크립트 추가 — 로그인 페이지 제외한 모든 페이지에서 `jwt-token` 미존재 시 즉시 로그인 페이지로 리다이렉트
- 클라이언트 실행이라 페이지가 잠깐 보일 수 있으나, V1 구조상 가능한 최선의 방식

**V2 (Next.js 15)**

- Next.js Middleware로 페이지 렌더링 전에 인증 여부 확인
- 미인증 사용자가 백오피스 URL에 접근 시 로그인 페이지로 리다이렉트
- 페이지 껍데기(레이아웃·메뉴)가 노출되기 전에 차단

### 5. 검증 방법

- 배포 후 `curl -I [백오피스 URL]` 실행 시 `X-Robots-Tag: noindex, nofollow` 확인
- `[도메인]/robots.txt` 접속 시 `Disallow: /` 확인
- 페이지 소스에서 `<meta name="robots" content="noindex, nofollow">` 확인
- 미인증 상태에서 백오피스 URL 직접 접근 시 로그인 페이지로 리다이렉트되는지 확인