import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle everything into a single file — resolves all path aliases
  bundle: true,
  // Don't bundle node_modules dependencies
  // Don't strip the shebang — needed for `npx splice-mcp` to work
  banner: { js: '#!/usr/bin/env node' },
  external: [
    '@modelcontextprotocol/sdk',
    'axios',
    'zod',
  ],
  // Resolve the frontend's src/* path alias
  esbuildOptions(options) {
    options.alias = {
      'src': '../frontend/src',
    };
  },
});
