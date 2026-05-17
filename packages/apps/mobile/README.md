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

- 首页、作品夹、设置页、入口选择面板和编辑器已拆分。
- 编辑器纯逻辑从 `@poem/shared` 复用，RN 侧使用触控字格和原生 `TextInput`。
- 本地持久化通过 `PoemCreationDraftStore` 抽象，当前实现为 AsyncStorage。
- 模板、韵书和校验已接入 parser 数据与 kernel；外接键盘不作为移动端主路径。
