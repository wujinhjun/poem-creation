# ci-examples-bundle.json —— 词牌例词数据（首版，源自钦定词谱）

由 `../scripts/build-ci-examples.py` 从钦定词谱 `qdcp-canonical.json` 生成。
**只做一件事：把例词文字关联到 poem-creation 变体 id。** 作者/sketch/平仄/分阕/韵脚
等已存于 `ci-catalog.json`、`ci-tunes-bundle-compact.json`，此处不重复。

## Schema

```jsonc
{
  // 变体 id → 分句例词文字列表
  "定风波-欧阳炯体1": [
    "暖日闲窗映碧纱", "小池春水浸明霞", "数树海棠红欲尽", "争忍", "玉闺深掩过年华",
    "独凭绣床方寸乱", "肠断", "泪珠穿破脸边花", "邻舍女郎相借问", "音信", "教人羞道未还家"
  ],
  // 句内「读（逗）」直接内嵌为「，」
  "洞仙歌-苏轼体1": [ "冰肌玉骨", "自清凉无汗", "水殿风来暗香满", "绣帘开，一点明月窥人", ... ]
}
```

- 数组每个元素 = **一句**，按序**对齐格律行**（格律给平仄/韵/分阕，例词给字）。
- 句内逗内嵌；对齐格律格子时把「，」去掉即可。
- 首版仅含**自校验通过**（字数、句数与 sketch 一致）的 1446 个变体。

## 不放这里的（另议 / 另处）

- **换韵组**、句读的"格律"语义：属格律信息，后续单独安置（compact bundle 或独立文件），不进例词 bundle。
- **未匹配 / 待复核清单**：是中间过程产物，写到 qdcp 输入目录（仓库外），**不入库**。

## 重新生成

```bash
python3 ../scripts/build-ci-examples.py \
  --qdcp /path/to/qdcp-canonical.json
# 产出 ci-examples-bundle.json（入库）+ 同目录下 ci-examples-todo.csv（仓库外，不入库）
```

> qdcp 是 OCR 版钦定词谱，其自带 cleanText 仅约 44% 对齐 sketch 字数（和声衬字/漏字/错字）。
> 本脚本按「句/韵断句、读作句内逗、按 sketch 句数分阕」重建并**自校验字数+句数**，不产出对不齐的变体。
