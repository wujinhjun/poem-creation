import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
