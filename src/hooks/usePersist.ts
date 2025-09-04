import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from '../lib/utils/async';

/**
 * 커스텀 직렬화/역직렬화 함수 인터페이스입니다.
 *
 * @template T - 직렬화/역직렬화할 값의 타입
 */
export interface Serializer<T> {
  /**
   * 문자열을 객체로 변환하는 함수입니다.
   * @param value - 직렬화된 문자열 값
   * @returns 역직렬화된 값
   */
  parse: (value: string) => T;
  /**
   * 객체를 문자열로 변환하는 함수입니다.
   * @param value - 직렬화할 값
   * @returns 직렬화된 문자열
   */
  stringify: (value: T) => string;
}

/**
 * usePersist 훅을 위한 옵션 객체입니다.
 *
 * @template T - 상태 값의 타입
 */
export interface PersistOptions<T> {
  /**
   * 커스텀 직렬화/역직렬화 함수. 기본값은 JSON.parse/JSON.stringify 입니다.
   */
  serializer?: Serializer<T>;
  /**
   * localStorage 쓰기 디바운스 지연 시간(ms).
   * @default 300
   */
  debounceMs?: number;
  /**
   * 여러 탭 간 localStorage 동기화 활성화 여부.
   * @default true
   */
  syncAcrossTabs?: boolean;
}

/**
 * localStorage와 동기화되는 React 상태를 관리하는 커스텀 훅입니다.
 * 값이 변경되면 localStorage에 자동 저장되고, 여러 탭에서 동기화가 가능합니다.
 *
 * @template T - 상태 값의 타입
 * @param key - localStorage에 저장할 키
 * @param initialValue - 기본값 (localStorage에 값이 없거나 파싱에 실패할 때 사용)
 * @param options - 커스텀 직렬화, 디바운스, 동기화 옵션
 * @returns [value, setValue, removeValue, setValueImmediate] 튜플
 *
 * @example
 * ```typescript
 * const [user, setUser, removeUser] = usePersist('user', { name: '', age: 0 });
 * setUser({ name: 'alice', age: 23 });
 * removeUser();
 * ```
 *
 * @remarks
 * - 서버사이드 렌더링 환경에서는 localStorage에 접근하지 않고 초기값만 반환합니다.
 * - setValueImmediate(newValue)로 디바운스 우회 저장이 가능합니다.
 * - custom serializer를 통해 복잡한 객체/Map/Set 등도 지원할 수 있습니다.
 */
export default function usePersist<T>(key: string, initialValue: T, options: PersistOptions<T> = {}) {
  const {
    serializer = {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    debounceMs = 300,
    syncAcrossTabs = true,
  } = options;

  /**
   * 클라이언트(localStorage 사용 가능) 여부를 나타냅니다.
   */
  const isClient = typeof window !== 'undefined' && !!window.localStorage;

  /**
   * 내부 동기화 트리거 여부(ref)입니다. (무한 루프 방지)
   */
  const isInternalUpdate = useRef(false);

  /**
   * 현재 상태 값을 반환합니다.
   * localStorage에 값이 있으면 해당 값을 파싱해서 반환하고, 없거나 실패하면 초기값을 반환합니다.
   */
  const [value, setValue] = useState<T>(() => {
    if (!isClient) return initialValue;
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue != null ? serializer.parse(savedValue) : initialValue;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  /**
   * localStorage 쓰기를 디바운스합니다.
   */
  const debouncedWrite = useRef(
    debounce((...args: unknown[]) => {
      const [k, v] = args as [string, T];
      if (!isClient) return;
      try {
        localStorage.setItem(k, serializer.stringify(v));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Error setting localStorage key "${k}":`, error);
      }
    }, debounceMs)
  );

  /**
   * 값이 변경될 때 localStorage에 저장합니다. (디바운스 적용)
   */
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    debouncedWrite.current(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  /**
   * 여러 탭에서 localStorage가 변경되었을 때 상태를 동기화합니다.
   */
  useEffect(() => {
    if (!isClient || !syncAcrossTabs) return;

    /**
     * StorageEvent를 처리하여 값 동기화
     */
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        isInternalUpdate.current = true;
        if (e.newValue === null) {
          setValue(initialValue);
        } else {
          setValue(serializer.parse(e.newValue));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Error parsing storage event for key "${key}":`, error);
        isInternalUpdate.current = false;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue, serializer, syncAcrossTabs, isClient]);

  /**
   * 상태 값을 localStorage에서 제거하고, 초기값으로 리셋합니다.
   *
   * @example
   * removeValue();
   */
  const removeValue = useCallback(() => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
      setValue(initialValue);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, isClient]);

  /**
   * 즉시 localStorage에 저장하는 setter입니다. (디바운스 우회)
   * @param newValue - 새 값 또는 이전 값을 인자로 받는 함수
   *
   * @example
   * setValueImmediate({ name: 'bob', age: 22 });
   * setValueImmediate(prev => ({ ...prev, active: true }));
   */
  const setValueImmediate = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolvedValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;

        if (isClient) {
          try {
            localStorage.setItem(key, serializer.stringify(resolvedValue));
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`Error setting localStorage key "${key}" immediately:`, error);
          }
        }
        return resolvedValue;
      });
    },
    [key, serializer, isClient]
  );

  /**
   * [현재 값, setter, remove 함수, 즉시 setter] 튜플을 반환합니다.
   */
  return [value, setValue, removeValue, setValueImmediate] as const;
}
