import { createCharNode } from "../core/factories.js";
import { CharNode, Tone, ToneAmbiguity } from "../core/types.js";
import { LexResult } from "../lexer/index.js";
import { RhymeDict, RhymeEntry } from "../rhyme-dict/index.js";

export interface AnnotationResult {
  chars: CharNode[][];
  ambiguities: ToneAmbiguity[];
}

/**
 * 从韵书查询结果归并出主声调与去重后的声调列表。
 *
 * 单一读音 → `primaryTone` 即该声调；多读音（多音字）→ `primaryTone`
 * 取第一条，`uniqueTones` 列出全部去重声调。
 * 供音韵标注、流式解析、模糊匹配复用，避免三处各写一份。
 */
export function resolveTones(entries: RhymeEntry[]): {
  primaryTone: Tone | null;
  uniqueTones: Tone[];
} {
  const uniqueTones = [...new Set(entries.map((entry) => entry.tone))];
  const primaryTone =
    uniqueTones.length === 1 ? uniqueTones[0] : entries[0]?.tone ?? null;
  return { primaryTone, uniqueTones };
}

export function annotate(lexResult: LexResult, dict: RhymeDict): AnnotationResult {
  const ambiguities: ToneAmbiguity[] = [];
  const lines: CharNode[][] = [];
  let globalIndex = 0;

  for (let lineIndex = 0; lineIndex < lexResult.lines.length; lineIndex += 1) {
    const lexLine = lexResult.lines[lineIndex];
    const row: CharNode[] = [];

    for (let col = 0; col < lexLine.chars.length; col += 1) {
      const char = lexLine.chars[col];
      const entries = dict.lookup(char);

      const { primaryTone, uniqueTones } = resolveTones(entries);
      const rhymeGroup = entries[0]?.rhymeGroup;

      row.push(
        createCharNode({
          char,
          line: lineIndex,
          col,
          global: globalIndex,
          tone: primaryTone,
          toneOptions: uniqueTones.length > 1 ? uniqueTones : undefined,
          rhymeGroup,
        }),
      );

      if (uniqueTones.length > 1) {
        ambiguities.push({
          char,
          position: { line: lineIndex, col },
          options: entries.map((entry) => ({
            tone: entry.tone,
            rhymeGroup: entry.rhymeGroup,
            pronunciation: "",
          })),
          suggestion: {
            preferredTone: Tone.Ping,
            reason: "默认建议平声，后续由 matcher 结合模板回溯修正",
          },
        });
      }

      globalIndex += 1;
    }

    lines.push(row);
  }

  return { chars: lines, ambiguities };
}
