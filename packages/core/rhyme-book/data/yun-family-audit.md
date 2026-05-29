# 叶韵 Family 数据 Audit

- 生成时间：2026-05-27
- 数据来源：词林正韵（rhyme-char-index.json 中 dictType=cilin 条目）
- 输出文件：`data/yun-family-index.json`

## 数据概况

| 指标 | 数值 |
|------|------|
| 索引字符总数 | 5,033 |
| 平声字符 | 2,170 |
| 仄声字符（上/去） | 1,994 |
| 入声字符 | 869 |
| Family 总数 | 19 |

## Family 结构

词林正韵 19 部，每部为一个叶韵 family：

| Family ID | 词林正韵部 | 声调范围 | 叶韵规则 |
|-----------|-----------|---------|---------|
| bu-01 ~ bu-14 | 第 1-14 部 | 平 + 仄（上/去） | 同部不同调可叶韵 |
| ru-15 ~ ru-19 | 第 15-19 部 | 入声 | 入声独立，仅入声间可叶韵 |

### 各 Family 字符数

部 1-14 每个 family 包含平声和仄声两个子集，同一 family 内平仄字符可以叶韵。

## 数据生成方法

1. 从 `rhyme-char-index.json` 提取所有 `dictType: "cilin"` 条目
2. 解析 `rhymeGroup` 字段（格式：`第X部-平声` / `第X部-仄声` / `第X部-入声`）
3. 将同部平声和仄声归入同一个 `bu-XX` family
4. 入声独立归入 `ru-XX` family
5. 多音字取第一个 cilin 条目

生成脚本：`scripts/build-yun-family.mjs`

## 已知限制

1. **上/去未细分**：词林正韵将上声和去声合并为"仄声"，无法区分。对叶韵判断无影响（上/去均为仄）。
2. **多音字简化**：多音字可能属于不同部，目前取 cilin 的第一个条目。后续可升级为多 family 支持。
3. **入声叶韵边界**：部分词牌（如《念奴娇》）入声可与平仄叶韵，目前入声独立处理可能过于严格。
4. **未覆盖字符**：rhyme-char-index.json 中无 cilin 条目的字符不在 family 索引中。

## Corpus 叶韵现状

当前 corpus 中暂无 `+p` / `+z` 叶韵标记的 DSL 行。叶韵 family 数据的落地为后续 PR-12（API）和 PR-13（cross-tone cohort validation）提供基础。

## 后续建议

- PR-12: 基于此数据实现 `RhymeDict.yunjieFamilyOf(char)` API
- PR-13: 在 `validateRhymeCohorts` 中使用 family 数据替换 cross-tone info 跳过逻辑
- 数据增强: 人工 review 多音字归属；补充《词林正韵》未覆盖的冷僻字
