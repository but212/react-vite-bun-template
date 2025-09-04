import { useCallback, useState } from 'react';

/**
 * 불리언 상태를 손쉽게 토글할 수 있는 커스텀 훅입니다.
 *
 * @param initialState 초기 상태 값 (기본값: false)
 * @returns 현재 불리언 상태와 토글 함수의 배열 [state, toggle]
 *
 * @example
 * const [isOpen, toggleOpen] = useToggle();
 * // isOpen이 true/false로 토글됨
 */
export function useToggle(initialState = false) {
  const [state, setState] = useState(initialState);

  const toggle = useCallback((value?: boolean) => {
    setState(prevState => (value !== undefined ? value : !prevState));
  }, []);

  return [state, toggle] as const;
}
