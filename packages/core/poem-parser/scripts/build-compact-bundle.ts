/**
 * 构建紧凑格式 ci-tunes-bundle.json
 *
 * 从现有 materialized bundle 转换为：
 * 1. 紧凑 ASCII DSL 编码（F/P/Z/p/z/+p/+z）
 * 2. Canonical + EditOp delta 变体压缩
 * 3. 拆出 ci-source-bundle.json（钦定词谱原文）
 * 4. 等价性验证：round-trip 后逐字位比对
 *
 * 用法: npx tsx scripts/build-compact-bundle.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 从 src 源码直接导入（tsx 支持 TypeScript）
import { parseLineDSL, encodeLineDSL, extractRhymeToken } from "../src/templates/dsl.js";
import {
  computeDiff,
  applyEdits,
  materializeVariant,
} from "../src/templates/ci-compress.js";
import type {
  CiVariantFull,
  CiVariantDelta,
  CiVariantStored,
  CiSectionStored,
  EditOp,
} from "../src/templates/ci-compress.js";

// ---- 类型定义 ----

interface OldLine {
  charCount: number;
  pattern: Array<{ type: string; tone?: string; group?: string }>;
  isRhymeLine: boolean;
  rhymeType?: "ping" | "ze";
  rhymeSwitch?: "ping" | "ze";
}

interface OldSection {
  name: string;
  lines: OldLine[];
}

interface OldVariant {
  id: string;
  name?: string;
  sketch?: string;
  author?: string;
  source?: string;
  rhymeType?: "ping" | "ze" | "mixed";
  sections: OldSection[];
}

interface OldTune {
  id: string;
  name: string;
  aliases?: string[];
  variants: OldVariant[];
}

interface NewTune {
  id: string;
  name: string;
  aliases?: string[];
  variants: CiVariantStored[];
}

// ---- 路径 ----

const DATA_DIR = resolve("./data");
const OLD_BUNDLE_PATH = resolve(DATA_DIR, "ci-tunes-bundle.json");
const NEW_BUNDLE_PATH = resolve(DATA_DIR, "ci-tunes-bundle-compact.json");
const SOURCE_BUNDLE_PATH = resolve(DATA_DIR, "ci-source-bundle.json");

// ---- 工具函数 ----

/** 比较两个 CiSectionStored[] 是否完全一致 */
function sectionsEqual(a: CiSectionStored[], b: CiSectionStored[]): boolean {
  if (a.length !== b.length) return false;
  for (let si = 0; si < a.length; si++) {
    const sa = a[si];
    const sb = b[si];
    if (sa.lines.length !== sb.lines.length) return false;
    for (let li = 0; li < sa.lines.length; li++) {
      if (sa.lines[li] !== sb.lines[li]) return false;
    }
  }
  return true;
}

// ---- 主流程 ----

console.log("读取现有 bundle...");
const oldBundle: Record<string, OldTune> = JSON.parse(
  readFileSync(OLD_BUNDLE_PATH, "utf8"),
);

const newBundle: Record<string, NewTune> = Object.create(null);
const sourceBundle: Record<string, string> = Object.create(null);

let totalVariants = 0;
let deltaCount = 0;
let fullCount = 0;
let diffTooLargeCount = 0;
let sourceBytes = 0;

for (const [tuneName, oldTune] of Object.entries(oldBundle)) {
  // Step 1: 将所有变体转为 compact DSL 的 CiVariantFull
  const compactVariants: CiVariantFull[] = oldTune.variants.map((v) => {
    // 提取 source
    if (v.source) {
      sourceBundle[v.id] = v.source;
      sourceBytes += Buffer.byteLength(v.source, "utf8");
    }

    return {
      kind: "full" as const,
      id: v.id,
      author: v.author,
      sketch: v.sketch,
      rhymeType: v.rhymeType,
      sections: v.sections.map((sec) => ({
        lines: sec.lines.map((line) =>
          encodeLineDSL(
            line.pattern as any,
            {
              isRhymeLine: line.isRhymeLine,
              rhymeTone: line.rhymeType,
            },
          ),
        ),
      })),
    };
  });

  // Step 2: 第一个变体 = canonical
  const canonical = compactVariants[0];
  const storedVariants: CiVariantStored[] = [canonical];
  totalVariants += 1;
  fullCount += 1;

  // Step 3: 其余变体尝试 delta 压缩
  for (let i = 1; i < compactVariants.length; i++) {
    const variant = compactVariants[i];
    const edits = computeDiff(canonical.sections, variant.sections);

    if (edits !== null) {
      // 立即验证 round-trip：applyEdits 后与 target 比较
      const reconstructed = applyEdits(canonical.sections, edits);
      const linesMatch = sectionsEqual(reconstructed, variant.sections);

      if (linesMatch) {
        const delta: CiVariantDelta = {
          kind: "delta",
          id: variant.id,
          author: variant.author,
          sketch: variant.sketch,
          base: canonical.id,
          edits,
        };
        storedVariants.push(delta);
        deltaCount += 1;
      } else {
        // round-trip 不匹配，回退 full
        storedVariants.push(variant);
        fullCount += 1;
        diffTooLargeCount += 1;
      }
    } else {
      // diff 太大，回退为 full
      storedVariants.push(variant);
      fullCount += 1;
      diffTooLargeCount += 1;
    }

    totalVariants += 1;
  }

  newBundle[tuneName] = {
    id: oldTune.id,
    name: oldTune.name,
    aliases: oldTune.aliases,
    variants: storedVariants,
  };
}

// ---- 统计 ----

console.log(`\n词牌数: ${Object.keys(newBundle).length}`);
console.log(`变体总数: ${totalVariants}`);
console.log(`  canonical (full): ${fullCount}`);
console.log(`  delta: ${deltaCount}`);
console.log(`  diff 过大回退 full: ${diffTooLargeCount}`);
console.log(
  `压缩率: ${((1 - (fullCount + deltaCount - diffTooLargeCount) / totalVariants) * 100).toFixed(1)}% 变体为 delta`,
);

// ---- 写入 ----

const newJson = JSON.stringify(newBundle);
// 不 pretty-print 以节省空间
writeFileSync(NEW_BUNDLE_PATH, newJson);
console.log(`\n新 bundle: ${NEW_BUNDLE_PATH}`);
console.log(
  `文件大小: ${(Buffer.byteLength(newJson) / 1024).toFixed(1)} KB`,
);

const sourceJson = JSON.stringify(sourceBundle);
writeFileSync(SOURCE_BUNDLE_PATH, sourceJson);
console.log(`Source bundle: ${SOURCE_BUNDLE_PATH}`);
console.log(
  `文件大小: ${(Buffer.byteLength(sourceJson) / 1024).toFixed(1)} KB`,
);

// ---- 等价性验证 ----

console.log("\n--- 等价性验证 ---");

// 构建 canonical map
const canonicalMap = new Map<string, CiVariantFull>();
for (const tune of Object.values(newBundle)) {
  if (!tune?.variants) continue;
  for (const v of tune.variants) {
    if (v?.kind === "full") {
      canonicalMap.set(v.id, v);
    }
  }
}
console.log(`Canonical map: ${canonicalMap.size} entries`);

let verifyErrors = 0;
let verifyOk = 0;

for (const [tuneName, oldTune] of Object.entries(oldBundle)) {
  const newTune = newBundle[tuneName];
  if (!newTune) {
    console.error(`  MISSING: ${tuneName}`);
    verifyErrors += 1;
    continue;
  }

  for (const oldVariant of oldTune.variants) {
    const stored = newTune.variants.find((v) => v.id === oldVariant.id);
    if (!stored) {
      console.error(`  MISSING variant: ${oldVariant.id}`);
      verifyErrors += 1;
      continue;
    }

    try {
      const materialized = materializeVariant(stored, canonicalMap);

      // 比较 sections
      if (materialized.sections.length !== oldVariant.sections.length) {
        console.error(
          `  SECTION COUNT: ${oldVariant.id}: ${oldVariant.sections.length} → ${materialized.sections.length}`,
        );
        verifyErrors += 1;
        continue;
      }

      let hasError = false;
      for (let si = 0; si < oldVariant.sections.length && !hasError; si++) {
        const oldSec = oldVariant.sections[si];
        const newSec = materialized.sections[si];

        if (oldSec.lines.length !== newSec.lines.length) {
          console.error(
            `  LINE COUNT [${oldVariant.id}] section ${si}: ${oldSec.lines.length} → ${newSec.lines.length}`,
          );
          verifyErrors += 1;
          hasError = true;
          continue;
        }

        for (let li = 0; li < oldSec.lines.length && !hasError; li++) {
          const oldLine = oldSec.lines[li];
          const newLine = newSec.lines[li];

          if (oldLine.charCount !== newLine.charCount) {
            console.error(
              `  CHAR COUNT [${oldVariant.id}] S${si}L${li}: ${oldLine.charCount} → ${newLine.charCount}`,
            );
            verifyErrors += 1;
            hasError = true;
            continue;
          }

          if (oldLine.isRhymeLine !== newLine.isRhymeLine) {
            console.error(
              `  RHYME LINE [${oldVariant.id}] S${si}L${li}: ${oldLine.isRhymeLine} → ${newLine.isRhymeLine}`,
            );
            verifyErrors += 1;
            hasError = true;
            continue;
          }

          if (oldLine.isRhymeLine && oldLine.rhymeType !== newLine.rhymeType) {
            console.error(
              `  RHYME TYPE [${oldVariant.id}] S${si}L${li}: ${oldLine.rhymeType} → ${newLine.rhymeType}`,
            );
            verifyErrors += 1;
            hasError = true;
            continue;
          }

          // 逐位比较 pattern
          for (let ci = 0; ci < oldLine.pattern.length && !hasError; ci++) {
            const oldConstraint = oldLine.pattern[ci];
            const newConstraint = newLine.pattern[ci];

            if (oldConstraint.type !== newConstraint.type) {
              console.error(
                `  CONSTRAINT TYPE [${oldVariant.id}] S${si}L${li}C${ci}: ${oldConstraint.type} → ${newConstraint.type}`,
              );
              verifyErrors += 1;
              hasError = true;
              continue;
            }

            if (
              oldConstraint.type === "fixed" &&
              newConstraint.type === "fixed"
            ) {
              if (oldConstraint.tone !== newConstraint.tone) {
                console.error(
                  `  CONSTRAINT TONE [${oldVariant.id}] S${si}L${li}C${ci}: ${oldConstraint.tone} → ${newConstraint.tone}`,
                );
                verifyErrors += 1;
                hasError = true;
              }
            }
          }
        }
      }

      if (!hasError) {
        verifyOk += 1;
      }
    } catch (err: any) {
      console.error(`  ERROR [${oldVariant.id}]: ${err.message}`);
      verifyErrors += 1;
    }
  }
}

console.log(`\n验证结果: ${verifyOk} 通过, ${verifyErrors} 失败`);
if (verifyErrors === 0) {
  console.log("等价性验证 100% 通过。可以替换 ci-tunes-bundle.json。");

  // 输出对比
  const oldSize = Buffer.byteLength(JSON.stringify(oldBundle));
  const newSize = Buffer.byteLength(newJson);
  const sourceSize = Buffer.byteLength(sourceJson);
  console.log(`\n体积对比:`);
  console.log(`  旧 bundle: ${(oldSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  新 bundle: ${(newSize / 1024).toFixed(1)} KB`);
  console.log(`  Source: ${(sourceSize / 1024).toFixed(1)} KB`);
  console.log(
    `  总计: ${((newSize + sourceSize) / 1024).toFixed(1)} KB (节省 ${((1 - (newSize + sourceSize) / oldSize) * 100).toFixed(1)}%)`,
  );
} else {
  console.log("\n存在验证错误，请检查！");
  process.exit(1);
}
