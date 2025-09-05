import { useCallback, useState } from 'react';

/**
 * 불리언 상태를 간편하게 토글할 수 있는 React 커스텀 훅입니다.
 *
 * @param initialState - 초기 불리언 상태 값 (기본값: `false`)
 * @returns `[state, toggle]` 형태의 튜플을 반환합니다.
 * - `state`: 현재 불리언 상태 값
 * - `toggle(value?: boolean)`: 상태를 반전하거나, 특정 값으로 설정하는 함수
 *
 * @example
 * ```tsx
 * const [isToggled, toggle] = useToggle();
 *
 * <button onClick={() => toggle()}>Switch</button>
 * <button onClick={() => toggle(true)}>Set True</button>
 * <button onClick={() => toggle(false)}>Set False</button>
 * ```
 *
 * @remarks
 * - `toggle()`을 호출하면 현재 상태가 반전됩니다.
 * - `toggle(true)`/`toggle(false)`로 명시적으로 상태를 설정할 수도 있습니다.
 * - 함수형 업데이트 패턴이 적용되어 이전 상태 기반 토글이 안전하게 처리됩니다.
 */
export function useToggle(initialState = false) {
  const [state, setState] = useState(initialState);

  const toggle = useCallback((value?: boolean) => {
    setState(prev => (value !== undefined ? value : !prev));
  }, []);

  return [state, toggle] as const;
}
