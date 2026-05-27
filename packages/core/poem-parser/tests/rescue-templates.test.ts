/**
 * 拗救模板数据表测试
 */

import { describe, it, expect } from "vitest";
import {
  RESCUE_TEMPLATES,
  getRescueTemplatesByLength,
  getRescueTemplatesByCategory,
  matchRescueTemplate,
  tonesToMarks,
} from "../src/rescue/templates.js";
import { Tone } from "../src/core/types.js";

describe("RESCUE_TEMPLATES", () => {
  it("应包含至少 8 个模板", () => {
    expect(RESCUE_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it("所有模板应有唯一 ID", () => {
    const ids = RESCUE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("所有模板的 base 和 nao 长度应一致", () => {
    for (const t of RESCUE_TEMPLATES) {
      expect(t.base.length).toBe(t.nao.length);
      expect(t.base.length).toBe(t.lineLength);
    }
  });

  it("所有模板的 naoCol 应在有效范围内", () => {
    for (const t of RESCUE_TEMPLATES) {
      expect(t.naoCol).toBeGreaterThanOrEqual(0);
      expect(t.naoCol).toBeLessThan(t.lineLength);
    }
  });

  it("requiresCounterpart 的模板应有 counterpart 定义", () => {
    for (const t of RESCUE_TEMPLATES) {
      if (t.requiresCounterpart) {
        expect(t.counterpart).toBeDefined();
        expect(t.counterpart!.base.length).toBe(t.lineLength);
        expect(t.counterpart!.jiu.length).toBe(t.lineLength);
      }
    }
  });

  it("应包含五言和七言模板", () => {
    const wuyan = getRescueTemplatesByLength(5);
    const qiyan = getRescueTemplatesByLength(7);
    expect(wuyan.length).toBeGreaterThanOrEqual(3);
    expect(qiyan.length).toBeGreaterThanOrEqual(3);
  });

  it("应包含 4 种拗救类别", () => {
    const categories = new Set(RESCUE_TEMPLATES.map((t) => t.category));
    expect(categories.has("benju-zijiou")).toBe(true);
    expect(categories.has("duiju-xiangjiou")).toBe(true);
    expect(categories.has("guping-jiou")).toBe(true);
    expect(categories.has("sansi-hujiou")).toBe(true);
  });
});

describe("getRescueTemplatesByCategory", () => {
  it("过滤后结果应全为指定类别", () => {
    const guping = getRescueTemplatesByCategory("guping-jiou");
    expect(guping.length).toBeGreaterThanOrEqual(2); // 五言 + 七言
    for (const t of guping) {
      expect(t.category).toBe("guping-jiou");
    }
  });
});

describe("matchRescueTemplate", () => {
  it("应匹配五言孤平拗救模板", () => {
    // base: Z Z P Z P → nao: Z P Z P P
    const result = matchRescueTemplate(5, ["Z", "P", "Z", "P", "P"]);
    expect(result).toBeDefined();
    expect(result!.id).toBe("wuyan-guping-jiu");
  });

  it("应匹配七言孤平拗救模板", () => {
    // base: Z Z P P Z Z P → nao: Z Z Z P Z P P
    const result = matchRescueTemplate(7, ["Z", "Z", "Z", "P", "Z", "P", "P"]);
    expect(result).toBeDefined();
    expect(result!.id).toBe("qiyan-guping-jiu");
  });

  it("不合任何模板的序列应返回 undefined", () => {
    const result = matchRescueTemplate(5, ["P", "P", "P", "P", "P"]);
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
