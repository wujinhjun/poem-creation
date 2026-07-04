import { defineConfig } from "vitest/config";

// 独立于 app 的 vite.config（不加载 react/tailwind/data-copy 插件）。
// 仅覆盖纯逻辑 util，故用 node 环境；workspace 包经 development 条件解析到源码。
export default defineConfig({
  resolve: {
    conditions: ["development"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
