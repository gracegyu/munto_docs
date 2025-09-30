# Notion → Confluence Migration 툴 개발 계획서

본 문서는 Munto가 자체적으로 **Notion DB 기반 문서를 Confluence로 자동 변환**하기 위한 전용 Migration 툴 개발 계획을 정의합니다.

---

## 1. 목표 및 범위

- **목표**: Notion Database 기반 문서를 Confluence 페이지(본문 + Page Properties/Labels)로 자동 이행.
- **범위**:
  - 회의록, 정책, 프로젝트 산출물 DB → Confluence Space 구조로 전환
  - 내부 링크·첨부·멘션 변환
  - Jira 연계(Action Items → 이슈 생성)
- **비범위**:
  - 개인 노트, 임시 메모, 불용/중복 문서 (사전 정리/아카이빙)

---

## 2. 기능 요구사항 (Functional)

1. **추출 (Extract)**
   - Notion API로 DB Rows/Blocks/Files 수집
   - 페이징·증분필터 지원
2. **변환 (Transform)**
   - 테이블별 **매핑 규칙** 적용 (템플릿/Jinja2)
   - 필드 → Page Properties/Labels/본문 섹션 반영
3. **적재 (Load)**
   - Confluence REST Upsert(신규/갱신)
   - Attachment 업로드 및 본문 URL 재치환
   - Ancestor/Space 지정
4. **링크/멘션/사용자 매핑**
   - 내부 링크 치환
   - 이메일 기반 사용자 매핑(@mention)
   - 실패 시 대체 표기
5. **증분 동기화**
   - `last_edited_time` 기반 증분 이행
   - Dry-run 모드 지원
6. **검증/리포트**
   - 배치별 성공/실패/경고 카운트
   - 링크 무결성 검사
   - 커버리지 리포트 생성

---

## 3. 비기능 요구사항 (Non-Functional)

- **멱등성**: `original_notion_id` 기반 Upsert, 중복 생성 방지
- **성능**: 동시성(3~5) + 레이트리밋 준수, 3,000문서 기준 1회 처리
- **신뢰성**: 재시도(지수 백오프), Dead-letter 큐, 중간 저장소 스냅샷
- **보안**: 토큰/비밀정보 Vault/Secrets 보관
- **감사성**: 호출 로그 + 상태 테이블 기록, 롤백 절차 문서화

---

## 4. 기술 스택

- **언어/런타임**: Python 3.12 (또는 Node.js 20)
- **API**: Notion Official API, Confluence Cloud REST API
- **템플릿**: Jinja2 (Confluence Storage Format XML 생성)
- **데이터 저장**: SQLite(개발) / 운영: 일괄 Migration 시 상태 관리 DB (PostgreSQL 등 선택 가능, 1회성 또는 단기 증분 운영 목적)
- **오브젝트 저장소**: S3/Blob (원본 JSON/첨부 스냅샷)
- **실행 환경**: Docker + GitHub Actions

---

## 5. 데이터 모델 (요약)

- `migrations(id, notion_id, conf_content_id, version, status, last_error, updated_at)`
- `user_map(notion_email, conf_account_id, display_name, last_sync_at)`
- `link_map(notion_block_id, conf_content_id, url_from, url_to)`

---

## 6. 매핑 규칙

- **전역 설정**: `config.yaml` (Confluence Base URL, Space Key, 부모 페이지, 레이트리밋)
- **테이블별 매핑 파일**: `mappings/<table>.yaml`
  - 필드 → Page Properties/Label/본문 섹션
  - 값 변환 규칙 (예: select→slug, date 포맷)
  - Jira 생성 규칙 (Action Items → 프로젝트/이슈 타입/라벨)

---

## 7. 운영 플로우

1. **Dry-run**: Storage Format 생성만 수행, 샘플 5% 검수
2. **1차 배치**: 500건 단위 이행, 실패 재시도/수정
3. **본 이행**: 잔여 전량 처리, 링크 치환 후처리
4. **증분 동기화 (2주)**: 변경분만 반영, 사용자 피드백 반영

---

## 8. 배포/자동화 (GitHub Actions 개요)

- `workflow_dispatch` 입력: Space Key, 대상 테이블, 날짜 필터
- Job 구성: `extract` → `transform` → `load` → `verify` → `report`
- 산출물: 실행 로그, 커버리지 리포트, 실패 레코드 CSV, 스냅샷 ZIP

---

## 9. 테스트 계획

- **단위**: 필드 매핑, 마크업 변환, 링크/멘션 치환
- **통합**: DB 1개(≥200행) PoC, 첨부 포함
- **성능**: 동시성/레이트리밋, 대용량 페이지 처리
- **회귀**: 매핑 규칙 변경 후 재실행 결과 비교

---

## 10. KPI / 성공 기준

- 변환 정확도 ≥ **98%**
- 링크 무결성 ≥ **99%**
- 롤백 시간 < **10분** (단일 페이지)
- 증분 동기화 지연 < **24시간**

---

## 11. 리스크 & 대응

- **사용자 매핑 실패**: 대체 표기 + 주간 동기화
- **대용량 페이지 실패**: 섹션 분할/첨부 이동
- **API 한도 초과**: 큐잉·슬로틀링, 야간 배치 수행
- **링크 손실**: 사전 링크 인덱싱 + 후처리 치환

---

## 12. 일정 (예시, 4주)

- **W1**: PoC (스키마·매핑 규칙 확정, 사용자 매핑 확보)
- **W2**: 툴 개발 완료, Dry-run + 1차 배치(500건)
- **W3**: 본 이행 (잔여 전량), 링크/첨부 후처리
- **W4**: 증분 동기화 운영, 교육/FAQ 반영, 마감 리포트

---

## 13. 역할과 책임 (R&R)

- **PM/오너**: 범위/일정/리스크 관리
- **개발**: ETL 파이프라인 구현, 매핑 템플릿 작성
- **QA**: 샘플 검수, 커버리지 리포트 검증
- **도메인 오너**: Space 구조/권한 확정, 최종 승인
