import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['@imgly/background-removal', 'onnxruntime-web'],
  },
})
