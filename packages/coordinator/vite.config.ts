import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "../server/html",
    target: 'esnext'
  },
  server: {
    proxy: {
      "/api": "localhost:47911",
      "/ws":  {
        target: 'ws://localhost',
        ws: true,
      },
    }
  }
})
