# poem-creation-web

诗词创作 Web 应用。提供实时逐字校验的填诗填词界面，支持近体诗（五绝/七绝/五律/七律 × 16 种格律）和词牌（818 首 × 2475 变体）。

## 运行

```sh
pnpm --filter poem-creation-web dev    # 开发服务器 (http://localhost:5173)
pnpm --filter poem-creation-web build  # 生产构建
```

## 组件

| 文件 | 职责 |
|------|------|
| `App.tsx` | 顶层状态：体裁/模板/变体/韵书选择，ci bundle 懒加载，分析调度 |
| `Composer.tsx` | 逐字创作格子：constraint 标签 + 输入框 + 实时校验 + 自动跳格 |
| `rhymeDict.ts` | 浏览器韵书：fetch `tone-lookup.json`（~200KB），实现 `RhymeDict` 接口 |

## 数据流

```
用户选择模板 + 变体
  │
  ├─ 诗体: loadMeterTemplates() → pattern → ToneConstraint[][]
  │
  └─ 词牌: fetch ci-tunes-bundle.json（首次 ~2MB gzip，浏览器缓存）
              → 提取变体 sections → 展平为 ToneConstraint[][]

pattern → Composer 渲染逐字格子
  │
  ├─ {type:"fixed"}   → 标签 "平"/"仄"
  ├─ {type:"flexible"} → 标签 "中"
  └─ {type:"rhyme"}   → 标签 "韵"（橙色）

用户输入汉字 → BrowserRhymeDict.lookup(char) → 实时校验
  │
  ├─ tone 匹配 constraint → 绿框 ✓
  ├─ tone 不匹配           → 红框 ✗
  └─ flexible              → 灰框

点击"分析" → analyzeSync(text, template, dict, { variantId })
```

## 数据资产

| 文件 | 大小 | 加载时机 | 用途 |
|------|------|----------|------|
| `ci-catalog.json` | 373KB → 编译进 bundle | 初始化 | 模板下拉列表 |
| `tone-lookup.json` | ~200KB | 初始化 | 浏览器韵书（实时查平仄） |
| `ci-tunes-bundle.json` | 8.7MB / ~2MB gzip | 选中词牌时 | 词牌完整格律 pattern |

## 校验规则

| 约束类型 | 格子标签 | 校验逻辑 |
|----------|----------|----------|
| `{type:"fixed", tone:Ping}` | 平 | 查字必须为平声 |
| `{type:"fixed", tone:Ze}` | 仄 | 查字必须为仄声 |
| `{type:"flexible"}` | 中 | 永远通过（灰框） |
| `{type:"rhyme"}` | 韵 | 查字非未知即通过（橙色标签，韵部一致性由`analyzeSync`最终校验） |
