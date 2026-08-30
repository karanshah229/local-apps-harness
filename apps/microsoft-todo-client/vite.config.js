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
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5005',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Silently handle socket drops when backend restarts or is offline
            if (err.code !== 'ECONNRESET' && err.code !== 'ECONNREFUSED' && err.code !== 'EPIPE') {
              console.error('Socket proxy error:', err);
            }
          });
        },
      },
    },
  },
});
