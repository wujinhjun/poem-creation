/**
 * 模糊匹配测试 —— 覆盖 findMatch (AnyTemplate) 与 fuzzyMatchCi 向后兼容封装。
 */

import { describe, expect, it } from "vitest";
import { createRhymeDict } from "@poem/rhyme-book";
import { fuzzyMatch, fuzzyMatchCi } from "../src/analyzer/fuzzy-match.js";
import type { CiTemplate } from "../src/templates/index.js";
import { loadMeterTemplates } from "../src/templates/meters.js";

// ============ 测试辅助 ============

function makeCiTemplate(
  id: string,
  name: string,
  lineCounts: number[],
  isRhymeLines: boolean[] = [],
): CiTemplate {
  return {
    id,
    name,
    variants: [
      {
        id: `${id}-v1`,
        name: "正体",
        sections: [
          {
            name: "双调",
            lines: lineCounts.map((charCount, i) => ({
              charCount,
              pattern: Array.from({ length: charCount }, (_, j) =>
                j === charCount - 1
                  ? ({ type: "rhyme" as const })
                  : ({ type: "fixed" as const, tone: j % 2 === 0 ? "平" as const : "仄" as const }),
              ),
              isRhymeLine: isRhymeLines[i] ?? true,
            })),
          },
        ],
      },
    ],
  };
}

// ============ fuzzyMatchCi 向后兼容 ============

describe("fuzzyMatchCi", () => {
  it("空输入应返回空数组", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeCiTemplate("test", "测试牌", [5, 5, 5])];
    expect(fuzzyMatchCi("", templates, dict)).toEqual([]);
  });

  it("空模板应返回空数组", async () => {
    const dict = await createRhymeDict("pingshui");
    expect(fuzzyMatchCi("测试一二三四五", [], dict)).toEqual([]);
  });

  it("应返回匹配的模板（按置信度排序）", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [
      makeCiTemplate("long", "长牌", [7, 7, 7, 7, 7]),
      makeCiTemplate("short", "短牌", [5, 5]),
      makeCiTemplate("mid", "中牌", [5, 5, 5]),
    ];
    const results = fuzzyMatchCi("白日依山尽，黄河入海流", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].templateId).toBe("short");
    expect(results[0].confidence).toBeGreaterThan(0.6);
  });

  it("部分匹配（不完整输入）应返回合理置信度", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [
      makeCiTemplate("mid", "中牌", [5, 5, 5]),
      makeCiTemplate("long", "长牌", [7, 7, 7, 7]),
    ];
    const results = fuzzyMatchCi("白日依山尽", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].templateId).toBe("mid");
    expect(results[0].confidence).toBeLessThan(1);
  });

  it("topN 参数应限制结果数量", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = Array.from({ length: 10 }, (_, i) =>
      makeCiTemplate(`t${i}`, `模板${i}`, [5, 5, 5]),
    );
    const results = fuzzyMatchCi(
      "白日依山尽黄河入海流举头望明月",
      templates,
      dict,
      { topN: 3 },
    );
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("单句单字输入不应崩溃", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeCiTemplate("mini", "小令", [3])];
    const results = fuzzyMatchCi("白", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].confidence).toBeDefined();
  });

  it("结果应包含 lineDetails、matchedChars、totalExpectedChars", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeCiTemplate("short", "短牌", [5, 5])];
    const results = fuzzyMatchCi("白日依山尽，黄河入海流", templates, dict);
    expect(results[0].lineDetails.length).toBeGreaterThan(0);
    expect(results[0].matchedChars).toBeGreaterThan(0);
    expect(results[0].totalExpectedChars).toBe(10);
    expect(results[0].inputChars).toBe(10);
  });

  it("结果应包含 genre/templateId/tuneName/variantId", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeCiTemplate("test", "测试牌", [5, 5])];
    const results = fuzzyMatchCi("白日依山尽黄河入", templates, dict);
    expect(results[0].genre).toBe("ci");
    expect(results[0].templateId).toBe("test");
    expect(results[0].tuneName).toBe("测试牌");
    expect(results[0].variantId).toBe("test-v1");
  });
});

// ============ fuzzyMatch 统一接口 ============

describe("fuzzyMatch", () => {
  it("同时传入 meter + ci 模板应能分别匹配", async () => {
    const dict = await createRhymeDict("pingshui");
    const meters = loadMeterTemplates();
    const ci = [makeCiTemplate("test-ci", "测试词牌", [5, 5, 5, 5])];

    // 输入 20 字五言绝句 → 应当匹配到 meter
    const results = fuzzyMatch(
      "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。",
      [...meters, ...ci],
      dict,
    );
    expect(results.length).toBeGreaterThan(0);
    // 五绝应排前列
    const meterResults = results.filter((r) => r.genre === "meter");
    expect(meterResults.length).toBeGreaterThan(0);
  });

  it("结果应包含韵脚一致性评分", async () => {
    const dict = await createRhymeDict("pingshui");
    const ci = [makeCiTemplate("test", "测试牌", [5, 5, 5])];
    const results = fuzzyMatch("白日依山尽，黄河入海流", ci, dict);
    expect(results[0].rhymeConsistency).toBeGreaterThanOrEqual(0);
    expect(results[0].rhymeConsistency).toBeLessThanOrEqual(1);
  });

  it("默认返回 Top 5", async () => {
    const dict = await createRhymeDict("pingshui");
    const meters = loadMeterTemplates();
    const results = fuzzyMatch("白日依山尽黄河入海流欲穷千里目更上一层楼", meters, dict);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("可指定 topN", async () => {
    const dict = await createRhymeDict("pingshui");
    const meters = loadMeterTemplates();
    const results = fuzzyMatch(
      "白日依山尽黄河入海流",
      meters,
      dict,
      { topN: 3 },
    );
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("字数差过大（>50%）的模板应被剪枝", async () => {
    const dict = await createRhymeDict("pingshui");
    // 输入 3 字：vs 七言首句 7 字差 57% → 剪枝；vs 五言首句 5 字差 40% → 保留
    const meters = loadMeterTemplates();
    const results = fuzzyMatch("白日依", meters, dict);
    const hasQiYan = results.some((r) => r.templateId.startsWith("qi"));
    expect(hasQiYan).toBe(false);
    const hasWuYan = results.some((r) => r.templateId.startsWith("wu"));
    expect(hasWuYan).toBe(true);
  });
});
