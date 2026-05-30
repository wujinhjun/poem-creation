import type { EditorConstraint } from "./types.js";

/** 创建空的编辑器网格 */
export function createEmptyEditorGrid(
  pattern: readonly EditorConstraint[][],
): string[][] {
  return pattern.map((row) => row.map(() => ""));
}

/** 克隆编辑器网格，避免直接修改已有状态 */
export function cloneEditorGrid(grid: readonly string[][]): string[][] {
  return grid.map((row) => [...row]);
}

/** 生成 pattern 的摘要字符串（用于检测模板变化） */
export function createEditorPatternSignature(
  pattern: readonly EditorConstraint[][],
): string {
  return pattern
    .map((row) =>
      row
        .map((c) => {
          if (c.type === "fixed") return c.tone ?? "";
          if (c.type === "rhyme") return "韵";
          return "中";
        })
        .join(""),
    )
    .join("|");
}

/** 判断一行末尾是否为韵脚约束（泛型：取末位元素的 type 字段） */
export function lineEndsWithRhyme(
  patternLine: readonly { type: unknown }[] | undefined,
): boolean {
  return (patternLine?.at(-1)?.type as string) === "rhyme";
}
