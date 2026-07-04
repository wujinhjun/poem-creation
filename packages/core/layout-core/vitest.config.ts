import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@poem/editor-core": fileURLToPath(
        new URL("../editor-core/src/index.ts", import.meta.url),
      ),
    },
  },
});
