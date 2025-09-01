interface ImportMetaEnv {
  [key: string]: string | undefined;
}

/**
 * Vite 환경 변수를 가져오는 함수
 * @param key - 환경 변수 키
 * @param fallback - 환경 변수가 없을 때 사용할 기본값
 * @returns 환경 변수 값 또는 기본값
 */
export function getEnv<K extends keyof ImportMetaEnv>(key: K, fallback = ''): string {
  const v = import.meta.env[key];
  return typeof v === 'string' ? v : fallback;
}
