import type { EditorConstraint, EditorWriteResult } from "./types.js";

/** 滤除标点和空白，返回纯汉字数组 */
export function normalizeEditorInput(text: string): string[] {
  return Array.from(text).filter(
    (ch) => !/[\s，。！？；：、,.!?;:]/u.test(ch),
  );
}

/** 在指定位置写入字符序列，自动换行 */
export function writeEditorCharsAt(
  grid: readonly string[][],
  pattern: readonly EditorConstraint[][],
  lineIdx: number,
  colIdx: number,
  chars: readonly string[],
): EditorWriteResult {
  const next = grid.map((row) => [...row]);
  let line = lineIdx;
  let col = colIdx;
  let wroteAny = false;

  for (const char of chars) {
    while (line < pattern.length && col >= (pattern[line]?.length ?? 0)) {
      line += 1;
      col = 0;
    }
    if (line >= pattern.length) break;
    next[line][col] = char;
    wroteAny = true;
    col += 1;
  }

  while (line < pattern.length && col >= (pattern[line]?.length ?? 0)) {
    line += 1;
    col = 0;
  }

  const completed = wroteAny && line >= pattern.length;
  if (line >= pattern.length) {
    const lastLine = Math.max(pattern.length - 1, 0);
    const lastCol = Math.max((pattern[lastLine]?.length ?? 1) - 1, 0);
    return {
      grid: next,
      nextPosition: { line: lastLine, col: lastCol },
      completed,
    };
  }

  return {
    grid: next,
    nextPosition: { line, col },
    completed,
  };
}

/** 粘贴多行文本到编辑器网格 */
export function pasteEditorTextAt(
  grid: readonly string[][],
  pattern: readonly EditorConstraint[][],
  lineIdx: number,
  colIdx: number,
  text: string,
): EditorWriteResult {
  return writeEditorCharsAt(
    grid,
    pattern,
    lineIdx,
    colIdx,
    normalizeEditorInput(text),
  );
}
