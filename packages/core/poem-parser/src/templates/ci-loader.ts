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
  materializeVariant,
  applyEdits,
} from "./ci-compress.js";
import type {
  CiVariantStored,
  CiVariantFull,
  CiSectionStored,
} from "./ci-compress.js";
import { extractRhymeToken } from "./dsl.js";
import type { RhymeTokenInfo } from "./dsl.js";

// ========== 紧凑 Bundle 的 Raw 结构 ==========

export interface CompactTuneRaw {
  id: string;
  name: string;
  aliases?: string[];
  variants: CiVariantStored[];
}

export type CompactBundleRaw = Record<string, CompactTuneRaw>;

// ========== 韵组 Cohort 索引 ==========

export interface CohortedRhymeSlot {
  /** 行定位：[sectionIdx, lineIdx] */
  pos: [number, number];
  /** 所属韵组 ID（同组韵脚必须互押） */
  cohortId: number;
  /** 韵脚 token 信息 */
  token: RhymeTokenInfo;
}

/**
 * 从 compact sections 构建韵组 cohort 索引。
 *
 * 扫描规则（§1.5）：
 * 1. 首个韵脚 token 起第 1 组
 * 2. 带 + 修饰的 token 永远续上一组（叶韵）
 * 3. 裸 token 声调与上一 token 相同 → 续组
 * 4. 裸 token 声调与上一 token 相反 → 起新组
 */
export function buildCohortIndex(
  sections: CiSectionStored[],
): CohortedRhymeSlot[] {
  const slots: CohortedRhymeSlot[] = [];
  let cohortId = 0;
  /** 当前 cohort 的"已确立"声调（由裸 token 设定；+ token 不改变） */
  let cohortTone: "ping" | "ze" | null = null;

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    for (let li = 0; li < sec.lines.length; li++) {
      const dsl = sec.lines[li];
      const token = extractRhymeToken(dsl);
      if (!token) continue;

      if (slots.length === 0) {
        cohortId = 1;
        cohortTone = token.tone;
      } else if (token.xieyun) {
        // + 修饰 → 永远续上一组，不改变 cohort 确立的声调
      } else if (token.tone === cohortTone) {
        // 裸 token 与 cohort 确立声调相同 → 续组
      } else {
        // 裸 token 与 cohort 确立声调不同 → 起新组
        cohortId += 1;
        cohortTone = token.tone;
      }

      slots.push({
        pos: [si, li],
        cohortId,
        token: { tone: token.tone, xieyun: token.xieyun },
      });
    }
  }

  return slots;
}

// ========== 装载与缓存 ==========

const _templateCache = new Map<string, CiTemplate>();
const _cohortCache = new Map<string, CohortedRhymeSlot[]>();

/**
 * 同步装载紧凑格式 bundle，返回物化后的 CiTemplate 映射。
 *
 * 调用时机：应用启动时一次性调用。
 * 结果缓存，重复调用返回同一份数据。
 *
 * @param raw 紧凑格式 JSON 数据
 * @returns 词牌名 → CiTemplate 的映射
 */
export function loadCiBundle(
  raw: CompactBundleRaw,
): Record<string, CiTemplate> {
  // 构建 canonical map
  const canonicalMap = new Map<string, CiVariantFull>();
  for (const tune of Object.values(raw)) {
    for (const v of tune.variants) {
      if (v.kind === "full") {
        canonicalMap.set(v.id, v);
      }
    }
  }

  const result: Record<string, CiTemplate> = Object.create(null);

  for (const [tuneName, rawTune] of Object.entries(raw)) {
    const cacheKey = rawTune.id;

    // 检查缓存
    const cached = _templateCache.get(cacheKey);
    if (cached) {
      result[tuneName] = cached;
      continue;
    }

    // 物化变体
    const materializedVariants: CiTemplateVariant[] = rawTune.variants.map(
      (stored) => materializeVariant(stored, canonicalMap),
    );

    const template: CiTemplate = {
      id: rawTune.id,
      name: rawTune.name,
      aliases: rawTune.aliases,
      variants: materializedVariants,
    };

    _templateCache.set(cacheKey, template);

    // 为每个变体构建 cohort 索引
    for (const stored of rawTune.variants) {
      const sections =
        stored.kind === "full"
          ? stored.sections
          : applyEdits(
              canonicalMap.get(stored.base)!.sections,
              stored.edits,
            );

      const cohortKey = stored.id;
      if (!_cohortCache.has(cohortKey)) {
        _cohortCache.set(cohortKey, buildCohortIndex(sections));
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
export function getCohortIndex(variantId: string): CohortedRhymeSlot[] {
  return _cohortCache.get(variantId) ?? [];
}

/**
 * 清除缓存（主要用于测试）。
 */
export function clearCiBundleCache(): void {
  _templateCache.clear();
  _cohortCache.clear();
}
