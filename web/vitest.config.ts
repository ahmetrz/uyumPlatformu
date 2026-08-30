import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  resolve: {
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/sahte/server-only.ts') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, 'tests/sahte/next-navigation.ts') },
      { find: 'next/headers', replacement: path.resolve(__dirname, 'tests/sahte/next-headers.ts') },
      { find: 'next/cache', replacement: path.resolve(__dirname, 'tests/sahte/next-cache.ts') },
      // hem '@/lib/db' hem göreli '../db' / './db' importları test ikizine gider
      { find: '@/lib/db', replacement: path.resolve(__dirname, 'tests/sahte/db.ts') },
      { find: /^(\.\.?\/)+db$/, replacement: path.resolve(__dirname, 'tests/sahte/db.ts') },
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
});
