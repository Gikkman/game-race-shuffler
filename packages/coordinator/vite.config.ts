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
      "/api": "http://localhost:8090",
      "/ws":  {
        target: 'ws://localhost:8090',
        ws: true,
      },
    }
  }
})
