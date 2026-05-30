import { RhymeDictType, Tone } from "@poem/parser/kernel";
import type { RhymeDict, RhymeEntry } from "@poem/parser/kernel";

import rhymeIndexData from "../../../../core/rhyme-book/data/rhyme-char-index.json";
import toneLookupData from "../../../../core/rhyme-book/data/tone-lookup.json";
import yunFamilyData from "../../../../core/rhyme-book/data/yun-family-index.json";

type RhymeIndexEntry = {
  dictType: string;
  tone: "平" | "仄" | "未知";
  rhymeGroup: string;
  pronunciation?: string;
};

type RhymeCharIndex = Record<string, RhymeIndexEntry[]>;
type ToneLookup = Record<string, "平" | "仄" | "多" | "未知">;

function toneLookupToTones(info: ToneLookup[string] | undefined): Tone[] {
  if (info === "平") return [Tone.Ping];
  if (info === "仄") return [Tone.Ze];
  if (info === "多") return [Tone.Ping, Tone.Ze];
  return [];
}

type YunFamilyIndex = Record<string, { family: string; tone: string }>;

class AppRhymeDict implements RhymeDict {
  type: RhymeDictType;

  constructor(
    private index: RhymeCharIndex,
    private toneLookup: ToneLookup,
    private yunFamily: YunFamilyIndex,
    type: RhymeDictType,
  ) {
    this.type = type;
  }

  lookup(char: string): RhymeEntry[] {
    const entries = (this.index[char] ?? []).filter(
      (entry) => entry.dictType === this.type,
    );
    const fallbackTones = toneLookupToTones(this.toneLookup[char]);
    const result = entries.flatMap((entry) => {
      const tones =
        entry.tone === "未知"
          ? fallbackTones
          : [entry.tone === "平" ? Tone.Ping : Tone.Ze];

      return tones.map((tone) => ({
        char,
        tone,
        rhymeGroup: entry.rhymeGroup,
        pronunciation: entry.pronunciation,
      }));
    });

    if (result.length > 0) return result;
    return fallbackTones.map((tone) => ({ char, tone, rhymeGroup: "" }));
  }

  getRhymeGroup(char: string): string[] {
    return [...new Set(this.lookup(char).map((entry) => entry.rhymeGroup))];
  }

  isSameRhyme(a: string, b: string): boolean {
    const aGroups = new Set(this.getRhymeGroup(a));
    return this.getRhymeGroup(b).some((group) => aGroups.has(group));
  }

  yunjieFamilyOf(char: string): string | null {
    const entry = this.yunFamily[char];
    return entry?.family ?? null;
  }
}

export function createAppDict(type: RhymeDictType): RhymeDict {
  return new AppRhymeDict(
    rhymeIndexData as RhymeCharIndex,
    toneLookupData as ToneLookup,
    yunFamilyData as YunFamilyIndex,
    type,
  );
}
