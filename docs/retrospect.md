# 프로젝트 회고

## 계획 및 사전 준비

해당 프로젝트에 들어가기에 앞서 어떤 의존성이 있어야 하는지 확인하기 위하여 AI의 도움을 받았습니다.
해당 프로젝트는 bun + react + vite + typescript + tailwindcss + eslint + prettier를 사용하여 구현하는 템플릿으로서
어떤 의존성을 필요로 하고 폴더 구조는 어떻게 되어야 하는지 확인하였습니다. 이 내용은 project.md에 기록하였습니다.
자바스크립트가 아닌 타입스크립트인 이유는 추후 진행될 과정과 과제는 타입스크립트를 사용할 가능성이 있기에
타입스크립트로 진행하였습니다.

### 프로젝트 구조

AI가 생성해준 구조에서 변환하였습니다.

```text
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ App.tsx
│  └─ main.tsx
├─ public/
│  └─ favicon.svg
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

## package.json 설계

package.json에는 의존성과 스크립트가 포함되어 있는데 의존성은 AI의 도움을 받아 정리해서 `bun add` 했지만
스크립트는 직접 만들었습니다.

### 스크립트

- dev -> vite
- build -> vite build
- preview -> vite preview
- lint -> eslint .
- lint:fix -> eslint . --fix
- format -> prettier --write .

## tsconfig.json 재고

bun init이 자동 생성해주는tsconfig.json이 bun + react + vite + typescript + tailwindcss + eslint + prettier를 사용하는 프로젝트에 맞는지 AI의 도움을 받아 확인하고 그에 맞게 수정하였습니다.

### tsconfig.json

```json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": ["ESNext", "DOM", "DOM.Iterable"], // + DOM, DOM.Iterable은 React에서 필요
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "jsxImportSource": "react", // + jsxImportSource를 react로 설정
    "allowJs": true,
    "types": ["vite/client"], // + vite/client는 Vite에서 필요

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // + Path mapping: src 폴더를 @로 매핑
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"], // + src 폴더와 vite.config.ts를 포함
  "exclude": ["node_modules", "dist"] // + node_modules와 dist 폴더를 제외
}
```

## vite.config.ts 고려

vite 설정 파일을 AI가 자동 생성해주긴 했지만 이것을 그대로 사용하기에는 뭔가 부실해보였습니다. 한번 확인해봐야 할 것 같습니다.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: { port: 5173 },
});
```

### vite.config.ts 고려 결과

AI의 검토 결과 현재의 설정은 잘 구성되어 있지만 사용자가 빠르게 optional 설정을 하게 하기 위하여 주석으로 optional 설정을 추가하는 것이 좋을 것으로 추천하였습니다.

```ts
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(), // TypeScript path mapping 지원 (tsconfig.json의 paths 설정 사용)
    react(), // React SWC 플러그인 (빠른 컴파일)
  ],
  server: {
    port: 5173, // 개발 서버 포트
    // strictPort: true, // 포트가 사용 중일 때 다른 포트로 변경하지 않음
    // open: true, // 서버 시작 시 브라우저 자동 열기
  },
  // build: { 
  //   target: 'esnext', // 최신 ES 문법으로 빌드
  //   sourcemap: true   // 소스맵 생성 (디버깅용)
  // },
});
```

## 파비콘 디자인

그냥 별 생각 없이 템플릿의 T를 따서 디자인을 해봤습니다. 여기에 있는 모든 저작물은 CC0로 해야됐기 때문에 T의 디자인 삐침획 등을
직접 디자인하고 거기에 하늘색 배경을 추가했습니다.

![favicon](../public/favicon.png)

## .editorconfig

prettier가 있었지만 prettier가 작동되지 않는 환경 혹은 상황에서의 fallback에 가까우며 prettier가 지원하지 않는 파일 형식(.yml, .toml)에 대한 기본 에디터 설정을 제공합니다.

```toml
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
trim_trailing_whitespace = true
insert_final_newline = true
indent_blank_lines = false

[*.md]
trim_trailing_whitespace = false
insert_final_newline = true

[*.yml]
indent_style = space
indent_size = 2
insert_final_newline = true

[*.toml]
indent_style = space
indent_size = 2
insert_final_newline = true
```

## .prettierrc.toml

prettier의 설정은 최대한 관습적인 코딩 컨벤션을 따르기를 원했습니다.

```toml
printWidth = 120
tabWidth = 2
useTabs = false
semi = true
singleQuote = true
quoteProps = "as-needed"
jsxSingleQuote = true
trailingComma = "es5"
bracketSpacing = true
bracketSameLine = false
arrowParens = "avoid"
endOfLine = "lf"
embeddedLanguageFormatting = "auto"
```

| 옵션                       | 값          | 설명                                                                    |
| -------------------------- | ----------- | ----------------------------------------------------------------------- |
| printWidth                 | 120         | 한줄의 최대 너비, 원래 80자 였지만 너무 좁아서 120으로 변경             |
| tabWidth                   | 2           | 탭의 너비                                                               |
| useTabs                    | false       | 탭을 사용할지 여부                                                      |
| semi                       | true        | 세미콜론을 사용할지 여부. 끝을 확실하게 알 수 있도록 사용               |
| singleQuote                | true        | 싱글 쿼트를 사용할지 여부. 대부분의 경우에 싱글 쿼트를 사용             |
| quoteProps                 | "as-needed" | 프로퍼티 키를 쿼트할지 여부                                             |
| jsxSingleQuote             | true        | JSX에서 싱글 쿼트를 사용할지 여부. JSX에서는 대부분 싱글 쿼트를 사용    |
| trailingComma              | "es5"       | 라인 끝에 콤마를 사용할지 여부. ES5를 지원하는 브라우저에서 콤마를 사용 |
| bracketSpacing             | true        | 대괄호 주변의 공백을 사용할지 여부                                      |
| bracketSameLine            | false       | 대괄호를 같은 줄에 사용할지 여부                                        |
| arrowParens                | "avoid"     | 화살표 함수의 괄호를 사용할지 여부                                      |
| endOfLine                  | "lf"        | 줄 끝의 줄바꿈을 사용할지 여부. 라인피드 사용                           |
| embeddedLanguageFormatting | "auto"      | 내장된 언어 포맷팅을 사용할지 여부                                      |

## .eslintrc.mjs

ESLint 설정 파일로, TypeScript와 React 프로젝트에 맞춘 린팅 규칙을 정의합니다.

```js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] }, // 빌드 폴더 제외
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // JS와 TS 권장 규칙 적용
    files: ['**/*.{ts,tsx}'], // TypeScript 파일에만 적용
    languageOptions: {
      ecmaVersion: 2020, // ES2020 문법 지원
      globals: globals.browser, // 브라우저 전역 변수 허용
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // JSX 문법 지원
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks, // React Hooks 규칙
      'react-refresh': reactRefresh, // React Fast Refresh 지원
      react: react, // React 관련 규칙
      import: importPlugin, // import 구문 규칙
    },
    rules: {
      ...reactHooks.configs.recommended.rules, // React Hooks 권장 규칙
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }], // Fast Refresh를 위한 컴포넌트 export 규칙
      'react/react-in-jsx-scope': 'off', // React 17+ 자동 JSX 런타임으로 불필요
      'react/jsx-uses-react': 'off', // React 17+ 자동 JSX 런타임으로 불필요
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'], // import 순서 정의
          'newlines-between': 'always', // import 그룹 사이에 빈 줄 강제
        },
      ],
    },
    settings: {
      react: {
        version: 'detect', // React 버전 자동 감지
      },
    },
  },
  prettier // Prettier와 충돌하는 규칙 비활성화
);
```

## 그 외

그 외 파일은 검수하기 보다 AI가 생성해준 내용 그대로를 썼습니다.

## TSC를 통한 타입 체크

타입체크를 vite build에서는 하지 않는다는 것을 발견해서 tsc --noEmit을 추가했습니다.

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write ."
}
```

## rimraf를 활용한 클린과 bun create 전처리, 후처리

강사님의 템플릿을 참고하여 rimraf를 활용한 클린과 bun create 전처리, 후처리를 구현했습니다.

```json
"bun-create": {
    "preinstall": [],
    "postinstall": ["bunx rimraf -rf .git", "bunx rimraf -rf dist"],
    "start": "bun run dev"
  },

...

"scripts": {
  "clean": "rimraf dist"
}
```
