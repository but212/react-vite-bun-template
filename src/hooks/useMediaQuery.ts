import { useEffect, useState } from 'react';

/**
 * 미디어 쿼리의 매칭 여부를 반환하는 커스텀 훅입니다.
 *
 * @param query CSS 미디어 쿼리 문자열
 * @returns 현재 미디어 쿼리 일치 여부 (불리언)
 *
 * @example
 * ```typescript
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 * ```
 *
 * @remarks
 * - 서버사이드 렌더링 환경에서는 항상 false를 반환합니다.
 * - 미디어 쿼리 조건이 변경되면 자동으로 상태가 갱신됩니다.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQueryList.addEventListener('change', listener);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}
