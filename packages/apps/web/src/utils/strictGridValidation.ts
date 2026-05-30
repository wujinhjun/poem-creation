import { Tone } from '@poem/parser/kernel';
import type { RhymeDict, ToneConstraint } from '@poem/parser/kernel';
import { formatRhymeToneLabel } from '@poem/shared';

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
      if (!char || constraint.type === 'flexible') return;
      const expectedTone =
        constraint.type === 'rhyme'
          ? (constraint.tone ?? expectedRhymeTone)
          : null;
      const expectedLabel =
        constraint.type === 'fixed'
          ? toneLabel(constraint.tone)
          : formatRhymeToneLabel(
              expectedTone,
              constraint.type === 'rhyme' ? constraint.xieyun : false,
            );

      checkableCount += 1;
      const entries = dict.lookup(char);
      if (entries.length === 0) {
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
        const matched = entries.some((entry) => entry.tone === constraint.tone);
        if (matched) {
          matchedCount += 1;
          return;
        }
        issues.push({
          lineIndex,
          col,
          char,
          lineText,
          expected: toneLabel(constraint.tone),
          actual: [...new Set(entries.map((entry) => toneLabel(entry.tone)))]
            .join('/'),
          reason: '平仄不合',
        });
        return;
      }

      const rhymeEntries = entries.filter(
        (entry) =>
          entry.rhymeGroup &&
          (!expectedTone || entry.tone === expectedTone),
      );
      const matchingEntry = rhymeEntries.find((entry) => {
        const anchor = rhymeAnchors.get(entry.tone);
        return !anchor || anchor === entry.rhymeGroup;
      });

      if (matchingEntry) {
        matchedCount += 1;
        if (!rhymeAnchors.has(matchingEntry.tone)) {
          rhymeAnchors.set(matchingEntry.tone, matchingEntry.rhymeGroup);
        }
        return;
      }

      issues.push({
        lineIndex,
        col,
        char,
        lineText,
        expected: expectedLabel,
        actual: [...new Set(entries.map((entry) => {
          const tone = toneLabel(entry.tone);
          return entry.rhymeGroup ? `${tone}${entry.rhymeGroup}` : tone;
        }))].join('/'),
        reason: '韵脚不合',
      });
    });
  });

  return { checkableCount, matchedCount, issues };
}
