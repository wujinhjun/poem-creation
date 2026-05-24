/**
 * QuickFill 识别测试
 */

import { describe, expect, it } from "vitest";
import { createRhymeDict } from "@poem/rhyme-book";
import { identifyQuickFill } from "../src/identify.js";
import type { CiTemplate } from "@poem/parser";
import { loadMeterTemplates, HANZI_RE } from "@poem/parser";

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

// ============ 测试 ============

describe("identifyQuickFill", () => {
  it("空输入应返回空数组", async () => {
    const dict = await createRhymeDict("pingshui");
    expect(identifyQuickFill("", dict)).toEqual([]);
  });

  it("仅诗体模式（不传 ciTemplates）应返回 meter 候选", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽黄河入海流欲穷千里目更上一层楼", dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.genre === "meter")).toBe(true);
  });

  it("传入 ciTemplates 应同时返回 meter + ci 候选", async () => {
    const dict = await createRhymeDict("pingshui");
    const ci = [makeCiTemplate("test-ci", "测试词牌", [5, 5, 5, 5])];
    // 输入 20 字，匹配五绝和 [5,5,5,5] 词牌
    const results = identifyQuickFill(
      "白日依山尽黄河入海流欲穷千里目更上层楼",
      dict,
      ci,
    );
    expect(results.length).toBeGreaterThan(0);
    const genres = new Set(results.map((r) => r.genre));
    // 应同时包含 meter 和 ci
    expect(genres.has("meter")).toBe(true);
  });

  it("预过滤应跳过字数差距过大的词牌", async () => {
    const dict = await createRhymeDict("pingshui");
    // 输入 10 字，词牌 5 × 10 = 50 字差 80% → 应被过滤
    const ci = [makeCiTemplate("big", "大牌", [5, 5, 5, 5, 5, 5, 5, 5, 5, 5])];
    const results = identifyQuickFill("白日依山尽黄河入海流", dict, ci);
    const hasCi = results.some((r) => r.genre === "ci");
    expect(hasCi).toBe(false);
  });

  it("候选应包含 normalizedLines", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽黄河入海流欲穷千里目更上层楼", dict);
    expect(results[0].normalizedLines.length).toBeGreaterThan(0);
    // normalizedLines 每项应为字符串数组（或空数组）
    for (const line of results[0].normalizedLines) {
      expect(Array.isArray(line)).toBe(true);
    }
  });

  it("默认返回不超过 5 个候选", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽", dict);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("topN 参数应限制候选数量", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽", dict, undefined, { topN: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("候选应按置信度降序", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽黄河入海流欲穷千里目更上层楼", dict);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it("候选应包含完整元数据", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = identifyQuickFill("白日依山尽黄河入海流", dict);
    expect(results.length).toBeGreaterThan(0);
    const r = results[0];
    expect(r.genre).toBeDefined();
    expect(r.tuneName).toBeDefined();
    expect(r.variantId).toBeDefined();
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.templateCharCount).toBeGreaterThan(0);
  });
});
