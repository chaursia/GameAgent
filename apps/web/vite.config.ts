import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gameagent/plugins': path.resolve(__dirname, '../../packages/plugins/src/index.ts'),
      '@gameagent/game-core': path.resolve(__dirname, '../../packages/game-core/src/index.ts'),
      '@gameagent/ai-core': path.resolve(__dirname, '../../packages/ai-core/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // HTTP API routes
      '/game': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
