import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? '/yinxiang/' : '/',
  build: { outDir: mode === 'pages' ? 'dist-pages' : 'dist', sourcemap: false },
  define: { __PAGES__: JSON.stringify(mode === 'pages') },
}));
