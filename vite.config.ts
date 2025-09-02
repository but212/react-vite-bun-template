import tailwind from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
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

export default mergeConfig(viteConfig, vitestConfig);
