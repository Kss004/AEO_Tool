import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'bun run build',
  installCommand: 'bun install',
  functions: {
    'app/api/analyze/route.ts': {
      maxDuration: 300,
    },
  },
};
