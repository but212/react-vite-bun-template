import { getEnv } from '@/lib/utils';

export const config = {
  app: {
    title: getEnv('VITE_APP_TITLE', 'React App'),
    version: getEnv('VITE_APP_VERSION', '1.0.0'),
  },
  api: {
    baseUrl: getEnv('VITE_API_URL', 'http://localhost:3001'),
    timeout: parseInt(getEnv('VITE_API_TIMEOUT', '5000')),
  },
} as const;
