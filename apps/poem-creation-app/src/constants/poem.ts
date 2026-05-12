import { RhymeDictType } from "@poem/parser/kernel";

export type Genre = "meter" | "ci";
export type AppView = "home" | "works" | "entry" | "editor" | "settings";

export const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: "平水韵" },
  { value: RhymeDictType.Cilin, label: "词林正韵" },
  { value: RhymeDictType.Zhonghua, label: "中华新韵" },
] as const;

export function defaultRhymeType(genre: Genre): RhymeDictType {
  return genre === "meter" ? RhymeDictType.Pingshui : RhymeDictType.Cilin;
}
