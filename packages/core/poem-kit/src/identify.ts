/**
 * QuickFill 识别编排
 *
 * 调用 parser 的 meter/ci 模糊匹配，统一 Web/RN 的快速填写识别流程。
 * 将原始匹配结果映射为产品层 QuickFillCandidate。
 *
 * 纯编排层 —— RhymeDict 和 CiTemplate[] 均由调用方注入。
 */

import { fuzzyMatch, loadMeterTemplates } from "@poem/parser";
import type { FuzzyMatchResult, CiTemplate, RhymeDict } from "@poem/parser";
import { splitSentences, HANZI_RE } from "@poem/parser";

// ============ 公共类型 ============

export interface QuickFillCandidate {
  /** 体裁 */
  genre: "meter" | "ci";
  /** 模板名（如 "七律"、"浣溪沙"） */
  tuneName: string;
  /** 变体 ID */
  variantId: string;
  /** 变体名 */
  variantName: string;
  /** 韵脚类型 */
  rhymeType: "ping" | "ze" | "mixed" | null;
  /** 匹配置信度 0–1 */
  confidence: number;
  /** 输入行按模板句数对齐后的字数组 */
  normalizedLines: string[][];
  /** 模板总字数 */
  templateCharCount: number;
}

export interface QuickFillOptions {
  /** 返回结果数上限，默认 5 */
  topN?: number;
}

// ============ 内部 ============

/**
 * 从 FuzzyMatchResult 样式的 rhymeType 提取 QuickFill 韵脚类型。
 */
function extractRhymeType(result: FuzzyMatchResult): QuickFillCandidate["rhymeType"] {
  // Meter 默认平韵
  if (result.genre === "meter") return "ping";

  // Ci：通过 variant 信息推断
  return null; // 调用方可从 variant.catalogInfo 获取（不在返回结果中）
}

/**
 * 将输入行对齐到模板句数。
 * 输入行按索引对应模板行，多余截断，不足补空。
 */
function alignLines(
  input: string,
  templateLineCount: number,
): string[][] {
  const rawSentences = splitSentences(input);
  const sentences = rawSentences.map((s) =>
    [...s].filter((ch) => HANZI_RE.test(ch)),
  );

  const result: string[][] = [];
  for (let i = 0; i < templateLineCount; i += 1) {
    result.push(sentences[i] ?? []);
  }
  return result;
}

// ============ 公共 API ============

/**
 * QuickFill 识别流程。
 *
 * 给定任意诗词草稿文本，返回最佳匹配的格律/词牌候选。
 *
 * @param input       输入文本（分行草稿）
 * @param dict        韵书实例（由调用方加载后注入）
 * @param ciTemplates 词牌完整模板集合（可选；未提供时仅匹配诗体）
 * @param options     可选配置
 * @returns 按置信度降序排列的候选列表
 */
export function identifyQuickFill(
  input: string,
  dict: RhymeDict,
  ciTemplates?: CiTemplate[],
  options: QuickFillOptions = {},
): QuickFillCandidate[] {
  const { topN = 5 } = options;

  // 1. Meter 模板（16 个，全量）
  const meters = loadMeterTemplates();

  // 2. 预过滤 Ci 模板
  const inputCharCount = [...input].filter((ch) => HANZI_RE.test(ch)).length;
  let filteredCi: CiTemplate[] = [];

  if (ciTemplates && ciTemplates.length > 0) {
    filteredCi = ciTemplates.filter((t) => {
      // 对每个词牌，检查是否至少有一个变体在字数范围内
      return t.variants.some((v) => {
        const total = v.sections.reduce(
          (sum, s) => sum + s.lines.reduce((s2, l) => s2 + l.charCount, 0),
          0,
        );
        if (total === 0) return false;
        const ratio = Math.abs(inputCharCount - total) / total;
        return ratio <= 0.5;
      });
    });
  }

  // 3. 调用 parser 模糊匹配
  const allTemplates = [...meters, ...filteredCi];
  const results = fuzzyMatch(input, allTemplates, dict, { topN });

  // 4. 映射为 QuickFillCandidate
  const seenTune = new Set<string>();
  const candidates: QuickFillCandidate[] = [];

  for (const r of results) {
    // 去重：同一体裁+词牌名只保留最高置信度
    const key = `${r.genre}:${r.tuneName}`;
    if (seenTune.has(key)) continue;
    seenTune.add(key);

    // 确定模板行数
    const templateLineCount =
      r.genre === "meter"
        ? (meters.find((m) => m.id === r.templateId)?.lineCount ?? r.lineDetails.length)
        : r.lineDetails.filter((d) => d.expectedCharCount > 0).length;

    candidates.push({
      genre: r.genre,
      tuneName: r.tuneName,
      variantId: r.variantId,
      variantName: r.variantName,
      rhymeType: extractRhymeType(r),
      confidence: Math.round(r.confidence * 1000) / 1000,
      normalizedLines: alignLines(input, templateLineCount),
      templateCharCount: r.totalExpectedChars,
    });
  }

  return candidates;
}
