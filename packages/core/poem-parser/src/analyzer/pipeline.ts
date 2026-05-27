/**
 * 分析管线步骤
 *
 * 将 analyzeSync 拆分为独立步骤，每步输入输出类型清晰，便于单元测试。
 * 每步是纯函数，前一步的输出作为下一步的输入。
 *
 * @module analyzer/pipeline
 */

import { PoemType, HANZI_RE } from "../core/types.js";
import type { RhymeDictType, ToneAmbiguity, PoemAST } from "../core/types.js";
import { lex, splitSentences, LexResult } from "../lexer/index.js";
import { matchTemplate, MatchResult } from "../matcher/index.js";
import { annotate, AnnotationResult } from "../phonology/index.js";
import type { RhymeDict } from "../rhyme-dict/index.js";
import { isMeterTemplate, isCiTemplate } from "../templates/index.js";
import type { CiTemplate, MeterTemplate, AnyTemplate } from "../templates/index.js";
import { buildCohortFromSlots } from "../templates/index.js";
import { buildAstFromAnnotation, applyMeterTemplateToAst, buildLexResultFromRawLines } from "./ast.js";
import {
  validateLineAgainstPattern,
  applyValidationToLine,
  validateRhymeCohorts,
  LineValidationSummary,
} from "./validation.js";
import { scoreCiVariant, applyCiVariantToAst } from "./ci.js";
import { getTemplateType } from "./templates.js";
import type { CohortedRhymeSlot, RhymeCohortSourceSlot } from "../templates/index.js";

// ============ 公共类型 ============

export interface PipelineInput {
  input: string;
  template: AnyTemplate;
  dict: RhymeDict;
  preferredType?: PoemType;
  variantId?: string;
}

export interface PipelineOutput {
  ast: PoemAST;
  matchResults: MatchResult[];
  bestMatch: MatchResult | null;
  uniqueAmbiguities: ToneAmbiguity[];
  lineValidations: LineValidationSummary[];
  complianceRate: number;
  isCompliant: boolean;
  fullyCompliant: boolean;
}

export interface LexStepResult {
  lexResult: LexResult;
  isCi: boolean;
}

// ============ 步骤1：分词 ============

/**
 * 统一分词 —— 无论诗体还是词牌，都输出 LexResult。
 * 诗体用标准词法分析（含标题检测），词牌按标点分句后构造 LexResult。
 */
export function lexStep(input: string, template: AnyTemplate): LexStepResult {
  const isCi = isCiTemplate(template);
  if (isCi) {
    return { lexResult: buildLexResultFromRawLines(splitSentences(input)), isCi };
  }
  return { lexResult: lex(input), isCi: false };
}

// ============ 步骤2：音韵标注 ============

/** 对分词结果做音韵标注，为每字标平仄和韵部 */
export function annotateStep(lexResult: LexResult, dict: RhymeDict): AnnotationResult {
  return annotate(lexResult, dict);
}

// ============ 步骤3：构建 AST ============

/** 从标注结果构建 PoemAST */
export function buildAst(
  annotation: AnnotationResult,
  rawLines: string[],
  type: PoemType,
  dictType: RhymeDictType,
): PoemAST {
  return buildAstFromAnnotation(type, annotation, rawLines, dictType);
}

// ============ 步骤4：模板匹配 ============

/**
 * 模板匹配 —— 纯计算，不改动 AST。
 * 词牌必须由调用方指定 variantId（已在 runPipeline 预检中校验）。
 */
export function matchStep(
  ast: PoemAST,
  template: AnyTemplate,
  variantId?: string,
): { matchResults: MatchResult[]; bestMatch: MatchResult | null } {
  if (isCiTemplate(template)) {
    const variant = template.variants.find((v) => v.id === variantId);
    // variantId 有效性已在 runPipeline 预检，此处为防御
    if (!variant) return { matchResults: [], bestMatch: null };

    const scored = scoreCiVariant(ast.lines, variant);
    const bestMatch: MatchResult = {
      templateId: template.id,
      confidence: scored.confidence,
      toneDeviations: [],
    };
    return { matchResults: [bestMatch], bestMatch };
  }

  const matchResults = matchTemplate(ast, [template]);
  return { matchResults, bestMatch: matchResults[0] ?? null };
}

// ============ 步骤5：应用模板到 AST ============

/** 将匹配到的模板写入 AST（设置每行的 expectedPattern、韵脚信息、对句结构等） */
export function applyTemplate(
  ast: PoemAST,
  template: AnyTemplate,
  bestMatch: MatchResult | null,
  variantId?: string,
): void {
  ast.templateId = bestMatch?.templateId ?? template.id;
  ast.type = getTemplateType(template);

  if (isMeterTemplate(template)) {
    applyMeterTemplateToAst(ast, template);
  } else if (isCiTemplate(template) && variantId) {
    const variant = template.variants.find((v) => v.id === variantId);
    if (variant) {
      applyCiVariantToAst(ast, template, scoreCiVariant(ast.lines, variant));
    }
  }
}

// ============ 步骤6：过滤多音字歧义 ============

/**
 * 根据最佳匹配模板过滤多音字歧义，并去重。
 * 若某多音字的某个读音符合模板约束，则不再视为歧义。
 */
export function resolveAmbiguities(
  ambiguities: ToneAmbiguity[],
  ast: PoemAST,
  template: AnyTemplate,
  bestMatch: MatchResult | null,
): ToneAmbiguity[] {
  const bestMeterTemplate =
    bestMatch && isMeterTemplate(template) ? template : null;
  const filtered = _filterByBestTemplate(ambiguities, ast, bestMeterTemplate);

  const seenChars = new Set<string>();
  return filtered.filter((amb) => {
    if (seenChars.has(amb.char)) return false;
    seenChars.add(amb.char);
    return true;
  });
}

function _filterByBestTemplate(
  ambiguities: ToneAmbiguity[],
  ast: PoemAST,
  bestTemplate: MeterTemplate | null,
): ToneAmbiguity[] {
  if (!bestTemplate) return ambiguities;

  return ambiguities.filter((amb) => {
    const constraint = bestTemplate.pattern[amb.position.line]?.[amb.position.col];
    if (!constraint) return true;
    if (ast.type === PoemType.Jueju && constraint.type !== "fixed") return false;
    if (constraint.type !== "fixed") return true;
    const matchedOptions = amb.options.filter((item) => item.tone === constraint.tone);
    if (ast.type === PoemType.Jueju && matchedOptions.length === 1) return false;
    return true;
  });
}

// ============ 步骤7：行校验 ============

/** 校验每一行是否符合平仄模式，计算整体合规率 */
export function validate(
  ast: PoemAST,
  uniqueAmbiguities: ToneAmbiguity[],
): {
  lineValidations: LineValidationSummary[];
  complianceRate: number;
  isCompliant: boolean;
  fullyCompliant: boolean;
} {
  const lineValidations = ast.lines.map((line) => {
    const summary = validateLineAgainstPattern(line, line.expectedPattern, uniqueAmbiguities);
    applyValidationToLine(line, summary, line.expectedPattern);
    return summary;
  });

  const totalCheckable = lineValidations.reduce((sum, item) => sum + item.checkableCount, 0);
  const totalMatched = lineValidations.reduce((sum, item) => sum + item.matchedCount, 0);
  const complianceRate = totalCheckable > 0 ? totalMatched / totalCheckable : 1;
  const isCompliant = lineValidations.every((item) => item.isCompliant);
  const fullyCompliant = lineValidations.every((item) => item.nonAmbiguousMismatchCount === 0);

  return { lineValidations, complianceRate, isCompliant, fullyCompliant };
}

// ============ 字数预检 ============

/** 计算输入中的汉字总数 */
function countHanzi(input: string): number {
  let count = 0;
  for (const ch of input) {
    if (HANZI_RE.test(ch)) count += 1;
  }
  return count;
}

// ============ 韵组 Cohort 构建 ============

/**
 * 从词牌变体构建韵组 cohort 索引。
 *
 * 扫描变体所有行，按韵脚声调划分 cohort：
 * - 同声调连续韵脚 → 同一 cohort
 * - 声调切换 → 新 cohort
 */
function buildCohortFromCiVariant(
  variant: import("../templates/index.js").CiTemplateVariant,
): CohortedRhymeSlot[] {
  const sourceSlots: RhymeCohortSourceSlot[] = [];

  for (let si = 0; si < variant.sections.length; si++) {
    const sec = variant.sections[si];
    for (let li = 0; li < sec.lines.length; li++) {
      const line = sec.lines[li];
      if (!line.isRhymeLine || !line.rhymeType) continue;

      const tone = line.rhymeType;
      const xieyun = line.isXieyun === true;

      sourceSlots.push({ pos: [si, li], token: { tone, xieyun } });
    }
  }

  return buildCohortFromSlots(sourceSlots);
}

/**
 * 从律诗/绝句模板构建韵组 cohort 索引。
 *
 * 格律诗只有一个韵组：所有韵脚行同押平声韵。
 */
function buildCohortFromMeter(
  template: import("../templates/index.js").MeterTemplate,
): CohortedRhymeSlot[] {
  return template.rhymeLineIndices.map((lineIdx) => ({
    pos: [0, lineIdx] as [number, number],
    cohortId: 1,
    token: { tone: "ping" as const, xieyun: false },
  }));
}

// ============ 完整管线 ============

export function runPipeline(input: PipelineInput): PipelineOutput {
  const { input: text, template, dict, preferredType, variantId } = input;

  // 1. 分词
  const { lexResult, isCi } = lexStep(text, template);
  const rawLines = lexResult.lines.map((l) => l.raw);

  // 1.5 字数预检
  if (isMeterTemplate(template)) {
    const expected = template.charPerLine * template.lineCount;
    const actual = countHanzi(text);
    if (actual !== expected) {
      throw new Error(
        `字数不匹配：期望 ${expected} 字（${template.charPerLine}字×${template.lineCount}行），实际 ${actual} 字`,
      );
    }
  } else {
    // 词牌：用户必须指定变体
    if (!variantId) {
      throw new Error("词牌分析必须指定 variantId（变体 ID），不支持自动推断");
    }
    const variant = template.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error(`变体不存在: ${variantId}`);
    }
    const expected = variant.sections.reduce(
      (sum, s) => sum + s.lines.reduce((s2, l) => s2 + l.charCount, 0),
      0,
    );
    const actual = countHanzi(text);
    if (actual !== expected) {
      throw new Error(
        `字数不匹配：期望 ${expected} 字（词牌 ${template.name}，变体 ${variant.name}），实际 ${actual} 字`,
      );
    }
  }

  // 2. 标注
  const annotation = annotateStep(lexResult, dict);

  // 3. 建 AST
  const type = preferredType ?? (isCi ? PoemType.Ci : PoemType.Jueju);
  const ast = buildAst(annotation, rawLines, type, dict.type);

  // 4. 匹配
  const { matchResults, bestMatch } = matchStep(ast, template, variantId);

  // 5. 应用模板
  applyTemplate(ast, template, bestMatch, variantId);

  // 6. 解析歧义
  const uniqueAmbiguities = resolveAmbiguities(annotation.ambiguities, ast, template, bestMatch);

  // 7. 校验
  const { lineValidations, complianceRate, isCompliant, fullyCompliant } = validate(ast, uniqueAmbiguities);

  // 8. 韵组 cohort 校验
  let cohortSlots: CohortedRhymeSlot[];
  if (isMeterTemplate(template)) {
    cohortSlots = buildCohortFromMeter(template);
  } else {
    const variant = template.variants.find((v) => v.id === variantId);
    cohortSlots = variant ? buildCohortFromCiVariant(variant) : [];
  }

  const rhymeDiagnostics = validateRhymeCohorts(ast.lines, cohortSlots, dict);
  ast.diagnostics.push(...rhymeDiagnostics);

  return {
    ast,
    matchResults,
    bestMatch,
    uniqueAmbiguities,
    lineValidations,
    complianceRate,
    isCompliant,
    fullyCompliant,
  };
}
