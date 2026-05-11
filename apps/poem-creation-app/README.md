# poem-creation-app

诗词创作的 React Native 客户端包，当前使用 Expo managed workflow 初始化。

## 命令

```bash
pnpm --filter poem-creation-app start
pnpm --filter poem-creation-app ios
pnpm --filter poem-creation-app android
pnpm --filter poem-creation-app typecheck
```

## 当前边界

- 原生端只放轻量壳和同构编辑器占位，不直接复制 Web 页面代码。
- 编辑器纯逻辑从 `@poem/shared` 复用。
- 持久化、路由、正式 Composer UI 后续按 RN 平台能力单独实现。
