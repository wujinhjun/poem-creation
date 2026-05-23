# Agent 开发指南

## 分支命名规则

采用 `type-developer-YYYYMMDD-description` 格式：

| type | 用途 |
|------|------|
| `feat-*` | 新功能开发 |
| `fix-*` | Bug 修复 |
| `refactor-*` | 代码重构 |
| `perf-*` | 性能优化 |
| `chore-*` | 辅助性改动（依赖、配置、文档） |

**developer** 为开发者标识，如 `wujinhjun`、`terrence` 等。

示例：
- `feat-wujinhjun-20260518-arch-refactor`
- `fix-terrence-20260523-rhyme-match-bug`
- `refactor-wujinhjun-20260523-review-followups`

## Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

feat(poem-parser): add fuzzy matching for rhyme detection
fix(editor): correct cursor position on delete
refactor(rhyme-book): extract tone lookup table
```

type 与分支 type 保持一致，scope 指向具体包或模块。

## Pull Request 流程

1. 从 `main` 创建分支：`git checkout -b feat-wujinhjun-20260523-my-feature`
2. 开发完成后 push 并创建 PR
3. PR 标题遵循 `feat: description` 格式
4. 合并后删除分支

## 代码审查注意事项

- Parser 核心保持纯函数风格，外部注入 RhymeDict 和 Template
- 分析管线步骤输入输出类型清晰
- 测试使用固定小字典夹具，无需每次异步加载大表
- CI 运行 `claude-commit-guard.mjs` 钩子检查 commit 格式