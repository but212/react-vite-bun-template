/**
 * Vite 환경 변수를 가져오는 함수
 * @param key - 환경 변수 키
 * @param fallback - 환경 변수가 없을 때 사용할 기본값
 * @returns 환경 변수 값 또는 기본값
 * @throws {TypeError} key가 문자열이 아니거나, 허용된 키 패턴이 아닌 경우
 */
export function getEnv(key: string, fallback = ''): string {
  if (typeof key !== 'string') {
    throw new TypeError(`환경 변수 키는 문자열이어야 합니다. (got: ${typeof key})`);
  }
  // Vite 환경 변수는 일반적으로 'VITE_' 접두사를 가짐
  if (!/^VITE_[A-Z0-9_]+$/.test(key)) {
    throw new TypeError(`허용되지 않는 환경 변수 키입니다: ${String(key)}`);
  }
  const v = (import.meta.env as Record<string, unknown>)[key];
  return v != null ? String(v) : fallback;
}
