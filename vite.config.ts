import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(), // TypeScript path mapping 지원 (tsconfig.json의 paths 설정 사용)
    react(), // React SWC 플러그인 (빠른 컴파일)
  ],
  server: {
    port: 5173, // 개발 서버 포트
    // strictPort: true, // 포트가 사용 중일 때 다른 포트로 변경하지 않음
    // open: true, // 서버 시작 시 브라우저 자동 열기
  },
  // build: { 
  //   target: 'esnext', // 최신 ES 문법으로 빌드
  //   sourcemap: true   // 소스맵 생성 (디버깅용)
  // },
});