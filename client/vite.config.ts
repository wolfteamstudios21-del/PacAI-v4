import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // THIS IS THE ONLY LINE THAT MATTERS RIGHT NOW
      '@': path.resolve(__dirname, './src'),

      // Optional nice-to-haves (keep if you use them)
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: false,
  },
})
