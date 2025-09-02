import { useEffect, useState } from 'react';

/**
 * 입력값을 디바운스하여 변경이 멈춘 후에만 최신값을 반환합니다.
 *
 * @param value 디바운스할 값
 * @param delay 디바운스 대기 시간(밀리초)
 * @returns 디바운스된 값
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
