/**
 * @poem/parser/catalog —— 词牌目录查询
 *
 * 提供轻量索引，供 Web/RN 构建词牌选择器。
 * 不含完整格律数据（CiTemplate.pattern 等），仅展示所需信息。
 *
 * 用法：
 *   import { ciCatalog, listTunes, findTune } from "@poem/parser/catalog";
 */

import catalogData from "../data/ci-catalog.json" with { type: "json" };

// ---- 类型 ----

export interface CiCatalogVariant {
  /** 变体 ID，如 "水调歌头-苏轼体1" */
  id: string;
  /** 作者 */
  author: string;
  /** 词谱概要，如 "双调九十五字，前段九句四平韵" */
  sketch: string;
  /** 总字数 */
  charCount: number;
}

export interface CiCatalogEntry {
  variantCount: number;
  variants: CiCatalogVariant[];
}

export type CiCatalog = Record<string, CiCatalogEntry>;

// ---- 数据 ----

/** 完整词牌目录（878 首），键为词牌名 */
export const ciCatalog: CiCatalog = catalogData;

// ---- 查询函数 ----

/** 列出所有词牌名（按拼音排序） */
export function listTuneNames(): string[] {
  return Object.keys(ciCatalog).sort();
}

/** 按词牌名查找目录条目 */
export function findTune(name: string): CiCatalogEntry | undefined {
  return ciCatalog[name];
}

/** 按字数筛选词牌 */
export function filterByCharCount(min: number, max: number): CiCatalogEntry[] {
  return Object.values(ciCatalog).filter((entry) =>
    entry.variants.some((v) => v.charCount >= min && v.charCount <= max),
  );
}

/** 按作者筛选词牌 */
export function filterByAuthor(author: string): { tuneName: string; variant: CiCatalogVariant }[] {
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
