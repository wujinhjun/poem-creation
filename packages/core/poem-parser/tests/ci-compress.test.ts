/**
 * 变体压缩测试
 *
 * 测试 applyEdits / materializeVariant / computeDiff 的正确性。
 */

import { describe, it, expect } from "vitest";
import {
  applyEdits,
  materializeVariant,
  computeDiff,
} from "../src/templates/ci-compress.js";
import type {
  CiVariantFull,
  CiVariantDelta,
  EditOp,
  CiSectionStored,
} from "../src/templates/ci-compress.js";
import { Tone } from "../src/core/types.js";

// ---- 辅助函数 ----

function makeCanonical(): CiVariantFull {
  return {
    kind: "full",
    id: "test-zhengti",
    author: "测试",
    sketch: "测试正体",
    rhymeType: "ping",
    sections: [
      { lines: ["FPFZZPp", "ZFPPFZp", "FZFPPZZ", "FPFZZPp"] },
      { lines: ["FPFZPPZ", "ZFPPFZp", "FZFPPZZ", "FPFZZPp"] },
    ],
  };
}

function makeCanonicalMap(full: CiVariantFull): Map<string, CiVariantFull> {
  return new Map([[full.id, full]]);
}

// ---- applyEdits 测试 ----

describe("applyEdits", () => {
  it("空编辑应返回原 sections", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp"] },
    ];
    const result = applyEdits(sections, []);
    expect(result).toEqual(sections);
    // 应该是深拷贝
    expect(result).not.toBe(sections);
  });

  it("setTone 应正确修改指定位置", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "setTone", at: [0, 0], col: 1, tone: "Z" },
    ];
    const result = applyEdits(sections, edits);
    // F→Z [P]FZZPp
    expect(result[0].lines[0]).toBe("FZFZZPp");
  });

  it("setFlex 应正确设置可平可仄", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "setFlex", at: [0, 0], col: 3 },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFFZPp");
  });

  it("addRhyme 应在行末添加韵脚", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FZFPPZZ"] }, // 非韵脚行
    ];
    const edits: EditOp[] = [
      { op: "addRhyme", at: [0, 0], tone: "ping" },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FZFPPZZp");
  });

  it("dropRhyme 应移除行末韵脚", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "dropRhyme", at: [0, 0] },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFZZP");
  });

  it("dropRhyme 应正确处理叶韵 +p/+z", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZFP+p"] },
    ];
    const edits: EditOp[] = [
      { op: "dropRhyme", at: [0, 0] },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFZFP");
  });

  it("insertChar 应在指定位置插入", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZ"] },
    ];
    const edits: EditOp[] = [
      { op: "insertChar", at: [0, 0], col: 3, cons: "P" },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFPZZ");
  });

  it("removeChar 应在指定位置删除", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "removeChar", at: [0, 0], col: 4 },
    ];
    const result = applyEdits(sections, edits);
    // 删除 F P F Z [Z] P p → F P F Z P p
    expect(result[0].lines[0]).toBe("FPFZPp");
  });

  it("多个 removeChar 倒序应用避免索引漂移", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    // 删除 col 4 和 col 5（按任意顺序，引擎应自动倒序）
    const edits: EditOp[] = [
      { op: "removeChar", at: [0, 0], col: 1 },
      { op: "removeChar", at: [0, 0], col: 4 },
    ];
    const result = applyEdits(sections, edits);
    // 从后往前：先删 col4(Z)，再删 col1(F)
    // 原始: F P F Z Z P p
    // 删 col4: F P F Z P p
    // 删 col1: F F Z P p
    expect(result[0].lines[0]).toBe("FFZPp");
  });

  it("多个 insertChar 倒序应用保持位置不变", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPF"] },
    ];
    const edits: EditOp[] = [
      { op: "insertChar", at: [0, 0], col: 1, cons: "Z" },
      { op: "insertChar", at: [0, 0], col: 3, cons: "P" },
    ];
    const result = applyEdits(sections, edits);
    // 从后往前：先插 col3(P)，再插 col1(Z)
    // 原始: F P F
    // 插 col3: F P F P
    // 插 col1: F Z P F P
    expect(result[0].lines[0]).toBe("FZPFP");
  });

  it("setTone 在韵脚位置应保留韵脚标记", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    // 修改倒数第二字（非韵脚）
    const edits: EditOp[] = [
      { op: "setTone", at: [0, 0], col: 4, tone: "P" },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFZPPp");
    expect(result[0].lines[0]).toMatch(/p$/); // 韵脚保留
  });

  it("addRhyme 带 xieyun 应写 +p/+z", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FZFPPZZ"] },
    ];
    const edits: EditOp[] = [
      { op: "addRhyme", at: [0, 0], tone: "ping", xieyun: true },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FZFPPZZ+p");
  });

  it("setXieyun 应将 p 转为 +p（普通→叶韵）", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "setXieyun", at: [0, 0], value: true },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFZZP+p");
  });

  it("setXieyun 应将 +p 转为 p（叶韵→普通）", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZP+p"] },
    ];
    const edits: EditOp[] = [
      { op: "setXieyun", at: [0, 0], value: false },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines[0]).toBe("FPFZZPp");
  });

  it("splitLine 应正确拆分一行", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp"] },
    ];
    const edits: EditOp[] = [
      { op: "splitLine", at: [0, 0], col: 3 },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines).toHaveLength(3);
    expect(result[0].lines[0]).toBe("FPF");
    expect(result[0].lines[1]).toBe("ZZPp");
  });

  it("mergeLines 应正确合并两行", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPF", "ZZPp"] },
    ];
    const edits: EditOp[] = [
      { op: "mergeLines", at: [0, 0] },
    ];
    const result = applyEdits(sections, edits);
    expect(result[0].lines).toHaveLength(1);
    expect(result[0].lines[0]).toBe("FPFZZPp");
  });
});

// ---- materializeVariant 测试 ----

describe("materializeVariant", () => {
  it("应物化 full 变体为运行时 CiTemplateVariant", () => {
    const full = makeCanonical();
    const result = materializeVariant(full, new Map());

    expect(result.id).toBe("test-zhengti");
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].name).toBe("上阕");
    expect(result.sections[1].name).toBe("下阕");
    expect(result.sections[0].lines).toHaveLength(4);
    expect(result.sections[0].lines[0].charCount).toBe(7);
    expect(result.sections[0].lines[0].isRhymeLine).toBe(true);
    expect(result.sections[0].lines[0].rhymeType).toBe("ping");
    expect(result.sections[0].lines[2].isRhymeLine).toBe(false);
  });

  it("应展开 delta 变体为完整 sections", () => {
    const canonical = makeCanonical();
    const canonicalMap = makeCanonicalMap(canonical);
    const delta: CiVariantDelta = {
      kind: "delta",
      id: "test-bianti",
      author: "变体测试",
      base: "test-zhengti",
      edits: [
        { op: "setTone", at: [0, 0], col: 1, tone: "Z" },
        { op: "dropRhyme", at: [0, 0] },
      ],
    };

    const result = materializeVariant(delta, canonicalMap);

    expect(result.id).toBe("test-bianti");
    // S0L0 DSL: F P F Z Z P p → 修改 col1 P→Z, 去韵脚
    // 变为: F Z F Z Z P（前 section 后，韵脚去掉）
    expect(result.sections[0].lines[0].isRhymeLine).toBe(false);
    expect(result.sections[0].lines[0].pattern).toHaveLength(6);
  });

  it("delta 找不到 base 应抛出异常", () => {
    const delta: CiVariantDelta = {
      kind: "delta",
      id: "test-bianti",
      base: "nonexistent",
      edits: [],
    };
    expect(() => materializeVariant(delta, new Map())).toThrow(
      "Canonical variant not found",
    );
  });
});

// ---- computeDiff 测试 ----

describe("computeDiff", () => {
  it("相同 sections 应返回空编辑", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp"] },
    ];
    const result = computeDiff(sections, sections);
    expect(result).toEqual([]);
  });

  it("应检测 setTone 差异", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FZFZZPp"] }, // col1: P→Z
    ];
    const result = computeDiff(base, target);
    expect(result).not.toBeNull();
    expect(result).toEqual([
      { op: "setTone", at: [0, 0], col: 1, tone: "Z" },
    ]);
  });

  it("应检测 addRhyme 差异", () => {
    const base: CiSectionStored[] = [
      { lines: ["FZFPPZZ"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FZFPPZZp"] },
    ];
    const result = computeDiff(base, target);
    expect(result).not.toBeNull();
    expect(result).toContainEqual({
      op: "addRhyme",
      at: [0, 0],
      tone: "ping",
      xieyun: false,
    });
  });

  it("应检测 dropRhyme 差异", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FPFZZP"] },
    ];
    const result = computeDiff(base, target);
    expect(result).not.toBeNull();
    expect(result).toContainEqual({
      op: "dropRhyme",
      at: [0, 0],
    });
  });

  it("差异过大应回退 null", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPF"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["ZZZZZZZZ"] }, // 完全不同
    ];
    const result = computeDiff(base, target);
    expect(result).toBeNull();
  });

  it("行数不同应回退 null", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp"] }, // 多一行
    ];
    const result = computeDiff(base, target);
    expect(result).toBeNull();
  });

  it("xieyun 差异应产生 setXieyun op 并往返还原", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPFZZPp"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FPFZZP+p"] },
    ];

    const edits = computeDiff(base, target);
    expect(edits).not.toBeNull();
    expect(edits!).toContainEqual({ op: "setXieyun", at: [0, 0], value: true });

    const roundTripped = applyEdits(base, edits!);
    expect(roundTripped).toEqual(target);
  });

  it("diff→applyEdits 往返应还原 target", () => {
    const base: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp", "FZFPPZZ", "FPFZZPp"] },
      { lines: ["FPFZPPZ", "ZFPPFZp", "FZFPPZZ", "FPFZZPp"] },
    ];
    const target: CiSectionStored[] = [
      { lines: ["FZFZZPp", "ZFPPFZz", "FZFPPZZ", "FPFZZPp"] },
      { lines: ["FPFZPPZ", "ZFPPFZp", "FZFPZZZ", "FPFZPPp"] },
    ];

    const edits = computeDiff(base, target);
    expect(edits).not.toBeNull();

    const roundTripped = applyEdits(base, edits!);
    expect(roundTripped).toEqual(target);
  });
});
