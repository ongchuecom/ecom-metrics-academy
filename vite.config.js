import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ecom-metrics-academy/',
  build: { rollupOptions: { output: { manualChunks: { katex: ['katex'], react: ['react', 'react-dom'] } } } },
})
