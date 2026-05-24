import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
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
