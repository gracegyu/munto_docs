다음은 **S3 Pre-Signed URL**, **CloudFront Signed URL**, **CloudFront(+Lambda@Edge)**의 보안/특징/운영/비용 관점 비교입니다. (가격은 개념만 표기, 세부 단가는 리전에 따라 상이)

| 항목 | S3 Pre-Signed URL | CloudFront Signed URL (또는 Signed Cookies) | CloudFront + Lambda@Edge(옵션) |
| --- | --- | --- | --- |
| 접근 경로 | **클라이언트 → S3** 직접 | **클라이언트 → CloudFront(캐시) → S3(OAC/OAI)** | **클라이언트 → CloudFront(캐시, 엣지 코드) → S3(OAC/OAI)** |
| 인증/권한 부여 방식 | URL에 포함된 **서명+만료 시간**으로 S3가 검증 | CloudFront 키 페어로 **서명 정책(만료, IP 제한 등)** 검증. 여러 객체에 **Signed Cookies**로 일괄 적용 가능 | 엣지에서 **토큰 검사(OAuth2/JWT/쿠키), 헤더 검증, 외부 권한 서버 연동** 등 **커스텀 인증/인가 로직** 수행 |
| 만료(유효기간) | 콘솔 생성 시 1분~12시간, SDK/CLI 시 **최대 7일** 설정 가능 ([AWS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html?utm_source=chatgpt.com)) | 정책으로 **만료 시각/경로/IP 범위** 세분화 가능. URL 단건(Signed URL) 또는 다수 파일(Signed Cookies) 제어 ([AWS Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html?utm_source=chatgpt.com)) | 애플리케이션 로직대로 **짧은 TTL 토큰**, 사용자 그룹별 권한, 외부 IdP 검증 등 **임의 정책** 구현 가능 ([Amazon Web Services, Inc.](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/?utm_source=chatgpt.com), [GitHub](https://github.com/aws-samples/cloudfront-authorization-at-edge?utm_source=chatgpt.com)) |
| 보안 범위 | URL 자체가 **권한 증표**. 유출 시 만료 전까지 재사용 가능. Referer 차단/Geo 제한 등은 **S3 단독으로 제한적** ([AWS Documentation](https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/presigned-url-best-practices/presigned-url-best-practices.pdf?utm_source=chatgpt.com)) | 배포 단에서 **IP/만료/경로 제약**과 **OAC/OAI**로 S3 **직접 접근 차단** 가능(CloudFront만 원본 접근) → URL 유출 리스크를 상대적으로 축소 ([AWS Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html?utm_source=chatgpt.com), [in28minutes Cloud](https://cloud.in28minutes.com/aws-certification-amazon-cloudfront-signed-urls-cookies-oai-s3?utm_source=chatgpt.com)) | 위와 동일 + **토큰 유효성/세션/요금제/구독 상태** 등 **정교한 인가** 가능. 단, 코드 취약점/오버헤드 관리 필요 ([Amazon Web Services, Inc.](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/?utm_source=chatgpt.com)) |
| 성능/캐싱 | S3에서 직접 제공 → **글로벌 엣지 캐시 없음** | **전 세계 엣지 캐시** 활용, 대용량/고지연 사용자에 유리 | 엣지에서 **선제 필터링/리다이렉트** 가능. 다만 함수 실행이 캐시 적중률에 영향 줄 수 있음 |
| 사용성(클라이언트) | 객체마다 URL 생성/전달 필요. **단건 다운로드**에 단순/효율적 | **Signed Cookies**로 **여러 파일**을 세션처럼 투명하게 접근 가능(스트리밍/다중 객체에 유리) ([AWS Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html?utm_source=chatgpt.com)) | 클라이언트는 통상 **일반 URL**만 사용. 인증 토큰/쿠키만 전달하면 됨 |
| 운영 복잡도 | **낮음**: 서버가 URL 발급만 하면 끝 | **중간**: 키 페어 관리, 배포/회전, **OAC/OAI** 설정 필요 | **높음**: 코드 배포(버전/리전 전파), 관측/테스트, 보안 검토 필요 |
| 비용 구조(대략) | **S3 GET/데이터 전송 비용만** | **CloudFront 전송/요청 비용** + S3 원본 비용(캐시 히트로 절감 가능) | 위 비용 + **Lambda@Edge 실행당 요청·실행시간 과금**(글로벌 과금) ([Amazon Web Services, Inc.](https://aws.amazon.com/cloudfront/pricing/?utm_source=chatgpt.com), [cloudchipr.com](https://cloudchipr.com/blog/aws-lambda-pricing?utm_source=chatgpt.com)) |
| 대표 유스케이스 | 일회성/단건 파일, **짧은 만료로 간단 보호**, API 백엔드에서 즉시 발급 | 로그인 후 다수 파일 다운로드, 대용량 파일/전세계 배포, **세션형 접근 제어** | SaaS 과금/권한 모델, **OAuth2/JWT 연동**, 외부 권한 서버와의 **정교한 인가** 필요 시 |
| 한계/주의 | 7일 초과 만료 불가, **URL 유출 시 재사용**(만료까지), 도메인/엣지 제약 없음 | 도메인/캐시 전제. 키 관리·회전 필수. **정적 정책** 범위를 넘어서는 세밀 인가 한계 | 코드/배포 복잡도↑, 잘못 구현 시 **성능/비용 폭증** 가능. 모니터링/테스트 체계 필요 ([Repost](https://repost.aws/questions/QUc_EuFVfPR7qeww-GeH2TdA/cloudfront-lambda-edge-cost?utm_source=chatgpt.com)) |

## 핵심 포인트 / 베스트 프랙티스

1. **간단·단건 다운로드**이면 **S3 Pre-Signed URL**이 가장 간단합니다. 단, 만료는 **SDK/CLI 기준 최대 7일**, 콘솔 생성은 최대 12시간이라는 제약이 있습니다. ([AWS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html?utm_source=chatgpt.com))
2. **로그인 사용자에게 다수 객체**를 안정적으로 제공하고, **S3를 퍼블릭에서 차단**하려면 **CloudFront + Signed URL/Cookies + OAC(OAI)** 구성이 표준적입니다. (S3는 **CloudFront 전용**으로 잠그기) ([AWS Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html?utm_source=chatgpt.com), [in28minutes Cloud](https://cloud.in28minutes.com/aws-certification-amazon-cloudfront-signed-urls-cookies-oai-s3?utm_source=chatgpt.com))
3. *정교한 인가(구독 상태, 조직/권한 레벨, 외부 IdP 토큰 검사)**가 필요하면 **Lambda@Edge**로 엣지 인증/인가를 추가합니다. 운영 복잡도와 **추가 비용(요청·실행시간 과금)**을 감안해야 합니다. ([Amazon Web Services, Inc.](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/?utm_source=chatgpt.com))
4. 최신 가이드에 따르면 **Pre-Signed URL 보안 모니터링/남용 방지**를 위한 감시·제한 전략을 권장합니다. (예: 짧은 만료, 범위 최소화, 발급 주체 권한 최소화 등) ([AWS Documentation](https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/presigned-url-best-practices/presigned-url-best-practices.pdf?utm_source=chatgpt.com))

## 비용 관점 요약

- **S3 Pre-Signed URL**: S3 **요청/전송 요금만** 발생. 가장 저렴.
- **CloudFront Signed URL/Cookies**: CloudFront **전송/요청 요금**(캐시로 절감 가능) + S3 원본 비용. **글로벌 사용자**일수록 단가 대비 체감 성능/절감 효과 큼. ([Amazon Web Services, Inc.](https://aws.amazon.com/cloudfront/pricing/?utm_source=chatgpt.com))
- **Lambda@Edge 추가 시**: 위에 **Lambda@Edge 요청·실행시간 비용**이 추가(전 세계 기준 과금). 고QPS·복잡 로직일수록 비용 민감. ([Amazon Web Services, Inc.](https://aws.amazon.com/lambda/pricing/?utm_source=chatgpt.com), [cloudchipr.com](https://cloudchipr.com/blog/aws-lambda-pricing?utm_source=chatgpt.com))

---

### 선택 가이드(실무 권고안)

- **단순 보호/단건 파일**: *S3 Pre-Signed URL*. 만료를 짧게, 최소 권한으로 발급. 로그/모니터링 구성 권장. ([AWS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html?utm_source=chatgpt.com))
- **다수 파일·전세계 사용자·캐시 활용**: *CloudFront Signed Cookies* + **OAC**로 S3 원본 잠금. (권한 모델이 단순할 때) ([AWS Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html?utm_source=chatgpt.com))
- **정교한 인가·외부 IdP 연동**: *CloudFront + Lambda@Edge*로 토큰 검증/권한 확인. 운영 복잡도·비용 대비 가치가 있을 때 채택. ([Amazon Web Services, Inc.](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/?utm_source=chatgpt.com))

필요하시면, 현재 아키텍처/요구사항(만료 요구, 사용자 규모, 지역 분포, 파일 크기 및 수, 기존 IdP 여부)을 기준으로 **구체 아키텍처(예: CloudFront+OAC+Signed Cookies, 혹은 Edge JWT 검증 샘플)**까지 바로 설계안 드리겠습니다.