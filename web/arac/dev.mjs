import { spawn } from 'node:child_process';

// Accept the supervised preview's Vite-style flags without changing the Next.js stack.
const args = process.argv.slice(2);
const preview = args.includes('--strictPort');
const forwarded = args.filter(arg => arg !== '--strictPort').map(arg => arg === '--host' ? '--hostname' : arg);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...forwarded], {
  stdio: 'inherit',
  env: { ...process.env, ...(preview ? { NEXT_PUBLIC_DEMO: '1' } : {}) },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
