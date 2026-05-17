# 诗词创作 App 设计说明

Web 端设计见 `docs/poem-creation-web-design.md`。本文只记录 React Native / Expo 客户端的页面、移动端输入、App 持久化和跨端复用边界。

## 目标

RN 客户端包位于 `apps/poem-creation-app`，使用 Expo managed workflow 初始化，不在仓库里直接生成 `ios/` 和 `android/` 原生目录。当前阶段优先验证移动端创作工作流、同构编辑器、数据模型和本地草稿，真正需要原生配置时再执行 prebuild。

RN 不追求和 Web 完全一致。移动端按原生工作流组织页面，优先照顾触控、中文输入法和小屏阅读。

## 工程初始化

- 包名：`poem-creation-app`，避免和旧占位 `apps/rn` 的 `@poem/rn` 重名。
- Expo SDK：使用 SDK 54 稳定组合，对应 React Native 0.81、React 19.1。
- 入口：`index.ts` 通过 `registerRootComponent` 注册 `src/App.tsx`。
- Metro：`metro.config.js` 增加 workspace root watch 和 node_modules 查找路径，让 pnpm workspace 中的 `@poem/*` 包可被 RN 解析。
- TypeScript：`tsconfig.json` 继承 `expo/tsconfig.base`，开启 strict，并保留 `@/*` 到 `src/*` 的路径别名。

## 页面结构

- `HomeScreen`：创作首页，只放开始新作、作品夹和设置入口。
- `EntryScreen`：入口选择面板，选择体裁、模板、变体和韵书；诗默认平水，词默认词林，选中模板后自动选第一个变体。
- `WorksScreen`：作品夹，支持搜索、打开、删除本机草稿。
- `SettingsScreen`：用户设置，目前维护默认署名。
- `EditorScreen`：正文编辑器，标题、题记、署名和字格放在同一张纸面上，分析结果也在编辑页内显示。

页面保持轻量壳，不直接复制 Web 页面状态树。编辑器交互走 RN 专属的 `TextInput` 和触控字格，但底层写入逻辑继续复用共享编辑器核心。

## 输入模型

RN 编辑器当前已经从占位演示推进为可输入组件：

- `components/RnComposer.tsx` 负责触控字格、当前格 `TextInput`、补位写入、删除、上一格/下一格和完成回调。
- 输入归一化放在 `utils/editorInput.ts`，RN 侧只把已确认的汉字写入格子，避免拼音组合串提前落格。
- iOS 拼音输入期间隐藏原生 `TextInput` caret，使用格子内固定视觉光标；汉字确认前光标不随拼音串移动，确认后才跳到下一字位。
- 写入、pattern signature、空 grid、多行粘贴仍复用 `@poem/shared`，RN UI 不重新实现编辑器核心算法。
- RN Composer 不在 mount 或父组件重渲染时主动把初始 grid 回写给父级，只在用户写入、粘贴或删除后触发 `onChange`。这样避免父级 `setDraft({ chars })` 造成编辑器反复重渲染并触发 maximum update depth。

当前 RN Composer 覆盖手机触控主路径。外接键盘方向键暂不做，移动端优先用触格、上一格、下一格和删除按钮完成定位。

## 模板、韵书与分析

RN 侧已经接入正式模板、变体、韵书和分析：

- 模板目录来自 `@poem/parser/catalog`。
- 诗体 pattern 复用 `loadMeterTemplates()`。
- 词牌完整 pattern 静态打包 `packages/parser/data/ci-tunes-bundle.json`，不依赖 Web 的 `/data` 路径。
- 入口模板搜索展示完整候选数量，不默认截断词牌；搜索框采用非受控 `TextInput` 接收输入，避免中文 IME 组合过程中被 state 回写打断。
- 韵书静态打包 `rhyme-char-index.json` 和 `tone-lookup.json`，由 `createAppDict()` 构造 RN 端 `RhymeDict`。
- 分析调用 `@poem/parser/kernel` 的 `analyzeSync()`，和 Web 共用同一内核。

## 持久化层

RN 本地持久化通过 `PoemCreationDraftStore` 抽象，不让页面直接依赖 AsyncStorage。当前实现是 `AsyncStorageDraftStore`：

- 草稿索引：`poem-creation-app:draft-index`。
- 当前草稿：`poem-creation-app:active-draft-id`。
- 草稿实体：`poem-creation-app:draft:{id}`。

后续如果接 SQLite、文件存储或后端同步，只需要新增 store 实现。RN UI 层保持面对同一套草稿接口。

## 技术实现

主要文件：

- `apps/poem-creation-app/src/App.tsx`：RN 应用入口、页面切换和全局状态。
- `apps/poem-creation-app/src/screens/HomeScreen.tsx`：移动端首页。
- `apps/poem-creation-app/src/screens/EntryScreen.tsx`：新作参数选择。
- `apps/poem-creation-app/src/screens/WorksScreen.tsx`：作品夹。
- `apps/poem-creation-app/src/screens/SettingsScreen.tsx`：用户设置。
- `apps/poem-creation-app/src/screens/EditorScreen.tsx`：编辑页、元数据表单、分析结果。
- `apps/poem-creation-app/src/components/RnComposer.tsx`：RN 字格编辑器，复用共享编辑器核心。
- `apps/poem-creation-app/src/persist/`：RN 草稿持久化接口与 AsyncStorage 实现。
- `apps/poem-creation-app/src/utils/templates.ts`：RN 模板、词牌视觉分组和变体文案。
- `apps/poem-creation-app/src/utils/rhymeDict.ts`：RN 端韵书封装。
- `packages/shared/src/editor/`：Web/RN 可复用的编辑器纯逻辑。

拆分原则：

- RN 页面组件只负责移动端布局、表单和事件出口，不直接耦合 AsyncStorage。
- Web 和 RN 共用 parser kernel、模板目录和 editor-core；平台差异只留在 UI、输入事件、样式和本地存储实现中。
- 移动端优先触控主路径，不为了追平 Web 键盘体验牺牲输入法稳定性。
