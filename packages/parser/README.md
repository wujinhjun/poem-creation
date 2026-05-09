# @poem/parser

中文古典诗词格律分析引擎。给定一首诗/词，查韵书标平仄，匹配格律模板，输出逐字合规报告。

## 包结构

```
@poem/parser          ← 全部导出（类型 + 纯函数 + 工具）
@poem/parser/kernel   ← 纯核态（零 fs/path 依赖，浏览器/Worker 可用）
@poem/parser/types    ← 仅核心类型
@poem/parser/loader   ← Node 环境韵书加载器（createRhymeDict）
```

## 快速开始

**Node 环境（从 JSON 加载韵书）：**

```ts
import { analyzeSync, loadMeterTemplates } from "@poem/parser/kernel";
import { createRhymeDict } from "@poem/parser/loader";

const tpl = loadMeterTemplates().find((m) => m.id === "wujue-zeqi")!;
const dict = await createRhymeDict("pingshui", "./data");

const r = analyzeSync("白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。", tpl, dict);
```

**浏览器 / 非 Node 环境（自定义韵书）：**

```ts
import { analyzeSync, loadMeterTemplates, RhymeDictType } from "@poem/parser/kernel";
import type { RhymeDict, RhymeEntry } from "@poem/parser/kernel";

class MyDict implements RhymeDict {
  type = RhymeDictType.Pingshui;  // 不是裸字符串 "pingshui"
  lookup(char: string): RhymeEntry[] { /* fetch / IndexedDB / 内存 Map */ }
  getRhymeGroup(char: string): string[] { /* ... */ }
  isSameRhyme(a: string, b: string): boolean { /* ... */ }
}

const r = analyzeSync(text, template, new MyDict());
```

---

# API 参考

## 主入口 `@poem/parser`

### 核心分析函数


| 函数                  | 签名                                                        | 说明                   |
| ------------------- | --------------------------------------------------------- | -------------------- |
| `analyzeSync`       | `(input, template, dict, options?) → AnalysisResult`      | 全诗分析。所有依赖注入，纯函数      |
| `analyzeLineSync`   | `(input, template, dict, context) → LineValidationResult` | 单行分析。支持注入相邻行做拗救上下文   |
| `analyzeStreamSync` | `(input, template, dict, options?) → StreamAnalyzeResult` | 流式逐字分析。输入不完整时只校验已有部分 |


### 工具函数


| 函数                   | 签名                                           | 说明                        |
| -------------------- | -------------------------------------------- | ------------------------- |
| `lex`                | `(input: string) → LexResult`                | 词法分析：标点标准化 → 按换行拆句 → 提取汉字 |
| `splitSentences`     | `(input: string) → string[]`                 | 按中文标点分句，词牌/流式场景用          |
| `annotate`           | `(lexResult, dict) → AnnotationResult`       | 音韵标注：逐字查韵书，标注平仄和韵部        |
| `matchTemplate`      | `(ast, templates) → MatchResult[]`           | 模板匹配：逐字对比 pattern，返回置信度排序 |
| `analyzeRescue`      | `(couplet, template, dict) → RescueDetail[]` | 拗救检测：本句自救/对句相救/三四互救/孤平救   |
| `loadMeterTemplates` | `() → MeterTemplate[]`                       | 返回 8 种硬编码格律模板（纯函数）        |
| `createCharNode`     | `(params) → CharNode`                        | 工厂：创建字符节点                 |
| `createLineNode`     | `(params) → LineNode`                        | 工厂：创建行节点                  |


### 报告函数


| 函数                | 签名                                  | 说明         |
| ----------------- | ----------------------------------- | ---------- |
| `toJSON`          | `(result: AnalysisResult) → string` | 格式化为 JSON  |
| `toAnnotatedText` | `(result: AnalysisResult) → string` | 逐字标平仄的文本格式 |
| `toCLI`           | `(result: AnalysisResult) → string` | 终端友好的命令行输出 |


### 类型

#### 分析结果


| 类型                     | 关键字段                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AnalysisResult`       | `ast`, `bestMatch`, `matchResults`, `complianceRate`, `fullyCompliant`, `isCompliant`, `ambiguities`, `diagnostics`, `lineValidations`, `summary` |
| `LineValidationResult` | `line`, `expectedPattern`, `actualTones`, `matchScore`, `diagnostics`, `ambiguities`, `rhymeCheck`, `rescues`, `contextHints`                     |
| `StreamAnalyzeResult`  | `templateId`, `totalSentences`, `sentenceCharCounts`, `segments`, `sentenceSummaries`                                                             |
| `StreamSegment`        | `segmentIndex`, `text`, `sentenceIndex`, `startCol`, `validation`                                                                                 |
| `MatchResult`          | `templateId`, `confidence`, `toneDeviations`                                                                                                      |


#### AST 节点


| 类型            | 关键字段                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PoemAST`     | `type` (PoemType), `lines`, `couplets?`, `sections?`, `templateId?`, `rhymeDictType`, `diagnostics`, `rhymeSequence?`                               |
| `LineNode`    | `raw`, `chars`, `charCount`, `globalLineIndex`, `isRhymeLine`, `rhymeChar?`, `expectedPattern?`, `coupletRole?`, `requiresDuizhang?`, `diagnostics` |
| `CharNode`    | `char`, `tone`, `toneOptions?`, `rhymeGroup?`, `position` (global/line/col), `expectedConstraint?`, `validationStatus?`                             |
| `CoupletNode` | `upper`, `lower`, `coupletIndex`, `requiresDuizhang`, `diagnostics`                                                                                 |
| `SectionNode` | `sectionIndex`, `name`, `lines`                                                                                                                     |


#### 模板类型


| 类型                  | 关键字段                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `MeterTemplate`     | `id`, `type` (PoemType), `name`, `charPerLine` (5|7), `lineCount` (4|8), `pattern`, `rhymeLineIndices` |
| `CiTemplate`        | `id`, `name`, `aliases?`, `variants`, `source?`                                                        |
| `CiTemplateVariant` | `id`, `name`, `sketch?`, `author?`, `sections`                                                         |
| `CiTemplateLine`    | `charCount`, `pattern`, `isRhymeLine`, `rhymeType?`, `rhymeSwitch?`                                    |
| `AnyTemplate`       | `MeterTemplate | CiTemplate`                                                                           |


#### 韵书接口


| 类型           | 关键字段                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `RhymeDict`  | interface: `type`, `lookup(char) → RhymeEntry[]`, `getRhymeGroup(char) → string[]`, `isSameRhyme(a, b) → boolean` |
| `RhymeEntry` | `char`, `tone` (Tone), `rhymeGroup`, `pronunciation?`                                                             |


#### 管道/工具类型


| 类型                      | 关键字段                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `LexResult`             | `lines`, `metadata` (totalLines, charsPerLine)                                                                           |
| `LexLine`               | `raw`, `chars`, `punctuation`                                                                                            |
| `AnnotationResult`      | `chars` (CharNode[][]), `ambiguities` (ToneAmbiguity[])                                                                  |
| `ToneAmbiguity`         | `char`, `position`, `options`, `suggestion?`                                                                             |
| `Diagnostic`            | `type` ("violation"|"rescue"|"info"|"ambiguity"), `severity`, `position`, `message`, `rescueInfo?`                       |
| `RescueDetail`          | `type` (RescueType), `naoPosition`, `jiuPosition`, `description`                                                         |
| `RhymeInfo`             | `lineIndex`, `char`, `rhymeGroup`, `tone`, `isConsistent`                                                                |
| `ResolvedLineTemplate`  | `templateId`, `expectedPattern`, `charCount`, `isRhymeLine`, `sectionInfo?`, `variantId?`                                |
| `LineValidationSummary` | `lineIndex`, `checkableCount`, `matchedCount`, `mismatchCount`, `nonAmbiguousMismatchCount`, `isCompliant`, `charChecks` |


#### 常量


| 常量                     | 成员                                           | 值                                                                         |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `Tone`                 | `Ping | Ze | Unknown`                        | `"平" | "仄" | "未知"`                                                        |
| `PoemType`             | `Lüshi | Jueju | Ci`                         | `"lüshi" | "jueju" | "ci"`                                                |
| `RhymeTone`            | `Ping | Ze`                                  | `"ping" | "ze"`                                                           |
| `CoupletRole`          | `Upper | Lower`                              | `"upper" | "lower"`                                                       |
| `SectionName`          | `ShangQue | XiaQue`                          | `"上阕" | "下阕"`                                                             |
| `RhymeDictType`        | `Pingshui | Cilin | Zhonghua`                | `"pingshui" | "cilin" | "zhonghua_new"`                                   |
| `CharValidationStatus` | `Pass | Fail | Flexible | Rescued | Unknown` | `"pass" | "fail" | "flexible" | "rescued" | "unknown"`                    |
| `RescueType`           | 联合类型                                         | `"benju-zijiou" | "duiju-xiangjiou" | "sansi-hujiou" | "guping-jiou"`     |
| `ToneConstraint`       | 联合类型                                         | `{ type:"fixed"; tone } | { type:"flexible" } | { type:"rhyme"; group? }` |


---

## 内核 `@poem/parser/kernel`

零 fs/path 依赖，浏览器/Worker/VS Code 可用。除主入口的全部核心函数外，额外暴露管线步骤：


| 函数                      | 说明                             |
| ----------------------- | ------------------------------ |
| `runPipeline`           | 运行完整 7 步管线，返回 `PipelineOutput` |
| `lexStep`               | 步骤 1：统一分词（诗体 lex / 词牌分句）       |
| `annotateStep`          | 步骤 2：音韵标注                      |
| `buildAst`              | 步骤 3：构建 PoemAST                |
| `matchStep`             | 步骤 4：模板/变体匹配                   |
| `applyTemplate`         | 步骤 5：将匹配到的模板写回 AST             |
| `resolveAmbiguities`    | 步骤 6：根据最佳匹配过滤多音字歧义             |
| `validate`              | 步骤 7：逐行校验，计算合规率                |
| `getTemplateType`       | 从模板 ID 推断诗歌体裁                  |
| `resolveLineTemplate`   | 解析单行对应的模板约束                    |
| `getSentenceCharCounts` | 从模板提取每句期望字数                    |


## 类型 `@poem/parser/types`

纯类型入口，仅导出 `core/types.ts` 中的 21 个类型/接口/常量（Tone、PoemType、PoemAST、LineNode 等），零运行时代码。

---

## 架构

```
用户输入 (string)
  │
  ▼
lex / splitSentences      ← 分词：标点标准化、拆句、提取汉字
  │
  ▼
annotate                  ← 音韵标注：查韵书 → 每字标平仄 + 韵部
  │
  ▼
buildAst                  ← 构建 AST（CharNode[] → LineNode[] → PoemAST）
  │
  ▼
matchStep                 ← 模板匹配：诗体比 pattern 置信度，词牌选最佳变体
  │
  ▼
applyTemplate             ← 将匹配到的模板写回 AST（expectedPattern、rhymeLine 等）
  │
  ▼
resolveAmbiguities        ← 多音字消歧：根据最佳模板过滤歧义
  │
  ▼
validate                  ← 逐行校验平仄 + 韵脚一致性 → 合规报告
  │
  ▼
AnalysisResult
```

## 加载器 `@poem/parser/loader`

Node 环境专用，从磁盘 JSON 构造韵书。


| 函数                | 签名                                                            | 说明                                   |
| ----------------- | ------------------------------------------------------------- | ------------------------------------ |
| `createRhymeDict` | `(type: RhymeDictType, dataDir: string) → Promise<RhymeDict>` | 异步加载韵书索引和音调查询表，返回 `JsonRhymeDict` 实例 |
| `clearRhymeCache` | `() → void`                                                   | 清空内部缓存（测试隔离用）                        |


## 自定义韵书

实现 `RhymeDict` 接口即可接入任意韵书系统：

```ts
import type { RhymeDict, RhymeEntry } from "@poem/parser/kernel";

class MyDict implements RhymeDict {
  type = "pingshui" as const;
  lookup(char: string): RhymeEntry[] { /* ... */ }
  getRhymeGroup(char: string): string[] { /* ... */ }
  isSameRhyme(a: string, b: string): boolean { /* ... */ }
}
```

## 自定义词牌（自度曲）

手写 `CiTemplate` 对象，传给 `analyzeSync`，与内置词牌同等对待：

```ts
import type { CiTemplate } from "@poem/parser/kernel";

const myTune: CiTemplate = {
  id: "自度曲·某某",
  name: "某某",
  variants: [{
    id: "v1",
    name: "正体",
    sections: [
      { name: "上阕", lines: [/* CiTemplateLine[] */] },
      { name: "下阕", lines: [/* CiTemplateLine[] */] },
    ],
  }],
};
```

