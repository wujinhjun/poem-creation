/**
 * 模糊模板匹配模块
 *
 * 给定任意文本（可为不完整/非标输入），在所有候选模板中搜索最匹配的 N 个结果。
 * 同时支持格律诗（MeterTemplate）和词牌（CiTemplate）。
 *
 * 纯函数 —— 不加载 bundle、不读文件系统。
 *
 * @module analyzer/fuzzy-match
 */

import type { ToneConstraint } from "../core/types.js";
import { HANZI_RE } from "../core/types.js";
import { splitSentences } from "../lexer/index.js";
import { resolveTones } from "../phonology/index.js";
import type { RhymeDict } from "../rhyme-dict/index.js";
import type { CiTemplate, AnyTemplate } from "../templates/index.js";
import { isCiTemplate, isMeterTemplate } from "../templates/index.js";
import type { MeterTemplate } from "../templates/meters.js";
import { flattenCiVariantLines } from "./ci.js";

// ============ 公共类型 ============

export interface FuzzyMatchResult {
  /** 体裁：格律诗 / 词牌 */
  genre: "meter" | "ci";
  /** 模板 ID（如 "qilü-shouju-ping"、"huanxisha"） */
  templateId: string;
  /** 模板名（如 "七律·首句入韵·平起"、"浣溪沙"） */
  tuneName: string;
  /** 变体 ID */
  variantId: string;
  /** 变体名（如 "正体"、"首句押韵 · 平起"） */
  variantName: string;
  /** 置信度（0–1） */
  confidence: number;
  /** 已完成校验的字数（既有输入又有模板约束的字符） */
  matchedChars: number;
  /** 模板总汉字数 */
  totalExpectedChars: number;
  /** 已输入的总汉字数 */
  inputChars: number;
  /** 每句的匹配细节 */
  lineDetails: FuzzyLineDetail[];
  /** 韵脚一致性（0–1），输入行末字之间的韵部一致程度 */
  rhymeConsistency: number;
}

export interface FuzzyLineDetail {
  /** 句索引（0 开始，对应模板展平后的行序） */
  lineIndex: number;
  /** 期望字数 */
  expectedCharCount: number;
  /** 实际字数 */
  actualCharCount: number;
  /** 字数匹配得分（0–1） */
  charScore: number;
  /** 该句中已做音调校验的字数 */
  toneCheckCount: number;
  /** 该句中音调匹配的字数 */
  toneMatchCount: number;
}

export interface FuzzyMatchOptions {
  /** 返回的结果数上限，默认 5 */
  topN?: number;
}

// ============ 内部类型 ============

interface FlatExpectedLine {
  charCount: number;
  pattern: ToneConstraint[];
  isRhymeLine: boolean;
}

// ============ 剪枝辅助 ============

/**
 * 计算输入与模板的期望字数差是否超过阈值。
 *
 * 逐行累加模板字数，直到累加值 ≥ 输入字数，然后与该累加值比较。
 * 这样可以正确处理多句输入被分到单句再匹配多行模板的场景。
 */
function shouldPrune(
  inputChars: number,
  expectedLines: FlatExpectedLine[],
  threshold: number,
): boolean {
  if (inputChars < 3) return false;
  if (expectedLines.length === 0) return false;

  let cumChars = 0;
  let linesIncluded = 0;
  for (const line of expectedLines) {
    cumChars += line.charCount;
    linesIncluded += 1;
    if (cumChars >= inputChars) break;
  }

  const comparedExpected =
    linesIncluded > 0 ? cumChars : expectedLines[0].charCount;
  return (
    comparedExpected > 0 &&
    Math.abs(inputChars - comparedExpected) / comparedExpected > threshold
  );
}

// ============ 韵脚一致性 ============

/**
 * 计算输入行末字之间的韵部一致性。
 *
 * 对于词牌，韵脚同韵部是强信号（如《水调歌头》多处押同一韵）。
 * 返回 0–1，表示韵脚字两两之间同韵部的比例。
 */
function computeRhymeConsistency(
  sentences: string[][],
  expectedLines: FlatExpectedLine[],
  dict: RhymeDict,
): number {
  const rhymeEndChars: string[] = [];
  for (let i = 0; i < Math.min(sentences.length, expectedLines.length); i += 1) {
    if (expectedLines[i]?.isRhymeLine && sentences[i].length > 0) {
      rhymeEndChars.push(sentences[i][sentences[i].length - 1]);
    }
  }

  if (rhymeEndChars.length < 2) return 0;

  let consistentPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < rhymeEndChars.length; i += 1) {
    for (let j = i + 1; j < rhymeEndChars.length; j += 1) {
      totalPairs += 1;
      if (dict.isSameRhyme(rhymeEndChars[i], rhymeEndChars[j])) {
        consistentPairs += 1;
      }
    }
  }

  return totalPairs > 0 ? consistentPairs / totalPairs : 0;
}

// ============ 核心评分 ============

/**
 * 对单个变体评分。
 *
 * 返回 null 表示该变体应被剪枝（字数差过大）。
 */
function scoreVariant(
  sentences: string[][],
  sentenceTones: ReturnType<typeof resolveTones>[][],
  expectedLines: FlatExpectedLine[],
  genre: "meter" | "ci",
  templateId: string,
  tuneName: string,
  variantId: string,
  variantName: string,
  dict: RhymeDict,
  inputChars: number,
): FuzzyMatchResult | null {
  const totalExpectedChars = expectedLines.reduce(
    (s, l) => s + l.charCount,
    0,
  );

  // 剪枝：累加模板行直到覆盖输入字数，偏差 > 50% 则跳过。
  if (shouldPrune(inputChars, expectedLines, 0.5)) return null;

  let totalCharScore = 0;
  let toneCheckCount = 0;
  let toneMatchCount = 0;
  let matchedChars = 0;
  let comparedLines = 0;

  const lineDetails: FuzzyLineDetail[] = [];

  for (
    let i = 0;
    i < Math.max(sentences.length, expectedLines.length);
    i += 1
  ) {
    const sentence = sentences[i] ?? [];
    const expected = expectedLines[i];

    if (!expected) {
      lineDetails.push({
        lineIndex: i,
        expectedCharCount: 0,
        actualCharCount: sentence.length,
        charScore: 0,
        toneCheckCount: 0,
        toneMatchCount: 0,
      });
      continue;
    }

    comparedLines += 1;
    const expectedCount = expected.charCount;
    const actualCount = sentence.length;

    const charScore =
      expectedCount === 0
        ? actualCount === 0
          ? 1
          : 0
        : 1 - Math.abs(actualCount - expectedCount) / expectedCount;

    totalCharScore += Math.max(0, charScore);

    let lineToneCheck = 0;
    let lineToneMatch = 0;
    const maxCol = Math.min(actualCount, expectedCount);
    for (let col = 0; col < maxCol; col += 1) {
      const char = sentence[col];
      const constraint = expected.pattern[col];
      if (!char || !constraint || constraint.type !== "fixed") continue;

      matchedChars += 1;
      lineToneCheck += 1;

      const toneInfo = sentenceTones[i]?.[col];
      if (
        toneInfo &&
        (toneInfo.primaryTone === constraint.tone ||
          toneInfo.uniqueTones.includes(constraint.tone))
      ) {
        toneMatchCount += 1;
        lineToneMatch += 1;
      }
    }

    toneCheckCount += lineToneCheck;

    lineDetails.push({
      lineIndex: i,
      expectedCharCount: expectedCount,
      actualCharCount: actualCount,
      charScore: Math.max(0, charScore),
      toneCheckCount: lineToneCheck,
      toneMatchCount: lineToneMatch,
    });
  }

  const charConfidence =
    comparedLines > 0 ? totalCharScore / comparedLines : 0;
  const toneConfidence =
    toneCheckCount > 0 ? toneMatchCount / toneCheckCount : 0;
  const rhymeConsistency = computeRhymeConsistency(
    sentences,
    expectedLines,
    dict,
  );

  // 加权：字数 55% + 音调 35% + 韵脚一致性 10%
  const confidence =
    charConfidence * 0.55 +
    (toneCheckCount > 0 ? toneConfidence * 0.35 : 0) +
    rhymeConsistency * 0.1;

  if (confidence <= 0) return null;

  return {
    genre,
    templateId,
    tuneName,
    variantId,
    variantName,
    confidence,
    matchedChars,
    totalExpectedChars,
    inputChars,
    lineDetails,
    rhymeConsistency,
  };
}

// ============ 公共 API ============

/**
 * 模糊匹配 —— 在任意模板集合中搜索最佳匹配。
 *
 * 同时支持 MeterTemplate（格律诗）和 CiTemplate（词牌）。
 * 模板由调用方注入，不内部加载。
 *
 * @param input     输入文本（可为不完整片段）
 * @param templates 候选模板（由调用方预过滤后传入）
 * @param dict      韵书实例
 * @param options   可选配置
 * @returns 按置信度降序排列的匹配结果（默认 Top 5）
 */
export function fuzzyMatch(
  input: string,
  templates: AnyTemplate[],
  dict: RhymeDict,
  options: FuzzyMatchOptions = {},
): FuzzyMatchResult[] {
  const { topN = 5 } = options;

  // 1. 分句并提取汉字
  const rawSentences = splitSentences(input);
  const sentences = rawSentences.map((s) =>
    [...s].filter((ch) => HANZI_RE.test(ch)),
  );
  const inputChars = sentences.reduce((sum, s) => sum + s.length, 0);
  if (inputChars === 0 || templates.length === 0) return [];

  // 2. 预解析声调（一次查韵书，所有模板复用）
  const sentenceTones = sentences.map((chars) =>
    chars.map((ch) => resolveTones(dict.lookup(ch))),
  );

  const results: FuzzyMatchResult[] = [];

  for (const template of templates) {
    if (isMeterTemplate(template)) {
      // Meter：累加模板行直到覆盖输入字数，偏差 > 50% 剪枝
      if (
        shouldPrune(
          inputChars,
          template.pattern.map((p) => ({
            charCount: p.length,
            pattern: p,
            isRhymeLine: false,
          })),
          0.5,
        )
      ) {
        continue;
      }

      const expectedLines: FlatExpectedLine[] = template.pattern.map(
        (pat, i) => ({
          charCount: pat.length,
          pattern: pat,
          isRhymeLine: template.rhymeLineIndices.includes(i),
        }),
      );

      const result = scoreVariant(
        sentences,
        sentenceTones,
        expectedLines,
        "meter",
        template.id,
        template.name,
        template.id,
        template.name,
        dict,
        inputChars,
      );
      if (result) results.push(result);
    } else if (isCiTemplate(template)) {
      // Ci：遍历变体
      for (const variant of template.variants) {
        const flatLines = flattenCiVariantLines(variant);

        const ciLines: FlatExpectedLine[] = flatLines.map((l) => ({
          charCount: l.charCount,
          pattern: l.pattern,
          isRhymeLine: l.isRhymeLine,
        }));

        // 剪枝：累加模板行直到覆盖输入字数，偏差 > 50% 跳过
        if (shouldPrune(inputChars, ciLines, 0.5)) continue;

        const result = scoreVariant(
          sentences,
          sentenceTones,
          ciLines,
          "ci",
          template.id,
          template.name,
          variant.id,
          variant.name,
          dict,
          inputChars,
        );
        if (result) results.push(result);
      }
    }
  }

  // 按置信度降序，取 topN
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, topN);
}

/**
 * 模糊匹配词牌 —— 仅接受 CiTemplate[]。
 *
 * 委托给 {@link fuzzyMatch} 的便捷封装，保持向后兼容。
 * 新代码建议直接用 fuzzyMatch。
 */
export function fuzzyMatchCi(
  input: string,
  templates: CiTemplate[],
  dict: RhymeDict,
  options: FuzzyMatchOptions = {},
): FuzzyMatchResult[] {
  return fuzzyMatch(input, templates, dict, options);
}
