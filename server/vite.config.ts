import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react.js';  // Note the .js extension

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});