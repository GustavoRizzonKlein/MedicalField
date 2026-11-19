import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so Electron can load dist/index.html from disk (file://).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
