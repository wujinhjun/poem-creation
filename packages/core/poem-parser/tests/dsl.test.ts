/**
 * DSL 编解码测试
 *
 * 测试 parseLineDSL / encodeLineDSL / extractRhymeToken 的往返一致性。
 */

import { describe, it, expect } from "vitest";
import {
  parseLineDSL,
  encodeLineDSL,
  extractRhymeToken,
} from "../src/templates/dsl.js";
import { Tone } from "../src/core/types.js";

describe("parseLineDSL", () => {
  it("应正确解析纯平仄行（无韵脚）", () => {
    const result = parseLineDSL("FPFZPPZ");
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ type: "flexible" });
    expect(result[1]).toEqual({ type: "fixed", tone: Tone.Ping });
    expect(result[2]).toEqual({ type: "flexible" });
    expect(result[3]).toEqual({ type: "fixed", tone: Tone.Ze });
    expect(result[4]).toEqual({ type: "fixed", tone: Tone.Ping });
    expect(result[5]).toEqual({ type: "fixed", tone: Tone.Ping });
    expect(result[6]).toEqual({ type: "fixed", tone: Tone.Ze });
  });

  it("应正确解析平韵韵脚 p", () => {
    const result = parseLineDSL("FPFZZPp");
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({ type: "rhyme", tone: Tone.Ping });
  });

  it("应正确解析仄韵韵脚 z", () => {
    const result = parseLineDSL("ZFPPFZz");
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({ type: "rhyme", tone: Tone.Ze });
  });

  it("应正确解析叶韵 +p / +z（双字符 token）", () => {
    const result = parseLineDSL("FPFZFP+p");
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({
      type: "rhyme",
      tone: Tone.Ping,
      xieyun: true,
    });

    const result2 = parseLineDSL("FZFPFF+z");
    expect(result2).toHaveLength(7);
    expect(result2[6]).toEqual({
      type: "rhyme",
      tone: Tone.Ze,
      xieyun: true,
    });
  });

  it("孤立 + 应被跳过（宽松处理）", () => {
    const result = parseLineDSL("FP+FZPPZ");
    // + 后不是 p/z，+ 被跳过，正常解析为 7 个位置
    expect(result).toHaveLength(7);
  });

  it("空字符串返回空数组", () => {
    expect(parseLineDSL("")).toEqual([]);
  });
});

describe("encodeLineDSL", () => {
  it("应将 ToneConstraint[] 编码为紧凑 DSL（非韵脚行）", () => {
    const constraints = [
      { type: "flexible" as const },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "flexible" as const },
      { type: "fixed" as const, tone: Tone.Ze },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "fixed" as const, tone: Tone.Ze },
    ];
    expect(encodeLineDSL(constraints, { isRhymeLine: false })).toBe("FPFZPPZ");
  });

  it("应将韵脚行编码为带 p/z 的 DSL", () => {
    const constraints = [
      { type: "flexible" as const },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "flexible" as const },
      { type: "fixed" as const, tone: Tone.Ze },
      { type: "fixed" as const, tone: Tone.Ze },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "rhyme" as const },
    ];
    expect(
      encodeLineDSL(constraints, {
        isRhymeLine: true,
        rhymeTone: "ping",
      }),
    ).toBe("FPFZZPp");
  });

  it("应支持叶韵 xieyun 前缀", () => {
    const constraints = [
      { type: "flexible" as const },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "fixed" as const, tone: Tone.Ze },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "rhyme" as const },
    ];
    expect(
      encodeLineDSL(constraints, {
        isRhymeLine: true,
        rhymeTone: "ping",
        xieyun: true,
      }),
    ).toBe("FPZP+p");
  });

  it("非行末的 {type:rhyme} 应 fallback 为 F", () => {
    const constraints = [
      { type: "rhyme" as const },
      { type: "fixed" as const, tone: Tone.Ping },
      { type: "fixed" as const, tone: Tone.Ze },
    ];
    expect(encodeLineDSL(constraints, { isRhymeLine: false })).toBe("FPZ");
  });
});

describe("extractRhymeToken", () => {
  it("应提取平韵韵脚 p", () => {
    expect(extractRhymeToken("FPFZZPp")).toEqual({
      tone: "ping",
      xieyun: false,
    });
  });

  it("应提取仄韵韵脚 z", () => {
    expect(extractRhymeToken("ZFPPFZz")).toEqual({
      tone: "ze",
      xieyun: false,
    });
  });

  it("应提取叶韵韵脚 +p / +z", () => {
    expect(extractRhymeToken("FPFZFP+p")).toEqual({
      tone: "ping",
      xieyun: true,
    });
    expect(extractRhymeToken("FZFPFF+z")).toEqual({
      tone: "ze",
      xieyun: true,
    });
  });

  it("非韵脚行返回 null", () => {
    expect(extractRhymeToken("FPFZPPZ")).toBeNull();
    expect(extractRhymeToken("")).toBeNull();
  });
});

describe("DSL 往返一致性", () => {
  const testCases = [
    { dsl: "FPFZPPZ", rhyme: false },
    { dsl: "FPFZZPp", rhyme: true, tone: "ping" as const },
    { dsl: "ZFPPFZz", rhyme: true, tone: "ze" as const },
    { dsl: "FZFPPZZ", rhyme: false },
    { dsl: "FZPPZ", rhyme: false },
    { dsl: "FPZZp", rhyme: true, tone: "ping" as const },
    { dsl: "FZZPp", rhyme: true, tone: "ping" as const },
    { dsl: "FPFZFP+p", rhyme: true, tone: "ping" as const, xieyun: true },
    { dsl: "FZFPFF+z", rhyme: true, tone: "ze" as const, xieyun: true },
  ];

  for (const { dsl, rhyme, tone, xieyun } of testCases) {
    it(`往返: "${dsl}"`, () => {
      const parsed = parseLineDSL(dsl);
      const encoded = encodeLineDSL(parsed, {
        isRhymeLine: rhyme,
        rhymeTone: tone,
        xieyun,
      });
      expect(encoded).toBe(dsl);
    });
  }
});
