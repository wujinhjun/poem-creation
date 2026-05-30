import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(fileURLToPath(import.meta.url));

const dataAssets = [
  {
    from: "../../core/poem-parser/data/ci-tunes-bundle-compact.json",
    to: "data/ci-tunes-bundle-compact.json",
  },
  {
    from: "../../core/poem-parser/data/ci-tunes-bundle-compact.json.gz",
    to: "data/ci-tunes-bundle-compact.json.gz",
  },
  {
    from: "../../core/rhyme-book/data/rhyme-char-index.json",
    to: "data/rhyme-char-index.json",
  },
  {
    from: "../../core/rhyme-book/data/tone-lookup.json",
    to: "data/tone-lookup.json",
  },
  {
    from: "../../core/rhyme-book/data/yun-family-index.json",
    to: "data/yun-family-index.json",
  },
];

function copyPublicDataAssets() {
  for (const asset of dataAssets) {
    const target = resolve(APP_DIR, "public", asset.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(APP_DIR, asset.from), target);
  }
}

function poemDataAssetsPlugin() {
  return {
    name: "poem-data-assets",
    configResolved: copyPublicDataAssets,
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [poemDataAssetsPlugin(), react(), tailwindcss()],
  resolve: {
    // workspace 包直接引用源码
    conditions: ["development"],
  },
  server: {
    fs: {
      // 允许访问 workspace 根目录（packages/apps/web → 上溯三级）
      allow: ["../../.."],
    },
  },
});
