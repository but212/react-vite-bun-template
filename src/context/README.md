# 컨텍스트 (Context)

이 디렉터리는 애플리케이션 전역에서 사용될 수 있는 리액트 컨텍스트 프로바이더와 훅을 관리합니다.

## `createContext` 팩토리

`src/context/create-context.tsx` 파일은 타입 안전한 범용 컨텍스트를 쉽게 생성할 수 있는 `createContext` 팩토리 함수를 제공합니다. 이 함수는 새로운 컨텍스트를 만들 때 발생하는 반복적인 코드를 줄여주고, Provider 외부에서 컨텍스트를 사용하는 실수를 방지합니다.

### 사용법

1. **컨텍스트 생성**: `createContext` 함수에 컨텍스트의 타입과 이름을 전달하여 훅과 프로바이더를 생성합니다.

   ```typescript
   // src/context/theme-context.ts
   import { createContext } from './create-context';

   type Theme = 'light' | 'dark';

   export const [useTheme, ThemeProvider] = createContext<Theme>('Theme');
   ```

2. **프로바이더로 감싸기**: 애플리케이션의 최상단이나 필요한 컴포넌트 트리 상단에서 생성된 `Provider`로 자식 컴포넌트를 감싸고 `value`를 전달합니다.

   ```tsx
   // src/App.tsx
   import { ThemeProvider } from './context/theme-context';

   function App() {
     return <ThemeProvider value='dark'>{/* ... other components */}</ThemeProvider>;
   }
   ```

3. **훅 사용하기**: 하위 컴포넌트에서 생성된 `useContext` 훅을 사용하여 컨텍스트 값을 가져옵니다.

   ```tsx
   // src/components/SomeComponent.tsx
   import { useTheme } from '../context/theme-context';

   function SomeComponent() {
     const theme = useTheme(); // 'dark'
     return <div className={theme}>...</div>;
   }
   ```
