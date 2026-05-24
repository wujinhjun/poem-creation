/**
 * 浏览器兼容的韵书实现
 *
 * 通过 fetch 加载 rhyme-char-index.json，构造浏览器端 RhymeDict。
 */

import type { RhymeDict, RhymeDictType, RhymeEntry } from "@poem/parser/kernel";
import { Tone, RhymeDictType as DictType } from "@poem/parser/kernel";
import { publicAssetPath } from './publicAsset';

type RhymeIndexEntry = {
  dictType: string;
  tone: "平" | "仄" | "未知";
  rhymeGroup: string;
  pronunciation?: string;
};

type RhymeCharIndex = Record<string, RhymeIndexEntry[]>;
type ToneLookup = Record<string, "平" | "仄" | "多" | "未知">;

let _cache: RhymeCharIndex | null = null;
let _toneCache: ToneLookup | null = null;

/** 从 JSON 加载完整韵字索引（dev server /data 已可访问） */
async function loadRhymeIndex(): Promise<RhymeCharIndex> {
  if (_cache) return _cache;
  const res = await fetch(publicAssetPath("data/rhyme-char-index.json"));
  _cache = (await res.json()) as RhymeCharIndex;
  return _cache!;
}

async function loadToneLookup(): Promise<ToneLookup> {
  if (_toneCache) return _toneCache;
  const res = await fetch(publicAssetPath("data/tone-lookup.json"));
  _toneCache = (await res.json()) as ToneLookup;
  return _toneCache!;
}

function toneLookupToTones(info: ToneLookup[string] | undefined): Tone[] {
  if (info === "平") return [Tone.Ping];
  if (info === "仄") return [Tone.Ze];
  if (info === "多") return [Tone.Ping, Tone.Ze];
  return [];
}

class BrowserRhymeDict implements RhymeDict {
  type: RhymeDictType;
  private index: RhymeCharIndex;
  private toneLookup: ToneLookup;

  constructor(index: RhymeCharIndex, toneLookup: ToneLookup, type: RhymeDictType) {
    this.index = index;
    this.toneLookup = toneLookup;
    this.type = type;
  }

  lookup(char: string): RhymeEntry[] {
    const entries = (this.index[char] ?? []).filter((entry) => entry.dictType === this.type);
    const fallbackTones = toneLookupToTones(this.toneLookup[char]);
    const result = entries.flatMap((entry) => {
      const tones = entry.tone === Tone.Unknown
        ? fallbackTones
        : [entry.tone === Tone.Ping ? Tone.Ping : Tone.Ze];

      return tones.map((tone) => ({
        char,
        tone,
        rhymeGroup: entry.rhymeGroup,
        pronunciation: entry.pronunciation,
      }));
    });

    if (result.length > 0) return result;

    return fallbackTones.map((tone) => ({
      char,
      tone,
      rhymeGroup: "",
    }));
  }

  getRhymeGroup(char: string): string[] {
    return [...new Set(this.lookup(char).map((entry) => entry.rhymeGroup))];
  }

  isSameRhyme(a: string, b: string): boolean {
    const aGroups = new Set(this.getRhymeGroup(a));
    return this.getRhymeGroup(b).some((group) => aGroups.has(group));
  }
}

/** 创建浏览器韵书实例 */
export async function createBrowserDict(
  type: RhymeDictType = DictType.Pingshui,
): Promise<RhymeDict> {
  const [index, toneLookup] = await Promise.all([loadRhymeIndex(), loadToneLookup()]);
  return new BrowserRhymeDict(index, toneLookup, type);
}
