# 스타일링 가이드

이 문서는 TailwindCSS를 사용한 프로젝트의 스타일링 규칙과 모범 사례를 설명합니다.

## 기본 원칙

- **유틸리티 우선(Utility-First)**: 모든 스타일은 가급적 TailwindCSS의 유틸리티 클래스를 조합하여 작성합니다. 이는 일관성을 유지하고 CSS 파일 크기를 최소화하는 데 도움이 됩니다.
- **`@apply` 지양**: 커스텀 CSS 파일에서 `@apply`를 사용하여 유틸리티를 조합하는 것은 꼭 필요한 경우(예: 여러 곳에서 반복되는 복잡한 스타일 패턴)로 제한합니다. 컴포넌트 내에서 클래스를 직접 조합하는 것이 더 명확합니다.
- **전역 스타일 최소화**: `src/styles/main.css`에는 `body` 태그나 기본 폰트 설정 등 정말로 필요한 최소한의 전역 스타일만 정의합니다.

## TailwindCSS 설정

설정 파일은 `tailwind.config.mjs`입니다. 주요 설정 내용은 다음과 같습니다.

- **`content`**: Tailwind가 클래스를 스캔할 파일 경로를 지정합니다. `src/**/*.{js,ts,jsx,tsx}` 내의 모든 파일을 대상으로 합니다.
- **`theme.extend`**: 프로젝트의 디자인 시스템에 맞게 색상, 폰트, 간격 등을 확장하거나 재정의합니다. 새로운 색상이나 폰트를 추가할 때는 이 섹션을 수정합니다.

```javascript
// tailwind.config.mjs

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## 클래스 관리

### `cn` 유틸리티

동적 또는 조건부 클래스를 적용해야 할 때는 `clsx`와 `tailwind-merge`를 조합한 `cn` 유틸리티 함수(`src/lib/utils/cn.ts`)를 사용합니다. 이 함수는 조건부 클래스를 쉽게 적용하고, 충돌하는 Tailwind 클래스를 지능적으로 병합해줍니다.

```tsx
import { cn } from '@/lib/utils/cn';

function Alert({ isError, children }) {
  const alertClasses = cn(
    'p-4 rounded-md',
    {
      'bg-red-100 text-red-800': isError,
      'bg-blue-100 text-blue-800': !isError,
    }
  );

  return <div className={alertClasses}>{children}</div>;
}
```

### 클래스 순서

일관성 유지를 위해 Prettier 플러그인(`prettier-plugin-tailwindcss`)이 자동으로 클래스 순서를 정렬합니다. 커밋하기 전에 코드를 포맷팅하여 항상 정돈된 클래스를 유지하세요.
