/**
 * 拗救模板数据表测试
 */

import { describe, it, expect } from "vitest";
import {
  RESCUE_TEMPLATES,
  getRescueTemplatesByLength,
  getRescueTemplatesByCategory,
  matchRescueTemplate,
  matchRescueTemplateWithCounterpart,
  validateRescueTemplates,
  tonesToMarks,
} from "../src/rescue/templates.js";
import { Tone } from "../src/core/types.js";

describe("RESCUE_TEMPLATES invariant", () => {
  it("validateRescueTemplates 应返回空错误数组", () => {
    const errors = validateRescueTemplates();
    if (errors.length > 0) {
      console.error("Template validation errors:\n" + errors.join("\n"));
    }
    expect(errors).toEqual([]);
  });

  it("应包含至少 8 个模板", () => {
    expect(RESCUE_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it("所有模板应有唯一 ID", () => {
    const ids = RESCUE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("所有模板的 base 和 nao 长度应一致", () => {
    for (const t of RESCUE_TEMPLATES) {
      expect(t.base).toHaveLength(t.nao.length);
      expect(t.base).toHaveLength(t.lineLength);
    }
  });

  it("所有模板 naoCol 指向真实变化 (base[naoCol] !== nao[naoCol])", () => {
    for (const t of RESCUE_TEMPLATES) {
      expect(t.base[t.naoCol]).not.toBe(t.nao[t.naoCol]);
    }
  });

  it("同句救模板 jiuCol 应指向真实变化", () => {
    for (const t of RESCUE_TEMPLATES) {
      if (t.jiuCol < 0) continue;
      expect(t.base[t.jiuCol]).not.toBe(t.nao[t.jiuCol]);
    }
  });

  it("requiresCounterpart 的模板应有 counterpart 且 jiuCol 指向真实变化", () => {
    for (const t of RESCUE_TEMPLATES) {
      if (!t.requiresCounterpart) continue;
      expect(t.counterpart).toBeDefined();
      const c = t.counterpart!;
      expect(c.base).toHaveLength(t.lineLength);
      expect(c.jiu).toHaveLength(t.lineLength);
      expect(c.base[c.jiuCol]).not.toBe(c.jiu[c.jiuCol]);
    }
  });

  it("应包含五言和七言模板", () => {
    expect(getRescueTemplatesByLength(5).length).toBeGreaterThanOrEqual(4);
    expect(getRescueTemplatesByLength(7).length).toBeGreaterThanOrEqual(4);
  });

  it("应包含 5 种拗救类别", () => {
    const cats = new Set(RESCUE_TEMPLATES.map((t) => t.category));
    expect(cats.has("benju-zijiou")).toBe(true);
    expect(cats.has("duiju-xiangjiou")).toBe(true);
    expect(cats.has("guping-jiou")).toBe(true);
    expect(cats.has("sansi-hujiou")).toBe(true);
    expect(cats.has("daao-jiou")).toBe(true);
  });
});

describe("getRescueTemplatesByCategory", () => {
  it("过滤后结果应全为指定类别", () => {
    const guping = getRescueTemplatesByCategory("guping-jiou");
    expect(guping.length).toBeGreaterThanOrEqual(2);
    for (const t of guping) {
      expect(t.category).toBe("guping-jiou");
    }
  });
});

describe("matchRescueTemplate", () => {
  it("应匹配五言孤平拗救模板 (nao: Z P P Z P)", () => {
    const result = matchRescueTemplate(5, ["Z", "P", "P", "Z", "P"]);
    expect(result).toBeDefined();
    expect(result!.id).toBe("wuyan-guping-jiu");
  });

  it("应匹配七言孤平拗救模板 (nao: Z Z Z P P Z P)", () => {
    const result = matchRescueTemplate(7, ["Z", "Z", "Z", "P", "P", "Z", "P"]);
    expect(result).toBeDefined();
    expect(result!.id).toBe("qiyan-guping-jiu");
  });

  it("requiresCounterpart 模板不应被单行匹配", () => {
    // wuyan-daao-jiu 出句 nao 是 Z Z P Z Z
    const result = matchRescueTemplate(5, ["Z", "Z", "P", "Z", "Z"]);
    expect(result).toBeUndefined();
  });

  it("不合任何模板的序列应返回 undefined", () => {
    expect(matchRescueTemplate(5, ["P", "P", "P", "P", "P"])).toBeUndefined();
  });
});

describe("matchRescueTemplateWithCounterpart", () => {
  it("出句和对句都满足时应返回模板", () => {
    // wuyan-daao-jiu: upper nao Z Z P Z Z, lower jiu P P Z P P
    const result = matchRescueTemplateWithCounterpart(
      5,
      ["Z", "Z", "P", "Z", "Z"],
      ["P", "P", "Z", "P", "P"],
    );
    expect(result).toBeDefined();
    expect(result!.id).toBe("wuyan-daao-jiu");
  });

  it("只有出句匹配但对句不匹配时应返回 undefined", () => {
    // upper matches daao but lower does NOT match counterpart jiu
    const result = matchRescueTemplateWithCounterpart(
      5,
      ["Z", "Z", "P", "Z", "Z"],  // matches daao nao
      ["P", "P", "P", "P", "P"],  // does NOT match daao counterpart.jiu
    );
    expect(result).toBeUndefined();
  });

  it("非 counterpart 模板不应被匹配", () => {
    // guping nao matches, but guping is not requiresCounterpart
    const result = matchRescueTemplateWithCounterpart(
      7,
      ["Z", "Z", "Z", "P", "P", "Z", "P"],  // matches qiyan-guping-jiu nao
      ["Z", "Z", "P", "P", "Z", "Z", "P"],  // arbitrary
    );
    expect(result).toBeUndefined();
  });
});

describe("tonesToMarks", () => {
  it("应正确映射 Tone 值", () => {
    expect(tonesToMarks([Tone.Ping, Tone.Ze, null, Tone.Ping])).toEqual(["P", "Z", "F", "P"]);
  });

  it("空数组应返回空", () => {
    expect(tonesToMarks([])).toEqual([]);
  });
});
