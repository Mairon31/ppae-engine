import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ppae-engine/' : '/',
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2022',
    outDir: 'dist/demo',
    emptyOutDir: true
  }
}));
