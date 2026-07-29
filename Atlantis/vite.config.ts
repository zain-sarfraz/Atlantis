import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const root = path.resolve(__dirname)
const nm = (pkg: string) => path.resolve(root, 'node_modules', pkg)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@admin': path.resolve(root, '../admin/src'),
      // Single React copy when importing admin sources (admin has React 18)
      react: nm('react'),
      'react-dom': nm('react-dom'),
      'react-dom/client': nm('react-dom/client'),
      'react/jsx-runtime': nm('react/jsx-runtime'),
      'react/jsx-dev-runtime': nm('react/jsx-dev-runtime'),
      'react-router-dom': nm('react-router-dom'),
      'lucide-react': nm('lucide-react'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/rooms': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
