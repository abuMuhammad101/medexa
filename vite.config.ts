/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // "/" locally; the Pages workflow sets VITE_BASE=/medexa/
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // The workspace may sit under a redirected (virtualised) AppData path; keep paths as given.
  resolve: { preserveSymlinks: true },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
