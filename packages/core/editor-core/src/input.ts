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
  const rowLength = pattern[lineIdx]?.length ?? 0;

  for (
    let offset = 0;
    offset < chars.length && colIdx + offset < rowLength;
    offset++
  ) {
    next[lineIdx][colIdx + offset] = chars[offset];
  }

  const wrotePastLineEnd = colIdx + chars.length >= rowLength;
  const isLastLine = lineIdx === pattern.length - 1;
  const nextPosition = wrotePastLineEnd
    ? {
        line: isLastLine ? lineIdx : lineIdx + 1,
        col: isLastLine ? Math.max(rowLength - 1, 0) : 0,
      }
    : { line: lineIdx, col: colIdx + chars.length };

  return {
    grid: next,
    nextPosition,
    completed: wrotePastLineEnd && isLastLine,
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
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeEditorInput(line).join(""))
    .filter(Boolean);
  const next = grid.map((row) => [...row]);
  let lastPosition = { line: lineIdx, col: colIdx };
  let completed = false;

  if (lines.length > 1) {
    for (
      let offset = 0;
      offset < lines.length && lineIdx + offset < pattern.length;
      offset++
    ) {
      const targetLine = lineIdx + offset;
      const startCol = offset === 0 ? colIdx : 0;
      const result = writeEditorCharsAt(
        next,
        pattern,
        targetLine,
        startCol,
        normalizeEditorInput(lines[offset]),
      );
      result.grid.forEach((row, i) => {
        next[i] = row;
      });
      lastPosition = result.nextPosition;
      completed = result.completed;
    }
  } else {
    return writeEditorCharsAt(
      next,
      pattern,
      lineIdx,
      colIdx,
      normalizeEditorInput(text),
    );
  }

  return { grid: next, nextPosition: lastPosition, completed };
}
