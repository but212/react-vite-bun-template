// Async utilities: sleep, debounce, throttle, retry

/**
 * 지정된 시간(밀리초) 동안 대기하는 Promise를 반환합니다.
 * @param ms 대기할 시간(밀리초)
 * @returns void를 반환하는 Promise
 */
export const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

/**
 * 함수 호출을 지연시켜 연속된 호출을 방지하는 디바운스 함수를 생성합니다.
 * @param fn 디바운스할 함수
 * @param wait 대기 시간(밀리초), 기본값 300ms
 * @returns 디바운스된 함수
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * 함수 호출 빈도를 제한하는 스로틀 함수를 생성합니다.
 * @param fn 스로틀할 함수
 * @param wait 최소 대기 시간(밀리초), 기본값 300ms
 * @returns 스로틀된 함수
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}

/**
 * 비동기 함수를 지정된 횟수만큼 재시도합니다.
 * @param fn 재시도할 비동기 함수
 * @param times 재시도 횟수, 기본값 3회
 * @param delay 재시도 간격(밀리초), 기본값 300ms
 * @returns 함수 실행 결과를 반환하는 Promise
 * @throws 모든 재시도가 실패한 경우 마지막 에러를 던집니다
 */
export async function retry<T>(fn: () => Promise<T>, times = 3, delay = 300): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < times - 1) await sleep(delay);
    }
  }
  throw lastErr;
}
