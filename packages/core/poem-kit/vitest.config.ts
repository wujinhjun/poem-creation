import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@poem/parser/catalog": fileURLToPath(
        new URL("../poem-parser/src/catalog.ts", import.meta.url),
      ),
      "@poem/parser/kernel": fileURLToPath(
        new URL("../poem-parser/src/kernel.ts", import.meta.url),
      ),
      "@poem/parser": fileURLToPath(
        new URL("../poem-parser/src/index.ts", import.meta.url),
      ),
      "@poem/rhyme-book": fileURLToPath(
        new URL("../rhyme-book/src/index.ts", import.meta.url),
      ),
    },
  },
});
