import { describe, expect, it } from "vitest";
import {
  cloneEditorGrid,
  createEmptyEditorGrid,
  createEditorPatternSignature,
  lineEndsWithRhyme,
} from "../src/index.js";
import type { EditorConstraint } from "../src/index.js";

const F: EditorConstraint = { type: "flexible" };
const P: EditorConstraint = { type: "fixed", tone: "平" };
const R: EditorConstraint = { type: "rhyme" };

describe("createEmptyEditorGrid", () => {
  it("形状与 pattern 一致且全为空串", () => {
    const grid = createEmptyEditorGrid([[F, F], [F]]);
    expect(grid).toEqual([["", ""], [""]]);
  });
});

describe("cloneEditorGrid", () => {
  it("深拷贝各行，改动副本不影响原网格", () => {
    const grid = [["a"], ["b"]];
    const copy = cloneEditorGrid(grid);
    copy[0][0] = "x";
    expect(grid[0][0]).toBe("a");
  });
});

describe("createEditorPatternSignature", () => {
  it("相同结构签名相同、不同结构签名不同", () => {
    const a = createEditorPatternSignature([[P, F, R]]);
    const b = createEditorPatternSignature([[P, F, R]]);
    const c = createEditorPatternSignature([[F, F, R]]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("按行用 | 分隔", () => {
    expect(createEditorPatternSignature([[P], [R]])).toBe("平|韵");
  });
});

describe("lineEndsWithRhyme", () => {
  it("末位为韵脚返回 true，否则 false", () => {
    expect(lineEndsWithRhyme([P, R])).toBe(true);
    expect(lineEndsWithRhyme([P, F])).toBe(false);
    expect(lineEndsWithRhyme(undefined)).toBe(false);
    expect(lineEndsWithRhyme([])).toBe(false);
  });
});
