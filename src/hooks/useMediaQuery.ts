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
  // 미디어 쿼리 일치 여부 상태
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // 브라우저 환경이 아닌 경우 처리
    if (typeof window === 'undefined') return;

    // 미디어 쿼리 객체 생성
    const mediaQueryList = window.matchMedia(query);

    // 변경 이벤트 리스너(한글: 미디어 쿼리 일치 여부가 변경될 때 호출)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // 초기 상태 설정
    setMatches(mediaQueryList.matches);

    // 이벤트 리스너 등록
    mediaQueryList.addEventListener('change', listener);

    // 언마운트 시 리스너 해제
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  // 미디어 쿼리 일치 여부 반환
  return matches;
}
