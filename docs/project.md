# react-vite-bun-template 프로젝트 계획

템플릿 실습용으로 만드는 react, vite, bun에 대한 탬플릿입니다.

## 목표와 결과물

목표: Bun 기반에서 React + Vite + TS를 즉시 개발 가능한 상태로 제공하고, 코드 품질(ESLint/Prettier)과 스타일링(Tailwind)을 기본 내장한 템플릿을 GitHub에서 bun create로 바로 쓸 수 있게 제공. 원래 자바스크립트로 하려고 했지만 어차피 나중에는 TypeScript로 강의든 과제든 프로젝트든 할 것이기에 TypeScript로 작성하도록 함

결과물: GitHub “Template Repository” -> README 사용법 + 자동화 스크립트(dev/build/lint/typecheck/format/preview) + 최소 예제 페이지 + 각종 기본 설정들

## 템플릿 구성 요소

Bun + Vite + React + TypeScript 프로젝트의 기본 구성 요소를 포함하며, 코드 품질(ESLint/Prettier)과 스타일링(Tailwind)을 기본 내장한 템플릿을 포함함

### 의존성

#### 기본 런타임 및 프레임워크

- react
- react-dom
- typescript

#### 빌드 도구 및 플러그인

- vite
- @vitejs/plugin-react-swc
- vite-tsconfig-paths

#### 스타일링 및 포매팅

- tailwindcss
- prettier
- prettier-plugin-tailwindcss
- tailwind-merge
- clsx

#### 린트 및 코드 품질

- eslint
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-plugin-import
- eslint-config-prettier
- @types/react
- @types/react-dom

### 레포지토리 폴더 구조

```text
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ lib/
│  │  └─ utils/
│  ├─ styles/
│  ├─ App.tsx
│  └─ main.tsx
├─ public/
│  └─ favicon.png
├─ .editorconfig
├─ .eslintrc.mjs
├─ .gitignore
├─ .prettierignore
├─ .prettierrc.toml
├─ bunfig.toml
├─ index.html
├─ package.json
├─ tailwind.config.mjs
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ README.md
```

### 스크립트

- dev -> vite
- build -> tsc --noEmit && vite build
- preview -> vite preview
- lint -> eslint .
- lint:fix -> eslint . --fix
- format -> prettier --write .
- clean -> rimraf dist

### bun create 전/후 처리

```json
"bun-create": {
  "preinstall": [],
  "postinstall": ["bunx rimraf -rf .git", "bunx rimraf -rf dist"],
  "start": "bun run dev"
}
```

### 유틸 함수

- `cn`: `src/lib/utils/cn.ts` (클래스 병합/중복 제거)
- `getEnv`: `src/lib/utils/env.ts` (환경변수 안전 조회)
- `sleep`, `debounce`, `throttle`, `retry`: `src/lib/utils/async.ts`
- `clamp`, `pick`, `omit`: `src/lib/utils/object.ts`

자세한 사용 예시는 `docs/retrospect.md`의 [유틸 함수 요약 표](./retrospect.md#유틸-함수-요약-표)를 참고하세요.
