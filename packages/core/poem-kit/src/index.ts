/**
 * @poem/poem-kit —— 诗词创作工具包
 *
 * 在 parser 低层（loadMeterTemplates / listAllTemplates / 词牌 JSON）之上，
 * 给 composer/UI 提供面向创作的高阶 API：
 * 1. 目录懒加载（getAllTemplates / getMeterMap）—— 取代旧 @poem/shared 顶层 const 副作用。
 * 2. 模板/变体查询（firstVariantForTune / variantSummary）。
 * 3. 编辑器结构投影（ciPatternForEditor / pairLineGroups）。
 * 4. 草稿规范化（normalizeDraft）。
 */
import { listAllTemplates } from "@poem/parser/catalog";
import { loadMeterTemplates } from "@poem/parser/kernel";
import type {
  CiTemplate,
  CiTemplateLine,
  MeterTemplate,
  RhymeTone,
  ToneConstraint,
} from "@poem/parser/kernel";
import type { TemplateEntry } from "@poem/parser/catalog";
import type { Genre, PoemCreationDraft } from "@poem/shared";
import { Tone } from "@poem/shared";

// ============ 懒加载目录 ============

let _allTemplatesCache: TemplateEntry[] | null = null;
let _meterMapCache: Map<string, MeterTemplate> | null = null;

/** 全量模板目录（诗体 + 818 词牌），首次调用时构建并缓存 */
export function getAllTemplates(): TemplateEntry[] {
  if (!_allTemplatesCache) _allTemplatesCache = listAllTemplates();
  return _allTemplatesCache;
}

/** 格律模板按 ID 索引（首次调用时构建并缓存） */
export function getMeterMap(): Map<string, MeterTemplate> {
  if (!_meterMapCache) {
    _meterMapCache = new Map(loadMeterTemplates().map((t) => [t.id, t]));
  }
  return _meterMapCache;
}

// ============ 编辑器投影 ============

export type CiPatternForEditor = {
  lines: ToneConstraint[][];
  rhymeGroups: number[][];
  sectionBreaks: number[];
};

export function pairLineGroups(pattern: ToneConstraint[][]): number[][] {
  const groups: number[][] = [];
  for (let index = 0; index < pattern.length; index += 2) {
    groups.push(index + 1 < pattern.length ? [index, index + 1] : [index]);
  }
  return groups;
}

function rhymeToneToTone(tone: RhymeTone | undefined): Tone | undefined {
  if (tone === "ping") return Tone.Ping;
  if (tone === "ze") return Tone.Ze;
  return undefined;
}

function linePatternForEditor(line: CiTemplateLine): ToneConstraint[] {
  const rhymeTone = rhymeToneToTone(line.rhymeType);
  return line.pattern.map((constraint) => {
    // DSL-loaded templates already carry per-slot p/z/+z metadata. This
    // fallback covers non-DSL/custom sources that only expose line-level rhyme.
    if (!line.isRhymeLine || constraint.type !== "rhyme") return constraint;
    return {
      ...constraint,
      tone: constraint.tone ?? rhymeTone,
      xieyun: constraint.xieyun ?? line.isXieyun,
    };
  });
}

export function ciPatternForEditor(
  tune: CiTemplate | undefined,
  variantId: string,
): CiPatternForEditor {
  const variant = tune?.variants.find((item) => item.id === variantId);
  if (!variant) return { lines: [], rhymeGroups: [], sectionBreaks: [] };

  const lines: ToneConstraint[][] = [];
  const rhymeGroups: number[][] = [];
  const sectionBreaks: number[] = [];
  let lineOffset = 0;
  let groupBuffer: number[] = [];

  const flushGroup = () => {
    if (groupBuffer.length === 0) return;
    rhymeGroups.push(groupBuffer);
    groupBuffer = [];
  };

  variant.sections.forEach((section, sectionIndex) => {
    flushGroup();
    if (sectionIndex > 0 && section.lines.length > 0) {
      sectionBreaks.push(rhymeGroups.length);
    }

    section.lines.forEach((line) => {
      lines.push(linePatternForEditor(line));
      groupBuffer.push(lineOffset);
      lineOffset += 1;
      if (line.isRhymeLine) flushGroup();
    });
  });
  flushGroup();

  return { lines, rhymeGroups, sectionBreaks };
}

// TODO(P2): 该函数当前从展示文本"平韵"/"仄韵" 子串嗅探韵脚类型。
// 等 catalog `TemplateVariant` 暴露 `rhymeType` 字段后直接读，删除此函数。
export function inferCiRhymeTone(text: string): Tone | null {
  const hasPing = text.includes("平韵");
  const hasZe = text.includes("仄韵");
  if (hasPing && !hasZe) return Tone.Ping;
  if (hasZe && !hasPing) return Tone.Ze;
  return null;
}

// ============ 模板/变体查询 ============

export function variantSummary(
  genre: Genre,
  tuneName: string,
  variantId: string,
  templates: TemplateEntry[] = getAllTemplates(),
): string {
  if (!variantId) return "";
  const template = templates.find(
    (entry) => entry.genre === genre && entry.name === tuneName,
  );
  const variant = template?.variants.find((item) => item.id === variantId);
  if (!variant) return variantId;
  if (genre === "meter") {
    return `${variant.rhymeFirst ? "首句押韵" : "首句不押韵"} · ${variant.author}`;
  }
  return `${variant.author} · ${variant.sketch}`;
}

export function firstVariantForTune(
  genre: Genre,
  tuneName: string,
  templates: TemplateEntry[] = getAllTemplates(),
): string {
  return (
    templates.find((item) => item.genre === genre && item.name === tuneName)
      ?.variants[0]?.id ?? ""
  );
}

// ============ QuickFill 识别 ============

export { identifyQuickFill } from "./identify.js";
export type { QuickFillCandidate, QuickFillOptions } from "./identify.js";

// ============ 草稿规范化 ============

function inferTemplateNameFromVariant(
  variantId: string,
  templates: TemplateEntry[],
): string {
  for (const entry of templates) {
    if (entry.variants.some((variant) => variant.id === variantId)) {
      return entry.name;
    }
  }
  return "";
}

export function normalizeDraft(
  draft: PoemCreationDraft,
  templates: TemplateEntry[] = getAllTemplates(),
): PoemCreationDraft {
  const id = draft.id || "active";
  if (draft.selectedTune || !draft.selectedVariant) return { ...draft, id };

  return {
    ...draft,
    id,
    selectedTune: inferTemplateNameFromVariant(draft.selectedVariant, templates),
  };
}
