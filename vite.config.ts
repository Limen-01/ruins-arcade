import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  test: { environment: 'node', exclude: ['tests/browser/**', 'node_modules/**'], testTimeout: 60000 }
});
