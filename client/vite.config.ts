import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../dist' },
  server: { proxy: { '/v4': { target: 'http://localhost:3000' } } }
});
