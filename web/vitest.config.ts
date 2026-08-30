import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  resolve: {
    alias: {
      'server-only': path.resolve(__dirname, 'tests/sahte/server-only.ts'),
      'next/navigation': path.resolve(__dirname, 'tests/sahte/next-navigation.ts'),
      'next/headers': path.resolve(__dirname, 'tests/sahte/next-headers.ts'),
      'next/cache': path.resolve(__dirname, 'tests/sahte/next-cache.ts'),
      '@': path.resolve(__dirname),
    },
  },
});
