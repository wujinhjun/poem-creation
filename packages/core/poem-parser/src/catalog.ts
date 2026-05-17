/**
 * @poem/parser/catalog —— 模板目录查询
 *
 * 统一索引：诗体格律（从 loadMeterTemplates 派生） + 词牌（818 首 JSON）。
 * 供 Web/RN 构建体裁选择器，不含完整格律 pattern。
 */

import catalogData from '../data/ci-catalog.json' with { type: 'json' };
import { loadMeterTemplates } from './templates/meters.js';

// ---- 类型 ----

export interface TemplateVariant {
  id: string;
  author: string;
  sketch: string;
  charCount: number;
  rhymeFirst?: boolean;
}

export interface TemplateEntry {
  name: string;
  genre: 'meter' | 'ci';
  variantCount: number;
  variants: TemplateVariant[];
}

// ---- 诗体格律（从 loadMeterTemplates 派生，不重复定义） ----

function buildMeterCatalog(): TemplateEntry[] {
  const templates = loadMeterTemplates();
  const groups = new Map<string, TemplateEntry>();

  for (const t of templates) {
    const charLabel = t.charPerLine === 7 ? '七' : '五';
    const lineType = t.lineCount === 8 ? '律' : '绝';
    const name = `${charLabel}${lineType}`;
    const isRuYun = t.rhymeLineIndices.includes(0);

    // 从 ID 提取起韵信息
    const idLower = t.id.toLowerCase();
    const qiYun =
      idLower.includes('ping') || idLower.includes('pingqi') ? '平起' : '仄起';
    const rhymeNote = isRuYun ? '首句入韵' : '首句不入韵';
    const duizhangNote = t.lineCount === 8 ? ' · 颔联颈联对仗' : '';

    if (!groups.has(name)) {
      groups.set(name, { name, genre: 'meter', variantCount: 0, variants: [] });
    }
    const entry = groups.get(name)!;
    entry.variants.push({
      id: t.id,
      author: qiYun,
      sketch: `${rhymeNote} · ${charLabel}言${t.lineCount === 8 ? '八' : '四'}句${duizhangNote}`,
      charCount: t.charPerLine * t.lineCount,
      rhymeFirst: isRuYun,
    });
    entry.variantCount = entry.variants.length;
  }

  return [...groups.values()];
}

// ---- 词牌（从 JSON 加载） ----

export interface CiCatalogVariant {
  id: string;
  author: string;
  sketch: string;
  charCount: number;
}

export interface CiCatalogEntry {
  variantCount: number;
  variants: CiCatalogVariant[];
}

export type CiCatalog = Record<string, CiCatalogEntry>;

/** 完整词牌目录（818 首），键为词牌名 */
export const ciCatalog: CiCatalog = catalogData;

// ---- 统一查询 ----

/** 列出所有可用模板：诗体格律 + 词牌 818 首 */
export function listAllTemplates(): TemplateEntry[] {
  const ciEntries: TemplateEntry[] = Object.entries(ciCatalog).map(
    ([name, entry]) => ({
      name,
      genre: 'ci' as const,
      variantCount: entry.variantCount,
      variants: entry.variants.map((v) => ({
        id: v.id,
        author: v.author,
        sketch: v.sketch,
        charCount: v.charCount,
      })),
    }),
  );
  return [...buildMeterCatalog(), ...ciEntries];
}

/** 查找格律模板 */
export function findMeterTemplate(id: string): TemplateVariant | undefined {
  for (const m of buildMeterCatalog()) {
    const v = m.variants.find((v) => v.id === id);
    if (v) return v;
  }
}

/** 查找词牌 */
export function findCiTune(name: string): CiCatalogEntry | undefined {
  return ciCatalog[name];
}

/** 列出词牌名 */
export function listCiTuneNames(): string[] {
  return Object.keys(ciCatalog).sort();
}

/** 按字数筛选词牌 */
export function filterCiByCharCount(
  min: number,
  max: number,
): { tuneName: string; variant: CiCatalogVariant }[] {
  const results: { tuneName: string; variant: CiCatalogVariant }[] = [];
  for (const [name, entry] of Object.entries(ciCatalog)) {
    for (const v of entry.variants) {
      if (v.charCount >= min && v.charCount <= max) {
        results.push({ tuneName: name, variant: v });
      }
    }
  }
  return results;
}

/** 按作者筛选词牌变体 */
export function filterCiByAuthor(
  author: string,
): { tuneName: string; variant: CiCatalogVariant }[] {
  const results: { tuneName: string; variant: CiCatalogVariant }[] = [];
  for (const [name, entry] of Object.entries(ciCatalog)) {
    for (const v of entry.variants) {
      if (v.author.includes(author)) {
        results.push({ tuneName: name, variant: v });
      }
    }
  }
  return results;
}
