import { defineConfig } from 'prisma/config';
import path from 'node:path';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: `file:${path.join('prisma', 'dev.db')}`,
  },
});
