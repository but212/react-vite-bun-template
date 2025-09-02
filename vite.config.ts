import tailwind from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig as defineVitestConfig } from 'vitest/config';

// Vitest 설정
const vitestConfig = defineVitestConfig({
  test: {
    globals: true, // 전역 API 사용 (describe, it, expect 등)
    environment: 'jsdom', // 테스트 환경을 jsdom으로 설정 (DOM 시뮬레이션)
    setupFiles: ['./src/test/setup.ts'], // 테스트 설정 파일
    // reporters: ['verbose'], // 테스트 결과 상세 리포터
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
      ],
    },
  },
});

const viteConfig = defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    tailwind(),
    basicSsl(),
    visualizer({ open: true, filename: 'dist/stats.html' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'React Vite Bun Template',
        short_name: 'ReactTemplate',
        description: 'A modern React template with Vite and Bun.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon.png',
            sizes: '64x64',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
    // strictPort: true,
    // open: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});

// Vite 설정과 Vitest 설정을 병합하여 내보냅니다.
export default mergeConfig(viteConfig, vitestConfig);
