import { describe, expect, it } from "vitest";
import { Tone, RhymeDictType } from "@poem/parser/kernel";
import type { RhymeDict, RhymeEntry, ToneConstraint } from "@poem/parser/kernel";
import { evaluateToneCell } from "../src/tone-cell.js";

// 极小固定字典夹具：只覆盖测试需要的字。
function makeDict(table: Record<string, RhymeEntry[]>): RhymeDict {
  return {
    type: RhymeDictType.Pingshui,
    lookup: (char) => table[char] ?? [],
    getRhymeGroup: (char) => (table[char] ?? []).map((e) => e.rhymeGroup),
    isSameRhyme: () => false,
    yunjieFamilyOf: () => null,
  };
}

const entry = (char: string, tone: Tone, rhymeGroup: string): RhymeEntry => ({
  char,
  tone,
  rhymeGroup,
});

const dict = makeDict({
  东: [entry("东", Tone.Ping, "一东")],
  风: [entry("风", Tone.Ping, "一东")],
  冬: [entry("冬", Tone.Ping, "二冬")],
  雪: [entry("雪", Tone.Ze, "九屑")],
  好: [entry("好", Tone.Ze, "十九皓"), entry("好", Tone.Ping, "四豪")],
});

const fixedPing: ToneConstraint = { type: "fixed", tone: Tone.Ping };
const flexible: ToneConstraint = { type: "flexible" };
const rhymePing: ToneConstraint = { type: "rhyme", tone: Tone.Ping };

const ctx = () => ({
  dict,
  expectedRhymeTone: null,
  rhymeAnchors: new Map<Tone, string>(),
});

describe("evaluateToneCell", () => {
  it("空字或无字典返回 empty", () => {
    expect(evaluateToneCell("", fixedPing, ctx()).status).toBe("empty");
    expect(
      evaluateToneCell("东", fixedPing, { ...ctx(), dict: null }).status,
    ).toBe("empty");
  });

  it("可平可仄一律 pass", () => {
    const r = evaluateToneCell("雪", flexible, ctx());
    expect(r.status).toBe("pass");
    expect(r.constraintType).toBe("flexible");
  });

  it("韵书未收此字 → fail / not-in-dict", () => {
    const r = evaluateToneCell("葿", fixedPing, ctx());
    expect(r.status).toBe("fail");
    expect(r.failReason).toBe("not-in-dict");
  });

  it("固定格：平仄相符 pass、不符 fail", () => {
    expect(evaluateToneCell("东", fixedPing, ctx()).status).toBe("pass");
    const bad = evaluateToneCell("雪", fixedPing, ctx());
    expect(bad.status).toBe("fail");
    expect(bad.failReason).toBe("tone-mismatch");
  });

  it("多音字命中任一读音即算符合固定格", () => {
    // “好”有平/仄两读，固定平声应命中平读
    expect(evaluateToneCell("好", fixedPing, ctx()).status).toBe("pass");
  });

  it("韵脚：命中后写入锚点，命中韵部随结果返回", () => {
    const c = ctx();
    const r = evaluateToneCell("东", rhymePing, c);
    expect(r.status).toBe("pass");
    expect(r.matchedRhymeGroup).toBe("一东");
    expect(c.rhymeAnchors.get(Tone.Ping)).toBe("一东");
  });

  it("韵脚：同声调必须落在同一韵部（锚点约束）", () => {
    const c = ctx();
    evaluateToneCell("东", rhymePing, c); // 锚定平声=一东
    // “风”也在一东 → 仍 pass
    expect(evaluateToneCell("风", rhymePing, c).status).toBe("pass");
    // “冬”在二冬 → 与锚点冲突 → fail
    const bad = evaluateToneCell("冬", rhymePing, c);
    expect(bad.status).toBe("fail");
    expect(bad.failReason).toBe("rhyme-mismatch");
  });

  it("expectedRhymeTone 作为韵脚声调兜底", () => {
    const r = evaluateToneCell("雪", { type: "rhyme" }, {
      dict,
      expectedRhymeTone: Tone.Ze,
      rhymeAnchors: new Map(),
    });
    expect(r.expectedTone).toBe(Tone.Ze);
    expect(r.status).toBe("pass");
  });
});
