import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // workspace 包直接引用源码
    conditions: ["development"],
  },
  server: {
    fs: {
      // 允许访问 workspace 根目录
      allow: ["../.."],
    },
  },
});
