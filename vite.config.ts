import tailwind from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, mergeConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig as defineVitestConfig } from 'vitest/config';

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', 'dist/'],
    },
  },
});

const viteConfig = defineConfig({
  plugins: [
    tsconfigPaths(), // TypeScript path mapping 지원 (tsconfig.json의 paths 설정 사용)
    react(), // React SWC 플러그인 (빠른 컴파일)
    tailwind(), // Tailwind CSS 플러그인
    basicSsl(), // HTTPS 개발 서버 지원 (자동으로 HTTPS 활성화)
  ],
  server: {
    port: 3000, // 개발 서버 포트
    host: true, // 외부에서 접근 가능하도록 설정
    // strictPort: true, // 포트가 사용 중일 때 다른 포트로 변경하지 않음
    // open: true, // 서버 시작 시 브라우저 자동 열기
  },
  build: {
    target: 'esnext', // 최신 ES 문법으로 빌드
    sourcemap: true, // 소스맵 생성 (디버깅용)
  },
});

export default mergeConfig(viteConfig, vitestConfig);
