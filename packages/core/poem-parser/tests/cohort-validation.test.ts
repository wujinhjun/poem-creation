/**
 * 韵组 Cohort 校验测试
 *
 * 测试 validateRhymeCohorts 和 cohort 索引构建。
 */

import { describe, it, expect } from "vitest";
import { Tone } from "../src/core/types.js";
import type { CharNode, LineNode, Diagnostic } from "../src/core/types.js";
import type { RhymeDict, RhymeEntry } from "../src/rhyme-dict/index.js";
import { validateRhymeCohorts } from "../src/analyzer/validation.js";
import { buildCohortFromSlots, buildCohortIndex } from "../src/templates/index.js";
import type {
  CohortedRhymeSlot,
} from "../src/templates/index.js";
import type { CiSectionStored } from "../src/templates/ci-compress.js";

// ---- Mock RhymeDict ----

function makeCharNode(char: string, rhymeGroup: string, tone: Tone = Tone.Ping): CharNode {
  return {
    char,
    tone,
    rhymeGroup,
    position: { global: 0, line: 0, col: 0 },
  };
}

function makeLineNode(
  chars: CharNode[],
  overrides: Partial<LineNode> = {},
): LineNode {
  return {
    raw: chars.map((c) => c.char).join(""),
    chars,
    charCount: chars.length,
    globalLineIndex: overrides.globalLineIndex ?? 0,
    sectionIndex: overrides.sectionIndex,
    sectionName: overrides.sectionName,
    lineIndexInSection: overrides.lineIndexInSection,
    isRhymeLine: overrides.isRhymeLine ?? false,
    rhymeChar: overrides.rhymeChar ?? chars.at(-1),
    expectedRhymeType: overrides.expectedRhymeType,
    diagnostics: overrides.diagnostics ?? [],
  };
}

/**
 * 模拟韵书：东韵的字符互押，江韵的字符互押。
 */
function makeMockDict(): RhymeDict {
  const rhymeGroups: Record<string, string[]> = {
    一东: ["风", "空", "同", "中"],
    二冬: ["峰", "重", "钟"],
    三江: ["江", "窗", "双"],
  };

  const charToGroup = new Map<string, string>();
  for (const [group, chars] of Object.entries(rhymeGroups)) {
    for (const ch of chars) {
      charToGroup.set(ch, group);
    }
  }
  // 多音字: "重" 也在 一东
  // Actually "重" is already in 二冬. Let's make it a bit more complex.
  charToGroup.set("重", "二冬");

  return {
    type: "pingshui" as const,
    lookup(char: string): RhymeEntry[] {
      const group = charToGroup.get(char);
      if (!group) return [];
      return [{ char, tone: Tone.Ping, rhymeGroup: group }];
    },
    getRhymeGroup(char: string): string[] {
      const entry = this.lookup(char);
      return entry.map((e) => e.rhymeGroup);
    },
    isSameRhyme(a: string, b: string): boolean {
      const ga = charToGroup.get(a);
      const gb = charToGroup.get(b);
      return ga != null && ga === gb;
    },
    yunjieFamilyOf(_char: string): string | null {
      return null;
    },
  };
}

// ---- buildCohortIndex 测试 ----

describe("buildCohortIndex", () => {
  it("单韵组（全平韵）应全部归入 cohort 1", () => {
    const sections: CiSectionStored[] = [
      {
        lines: ["FPFZZPp", "ZFPPFZp", "FZFPPZZ", "FPFZZPp"],
      },
    ];
    const slots = buildCohortIndex(sections);

    expect(slots).toHaveLength(3); // 3 个韵脚行：L0, L1, L3
    expect(slots[0]).toEqual({
      pos: [0, 0],
      cohortId: 1,
      token: { tone: "ping", xieyun: false },
    });
    expect(slots[1].cohortId).toBe(1);
    expect(slots[2].cohortId).toBe(1);
  });

  it("转韵应产生多个 cohort", () => {
    const sections: CiSectionStored[] = [
      {
        // 菩萨蛮模式：z z p p
        lines: ["FPFZFPZz", "FPFZPPz", "ZFPp", "ZFPp"],
      },
    ];
    const slots = buildCohortIndex(sections);

    expect(slots).toHaveLength(4);
    expect(slots[0].cohortId).toBe(1); // z → cohort 1
    expect(slots[1].cohortId).toBe(1); // z → 同声调续组
    expect(slots[2].cohortId).toBe(2); // p → 声调切换新组
    expect(slots[3].cohortId).toBe(2); // p → 同声调续组
  });

  it("叶韵 + 修饰符应续上一组", () => {
    const sections: CiSectionStored[] = [
      {
        // 西江月模式：z +p +p z（全部同组）
        lines: ["FZFPFFz", "FPFZFP+p", "FPFFFPP+p", "FZFPFFz"],
      },
    ];
    const slots = buildCohortIndex(sections);

    expect(slots).toHaveLength(4);
    expect(slots[0].cohortId).toBe(1); // z → start cohort 1
    expect(slots[1].cohortId).toBe(1); // +p → 叶韵续组
    expect(slots[2].cohortId).toBe(1); // +p → 叶韵续组
    expect(slots[3].cohortId).toBe(1); // z → 同声调续组
  });

  it("无韵脚行不产生 slot", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FZFPPZZ", "FZFPPZZ"] },
    ];
    const slots = buildCohortIndex(sections);
    expect(slots).toHaveLength(0);
  });

  it("跨 section 的正确归属", () => {
    const sections: CiSectionStored[] = [
      { lines: ["FPFZZPp", "ZFPPFZp"] },
      { lines: ["FPFZPPZ", "FPFZZPp"] },
    ];
    const slots = buildCohortIndex(sections);

    expect(slots).toHaveLength(3); // S0L0, S0L1, S1L1
    expect(slots[0]).toMatchObject({ pos: [0, 0], cohortId: 1 });
    expect(slots[1]).toMatchObject({ pos: [0, 1], cohortId: 1 });
    expect(slots[2]).toMatchObject({ pos: [1, 1], cohortId: 1 });
  });

  it("共享 cohort builder 应与 compact DSL 路径一致", () => {
    const slots = buildCohortFromSlots([
      { pos: [0, 0], token: { tone: "ze", xieyun: false } },
      { pos: [0, 1], token: { tone: "ping", xieyun: true } },
      { pos: [0, 2], token: { tone: "ping", xieyun: true } },
      { pos: [0, 3], token: { tone: "ze", xieyun: false } },
      { pos: [0, 4], token: { tone: "ping", xieyun: false } },
    ]);

    expect(slots.map((slot) => slot.cohortId)).toEqual([1, 1, 1, 1, 2]);
  });
});

// ---- validateRhymeCohorts 测试 ----

describe("validateRhymeCohorts", () => {
  const dict = makeMockDict();

  it("同 cohort 内同韵部应无诊断", () => {
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ping",
      }),
      makeLineNode([makeCharNode("空", "一东")], {
        globalLineIndex: 1,
        sectionIndex: 0,
        lineIndexInSection: 1,
        isRhymeLine: true,
        rhymeChar: makeCharNode("空", "一东"),
        expectedRhymeType: "ping",
      }),
    ];

    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ping", xieyun: false } },
      { pos: [0, 1], cohortId: 1, token: { tone: "ping", xieyun: false } },
    ];

    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(0);
  });

  it("同 cohort 内异韵部应产生 diagnostic", () => {
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ping",
      }),
      makeLineNode([makeCharNode("江", "三江")], {
        globalLineIndex: 1,
        sectionIndex: 0,
        lineIndexInSection: 1,
        isRhymeLine: true,
        rhymeChar: makeCharNode("江", "三江"),
        expectedRhymeType: "ping",
      }),
    ];

    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ping", xieyun: false } },
      { pos: [0, 1], cohortId: 1, token: { tone: "ping", xieyun: false } },
    ];

    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      type: "violation",
      severity: "error",
      position: { line: 1 },
    });
    expect(diags[0].message).toContain("江");
    expect(diags[0].message).toContain("风");
  });

  it("不同 cohort 的韵脚不互相校验", () => {
    // 菩萨蛮：cohort 1 (仄韵) + cohort 2 (平韵)
    // 即使两个字恰好同韵部，也不强制互押（因为属于不同韵组）
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ze",
      }),
      makeLineNode([makeCharNode("空", "一东")], {
        globalLineIndex: 1,
        sectionIndex: 0,
        lineIndexInSection: 1,
        isRhymeLine: true,
        rhymeChar: makeCharNode("空", "一东"),
        expectedRhymeType: "ping",
      }),
    ];

    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ze", xieyun: false } },
      { pos: [0, 1], cohortId: 2, token: { tone: "ping", xieyun: false } },
    ];

    // L0 和 L1 在不同 cohort，即使同韵部也不报错
    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(0);
  });

  it("跨声调 cohort（叶韵）当前版本给出 info 诊断", () => {
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ze",
      }),
      makeLineNode([makeCharNode("江", "三江")], {
        globalLineIndex: 1,
        sectionIndex: 0,
        lineIndexInSection: 1,
        isRhymeLine: true,
        rhymeChar: makeCharNode("江", "三江"),
        expectedRhymeType: "ping",
      }),
    ];

    // 同一 cohort 但跨声调（叶韵）
    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ze", xieyun: false } },
      { pos: [0, 1], cohortId: 1, token: { tone: "ping", xieyun: true } },
    ];

    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      type: "info",
      severity: "info",
      position: { line: 0, col: 0 },
    });
    expect(diags[0].message).toContain("叶韵");
  });

  it("首韵脚标记为叶韵应给出 warning", () => {
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ping",
      }),
    ];

    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ping", xieyun: true } },
    ];

    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      type: "info",
      severity: "warning",
      position: { line: 0, col: 0 },
    });
    expect(diags[0].message).toContain("首个韵脚");
  });

  it("单韵脚行不产生 diagnostic", () => {
    const lines: LineNode[] = [
      makeLineNode([makeCharNode("风", "一东")], {
        globalLineIndex: 0,
        sectionIndex: 0,
        lineIndexInSection: 0,
        isRhymeLine: true,
        rhymeChar: makeCharNode("风", "一东"),
        expectedRhymeType: "ping",
      }),
    ];

    const slots: CohortedRhymeSlot[] = [
      { pos: [0, 0], cohortId: 1, token: { tone: "ping", xieyun: false } },
    ];

    const diags = validateRhymeCohorts(lines, slots, dict);
    expect(diags).toHaveLength(0);
  });
});
