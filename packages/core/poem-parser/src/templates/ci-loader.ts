/**
 * 词牌模板装载器
 *
 * 将紧凑存储格式（CiVariantStored）物化为运行时 CiTemplate 对象。
 * 装载时一次性完成 DSL 解析、delta 展开和韵组 cohort 索引构建。
 *
 * 结果缓存在模块级 Map 中，后续调用零开销。
 *
 * @module templates/ci-loader
 */

import type { CiTemplate, CiTemplateVariant } from "./index.js";
import {
  expandStoredVariant,
  materializeVariant,
} from "./ci-compress.js";
import type {
  CiVariantStored,
  CiVariantFull,
  CiSectionStored,
} from "./ci-compress.js";
import { extractRhymeToken } from "./dsl.js";
import { buildCohortFromSlots } from "./cohort.js";
import type {
  CohortedRhymeSlot,
  RhymeCohortSourceSlot,
} from "./cohort.js";

// ========== 紧凑 Bundle 的 Raw 结构 ==========

export interface CompactTuneRaw {
  id: string;
  name: string;
  aliases?: string[];
  variants: Array<CiVariantStored | null>;
}

export type CompactBundleRaw = Record<string, CompactTuneRaw>;

/**
 * 从 compact sections 构建韵组 cohort 索引。
 */
export function buildCohortIndex(
  sections: CiSectionStored[],
): CohortedRhymeSlot[] {
  const sourceSlots: RhymeCohortSourceSlot[] = [];

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    for (let li = 0; li < sec.lines.length; li++) {
      const dsl = sec.lines[li];
      const token = extractRhymeToken(dsl);
      if (!token) continue;

      sourceSlots.push({
        pos: [si, li],
        token: { tone: token.tone, xieyun: token.xieyun },
      });
    }
  }

  return buildCohortFromSlots(sourceSlots);
}

// ========== 装载与缓存 ==========

const DEFAULT_NAMESPACE = "default";

const _templateCache = new Map<string, CiTemplate>();
const _cohortCache = new Map<string, CohortedRhymeSlot[]>();

function nsKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/**
 * 同步装载紧凑格式 bundle，返回物化后的 CiTemplate 映射。
 *
 * 调用时机：应用启动时一次性调用。
 * 结果缓存，重复调用返回同一份数据。
 *
 * @param raw 紧凑格式 JSON 数据
 * @param namespace 缓存命名空间，多 bundle 场景下避免 key 冲突（默认 "default"）
 * @returns 词牌名 → CiTemplate 的映射
 */
export function loadCiBundle(
  raw: CompactBundleRaw,
  namespace: string = DEFAULT_NAMESPACE,
): Record<string, CiTemplate> {
  // 构建 canonical map
  const canonicalMap = new Map<string, CiVariantFull>();
  for (const tune of Object.values(raw)) {
    for (const v of tune.variants) {
      if (!v) continue;
      if (v.kind === "full") {
        canonicalMap.set(v.id, v);
      }
    }
  }

  const result: Record<string, CiTemplate> = Object.create(null);

  for (const [tuneName, rawTune] of Object.entries(raw)) {
    const cacheKey = nsKey(namespace, rawTune.id);
    const storedVariants = rawTune.variants.filter(
      (variant): variant is CiVariantStored => variant !== null,
    );

    // 检查缓存
    const cached = _templateCache.get(cacheKey);
    if (cached) {
      result[tuneName] = cached;
      continue;
    }

    const expandedVariants = storedVariants.map((stored) =>
      expandStoredVariant(stored, canonicalMap),
    );
    const materializedVariants: CiTemplateVariant[] = storedVariants.map(
      (stored, index) => materializeVariant(stored, canonicalMap, expandedVariants[index]),
    );

    const template: CiTemplate = {
      id: rawTune.id,
      name: rawTune.name,
      aliases: rawTune.aliases,
      variants: materializedVariants,
    };

    _templateCache.set(cacheKey, template);

    // 为每个变体构建 cohort 索引
    for (let index = 0; index < storedVariants.length; index++) {
      const stored = storedVariants[index];
      const cohortKey = nsKey(namespace, stored.id);
      if (!_cohortCache.has(cohortKey)) {
        _cohortCache.set(cohortKey, buildCohortIndex(expandedVariants[index].sections));
      }
    }

    result[tuneName] = template;
  }

  return result;
}

/**
 * 获取指定变体的韵组 cohort 索引。
 * 必须在 loadCiBundle 之后调用。
 */
export function getCohortIndex(
  variantId: string,
  namespace: string = DEFAULT_NAMESPACE,
): CohortedRhymeSlot[] {
  return _cohortCache.get(nsKey(namespace, variantId)) ?? [];
}

/**
 * 清除缓存（主要用于测试）。
 * 不传 namespace 清除全部缓存。
 */
export function clearCiBundleCache(namespace?: string): void {
  if (namespace) {
    const prefix = `${namespace}:`;
    for (const key of _templateCache.keys()) {
      if (key.startsWith(prefix)) _templateCache.delete(key);
    }
    for (const key of _cohortCache.keys()) {
      if (key.startsWith(prefix)) _cohortCache.delete(key);
    }
  } else {
    _templateCache.clear();
    _cohortCache.clear();
  }
}

export type { CohortedRhymeSlot } from "./cohort.js";
