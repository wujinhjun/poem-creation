import { describe, expect, it } from "vitest";
import { Tone } from "@poem/parser";
import type { CiTemplate } from "@poem/parser";
import { ciPatternForEditor } from "../src/index.js";

describe("ciPatternForEditor", () => {
  it("保留词牌韵脚自身的平仄与叶韵信息", () => {
    const tune: CiTemplate = {
      id: "西江月",
      name: "西江月",
      variants: [
        {
          id: "西江月-柳永体1",
          name: "柳永体",
          sections: [
            {
              name: "上阕",
              lines: [
                {
                  charCount: 6,
                  pattern: Array.from({ length: 6 }, () => ({ type: "flexible" as const })),
                  isRhymeLine: false,
                },
                {
                  charCount: 6,
                  pattern: [
                    ...Array.from({ length: 5 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ping",
                },
                {
                  charCount: 7,
                  pattern: [
                    ...Array.from({ length: 6 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ping",
                },
                {
                  charCount: 6,
                  pattern: [
                    ...Array.from({ length: 5 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ze",
                  isXieyun: true,
                },
              ],
            },
            {
              name: "下阕",
              lines: [
                {
                  charCount: 6,
                  pattern: Array.from({ length: 6 }, () => ({ type: "flexible" as const })),
                  isRhymeLine: false,
                },
                {
                  charCount: 6,
                  pattern: [
                    ...Array.from({ length: 5 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ping",
                },
                {
                  charCount: 7,
                  pattern: [
                    ...Array.from({ length: 6 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ping",
                },
                {
                  charCount: 6,
                  pattern: [
                    ...Array.from({ length: 5 }, () => ({ type: "flexible" as const })),
                    { type: "rhyme" as const },
                  ],
                  isRhymeLine: true,
                  rhymeType: "ze",
                  isXieyun: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = ciPatternForEditor(tune, "西江月-柳永体1");

    expect(result.lines[1].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ping,
    });
    expect(result.lines[2].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ping,
    });
    expect(result.lines[3].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ze,
      xieyun: true,
    });
    expect(result.lines[5].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ping,
    });
    expect(result.lines[6].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ping,
    });
    expect(result.lines[7].at(-1)).toMatchObject({
      type: "rhyme",
      tone: Tone.Ze,
      xieyun: true,
    });
  });
});
