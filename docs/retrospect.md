# 프로젝트 회고

## 계획 및 사전 준비

해당 프로젝트에 들어가기에 앞서 어떤 의존성이 있어야 하는지 확인하기 위하여 AI의 도움을 받았습니다.
해당 프로젝트는 bun + react + vite + typescript + tailwindcss + eslint + prettier를 사용하여 구현하는 템플릿으로서
어떤 의존성을 필요로 하고 폴더 구조는 어떻게 되어야 하는지 확인하였습니다. 이 내용은 project.md에 기록하였습니다.

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

vite 설정 파일을 AI가 자동 생성해주긴 했지만

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: { port: 5173 }
})
```

이것을 그대로 사용하기에는 뭔가 부실해보였습니다. 쓰면서 trouble shooting해야 할 것 같습니다.
