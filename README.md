# react-vite-bun-template

[docs/project.md](docs/project.md)와 [docs/retrospect.md](docs/retrospect.md)에 계획 및 과정을 기록해두었습니다.

## 사용방법

```bash
bun create but212/react-vite-bun-template
```

## 포함된 요소

- React
- Vite
- TypeScript
- TailwindCSS
- ESLint
- Prettier
- Bun
- tailwind-merge
- clsx

## 유틸 함수

- `cn` (클래스 병합/중복 제거): `src/lib/utils/cn.ts`
- `getEnv` (환경변수 안전 조회): `src/lib/utils/env.ts`
- `sleep`, `debounce`, `throttle`, `retry`: `src/lib/utils/async.ts`
- `clamp`, `pick`, `omit`: `src/lib/utils/object.ts`

### 비트연산 유틸리티

- `BitUtils`: `src/lib/utils/bit-utils.ts`

자세한 예시는 docs/retrospect.md의 [유틸 함수 요약 표](docs/retrospect.md#유틸-함수-요약-표) 참고.

## 스크립트

- dev -> vite
- build -> tsc --noEmit && vite build (빌드 전 타입체크)
- preview -> vite preview
- lint -> eslint .
- lint:fix -> eslint . --fix
- format -> prettier --write .
- clean -> rimraf dist

## 라이센스

- 전체: CC0(퍼블릭 도메인) -> `bun create` 후에 `LICENSE`를 제거해주세요
- src/lib/utils/cn.ts: MIT
