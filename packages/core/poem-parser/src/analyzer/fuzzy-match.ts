/**
 * 模糊词牌匹配模块
 *
 * 给定任意文本（可为不完整/非标输入），在所有词牌模板中搜索最匹配的 N 个变体。
 * 不要求预选模板或变体，也无需输入与目标字数完全一致。
 *
 * @module analyzer/fuzzy-match
 */

import { HANZI_RE } from "../core/types.js";
import { splitSentences } from "../lexer/index.js";
import { resolveTones } from "../phonology/index.js";
import type { RhymeDict } from "../rhyme-dict/index.js";
import type { CiTemplate, CiTemplateVariant } from "../templates/index.js";
import { flattenCiVariantLines } from "./ci.js";

// ============ 公共类型 ============

export interface FuzzyMatchResult {
  /** 匹配到的词牌 */
  template: CiTemplate;
  /** 匹配到的变体 */
  variant: CiTemplateVariant;
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
  /** 返回的结果数上限，默认 10 */
  topN?: number;
  /** 模板数过多时截断搜索，默认 200（0 = 不限） */
  templateLimit?: number;
}

// ============ 核心实现 ============

/**
 * 模糊匹配词牌 —— 核心纯函数
 *
 * 用法：
 * ```ts
 * const results = fuzzyMatchCi("明月几时有，把酒问青天", allCiTemplates, dict);
 * // results[0] → { template: 水调歌头, variant: ..., confidence: 0.87 }
 * ```
 *
 * @param input     输入文本（可为不完整片段）
 * @param templates 所有词牌模板（由调用方从 catalog 获取）
 * @param dict      韵书实例
 * @param options   可选配置
 */
export function fuzzyMatchCi(
  input: string,
  templates: CiTemplate[],
  dict: RhymeDict,
  options: FuzzyMatchOptions = {},
): FuzzyMatchResult[] {
  const { topN = 10, templateLimit = 200 } = options;

  // 1. 分句并提取汉字
  const rawSentences = splitSentences(input);
  const sentences = rawSentences.map(
    (s) => [...s].filter((ch) => HANZI_RE.test(ch)),
  );
  const inputChars = sentences.reduce((sum, s) => sum + s.length, 0);

  if (inputChars === 0 || templates.length === 0) return [];

  // 预解析每个输入字的声调：同一个字此前会在每个候选变体里被反复查韵书，
  // 这里查一次缓存，模板循环内直接索引。
  const sentenceTones = sentences.map((chars) =>
    chars.map((ch) => resolveTones(dict.lookup(ch))),
  );

  // 截断搜索范围
  const candidates =
    templateLimit > 0 ? templates.slice(0, templateLimit) : templates;

  const results: FuzzyMatchResult[] = [];

  for (const template of candidates) {
    for (const variant of template.variants) {
      const expectedLines = flattenCiVariantLines(variant);
      const totalExpectedChars = expectedLines.reduce(
        (sum, l) => sum + l.charCount,
        0,
      );

      let totalCharScore = 0;
      let toneCheckCount = 0;
      let toneMatchCount = 0;
      let matchedChars = 0;
      let comparedLines = 0;

      const lineDetails: FuzzyLineDetail[] = [];

      for (let i = 0; i < Math.max(sentences.length, expectedLines.length); i += 1) {
        const sentence = sentences[i] ?? [];
        const expected = expectedLines[i];

        if (!expected) {
          // 额外输入行：惩罚
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

        // 字数匹配得分：完全匹配=1，按比例递减
        const charScore =
          expectedCount === 0
            ? actualCount === 0
              ? 1
              : 0
            : 1 - Math.abs(actualCount - expectedCount) / expectedCount;

        totalCharScore += Math.max(0, charScore);

        // 音调校验：对重叠部分的字符，查韵书比对 pattern
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

      // 综合置信度：
      // - 字数匹配占比 60%（按句子数平均）
      // - 音调匹配占比 40%（有可校验字符时）
      const charConfidence =
        comparedLines > 0 ? totalCharScore / comparedLines : 0;
      const toneConfidence =
        toneCheckCount > 0 ? toneMatchCount / toneCheckCount : 0;
      const confidence =
        toneCheckCount > 0
          ? charConfidence * 0.6 + toneConfidence * 0.4
          : charConfidence;

      // 过滤完全不匹配的（字数差太多）
      if (confidence <= 0) continue;

      results.push({
        template,
        variant,
        confidence,
        matchedChars,
        totalExpectedChars,
        inputChars,
        lineDetails,
      });
    }
  }

  // 按置信度降序，取 topN
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, topN);
}
