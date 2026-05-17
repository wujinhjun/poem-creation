import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // 测试直接消费工作区包的源码，免去先构建
    alias: {
      '@poem/parser': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      '@poem/rhyme-book': fileURLToPath(
        new URL('../rhyme-book/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
