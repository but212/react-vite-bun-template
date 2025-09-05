/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

// Vitest 전용 설정 - 플러그인 타입 충돌을 방지하기 위해 최소한의 설정만 사용
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright 테스트 파일과 설정 파일들을 명시적으로 제외
    exclude: ['node_modules/**', 'tests-e2e/**', '**/*.config.ts', '**/*.config.mjs', 'playwright.config.ts'],
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
        '.eslintrc.mjs',
        'tests-e2e/**',
        'playwright.config.ts',
      ],
    },
  },
});
