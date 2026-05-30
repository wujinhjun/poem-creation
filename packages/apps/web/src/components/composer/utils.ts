import { Tone } from '@poem/parser/kernel';
import type { ToneConstraint } from '@poem/parser/kernel';
import { lineEndsWithRhyme } from '@poem/editor-core';
import { formatRhymeToneLabel } from '@poem/shared';

export function constraintLabel(c: ToneConstraint): string {
  if (c.type === 'flexible') return '中';
  if (c.type === 'rhyme') {
    if (c.tone) return rhymeToneLabel(c.tone, c.xieyun);
    return '韵';
  }
  return c.tone === Tone.Ping ? '平' : '仄';
}

export function rhymeToneLabel(tone: Tone, xieyun = false): string {
  return formatRhymeToneLabel(tone, xieyun);
}

export function linePunctuation(patternLine: ToneConstraint[] | undefined): string {
  return lineEndsWithRhyme(patternLine) ? '。' : '，';
}
