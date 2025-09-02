/// <reference types="vitest" />

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Vitest 설정을 Vite 설정과 병합합니다.
// 이렇게 하면 플러그인을 포함한 Vite의 모든 설정을 테스트 환경에서도 동일하게 사용할 수 있습니다.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['node_modules/**', 'tests-e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        all: true,
        exclude: [
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/components/ui/**',
          'src/test/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.config.ts',
          '**/*.config.mjs',
          'tests-e2e/**',
          '.eslintrc.mjs',
        ],
      },
    },
  })
);
