# @poem/agent-client

Agent 客户端**纯逻辑层** —— 占位骨架，待开发。

## 规划职责

- **上下文采集** —— 从编辑器状态收集 prompt 所需上下文
- **请求构建** —— 组装发往 `@poem/server` 的 Agent 请求
- **流式解析** —— 解析服务端流式返回
- **对话状态** —— 维护多轮对话状态机

不含 React / RN 概念；Web 与 RN 各自在 `features/agent/` 里写薄 adapter。
