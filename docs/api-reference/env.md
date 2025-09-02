# `getEnv` 유틸리티

**경로**: `src/lib/utils/env.ts`

`getEnv` 함수는 Vite 환경에서 환경 변수를 안전하게 가져오는 역할을 합니다. `import.meta.env` 객체에 직접 접근하는 대신 이 함수를 사용하면, 키 유효성 검사와 기본값(fallback) 처리를 일관되게 수행할 수 있습니다.

## 함수 시그니처

```typescript
export function getEnv(key: string, fallback = ''): string;
```

## 주요 기능

- **안전한 접근**: `import.meta.env`에서 지정된 키의 값을 조회합니다.
- **기본값 제공**: 환경 변수가 설정되지 않았거나 `null` 또는 `undefined`일 경우, 지정된 `fallback` 값을 반환합니다. `fallback`이 없으면 빈 문자열(`''`)을 반환합니다.
- **키 유효성 검사**: Vite 환경 변수 규칙에 따라 키가 `VITE_` 접두사로 시작하고, 대문자, 숫자, 밑줄(`_`)로만 구성되었는지 검사합니다. 유효하지 않은 키는 `TypeError`를 발생시킵니다.
- **타입 보장**: 반환값은 항상 문자열로 변환됩니다.

## 파라미터

- `key` (`string`)
  - 가져올 환경 변수의 키입니다.
- `fallback` (`string`, 선택적, 기본값: `''`)
  - 환경 변수 값이 없을 때 반환할 기본값입니다.

## 반환값

- `string`
  - 조회된 환경 변수 값 또는 `fallback` 값을 문자열로 반환합니다.

## 예외

- `TypeError`: `key`가 문자열이 아니거나, `VITE_`로 시작하는 유효한 형식이 아닐 경우 발생합니다.

## 사용 예시

```typescript
import { getEnv } from '@/lib/utils/env';

// .env.local 파일에 VITE_API_URL="https://api.example.com"가 있다고 가정

// 환경 변수 가져오기
const apiUrl = getEnv('VITE_API_URL');
// 결과: "https://api.example.com"

// 기본값 사용하기
const nodeEnv = getEnv('VITE_NODE_ENV', 'development');
// VITE_NODE_ENV가 없으면 결과: "development"

// 유효하지 않은 키 (TypeError 발생)
try {
  getEnv('INVALID_KEY');
} catch (e) {
  console.error(e); // TypeError: 허용되지 않는 환경 변수 키입니다: INVALID_KEY
}
```
