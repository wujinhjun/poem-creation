# @poem/editor-core

编辑器核心 —— 网格文档模型与输入处理的**纯逻辑**，从 `@poem/shared` 拆分而来。

## 职责

- 编辑器网格模型（`createEmptyEditorGrid`、`createEditorPatternSignature`）
- 输入处理（`normalizeEditorInput`、`writeEditorCharsAt`、`pasteEditorTextAt`）

不含任何 React / RN 概念。Web 与 RN 各自写一层薄 adapter 把本包状态映射到 UI。

## 规划

按 Notion「editor-core 职责边界」，后续将扩展为完整的文档模型 + 状态管理：
撤销/重做、`insert/delete/replace` 原子操作、注入 `poem-parser` 实例做实时校验。
