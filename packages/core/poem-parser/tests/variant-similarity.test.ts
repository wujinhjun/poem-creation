/**
 * 变体相似度测试
 */

import { describe, it, expect } from "vitest";
import { computeVariantSimilarity, findSimilarVariants } from "../src/templates/variant-similarity.js";
import type { CiTemplateVariant } from "../src/templates/index.js";
import { Tone } from "../src/core/types.js";

function makeVariant(
  id: string,
  sections: Array<{ lines: Array<{ charCount: number; pattern: Array<{ type: string; tone?: number }>; isRhymeLine: boolean; rhymeType?: string; isXieyun?: boolean }> }>,
): CiTemplateVariant {
  return {
    id,
    name: id,
    sections: sections.map((sec) => ({
      name: "上阕",
      lines: sec.lines.map((l) => ({
        charCount: l.charCount,
        pattern: l.pattern.map((p) =>
          p.type === "flexible"
            ? { type: "flexible" as const }
            : { type: "fixed" as const, tone: (p.tone ?? Tone.Ping) as number },
        ),
        isRhymeLine: l.isRhymeLine,
        rhymeType: l.rhymeType as "ping" | "ze" | undefined,
        isXieyun: l.isXieyun,
      })),
    })),
  };
}

// Helper: create a simple ping pattern
function P() { return { type: "fixed" as const, tone: Tone.Ping }; }
function Z() { return { type: "fixed" as const, tone: Tone.Ze }; }
function F() { return { type: "flexible" as const }; }

describe("computeVariantSimilarity", () => {
  it("identical variants should score 1.0", () => {
    const v = makeVariant("test", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const result = computeVariantSimilarity(v, v);
    expect(result.score).toBe(1.0);
    expect(result.structure).toBe(1.0);
    expect(result.tonal).toBe(1.0);
    expect(result.rhyme).toBe(1.0);
  });

  it("completely different variants should score near 0", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), P(), P(), P(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 7, pattern: [Z(), Z(), Z(), Z(), Z(), Z(), Z()], isRhymeLine: true, rhymeType: "ze" },
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    expect(result.score).toBeLessThan(0.5);
  });

  it("structural difference should lower structure score", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 7, pattern: [P(), Z(), P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 7, pattern: [Z(), P(), Z(), P(), Z(), P(), Z()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    expect(result.structure).toBeLessThan(1.0);
  });

  it("flexible tones should have partial match against fixed tones", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 4, pattern: [P(), Z(), P(), Z()], isRhymeLine: false },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 4, pattern: [F(), Z(), P(), F()], isRhymeLine: false },
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    // F vs P costs 0.5, F vs Z costs 0.5. Positions: P→F=0.5, Z→Z=0, P→P=0, Z→F=0.5
    // Total dist=1.0, maxLen=4, tonal=1-1/4=0.75
    expect(result.tonal).toBe(0.75);
  });

  it("rhyme scheme difference should lower rhyme score", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: false },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: false }, // rhyme removed
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: true, rhymeType: "ze" }, // rhyme added
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    expect(result.rhyme).toBeLessThan(1.0);
  });

  it("xieyun difference should partially lower rhyme score", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), P(), P(), P(), P()], isRhymeLine: true, rhymeType: "ping", isXieyun: false },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 5, pattern: [P(), P(), P(), P(), P()], isRhymeLine: true, rhymeType: "ping", isXieyun: true },
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    // Same tone but different xieyun → 0.5 per slot, 1 slot → rhyme=0.5
    expect(result.rhyme).toBe(0.5);
  });

  it("extra lines in one variant should lower structure score", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    const result = computeVariantSimilarity(a, b);
    // same first line but b has 2 extra lines → structure < 1
    expect(result.structure).toBeLessThan(1.0);
    expect(result.structure).toBeLessThan(0.7); // 1/3 line match ratio + section penalty
  });

  it("rhyme position shift should lower rhyme score", () => {
    const a = makeVariant("a", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: false },
        ],
      },
    ]);
    const b = makeVariant("b", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: false },
          { charCount: 5, pattern: [Z(), P(), Z(), P(), Z()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);
    // rhyme moved from line 0 to line 1 → rhyme < 1
    const result = computeVariantSimilarity(a, b);
    expect(result.rhyme).toBeLessThan(1.0);
  });
});

describe("findSimilarVariants", () => {
  it("should return top K most similar variants", () => {
    const target = makeVariant("target", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), Z(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);

    const similar = makeVariant("similar", [
      {
        lines: [
          { charCount: 5, pattern: [P(), Z(), P(), F(), P()], isRhymeLine: true, rhymeType: "ping" },
        ],
      },
    ]);

    const different = makeVariant("different", [
      {
        lines: [
          { charCount: 7, pattern: [Z(), Z(), Z(), Z(), Z(), Z(), Z()], isRhymeLine: true, rhymeType: "ze" },
        ],
      },
    ]);

    const results = findSimilarVariants(target, [different, similar], 2);
    expect(results).toHaveLength(2);
    expect(results[0].variant.id).toBe("similar");
    expect(results[1].variant.id).toBe("different");
    expect(results[0].similarity.score).toBeGreaterThan(results[1].similarity.score);
  });
});
