import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
      '/claude-flow': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/claude-flow/, ''),
      },
      '/openclaw': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openclaw/, ''),
      },
      '/huggingface': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/huggingface/, ''),
      },
      '/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ''),
      },
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openai/, ''),
      },
    },
  },
})
