/**
 * 词牌合并 / ID 清洗脚本
 *
 * 两种模式：
 * 1. 从 ci-tunes-index.json + ci-tunes/*.json 构建 → 不再使用（源文件已删除）
 * 2. 从 ci-tunes-bundle.json 重建 ID（当前模式）：基于 author 重命名 variant ID
 *
 * ID 命名规则：
 *   {词牌名}-{作者}体           （单一变体）
 *   {词牌名}-{作者}体{N}        （多版本，N 按原始顺序 1-indexed）
 *
 * 用法: node scripts/build-ci-bundle.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve("./data");
const BUNDLE_PATH = resolve(DATA_DIR, "ci-tunes-bundle.json");

const oldBundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf8"));
const newBundle = Object.create(null);

for (const [name, oldTune] of Object.entries(oldBundle)) {
  // 统计每个作者的出现次数
  const authorCounts = {};
  for (const v of oldTune.variants) {
    const a = v.author || "未知";
    authorCounts[a] = (authorCounts[a] || 0) + 1;
  }
  const authorRemain = { ...authorCounts };

  const newVariants = oldTune.variants.map((v) => {
    const author = v.author || "未知";
    const total = authorCounts[author];
    const seq = total > 1 ? total - authorRemain[author] + 1 : 0;
    authorRemain[author] -= 1;

    return {
      ...v,
      id: total <= 1
        ? `${name}-${author}体`
        : `${name}-${author}体${seq}`,
    };
  });

  newBundle[name] = { ...oldTune, variants: newVariants };
}

writeFileSync(BUNDLE_PATH, JSON.stringify(newBundle, null, 2));
console.log(`写入: ${BUNDLE_PATH}`);
console.log(`词牌数: ${Object.keys(newBundle).length}`);
console.log(`文件大小: ${(Buffer.byteLength(JSON.stringify(newBundle)) / 1024 / 1024).toFixed(1)} MB`);
