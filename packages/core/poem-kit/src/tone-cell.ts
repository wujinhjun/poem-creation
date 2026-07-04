/**
 * 单格平仄/韵校验 —— 唯一事实来源。
 *
 * "给定一个字 + 一个格位约束 + 韵组锚点，判定是否合律" 的逻辑此前在
 * 编辑器实时着色（web Composer）与严格校验报告（web strictGridValidation）
 * 里各写了一份，极易漂移出"格子是绿的、报告却说不合"的矛盾。
 *
 * 这里给出语义层结果，两个调用方各自映射到自己的展示（label/title 或 issue）。
 *
 * @module tone-cell
 */
import { Tone } from "@poem/parser/kernel";
import type { RhymeDict, RhymeEntry, ToneConstraint } from "@poem/parser/kernel";

export type ToneCellStatus = "empty" | "pass" | "fail";

export type ToneCellFailReason =
  | "not-in-dict" // 韵书未收此字
  | "tone-mismatch" // 固定格平仄不合
  | "rhyme-mismatch"; // 韵脚不合

export interface ToneCellContext {
  dict: RhymeDict | null;
  /** 词牌未在约束里写明韵脚声调时的兜底声调。 */
  expectedRhymeTone: Tone | null;
  /**
   * 跨格共享的韵组锚点，按迭代顺序原地更新：
   * 首个命中的韵脚确定该声调的韵部，后续同声调韵脚须落在同一韵部。
   * 调用方对每次校验会话传入一个新的 Map，并按行列顺序逐格调用。
   */
  rhymeAnchors: Map<Tone, string>;
}

export interface ToneCellResult {
  status: ToneCellStatus;
  constraintType: ToneConstraint["type"];
  /** 韵脚的期望声调（含兜底）；非韵脚约束为 null。 */
  expectedTone: Tone | null;
  xieyun: boolean;
  /** 命中的韵书条目；未查字典或字未收时为空数组。 */
  entries: RhymeEntry[];
  /** 韵脚 pass 时命中的韵部。 */
  matchedRhymeGroup?: string;
  failReason?: ToneCellFailReason;
}

/**
 * 判定单个格位是否合律。会在命中新韵脚时原地更新 `ctx.rhymeAnchors`。
 */
export function evaluateToneCell(
  char: string,
  constraint: ToneConstraint,
  ctx: ToneCellContext,
): ToneCellResult {
  const isRhyme = constraint.type === "rhyme";
  const expectedTone = isRhyme
    ? (constraint.tone ?? ctx.expectedRhymeTone)
    : null;
  const xieyun = isRhyme ? constraint.xieyun === true : false;
  const base = {
    constraintType: constraint.type,
    expectedTone,
    xieyun,
  } as const;

  if (!char || !ctx.dict) {
    return { status: "empty", entries: [], ...base };
  }
  if (constraint.type === "flexible") {
    return { status: "pass", entries: [], ...base };
  }

  const entries = ctx.dict.lookup(char);
  if (entries.length === 0) {
    return { status: "fail", entries, failReason: "not-in-dict", ...base };
  }

  if (constraint.type === "fixed") {
    const matches = entries.some((entry) => entry.tone === constraint.tone);
    return matches
      ? { status: "pass", entries, ...base }
      : { status: "fail", entries, failReason: "tone-mismatch", ...base };
  }

  // 韵脚：先按（韵部存在 + 期望声调）过滤，再受韵组锚点约束。
  const rhymeEntries = entries.filter(
    (entry) => entry.rhymeGroup && (!expectedTone || entry.tone === expectedTone),
  );
  const matchingEntry = rhymeEntries.find((entry) => {
    const anchor = ctx.rhymeAnchors.get(entry.tone);
    return !anchor || anchor === entry.rhymeGroup;
  });
  if (!matchingEntry) {
    return { status: "fail", entries, failReason: "rhyme-mismatch", ...base };
  }
  if (!ctx.rhymeAnchors.has(matchingEntry.tone)) {
    ctx.rhymeAnchors.set(matchingEntry.tone, matchingEntry.rhymeGroup);
  }
  return {
    status: "pass",
    entries,
    matchedRhymeGroup: matchingEntry.rhymeGroup,
    ...base,
  };
}
