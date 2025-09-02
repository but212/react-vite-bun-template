import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * localStorage에 값을 저장하고 동기화하는 커스텀 훅입니다.
 *
 * @template T 저장할 값의 타입
 * @param key localStorage에 사용할 키
 * @param initialValue 초기값
 * @returns [저장된 값, 값 갱신 함수]
 *
 * @example
 * ```typescript
 * const [user, setUser] = useLocalStorage('user', { name: '', age: 0 });
 * ```
 *
 * @remarks
 * - 서버사이드 렌더링 환경에서는 localStorage 접근 없이 초기값만 반환합니다.
 * - 값이 변경될 때마다 localStorage에 자동 동기화됩니다.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
