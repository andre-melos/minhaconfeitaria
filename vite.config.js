import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Separa as bibliotecas em arquivos próprios (melhor cache e arquivos menores).
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          graficos: ['recharts'],
          interface: ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog', '@radix-ui/react-select',
            '@radix-ui/react-tabs', '@radix-ui/react-switch', '@radix-ui/react-radio-group', 'lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
});
