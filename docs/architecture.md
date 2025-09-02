# 프로젝트 아키텍처

이 문서는 React Vite Bun 템플릿의 전반적인 아키텍처와 디렉터리 구조를 설명합니다.

## 최상위 디렉터리 구조

```text
.github/      # GitHub Actions 워크플로우 (CI/CD)
.husky/       # Git hooks 설정 (pre-commit)
.vscode/      # VSCode 에디터 설정
docs/         # 프로젝트 문서
licenses/     # 서드파티 라이선스 정보
public/       # 정적 에셋 (이미지, 파비콘 등)
src/          # 애플리케이션 소스 코드
tests-e2e/    # Playwright E2E 테스트
```

## `src` 디렉터리 상세 구조

`src` 디렉터리는 애플리케이션의 핵심 로직을 포함하며, 기능별로 모듈화되어 있습니다.

```text
src/
├── assets/         # CSS에서 참조하는 에셋
├── components/     # 재사용 가능한 UI 컴포넌트
├── config/         # 환경 변수 등 앱 설정
├── constants/      # 앱 전역에서 사용되는 상수
├── context/        # React Context API 관련
├── hooks/          # 재사용 가능한 커스텀 훅
├── lib/            # 라이브러리, 외부 연동 코드
│   └── utils/      # 순수 함수 유틸리티
├── stores/         # Zustand 상태 관리 스토어
├── styles/         # 전역 스타일 및 TailwindCSS 설정
├── test/           # 테스트 설정 및 유틸리티
├── types/          # 전역 타입 정의
├── App.tsx         # 메인 라우팅 및 레이아웃
└── main.tsx        # 애플리케이션 진입점
```

### 데이터 흐름

1. **UI Layer (`components`)**: 사용자의 상호작용을 처리하고, 훅을 통해 비즈니스 로직과 상태에 접근합니다.
2. **State Layer (`stores`, `hooks`)**: Zustand 스토어에서 전역 상태를 관리하며, 커스텀 훅을 통해 컴포넌트에 상태와 로직을 제공합니다.
3. **Logic Layer (`lib`, `hooks`)**: 비즈니스 로직, API 연동, 데이터 가공 등 핵심 로직을 처리합니다.

이 구조는 관심사 분리(SoC) 원칙을 따라 유지보수성과 확장성을 높이는 것을 목표로 합니다.
