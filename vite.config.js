import { defineConfig } from 'vite';

// VITE_BASE_PATH is set in GitHub actions.
const base = process.env.VITE_BASE_PATH || './';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    outDir: 'dist'
  }
});
