/**
 * 变体相似度算法
 *
 * 基于 canonical/delta 数据的结构、声调、韵脚三维比较。
 * 用于风格分析、作者识别、变体聚类。
 *
 * @module templates/variant-similarity
 */

import type { CiTemplateVariant, CiTemplateLine } from "./index.js";
import type { ToneConstraint } from "../core/types.js";
import { Tone } from "../core/types.js";

// ========== 公开类型 ==========

export interface VariantSimilarityResult {
  /** 整体相似度 0-1 */
  score: number;
  /** 结构相似度（阕数、行数、字数） */
  structure: number;
  /** 声调相似度（平仄 pattern 的归一化编辑距离） */
  tonal: number;
  /** 韵脚相似度（韵脚位置与韵调匹配） */
  rhyme: number;
}

// ========== 权重配置 ==========

const DEFAULT_WEIGHTS = {
  structure: 0.25,
  tonal: 0.50,
  rhyme: 0.25,
};

// ========== 主入口 ==========

/**
 * 计算两个变体之间的相似度。
 * 三维加权：结构 25% + 声调 50% + 韵脚 25%。
 */
export function computeVariantSimilarity(
  a: CiTemplateVariant,
  b: CiTemplateVariant,
  weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS,
): VariantSimilarityResult {
  const structure = computeStructuralSimilarity(a, b);
  const tonal = computeTonalSimilarity(a, b);
  const rhyme = computeRhymeSimilarity(a, b);

  const score =
    weights.structure * structure +
    weights.tonal * tonal +
    weights.rhyme * rhyme;

  return { score: clamp01(score), structure, tonal, rhyme };
}

// ========== 结构相似度 ==========

/**
 * 比较变体的宏观结构：阕数、行数、每行字数。
 */
function computeStructuralSimilarity(
  a: CiTemplateVariant,
  b: CiTemplateVariant,
): number {
  const secLen = Math.min(a.sections.length, b.sections.length);
  const maxSec = Math.max(a.sections.length, b.sections.length);
  if (maxSec === 0) return 1;

  // 段数差异惩罚
  const secPenalty = secLen / maxSec;

  // 逐段比较行数和字数
  let lineSimSum = 0;
  let lineCount = 0;

  for (let si = 0; si < secLen; si++) {
    const la = a.sections[si].lines;
    const lb = b.sections[si].lines;
    const minLines = Math.min(la.length, lb.length);
    const maxLines = Math.max(la.length, lb.length);

    for (let li = 0; li < minLines; li++) {
      const ca = la[li].charCount;
      const cb = lb[li].charCount;
      if (ca === 0 && cb === 0) {
        lineSimSum += 1;
      } else {
        lineSimSum += 1 - Math.abs(ca - cb) / Math.max(ca, cb);
      }
      lineCount++;
    }
  }

  if (lineCount === 0) return secPenalty;

  const avgLineSim = lineSimSum / lineCount;
  return clamp01(secPenalty * avgLineSim);
}

// ========== 声调相似度 ==========

/**
 * 展平所有声调 pattern 为单一声调序列，计算归一化编辑距离。
 */
function computeTonalSimilarity(
  a: CiTemplateVariant,
  b: CiTemplateVariant,
): number {
  const seqA = flattenToneSequence(a);
  const seqB = flattenToneSequence(b);

  if (seqA.length === 0 && seqB.length === 0) return 1;
  const maxLen = Math.max(seqA.length, seqB.length);
  if (maxLen === 0) return 1;

  const dist = levenshteinToneDistance(seqA, seqB);
  return clamp01(1 - dist / maxLen);
}

type ToneClass = "P" | "Z" | "F";

function toneToClass(tc: ToneConstraint): ToneClass {
  if (tc.type === "flexible") return "F";
  if (tc.type === "rhyme") return "F"; // rhyme slots are flexible by nature
  return tc.tone === Tone.Ping ? "P" : "Z";
}

function flattenToneSequence(v: CiTemplateVariant): ToneClass[] {
  const seq: ToneClass[] = [];
  for (const sec of v.sections) {
    for (const line of sec.lines) {
      for (const tc of line.pattern) {
        seq.push(toneToClass(tc));
      }
    }
  }
  return seq;
}

/**
 * 声调级别的加权编辑距离。
 * F（可平可仄）与 P/Z 的距离为 0.5（半匹配）。
 */
function levenshteinToneDistance(a: ToneClass[], b: ToneClass[]): number {
  const m = a.length;
  const n = b.length;

  // 使用两行滚动数组节省空间
  let prev = new Float64Array(n + 1);
  let curr = new Float64Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = toneSubstitutionCost(a[i - 1], b[j - 1]);
      curr[j] = Math.min(
        prev[j] + 1,       // delete
        curr[j - 1] + 1,   // insert
        prev[j - 1] + cost, // substitute
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/** 声调替换代价：相同=0，F↔P/Z=0.5，P↔Z=1 */
function toneSubstitutionCost(a: ToneClass, b: ToneClass): number {
  if (a === b) return 0;
  if (a === "F" || b === "F") return 0.5;
  return 1;
}

// ========== 韵脚相似度 ==========

/**
 * 比较韵脚格局：押韵行位置 + 韵调是否一致。
 */
function computeRhymeSimilarity(
  a: CiTemplateVariant,
  b: CiTemplateVariant,
): number {
  const ra = extractRhymeSignature(a);
  const rb = extractRhymeSignature(b);

  if (ra.length === 0 && rb.length === 0) return 1;

  let matches = 0;
  const maxLen = Math.max(ra.length, rb.length);
  if (maxLen === 0) return 1;

  const minLen = Math.min(ra.length, rb.length);
  for (let i = 0; i < minLen; i++) {
    if (ra[i].tone === rb[i].tone && ra[i].xieyun === rb[i].xieyun) {
      matches++;
    } else if (ra[i].tone === rb[i].tone) {
      matches += 0.5; // 同韵调但叶韵标记不同
    }
  }

  return clamp01(matches / maxLen);
}

interface RhymeSlot {
  tone: string;
  xieyun: boolean;
}

function extractRhymeSignature(v: CiTemplateVariant): RhymeSlot[] {
  const slots: RhymeSlot[] = [];
  for (const sec of v.sections) {
    for (const line of sec.lines) {
      if (line.isRhymeLine) {
        slots.push({
          tone: line.rhymeType ?? "unknown",
          xieyun: line.isXieyun ?? false,
        });
      }
    }
  }
  return slots;
}

// ========== 批量比较 ==========

/**
 * 计算一个变体与一组变体的相似度，返回按相似度降序排列的结果。
 */
export function findSimilarVariants(
  target: CiTemplateVariant,
  candidates: CiTemplateVariant[],
  topK = 10,
): Array<{ variant: CiTemplateVariant; similarity: VariantSimilarityResult }> {
  return candidates
    .map((variant) => ({
      variant,
      similarity: computeVariantSimilarity(target, variant),
    }))
    .sort((a, b) => b.similarity.score - a.similarity.score)
    .slice(0, topK);
}

// ========== 工具函数 ==========

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
