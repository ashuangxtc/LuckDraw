import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@': path.resolve(__dirname, 'client/src')
    },
  },
  root: './client',
  server: {
    fs: { allow: [path.resolve(__dirname, 'shared'), path.resolve(__dirname, 'client')] },
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://luck-draw-nine.vercel.app', // 指向Vercel部署的API
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    outDir: '../dist'
  }
})
