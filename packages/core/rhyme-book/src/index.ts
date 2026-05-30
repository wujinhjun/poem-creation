/**
 * @poem/rhyme-book —— 韵书 JSON 加载器
 *
 * 通过 readFile 从磁盘加载韵书数据，构造 JsonRhymeDict。
 * 调用方也可自行实现 RhymeDict 接口（如浏览器端 fetch JSON 后构造）。
 *
 * RhymeDict / RhymeEntry 接口与 Tone / RhymeDictType 由 @poem/shared 拥有，
 * 本包仅提供其 Node 环境的 JSON 实现。
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Tone } from "@poem/shared";
import type { RhymeDict, RhymeDictType, RhymeEntry } from "@poem/shared";

// ---- 内部类型 ----

type RawRhymeItem = {
  dictType: "pingshui" | "cilin" | "zhonghua_new" | "ci_rhyme";
  tone: "平" | "仄" | "未知";
  rhymeGroup: string;
};
type RhymeIndex = Record<string, RawRhymeItem[]>;
type ToneLookup = Record<string, "平" | "仄" | "多" | "未知">;
type YunFamilyEntry = { family: string; tone: string };
type YunFamilyIndex = Record<string, YunFamilyEntry>;

const TONE_MAP: Record<string, Tone> = { 平: Tone.Ping, 仄: Tone.Ze };

function toTone(raw: RawRhymeItem["tone"]): Tone {
  return TONE_MAP[raw] ?? Tone.Unknown;
}

/** 本包内置韵书数据目录（dist/index.js → ../data） */
const DEFAULT_DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../data");

// ---- JsonRhymeDict ----

class JsonRhymeDict implements RhymeDict {
  public readonly type: RhymeDictType;
  private readonly index: RhymeIndex;
  private readonly toneLookup: ToneLookup;
  private readonly yunFamily: YunFamilyIndex;

  public constructor(
    type: RhymeDictType,
    index: RhymeIndex,
    toneLookup: ToneLookup,
    yunFamily: YunFamilyIndex,
  ) {
    this.type = type;
    this.index = index;
    this.toneLookup = toneLookup;
    this.yunFamily = yunFamily;
  }

  public lookup(char: string): RhymeEntry[] {
    const toneInfo = this.toneLookup[char];
    const raw = this.index[char] ?? [];
    const rhymeGroupsForType = raw
      .filter((entry) => entry.dictType === this.type)
      .map((entry) => entry.rhymeGroup)
      .filter(Boolean);

    if (toneInfo && toneInfo !== "未知") {
      const toneEntries: RhymeEntry[] = [];
      if (toneInfo === "平") {
        for (const group of rhymeGroupsForType.length > 0 ? rhymeGroupsForType : [""]) {
          toneEntries.push({ char, tone: Tone.Ping, rhymeGroup: group });
        }
      } else if (toneInfo === "仄") {
        for (const group of rhymeGroupsForType.length > 0 ? rhymeGroupsForType : [""]) {
          toneEntries.push({ char, tone: Tone.Ze, rhymeGroup: group });
        }
      } else if (toneInfo === "多") {
        const pingGroups = raw
          .filter((entry) => entry.dictType === this.type && entry.tone === "平")
          .map((entry) => entry.rhymeGroup)
          .filter(Boolean);
        for (const group of pingGroups.length > 0 ? pingGroups : [""]) {
          toneEntries.push({ char, tone: Tone.Ping, rhymeGroup: group });
        }
        const zeGroups = raw
          .filter((entry) => entry.dictType === this.type && entry.tone === "仄")
          .map((entry) => entry.rhymeGroup)
          .filter(Boolean);
        for (const group of zeGroups.length > 0 ? zeGroups : [""]) {
          toneEntries.push({ char, tone: Tone.Ze, rhymeGroup: group });
        }
      }
      const validEntries = toneEntries.filter((e) => e.tone !== Tone.Unknown);
      if (validEntries.length > 0) return validEntries;
    }

    const primary = raw
      .filter((entry) => entry.dictType === this.type)
      .map((entry) => ({ char, tone: toTone(entry.tone), rhymeGroup: entry.rhymeGroup }));
    const knownPrimary = primary.filter((entry) => entry.tone !== Tone.Unknown);
    if (knownPrimary.length > 0) return knownPrimary;
    return primary;
  }

  public getRhymeGroup(char: string): string[] {
    return [...new Set(this.lookup(char).map((item) => item.rhymeGroup))];
  }

  public isSameRhyme(a: string, b: string): boolean {
    const aSet = new Set(this.getRhymeGroup(a));
    return this.getRhymeGroup(b).some((group) => aSet.has(group));
  }

  public yunjieFamilyOf(char: string): string | null {
    const entry = this.yunFamily[char];
    return entry?.family ?? null;
  }
}

// ---- 加载函数 ----

let _rhymeIndexCache: RhymeIndex | null = null;
let _toneLookupCache: ToneLookup | null = null;
let _yunFamilyCache: YunFamilyIndex | null = null;

async function loadJson<T>(dataDir: string, filename: string): Promise<T> {
  const file = resolve(dataDir, filename);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/**
 * 从 JSON 文件构造 RhymeDict（异步，仅 Node 环境）
 *
 * @param type     韵书类型
 * @param dataDir  韵书 data/ 目录的绝对路径，默认使用本包内置数据
 */
export async function createRhymeDict(
  type: RhymeDictType,
  dataDir: string = DEFAULT_DATA_DIR,
): Promise<RhymeDict> {
  if (!_rhymeIndexCache) {
    _rhymeIndexCache = await loadJson<RhymeIndex>(dataDir, "rhyme-char-index.json");
  }
  if (!_toneLookupCache) {
    _toneLookupCache = await loadJson<ToneLookup>(dataDir, "tone-lookup.json");
  }
  if (!_yunFamilyCache) {
    _yunFamilyCache = await loadJson<YunFamilyIndex>(dataDir, "yun-family-index.json");
  }
  return new JsonRhymeDict(type, _rhymeIndexCache, _toneLookupCache, _yunFamilyCache);
}

/** 清空缓存（测试隔离用） */
export function clearRhymeCache(): void {
  _rhymeIndexCache = null;
  _toneLookupCache = null;
  _yunFamilyCache = null;
}
