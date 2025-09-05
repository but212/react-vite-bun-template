import { EnvError } from './errors';

/**
 * Vite 환경 변수를 가져오는 함수
 * @param key - 환경 변수 키 (VITE_ 접두사 필요)
 * @param fallback - 환경 변수가 없을 때 사용할 기본값
 * @returns 환경 변수 값 또는 기본값
 * @throws {EnvError} key가 문자열이 아니거나, 허용된 키 패턴이 아닌 경우
 * 
 * @example
 * ```typescript
 * // 기본 사용법
 * const apiUrl = getEnv('VITE_API_URL', 'http://localhost:3000');
 * 
 * // 에러 처리
 * try {
 *   const config = getEnv('VITE_APP_CONFIG');
 * } catch (error) {
 *   if (error instanceof EnvError) {
 *     console.error(`Environment error: ${error.code} - ${error.message}`);
 *   }
 * }
 * ```
 */
export function getEnv(key: string, fallback = ''): string {
  if (typeof key !== 'string') {
    throw EnvError.invalidKeyType(typeof key);
  }
  
  // Vite 환경 변수는 일반적으로 'VITE_' 접두사를 가짐
  if (!/^VITE_[A-Z0-9_]+$/.test(key)) {
    throw EnvError.invalidKeyPattern(key);
  }
  
  const v = (import.meta.env as Record<string, unknown>)[key];
  return v != null ? String(v) : fallback;
}
