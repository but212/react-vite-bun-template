import { getEnv } from '@/lib/utils';

/**
 * 애플리케이션 환경별 설정 객체
 * 환경 변수는 Vite의 import.meta.env에서 읽어오며, 기본값을 제공합니다.
 */
export const config = {
  /** 앱 관련 설정 */
  app: {
    /** 애플리케이션 타이틀 */
    title: getEnv('VITE_APP_TITLE', 'React App'),
    /** 애플리케이션 버전 */
    version: getEnv('VITE_APP_VERSION', '1.0.0'),
  },
  /** API 서버 관련 설정 */
  api: {
    /** API 서버 기본 URL */
    baseUrl: getEnv('VITE_API_URL', 'http://localhost:3001'),
    /** API 요청 타임아웃(ms) */
    timeout: parseInt(getEnv('VITE_API_TIMEOUT', '5000')),
  },
} as const;
