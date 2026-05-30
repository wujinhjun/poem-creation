/**
 * 重建 compact bundle —— 图算法安全多 base diff。
 *
 * 1. 计算每个变体的最优 base
 * 2. 构建依赖图，检测并打破循环
 * 3. 安全转换：每个变体的 base 保证为 full
 *
 * 用法: npx tsx scripts/rebuild-compact-bundle.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(APP_DIR, "../data");
const BUNDLE_PATH = resolve(DATA_DIR, "ci-tunes-bundle-compact.json");
const GZ_PATH = resolve(DATA_DIR, "ci-tunes-bundle-compact.json.gz");

const { computeDiff } = await import(
  "../src/templates/ci-compress.ts"
);

const raw = JSON.parse(readFileSync(BUNDLE_PATH, "utf8"));

let converted = 0;
let failed = 0;
let existingDeltas = 0;

for (const [tuneName, tune] of Object.entries(raw)) {
  const variants = tune.variants;
  if (!Array.isArray(variants) || variants.length < 2) continue;

  // 收集被已有 delta 引用的 base（必须保持 full）
  const referencedBases = new Set();
  for (const v of variants) {
    if (v?.kind === "delta" && v.base) {
      referencedBases.add(v.base);
      existingDeltas++;
    }
  }

  // 收集所有 full 变体 (index → variant)
  const fulls = [];
  for (let i = 0; i < variants.length; i++) {
    if (variants[i]?.kind === "full") fulls.push({ idx: i, id: variants[i].id });
  }
  if (fulls.length < 2) continue;

  const canonicalIdx = fulls[0].idx;

  // Step 1: 为每个非 canonical full 找到最优 base
  // candidate[i] = { baseIdx, editCount } or null (can't diff against anyone)
  const candidates = new Map(); // variantIdx → { baseIdx, edits }

  for (const { idx, id } of fulls) {
    if (idx === canonicalIdx) continue;
    if (referencedBases.has(id)) continue; // must stay full

    let bestBaseIdx = -1;
    let bestEdits = null;
    let bestCount = Infinity;

    // Prefer canonical
    const canonDiff = computeDiff(variants[canonicalIdx].sections, variants[idx].sections);
    if (canonDiff && canonDiff.length < bestCount) {
      bestEdits = canonDiff;
      bestBaseIdx = canonicalIdx;
      bestCount = canonDiff.length;
    }

    // Try other fulls
    for (const { idx: bi } of fulls) {
      if (bi === idx) continue;
      const diff = computeDiff(variants[bi].sections, variants[idx].sections);
      if (diff && diff.length < bestCount) {
        bestEdits = diff;
        bestBaseIdx = bi;
        bestCount = diff.length;
      }
    }

    if (bestEdits) {
      candidates.set(idx, { baseIdx: bestBaseIdx, edits: bestEdits });
    }
  }

  // Step 2: 构建依赖图并拓扑排序
  // variant A depends on B if A's base is B and B is also convertible
  // A can only be converted if B stays full (or B is also converted AFTER A)

  // 简化：找出所有"可安全转换"的变体
  // - 直接依赖 canonical 的 → 安全
  // - 依赖其他 full 的 → 如果那个 full 也被转换，则不安全

  // 标记哪些变体会保持 full
  const staysFull = new Set();
  staysFull.add(canonicalIdx);

  // 被引用的 base 保持 full
  for (const { idx, id } of fulls) {
    if (referencedBases.has(id)) staysFull.add(idx);
  }

  // 构建反向依赖图：每个 base 有哪些 variant 依赖它
  const dependents = new Map(); // baseIdx → [variantIdx]
  for (const [idx, cand] of candidates) {
    const deps = dependents.get(cand.baseIdx) || [];
    deps.push(idx);
    dependents.set(cand.baseIdx, deps);
  }

  // BFS/DFS 标记安全转换的变体
  // 从 canonical 和其他 staysFull 的变体出发，所有直接依赖它们的变体可以安全转换
  const safeToConvert = new Set();

  function markSafe(baseIdx) {
    const deps = dependents.get(baseIdx);
    if (!deps) return;
    for (const depIdx of deps) {
      if (safeToConvert.has(depIdx)) continue;
      safeToConvert.add(depIdx);
      // 转换后的变体不能作为 base（它是 delta，不在 canonical map 中）
      // 所以不递归
    }
  }

  for (const baseIdx of staysFull) {
    markSafe(baseIdx);
  }

  // Step 3: 应用安全转换
  for (const idx of safeToConvert) {
    const cand = candidates.get(idx);
    if (!cand) continue;

    const variant = variants[idx];
    variants[idx] = {
      kind: "delta",
      id: variant.id,
      author: variant.author,
      sketch: variant.sketch,
      base: variants[cand.baseIdx].id,
      edits: cand.edits,
    };
    converted++;
  }

  // 统计失败的
  for (const { idx, id } of fulls) {
    if (idx === canonicalIdx) continue;
    if (referencedBases.has(id)) continue;
    if (safeToConvert.has(idx)) continue;
    if (variants[idx]?.kind === "full") failed++;
  }
}

// Stats
let allFull = 0;
let allDelta = 0;
for (const tune of Object.values(raw)) {
  for (const v of tune.variants) {
    if (!v) continue;
    if (v.kind === "full") allFull++;
    else allDelta++;
  }
}

console.log(`Converted: ${converted}`);
console.log(`Failed (kept as full): ${failed}`);
console.log(`Existing deltas: ${existingDeltas}`);
console.log(`Final: ${allFull} full + ${allDelta} delta = ${allFull + allDelta} total`);
console.log(`Delta ratio: ${((allDelta / (allFull + allDelta)) * 100).toFixed(1)}%`);

// Write JSON
console.log(`\nWriting ${BUNDLE_PATH}...`);
writeFileSync(BUNDLE_PATH, JSON.stringify(raw));
const { size: jsonSize } = await stat(BUNDLE_PATH);
console.log(`  JSON: ${(jsonSize / 1024).toFixed(0)} KB`);

// Write gzip
console.log(`Writing ${GZ_PATH}...`);
await pipeline(createReadStream(BUNDLE_PATH), createGzip(), createWriteStream(GZ_PATH));
const { size: gzSize } = await stat(GZ_PATH);
console.log(`  gzip: ${(gzSize / 1024).toFixed(0)} KB`);

console.log("\nDone.");
