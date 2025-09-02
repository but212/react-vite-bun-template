import React from 'react';

/**
 * 타입 안전성을 보장하고 Provider 외부에서 사용 시 에러를 발생시키는
 * 범용 리액트 컨텍스트를 생성하는 팩토리 함수입니다.
 *
 * @template T - 컨텍스트가 관리할 값의 타입입니다.
 * @param {string} contextName - 디버깅 시 사용할 컨텍스트의 이름입니다.
 * @returns {[() => T, React.FC<React.PropsWithChildren<{ value: T }>>]} - [useContext 훅, Provider 컴포넌트] 튜플을 반환합니다.
 *
 * @example
 * // 1. 컨텍스트 생성
 * const [useTheme, ThemeProvider] = createContext<string>('Theme');
 *
 * // 2. 앱 최상단 또는 필요한 곳에서 Provider로 감싸기
 * function App() {
 *   return (
 *     <ThemeProvider value="dark">
 *       <MyComponent />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // 3. 하위 컴포넌트에서 훅 사용하기
 * function MyComponent() {
 *   const theme = useTheme(); // "dark"
 *   // ...
 * }
 */
export function createContext<T>(contextName: string) {
  const Context = React.createContext<T | undefined>(undefined);

  const useContext = () => {
    const contextValue = React.useContext(Context);
    if (contextValue === undefined) {
      throw new Error(`use${contextName} must be used within a ${contextName}Provider`);
    }
    return contextValue;
  };

  const Provider: React.FC<React.PropsWithChildren<{ value: T }>> = ({ children, value }) => {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  // Provider의 displayName 설정 (React 개발자 도구에서 유용)
  Provider.displayName = `${contextName}Provider`;

  return [useContext, Provider] as const;
}
