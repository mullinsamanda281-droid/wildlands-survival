import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE ? '/' + process.env.GITHUB_PAGES_BASE.replace(/^\/+/, '') : '/',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});