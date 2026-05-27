/**
 * 模板类型定义
 *
 * 纯类型模块 —— 无 fs / path / process 依赖。
 * 词牌数据加载由调用方自行处理（如读取 ci-tunes-bundle-compact.json 后用 loadCiBundle 物化）。
 *
 * @module templates
 */

import type { ToneConstraint, RhymeTone } from '../core/types.js';

// ========== 格律模板 ==========

import type { MeterTemplate } from './meters.js';

export { loadMeterTemplates } from './meters.js';

// ========== 词牌模板 ==========

export interface CiTemplateLine {
  charCount: number;
  pattern: ToneConstraint[];
  isRhymeLine: boolean;
  rhymeType?: RhymeTone;
  /** 叶韵（+ 修饰），续上一韵组而非开新组 */
  isXieyun?: boolean;
  rhymeSwitch?: RhymeTone;
}

export interface CiTemplateSection {
  name: string;
  lines: CiTemplateLine[];
}

export interface CiTemplateVariant {
  id: string;
  name: string;
  sketch?: string;
  author?: string;
  source?: string;
  rhymeType?: RhymeTone | 'mixed';
  sections: CiTemplateSection[];
}

export interface CiTemplate {
  id: string;
  name: string;
  aliases?: string[];
  variants: CiTemplateVariant[];
  source?: string;
}

// ========== 联合类型 ==========

export type { MeterTemplate };
export type AnyTemplate = MeterTemplate | CiTemplate;

/** Type guard: MeterTemplate has a `pattern` field */
export function isMeterTemplate(
  template: AnyTemplate,
): template is MeterTemplate {
  return 'pattern' in template;
}

/** Type guard: CiTemplate has `variants` instead of `pattern` */
export function isCiTemplate(template: AnyTemplate): template is CiTemplate {
  return !('pattern' in template);
}

// DSL 编解码
export { parseLineDSL, encodeLineDSL, extractRhymeToken } from "./dsl.js";
export type { EncodeLineOptions, RhymeTokenInfo } from "./dsl.js";

// 变体压缩
export type {
  CiVariantFull,
  CiVariantDelta,
  CiVariantStored,
  CiSectionStored,
  EditOp,
  LineAddr,
} from "./ci-compress.js";
export { materializeVariant, expandStoredVariant, applyEdits, computeDiff } from "./ci-compress.js";

// 词牌装载
export {
  loadCiBundle,
  getCohortIndex,
  buildCohortIndex,
  clearCiBundleCache,
} from "./ci-loader.js";
export type { CompactTuneRaw, CompactBundleRaw, CohortedRhymeSlot } from "./ci-loader.js";
export { buildCohortFromSlots } from "./cohort.js";
export type { RhymeCohortSourceSlot, RhymeCohortToken } from "./cohort.js";

// 变体相似度
export { computeVariantSimilarity, findSimilarVariants } from "./variant-similarity.js";
export type { VariantSimilarityResult } from "./variant-similarity.js";
