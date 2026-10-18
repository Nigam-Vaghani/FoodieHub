import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/users': {
        target: process.env.VITE_USER_SERVICE_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/restaurants': {
        target: process.env.VITE_RESTAURANT_SERVICE_URL || 'http://localhost:8002',
        changeOrigin: true,
      },
      '/api/orders': {
        target: process.env.VITE_ORDER_SERVICE_URL || 'http://localhost:8003',
        changeOrigin: true,
      },
      '/api/deliveries': {
        target: process.env.VITE_DELIVERY_SERVICE_URL || 'http://localhost:8004',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: process.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8005',
        changeOrigin: true,
      },
    },
  },
});
