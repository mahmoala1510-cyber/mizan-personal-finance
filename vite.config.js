import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['Android >= 7', 'Chrome >= 64', 'Samsung >= 8'],
      modernPolyfills: true,
      renderLegacyChunks: true
    })
  ]
});
