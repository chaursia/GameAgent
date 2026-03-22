import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Fastify server in dev so the frontend
    // doesn't need to worry about CORS during development
    proxy: {
      '/game': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
