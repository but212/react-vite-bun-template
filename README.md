# 리액트 Vite Bun 템플릿

Vite, TypeScript, Bun 런타임으로 구축된 최신, 프로덕션 준비 완료 리액트 템플릿입니다. 포괄적인 테스트, CI/CD, 배포 구성을 제공합니다.

[docs/project.md](docs/project.md)와 [docs/retrospect.md](docs/retrospect.md)에 계획 및 과정을 기록해두었습니다.

## 빠른 시작

```bash
# 새 프로젝트 생성
bun create but212/react-vite-bun-template my-project
cd my-project

# 의존성 설치
bun install

# 개발 서버 시작 (HTTPS 지원)
bun run dev
```

## 포함 요소

### 핵심 기술

- **React 19** - 최신 리액트, 동시성 지원
- **Vite 7** - 매우 빠른 빌드 툴
- **TypeScript 5.9** - 타입 안정성 및 최신 JS 기능
- **Bun** - 초고속 JS 런타임 및 패키지 매니저

### 스타일링 & UI

- **TailwindCSS 4** - 유틸리티 기반 CSS 프레임워크
- **tailwind-merge** - 똑똑한 클래스 병합
- **clsx** - 조건부 클래스 네이밍

### 개발 도구

- **ESLint 9** - 타입스크립트 지원 코드 린팅
- **Prettier** - Tailwind 플러그인 포함 코드 포매팅
- **Vitest 2** - 빠른 단위 테스트 프레임워크
- **React Testing Library** - 컴포넌트 테스트 유틸

### 라우팅 & 상태

- **React Router 7** - 클라이언트 사이드 라우팅
- **Zustand 5** - 경량 상태 관리

## 개발 환경 설정

### 요구 사항

- **Bun** >= 1.0.0 ([Bun 설치](https://bun.sh/docs/installation))
- **Node.js** >= 18.0.0 (호환성 목적)

### 환경 변수

프로젝트 루트에 `.env` 파일 생성:

```env
# 개발 환경
VITE_APP_TITLE=My App
VITE_API_URL=https://api.example.com

# VITE_ 접두사로 환경변수 추가
```

### HTTPS 개발 서버

이 템플릿은 개발용 HTTPS를 지원합니다:

- 자동으로 자체 서명 인증서 생성
- `https://localhost:3000`에서 앱 접속
- PWA 및 보안 API 테스트에 필수

## 테스트

### 테스트 실행

```bash
# 1회 테스트 실행
bun run test

# 워치 모드
bun run test:watch

# 브라우저 기반 UI 테스트 실행
bun run test:ui

# 커버리지 리포트
bun run test:coverage
```

### 테스트 구조

- **유닛 테스트**: 컴포넌트 옆 `*.test.tsx` 파일
- **설정**: `src/test/setup.ts` - 글로벌 테스트 환경
- **유틸**: `src/test/utils.ts` - 테스트 유틸리티

## 배포

### Vercel (권장)

1. 코드를 GitHub에 푸시
2. Vercel에 레포지토리 연결
3. `vercel.json`에서 설정 자동 감지

### 수동 배포

```bash
# 프로덕션 빌드
bun run build

# 빌드 미리보기
bun run preview

# dist/ 폴더를 호스팅에 배포
```

### 프로덕션 환경 변수

배포 플랫폼에 다음 환경변수 등록:

- `VITE_APP_TITLE` - 앱 타이틀
- `VITE_API_URL` - 프로덕션 API 주소

## 사용 가능한 스크립트

| 스크립트 | 설명 |
|--------|-------------|
| `dev` | HTTPS 개발 서버 실행 |
| `build` | 타입체킹 포함 프로덕션 빌드 |
| `preview` | 프로덕션 빌드 미리보기 |
| `typecheck` | 타입스크립트 타입 검사 |
| `test` | 단위 테스트 실행 |
| `test:watch` | 워치 모드 테스트 |
| `test:ui` | 브라우저 UI 테스트 |
| `test:coverage` | 커버리지 리포트 생성 |
| `lint` | ESLint 실행 |
| `lint:fix` | ESLint 오류 자동 수정 |
| `format` | Prettier로 코드 포맷팅 |
| `clean` | 빌드 산출물 제거 |

## 유틸 함수

### 클래스 관리

- `cn` (클래스 병합/중복 제거): `src/lib/utils/cn.ts`

### 환경

- `getEnv` (환경변수 안전 조회): `src/lib/utils/env.ts`

### 비동기 유틸

- `sleep`, `debounce`, `throttle`, `retry`: `src/lib/utils/async.ts`

### 객체 유틸

- `clamp`, `pick`, `omit`: `src/lib/utils/object.ts`

### 비트 연산

- `BitUtils`: `src/lib/utils/bit-utils.ts`

자세한 예시는 [docs/retrospect.md](docs/retrospect.md#유틸-함수-요약-표)에서 확인하세요.

## CI/CD

템플릿에는 GitHub Actions 워크플로우(`.github/workflows/ci.yml`)가 포함되어 있습니다:

- **Test**: 모든 push, PR마다 실행
- **Build**: 프로덕션 빌드 생성
- **Deploy**: main 브랜치에 자동 배포

### 필수 Secrets

자동 배포를 위해 GitHub 저장소에 다음 시크릿을 추가하세요:

- `VERCEL_TOKEN` - Vercel 배포 토큰
- `ORG_ID` - Vercel 조직 ID
- `PROJECT_ID` - Vercel 프로젝트 ID

## 문제 해결

### 자주 발생하는 이슈

#### Bun 설치 문제

```bash
# Bun 캐시 삭제
bun pm cache rm

# 의존성 재설치
rm -rf node_modules bun.lock
bun install
```

#### 타입스크립트 오류

```bash
# 타입스크립트 캐시 삭제
rm -rf node_modules/.cache
bun run typecheck
```

#### 테스트 실패

```bash
# 테스트 캐시 삭제 후 실행
bun run test --run --reporter=verbose
```

#### 빌드 실패

```bash
# 클린 후 재빌드
bun run clean
bun run build
```

### 성능 팁

- 더 빠른 시작을 위해 `bun run dev` 사용
- 타입스크립트 strict 모드 활성화 권장
- 코드 분할을 위해 동적 import 활용
- `public/` 폴더 이미지 및 에셋 최적화

## 프로젝트 구조

```text
src/
├── components/          # 재사용 UI 컴포넌트
├── lib/
│   └── utils/          # 유틸 함수
├── styles/
│   ├── common/         # 공통 CSS 유틸
│   └── main.css        # 메인 스타일시트
├── test/               # 테스트 설정 및 유틸
├── App.tsx             # 메인 앱 컴포넌트
└── main.tsx            # 앱 진입점
```

## 기여 방법

1. 저장소 포크
2. 기능 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 변경 사항 커밋: `git commit -m 'Add amazing feature'`
4. 브랜치 푸시: `git push origin feature/amazing-feature`
5. Pull Request 생성

## 라이선스

이 프로젝트는 MIT 라이선스입니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

### 써드파티 라이선스

- `src/lib/utils/cn.ts`: MIT License
- 전체 목록은 [licenses/THIRD_PARTY_NOTICES.md](licenses/THIRD_PARTY_NOTICES.md) 참고
