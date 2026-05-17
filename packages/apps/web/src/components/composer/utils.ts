import { Tone } from '@poem/parser/kernel';
import type { ToneConstraint } from '@poem/parser/kernel';
import { lineEndsWithRhyme } from '@poem/editor-core';

export function constraintLabel(c: ToneConstraint): string {
  if (c.type === 'flexible') return '中';
  if (c.type === 'rhyme') return '韵';
  return c.tone === Tone.Ping ? '平' : '仄';
}

export function rhymeToneLabel(tone: Tone): string {
  return tone === Tone.Ping ? '平韵' : '仄韵';
}

export function linePunctuation(patternLine: ToneConstraint[] | undefined): string {
  return lineEndsWithRhyme(patternLine) ? '。' : '，';
}
