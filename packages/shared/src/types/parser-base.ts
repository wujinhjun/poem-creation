/**
 * Parser 基础类型 —— 跨包共享的最底层定义
 *
 * 由 shared 拥有；parser 与 rhyme-book 再 re-export，确保
 * "shared 是底座、parser 依赖 shared" 的分层方向正确。
 */

/** 汉字匹配：基本多文种平面（U+4E00–9FFF）+ CJK 扩展 A（U+3400–4DBF） */
export const HANZI_RE = /[㐀-䶿一-鿿]/u;

/**
 * 音调
 * - Ping: 平声
 * - Ze: 仄声（上去入）
 * - Unknown: 未知
 */
export enum Tone {
  Ping = "平",
  Ze = "仄",
  Unknown = "未知",
}

/**
 * 韵脚声调
 * - Ping: 平声韵
 * - Ze: 仄声韵（上/去/入）
 */
export const RhymeTone = {
  Ping: "ping",
  Ze: "ze",
} as const;
export type RhymeTone = (typeof RhymeTone)[keyof typeof RhymeTone];

/**
 * 韵书类型
 * - Pingshui: 平水韵（格律诗）
 * - Cilin: 词林正韵（词牌）
 * - Zhonghua: 中华新韵
 */
export const RhymeDictType = {
  Pingshui: "pingshui",
  Cilin: "cilin",
  Zhonghua: "zhonghua_new",
} as const;
export type RhymeDictType = (typeof RhymeDictType)[keyof typeof RhymeDictType];

/**
 * 单字的音调约束
 */
export type ToneConstraint =
  | { type: "fixed"; tone: Tone }
  | { type: "flexible" }
  | { type: "rhyme"; group?: string; tone?: Tone; xieyun?: boolean };

export function formatRhymeToneLabel(
  tone: Tone | string | null | undefined,
  xieyun = false,
): string {
  if (!tone) return "韵";
  return `${xieyun ? "叶" : ""}${tone}韵`;
}

/**
 * 字符校验状态
 */
export const CharValidationStatus = {
  Pass: "pass",
  Fail: "fail",
  Flexible: "flexible",
  Rescued: "rescued",
  Unknown: "unknown",
} as const;
export type CharValidationStatus =
  (typeof CharValidationStatus)[keyof typeof CharValidationStatus];

/**
 * 单字韵书条目（来自 RhymeDict 的查询结果）
 */
export interface RhymeEntry {
  char: string;
  tone: Tone;
  rhymeGroup: string;
  pronunciation?: string;
}

/**
 * 韵书接口 —— 调用方实现该接口（如 Node JSON 加载、浏览器 fetch 加载）
 */
export interface RhymeDict {
  type: RhymeDictType;
  lookup(char: string): RhymeEntry[];
  getRhymeGroup(char: string): string[];
  isSameRhyme(a: string, b: string): boolean;
}
