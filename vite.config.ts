import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-')) return 'charts'
          if (id.includes('/node_modules/@tanstack/')) return 'tables'
          if (id.includes('/node_modules/react-router')) return 'router'
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/')) return 'react'
        },
      },
    },
  },
})
