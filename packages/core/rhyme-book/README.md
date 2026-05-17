# @poem/rhyme-book

韵书数据加载与查询接口。从 `@poem/poem-parser` 拆分而来。

## 职责

- 加载韵书数据（`data/rhyme-char-index.json`、`data/tone-lookup.json`）
- 构造实现 `RhymeDict` 接口的查询对象，供 `@poem/parser` 内核注入使用

## 用法

```ts
import { createRhymeDict } from "@poem/rhyme-book";

// dataDir 可省略，默认使用本包内置 data/
const dict = await createRhymeDict("pingshui");
```

`RhymeDict` / `RhymeEntry` 接口类型由 `@poem/parser` 定义并导出（解析内核是接口的消费方，
依据依赖倒置原则由消费方持有抽象）；本包提供其 Node 环境的 JSON 实现。
