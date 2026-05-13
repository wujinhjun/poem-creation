# Parser TODO

## 技术债 & 代码清理

### 1. 清理 analyzer/types.ts 死类型
`CharCheckResult` 和 `ValidationResult` 只在自己文件内引用，全仓库无 import。validation.ts 实际用的是 `CharCheck` + `LineValidationSummary`。要么删掉，要么让 validation.ts 用上。

### 2. validation.ts 无用 import
`Diagnostic`、`LineValidationResult`、`Tone` 已不再使用（validateChar 重构后），应移除。

### 3. `_helpers.ts` 里的 `as any`
- `preferredType as any` —— preferredType 应该是 `PoemType`，但传进来的可能是 string
- `precedingRhymes?: any` / `adjacentLines?: any` —— 应换成 `AnalyzeLineContext` 里定义的类型

### 4. `analyzeStream` 调用方未更新
`_helpers.ts` 里的 `analyzeStream` wrapper 调 `getSentenceCharCounts` 但没有处理它现在对 Ci 抛错的情况（variantId 现在是必需的）。

## 功能增强

### 5. fuzzyMatchCi 支持格律模板
目前只匹配 CiTemplate。应扩展为也能匹配 MeterTemplate（律诗/绝句），返回统一的 `FuzzyMatchResult`，调用方不需要事先知道体裁。

### 6. fuzzyMatchCi 预过滤
818+ 词牌 × N 变体 = 数千次迭代，每次都查韵书。可以利用 `catalog.ts` 的 `filterCiByCharCount` 先按总字数过滤掉明显不匹配的模板，再进详细评分。

### 7. fuzzyMatchCi 加入韵脚一致性检查
目前只比对字数+平仄，没检查韵脚是否同韵部。对词牌来说韵脚一致性是强信号（如《水调歌头》多处押同一韵），加上可显著提升匹配置信度。

### 8. catalog.ts 与 fuzzyMatchCi 集成
`filterCiByCharCount(min, max)` 已有，但 fuzzyMatchCi 没用到。做一个 `fuzzyMatchFromCatalog(input, dict, options)` 便捷函数，自动从 catalog 加载词牌、按字数预过滤、再调 fuzzyMatchCi。

### 9. HANZI_RE 扩展 CJK 扩展 B+
目前覆盖基本平面 + 扩展 A（U+3400–4DBF）。扩展 B（U+20000–2A6DF）包含更多生僻字，部分古诗/词牌名可能用到。可以再加。

### 10. loadMeterTemplates 应该被 memoize
每次调用 `loadMeterTemplates()` 都新建 16 个对象。`catalog.ts` 的 `buildMeterCatalog()`、`findMeterTemplate()` 都各自调用一次。做个 `let _cache` + `if (!_cache)` 的 memo。

## 测试补充

### 11. fuzzyMatchCi 缺少真实词牌测试
现有测试用的是 `makeMinimalTemplate` 手工模板。应加一个用真实 `ci-tunes-bundle.json` 中词牌的测试（如用"水调歌头"的前几句来搜，应返回水调歌头排第一）。

### 12. stream.ts `isValid` 断言
PR review 提到的：现有 stream 测试验证了 mismatch 数据，但 `isValid: sentenceMismatches.length === 0` 的路径缺少显式断言（比如构造一个必有 mismatch 的输入，确认 isValid 为 false）。

### 13. validateChar 的 fixed+tone=null 行为变更需确认
旧逻辑 fixed+tone=null → Unknown，新逻辑 → Fail。这影响 `analyzeLineSync` 路径（以前给 Unknown 现在给 Fail）。需要确认调用方（RN app）没依赖旧行为。

## 性能

### 14. Ci 变体 flatten 重复计算
`flattenCiVariantLines`、`scoreCiVariant`、`applyCiVariantToAst`、`fuzzyMatchCi` 各自 flatten sections→lines。可以把 flatten 结果缓存到 variant 对象上，或者让 `CiTemplateVariant` 携带预计算的 flat lines。

### 15. runPipeline 对词牌也做 matchTemplate
`matchStep` 对 Meter 调用 `matchTemplate(ast, [template])`，但词牌分支直接 `scoreCiVariant`。如果 pipeline 已知 variantId，scoreCiVariant 就够了——但当前实现没问题，只是命名有点误导（matchStep 不再做"match"）。

## 文档

### 16. fuzzyMatchCi 使用示例
`analyzer/index.ts` 已导出类型，但缺 JSDoc 使用示例。README 可以考虑加上。
