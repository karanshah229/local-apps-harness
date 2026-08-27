import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5005',
        ws: true
      }
    }
  }
});
