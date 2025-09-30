# 현재 상황 분석

### **기존 Repository 명명 문제점**

| 현재 이름        | 문제점                     | 영향도 |
| ---------------- | -------------------------- | ------ |
| `munto_monorepo` | • 구현 방식(monorepo) 노출 |

• 실제 역할(backend API) 불명확 • 프로젝트 성격 파악 어려움 | 🔴 High | | `munto_web` | • 너무 일반적 • React 프로젝트임을 알 수 없음 • 미래 확장성 제한 | 🟡 Medium | | `munto_app` | • 모든 것이 'app'임 • Flutter 앱임을 알 수 없음 • 미래 다른 앱과 충돌 가능성 | 🟡 Medium |

### **기술적 일관성 문제**

**현재 혼재 상황:**

- **GitHub Repository**: underbar(`_`) 사용
- **package.json**: dash() 사용
- **AWS Resources**: dash() 사용
- **Environment Variables**: underbar(`_`) 사용 (표준)

## 개선 방안

### **추천 Repository 이름 변경**

| 현재             | 추천 이름       | 근거             |
| ---------------- | --------------- | ---------------- |
| `munto_monorepo` | `munto-backend` | • 역할 중심 명명 |

• 직관적 이해 가능 • 업계 표준 패턴 | | `munto_web` | `munto-frontend` | • 플랫폼 명확 • 미래 확장성 고려 • 기술 스택 중립적 | | `munto_app` | `munto-mobile` | • 디바이스 타입 명확 • 다른 모바일 앱과 구분 가능 • 간결하고 직관적 | | munt_admin | monto-backoffice | | | 데이팅 서비스 | dating-backend | | | 데이팅 서비스 | dating-mobile | |

### **대안 옵션**

### **Option A: 플랫폼 중심** (추천)

```
munto-backend    (NestJS API)
munto-frontend   (React Web)
munto-mobile     (Flutter App)
```

### **Option B: 역할 + 플랫폼**

```
munto-api, munto-api-server           (백엔드 API)
munto-web-client    (웹 클라이언트)
munto-mobile-app    (모바일 앱)

```

### **Option C: 기술 스택 포함**

```
munto-nestjs-api    (NestJS 백엔드)
munto-react-web     (React 웹)
munto-flutter-app   (Flutter 앱)

```

## Repository 네이밍 체크리스트

### **필수 조건 (MUST)**

- [ ] **명확성**: 이름만 보고 프로젝트 성격 파악 가능
- [ ] **확장성**: 미래 유사 프로젝트와 충돌 방지
- [ ] **간결성**: 3-20자 권장, 타이핑 편의성
- [ ] **일관성**: 팀 내 동일한 패턴 적용

### **기술적 요구사항**

- [ ] **GitHub 표준**: 소문자 + 숫자 + 하이픈(-)만 사용
- [ ] **검색 최적화**: 회사/제품명 포함
- [ ] **팀 컨벤션**: 기존 저장소와 일관성 유지

### **피해야 할 것들**

- [ ] 구현 세부사항 노출 (`monorepo`, `nestjs`, `react`)
- [ ] 너무 일반적인 단어 (`app`, `web`, `client`)
- [ ] 시간 종속적 용어 (`v2`, `new`, `legacy`)

## 마이그레이션 계획

### **1단계: 영향도 분석**

- [ ] 하드코딩된 Repository URL 검색
- [ ] CI/CD 파이프라인 설정 확인
- [ ] 외부 시스템 연동 포인트 파악

### **2단계: 변경 작업**

- [ ] GitHub Repository 이름 변경
- [ ] `package.json` 이름 업데이트
- [ ] `README.md` 제목 수정
- [ ] 문서 내 URL 링크 업데이트

### **3단계: 팀 커뮤니케이션**

- [ ] 팀원들에게 변경 사항 공지
- [ ] 로컬 git remote URL 업데이트 가이드 제공
- [ ] 북마크 및 즐겨찾기 업데이트 요청

## 기대 효과

### **단기적 효과**

- 프로젝트 성격 파악 용이성 향상
- 신규 팀원 온보딩 시간 단축
- 개발 도구 간 일관성 확보

### **장기적 효과**

- 미래 프로젝트 확장성 확보
- 팀 내 네이밍 컨벤션 정착
- 코드베이스 전반적 품질 향상

## 구체적 변경 사항

### **수정해야 할 파일 목록**

```
📁 munto_monorepo/
├── package.json          (name: "munto-backend")
├── README.md             (# Munto Backend)
├── docs/srs/vod.md       (GitHub URL 1개)
├── .cursor/setting.json  (프로젝트 설정)
└── nest-cli.json         (기본 설정)

```

### **팀원 작업 사항**

```bash
# 로컬 저장소 리모트 URL 업데이트
git remote set-url origin <https://github.com/Munto-dev/munto-backend.git>
git remote set-url origin <https://github.com/Munto-dev/munto-frontend.git>
git remote set-url origin <https://github.com/Munto-dev/munto-mobile.git>

```

## 액션 플랜

### **우선순위 1: 즉시 실행**

1. 팀 내 네이밍 컨벤션 합의
2. `munto_monorepo` → `munto-backend` 변경
3. 관련 문서 업데이트

### **우선순위 2: 순차 실행**

1. `munto_web` → `munto-frontend` 변경
2. `munto_app` → `munto-mobile` 변경
3. 팀원 교육 및 가이드 배포

### **우선순위 3: 지속적 개선**

1. 신규 프로젝트 생성 시 체크리스트 적용
2. 정기적인 네이밍 컨벤션 리뷰
