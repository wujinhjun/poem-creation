import { describe, expect, it } from "vitest";
import {
  normalizeEditorInput,
  writeEditorCharsAt,
  pasteEditorTextAt,
} from "../src/index.js";
import type { EditorConstraint } from "../src/index.js";

const F: EditorConstraint = { type: "flexible" };
// 两行三列的简单 pattern。
const pattern: EditorConstraint[][] = [
  [F, F, F],
  [F, F, F],
];
const empty = () => pattern.map((row) => row.map(() => ""));

describe("normalizeEditorInput", () => {
  it("滤除标点与空白，仅保留字符", () => {
    expect(normalizeEditorInput("春 眠，不觉。晓!")).toEqual([
      "春",
      "眠",
      "不",
      "觉",
      "晓",
    ]);
  });
  it("英文标点也滤除", () => {
    expect(normalizeEditorInput("a,b. c").join("")).toBe("abc");
  });
});

describe("writeEditorCharsAt", () => {
  it("从指定位置写入并返回下一个光标位置", () => {
    const r = writeEditorCharsAt(empty(), pattern, 0, 0, ["春", "眠"]);
    expect(r.grid[0]).toEqual(["春", "眠", ""]);
    expect(r.nextPosition).toEqual({ line: 0, col: 2 });
    expect(r.completed).toBe(false);
  });

  it("超出行宽时自动换到下一行", () => {
    const r = writeEditorCharsAt(empty(), pattern, 0, 2, ["a", "b", "c"]);
    expect(r.grid[0]).toEqual(["", "", "a"]);
    expect(r.grid[1]).toEqual(["b", "c", ""]);
    expect(r.nextPosition).toEqual({ line: 1, col: 2 });
  });

  it("填满整个网格时 completed 为 true，光标停在末位", () => {
    const r = writeEditorCharsAt(empty(), pattern, 0, 0, [
      "一",
      "二",
      "三",
      "四",
      "五",
      "六",
    ]);
    expect(r.completed).toBe(true);
    expect(r.nextPosition).toEqual({ line: 1, col: 2 });
    expect(r.grid[1]).toEqual(["四", "五", "六"]);
  });

  it("溢出网格的字符被丢弃，completed 仍为 true", () => {
    const r = writeEditorCharsAt(empty(), pattern, 1, 2, ["尾", "溢", "出"]);
    expect(r.grid[1]).toEqual(["", "", "尾"]);
    expect(r.completed).toBe(true);
  });

  it("不修改传入的原网格（纯函数）", () => {
    const grid = empty();
    writeEditorCharsAt(grid, pattern, 0, 0, ["改"]);
    expect(grid[0][0]).toBe("");
  });

  it("未写入任何字符时 completed 为 false", () => {
    const r = writeEditorCharsAt(empty(), pattern, 0, 0, []);
    expect(r.completed).toBe(false);
  });
});

describe("pasteEditorTextAt", () => {
  it("先归一化文本再写入", () => {
    const r = pasteEditorTextAt(empty(), pattern, 0, 0, "春眠，不");
    expect(r.grid[0]).toEqual(["春", "眠", "不"]);
  });
});
