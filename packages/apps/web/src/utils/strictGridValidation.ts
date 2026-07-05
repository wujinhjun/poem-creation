import { Tone } from '@poem/parser/kernel';
import type { RhymeDict, ToneConstraint } from '@poem/parser/kernel';
import { formatRhymeToneLabel } from '@poem/shared';
import { evaluateToneCell } from '@poem/poem-kit';

export type StrictCharIssue = {
  lineIndex: number;
  col: number;
  char: string;
  lineText: string;
  expected: string;
  actual: string;
  reason: string;
};

export type StrictGridValidation = {
  checkableCount: number;
  matchedCount: number;
  issues: StrictCharIssue[];
};

function toneLabel(tone: Tone): string {
  if (tone === Tone.Ping) return '平';
  if (tone === Tone.Ze) return '仄';
  return '未知';
}

export function validateGridStrictly({
  chars,
  pattern,
  dict,
  expectedRhymeTone,
}: {
  chars: string[][];
  pattern: ToneConstraint[][];
  dict: RhymeDict;
  expectedRhymeTone: Tone | null;
}): StrictGridValidation {
  let checkableCount = 0;
  let matchedCount = 0;
  const issues: StrictCharIssue[] = [];
  const rhymeAnchors = new Map<Tone, string>();

  pattern.forEach((line, lineIndex) => {
    const lineText = chars[lineIndex]?.join('').trim() ?? '';
    line.forEach((constraint, col) => {
      const char = chars[lineIndex]?.[col] ?? '';
      const result = evaluateToneCell(char, constraint, {
        dict,
        expectedRhymeTone,
        rhymeAnchors,
      });

      // 空格与可平可仄不计入可校验字数。
      if (result.status === 'empty' || result.constraintType === 'flexible') {
        return;
      }
      checkableCount += 1;
      if (result.status === 'pass') {
        matchedCount += 1;
        return;
      }

      const expectedLabel =
        constraint.type === 'fixed'
          ? toneLabel(constraint.tone)
          : formatRhymeToneLabel(result.expectedTone, result.xieyun);

      if (result.failReason === 'not-in-dict') {
        issues.push({
          lineIndex,
          col,
          char,
          lineText,
          expected: expectedLabel,
          actual: '未知',
          reason: '韵书未收此字',
        });
        return;
      }

      if (constraint.type === 'fixed') {
        issues.push({
          lineIndex,
          col,
          char,
          lineText,
          expected: expectedLabel,
          actual: [...new Set(result.entries.map((entry) => toneLabel(entry.tone)))]
            .join('/'),
          reason: '平仄不合',
        });
        return;
      }

      issues.push({
        lineIndex,
        col,
        char,
        lineText,
        expected: expectedLabel,
        actual: [...new Set(result.entries.map((entry) => {
          const tone = toneLabel(entry.tone);
          return entry.rhymeGroup ? `${tone}${entry.rhymeGroup}` : tone;
        }))].join('/'),
        reason: '韵脚不合',
      });
    });
  });

  return { checkableCount, matchedCount, issues };
}
