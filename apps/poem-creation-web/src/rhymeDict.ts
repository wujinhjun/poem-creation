/**
 * 浏览器兼容的韵书实现
 *
 * 通过 fetch 加载 tone-lookup.json，构造轻量 RhymeDict。
 * 仅含平仄查询，不含完整韵部信息（rhymeGroup）。
 */

import type { RhymeDict, RhymeEntry } from "@poem/parser/kernel";
import { Tone } from "@poem/parser/kernel";

type ToneLookup = Record<string, "平" | "仄" | "多" | "未知">;

let _cache: ToneLookup | null = null;

/** 从 JSON 加载音调查询表（~200KB，gzip ~60KB） */
async function loadToneLookup(): Promise<ToneLookup> {
  if (_cache) return _cache;
  const res = await fetch("/data/tone-lookup.json");
  _cache = (await res.json()) as ToneLookup;
  return _cache!;
}

/** 浏览器 RhymeDict：仅 support 基本平仄查询 */
class BrowserRhymeDict implements RhymeDict {
  type = "pingshui" as const; // 平仄查询跟韵书类型无关，type 仅占位
  private lookup_: ToneLookup;

  constructor(lookup: ToneLookup) {
    this.lookup_ = lookup;
  }

  lookup(char: string): RhymeEntry[] {
    const info = this.lookup_[char];
    if (!info || info === "未知") return [];
    if (info === "平") return [{ char, tone: Tone.Ping, rhymeGroup: "" }];
    if (info === "仄") return [{ char, tone: Tone.Ze, rhymeGroup: "" }];
    // 多 → 返回两种可能
    return [
      { char, tone: Tone.Ping, rhymeGroup: "" },
      { char, tone: Tone.Ze, rhymeGroup: "" },
    ];
  }

  getRhymeGroup(_char: string): string[] {
    return []; // 浏览器轻量版不查韵部
  }

  isSameRhyme(_a: string, _b: string): boolean {
    return false; // 浏览器轻量版不查韵部一致性
  }
}

/** 创建浏览器韵书实例 */
export async function createBrowserDict(): Promise<RhymeDict> {
  const lookup = await loadToneLookup();
  return new BrowserRhymeDict(lookup);
}
