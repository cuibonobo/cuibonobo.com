import path from 'path';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: path.resolve('./'),
    coverage: {
      enabled: false,
      all: true,
      exclude: ['**/*.config.*', '**/.rc.*', ...coverageConfigDefaults.exclude]
    },
    alias: {
      '@codec/': new URL('./codec/', import.meta.url).pathname
    }
  }
});
