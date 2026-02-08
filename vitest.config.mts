import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['lib/**', 'components/**'],
      exclude: ['**/*.d.ts', '**/*.test.*', '__tests__/**'],
      thresholds: {
        // Per-glob thresholds enforce minimum coverage
        // Will raise as more tests are added (Phase 3+)
        'lib/**': { statements: 35 },
        'components/**': { statements: 50 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
