# 컴포넌트 개발 가이드

이 문서는 프로젝트의 React 컴포넌트를 작성하기 위한 규칙과 모범 사례를 제공합니다.

## 컴포넌트 구조

모든 컴포넌트는 `src/components` 디렉터리 내에 위치합니다.

- **`src/components/ui/`**: 재사용 가능한 가장 작은 단위의 UI 요소 (e.g., `Button`, `Input`, `Card`). 이 컴포넌트들은 자체적인 상태를 거의 갖지 않으며, `props`를 통해 제어됩니다.
- **`src/components/features/`**: 특정 기능이나 도메인과 관련된 복합 컴포넌트 (e.g., `UserProfile`, `ProductList`). 이 컴포넌트들은 여러 `ui` 컴포넌트를 조합하고, 비즈니스 로직 및 상태 관리와 상호작용합니다.
- **`src/components/layout/`**: 페이지 구조를 정의하는 컴포넌트 (e.g., `Header`, `Footer`, `Sidebar`).

## 스타일링

- **TailwindCSS 우선**: 모든 스타일링은 TailwindCSS 유틸리티 클래스를 사용하는 것을 원칙으로 합니다.
- **`cn` 유틸리티**: 조건부 또는 동적 클래스를 적용할 때는 `src/lib/utils/cn.ts`의 `cn` 함수를 사용합니다.
- **CSS-in-JS 지양**: 특별한 사유가 없는 한, `styled-components`나 `emotion` 같은 CSS-in-JS 라이브러리 사용을 지양하여 런타임 오버헤드를 줄입니다.

```tsx
import { cn } from '@/lib/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ className, variant, ...props }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md';
  const variantClasses = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-200 text-black',
  };

  return <button className={cn(baseClasses, variant && variantClasses[variant], className)} {...props} />;
}
```

## 상태 관리

- **지역 상태**: 컴포넌트 내부에서만 사용되는 상태는 `useState`, `useReducer`를 사용합니다. (e.g., 입력 폼의 값)
- **전역 상태**: 여러 컴포넌트에서 공유되거나 앱 전반에 영향을 미치는 상태는 `Zustand` 스토어를 사용합니다. 컴포넌트가 직접 스토어를 구독하도록 합니다.
- **서버 상태**: API로부터 받아오는 데이터는 `React Query`나 `SWR` 같은 서버 상태 관리 라이브러리 사용을 권장합니다. (현재 템플릿에는 미포함)

## Props 설계

- **`interface` 사용**: `props`의 타입은 `interface`로 정의합니다.
- **명확성**: `boolean` `prop`은 `isOpen`, `isDisabled`와 같이 명확한 이름으로 지정합니다.
- **스프레드 속성**: `...props`를 사용하여 네이티브 HTML 속성(e.g., `onClick`, `id`)을 컴포넌트의 루트 요소로 전달할 수 있도록 합니다.
