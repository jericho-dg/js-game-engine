import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/cloud-api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/cloud-api/, ''),
      },
    },
  },
});
