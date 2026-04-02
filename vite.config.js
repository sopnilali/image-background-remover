import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  optimizeDeps: {
    include: ['@imgly/background-removal', 'onnxruntime-web'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        backgroundRemover: resolve(__dirname, 'background-remover/index.html'),
      },
    },
  },
})
