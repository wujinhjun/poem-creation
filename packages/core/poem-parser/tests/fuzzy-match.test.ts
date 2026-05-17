import { describe, expect, it } from "vitest";
import { createRhymeDict } from "@poem/rhyme-book";
import { fuzzyMatchCi } from "../src/analyzer/fuzzy-match.js";
import type { CiTemplate } from "../src/templates/index.js";

// 最小测试用词牌
function makeMinimalTemplate(
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
              pattern: Array.from(
                { length: charCount },
                (_, j) =>
                  j === charCount - 1
                    ? { type: "rhyme" as const }
                    : { type: "fixed" as const, tone: j % 2 === 0 ? "平" as const : "仄" as const },
              ),
              isRhymeLine: isRhymeLines[i] ?? true,
            })),
          },
        ],
      },
    ],
  };
}

describe("fuzzyMatchCi", () => {
  it("空输入应返回空数组", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeMinimalTemplate("test", "测试牌", [5, 5, 5])];
    const results = fuzzyMatchCi("", templates, dict);
    expect(results).toEqual([]);
  });

  it("空模板应返回空数组", async () => {
    const dict = await createRhymeDict("pingshui");
    const results = fuzzyMatchCi("测试一二三四五", [], dict);
    expect(results).toEqual([]);
  });

  it("应返回匹配的模板（按置信度排序）", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [
      makeMinimalTemplate("long", "长牌", [7, 7, 7, 7, 7]),
      makeMinimalTemplate("short", "短牌", [5, 5]),
      makeMinimalTemplate("mid", "中牌", [5, 5, 5]),
    ];
    // 输入 10 个字，恰好匹配"短牌"的 [5,5] 布局
    const results = fuzzyMatchCi("白日依山尽，黄河入海流", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe("short");
    // 字数完美匹配 + 部分音调匹配
    expect(results[0].confidence).toBeGreaterThan(0.6);
  });

  it("部分匹配（不完整输入）应返回合理置信度", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [
      makeMinimalTemplate("mid", "中牌", [5, 5, 5]),
      makeMinimalTemplate("long", "长牌", [7, 7, 7, 7]),
    ];
    // 只输入第一句（5字），应匹配中牌
    const results = fuzzyMatchCi("白日依山尽", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].template.id).toBe("mid");
    // 不完整输入不应给满分
    expect(results[0].confidence).toBeLessThan(1);
  });

  it("topN 参数应限制结果数量", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = Array.from({ length: 10 }, (_, i) =>
      makeMinimalTemplate(`t${i}`, `模板${i}`, [5, 5, 5]),
    );
    const results = fuzzyMatchCi("白日依山尽黄河入海流举头望明月", templates, dict, { topN: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("templateLimit 参数应截断搜索", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = Array.from({ length: 10 }, (_, i) =>
      makeMinimalTemplate(`t${i}`, `模板${i}`, [5, 5, 5]),
    );
    // templateLimit 为 5 时只搜索前 5 个模板
    const results = fuzzyMatchCi("白日依山尽黄河入海流举头望明月", templates, dict, {
      topN: 10,
      templateLimit: 5,
    });
    // 检查结果中的 template id 只来自前 5 个
    const ids = results.map((r) => r.template.id);
    expect(ids.every((id) => ["t0", "t1", "t2", "t3", "t4"].includes(id))).toBe(true);
  });

  it("单句单字输入不应崩溃", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeMinimalTemplate("mini", "小令", [3])];
    const results = fuzzyMatchCi("白", templates, dict);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].confidence).toBeDefined();
  });

  it("matchResult 应包含 lineDetails", async () => {
    const dict = await createRhymeDict("pingshui");
    const templates = [makeMinimalTemplate("short", "短牌", [5, 5])];
    const results = fuzzyMatchCi("白日依山尽，黄河入海流", templates, dict);
    expect(results[0].lineDetails.length).toBeGreaterThan(0);
    expect(results[0].matchedChars).toBeGreaterThan(0);
    expect(results[0].totalExpectedChars).toBe(10);
    expect(results[0].inputChars).toBe(10);
  });
});
