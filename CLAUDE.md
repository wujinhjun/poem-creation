# poem-creation

诗词创作应用，包含格律诗/词牌分析与创作工具。

> Agent 开发规范请参考 [agents.md](agents.md)

## 项目结构

```
poem-creation/
├── packages/
│   ├── apps/
│   │   ├── web/          # Web 端 (React)
│   │   └── mobile/       # RN/Expo 移动端
│   ├── core/
│   │   ├── poem-parser/  # 诗词解析核心（分词、匹配、校验）
│   │   ├── rhyme-book/   # 韵书数据
│   │   ├── editor-core/  # 编辑器核心逻辑
│   │   └── agent-client/ # Agent 客户端
│   ├── shared/           # Web/RN 共用类型与逻辑
│   └── config/           # 统一构建配置
├── docs/                 # 设计文档
└── scripts/              # 构建与发布脚本
```

## 核心依赖注入原则

Parser/分析核心无状态，不内部 await 加载韵书、不隐式读全局模板。调用方注入依赖。

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发 Web
pnpm test             # 运行测试
pnpm build            # 构建
```

## 常用路径

- 模板目录：`packages/core/poem-parser/data/`
- 韵书数据：`packages/core/rhyme-book/`
- 测试用例：`packages/core/poem-parser/tests/`