import { Tone } from '@poem/parser/kernel';
import type { CiTemplate, ToneConstraint } from '@poem/parser/kernel';

export type CiPatternForEditor = {
  lines: ToneConstraint[][];
  rhymeGroups: number[][];
  sectionBreaks: number[];
};

let ciBundlePromise: Promise<Record<string, CiTemplate>> | null = null;

// Full ci patterns are large, so keep the initial catalog light and fetch once
// only when the editor actually needs a selected ci variant.
export function loadCiBundle(): Promise<Record<string, CiTemplate>> {
  if (!ciBundlePromise) {
    ciBundlePromise = fetch('/data/ci-tunes-bundle.json').then((r) => r.json());
  }
  return ciBundlePromise;
}

export function ciVariantPattern(
  tune: CiTemplate,
  variantId: string,
): ToneConstraint[][] {
  return ciPatternForEditor(tune, variantId).lines;
}

export function ciPatternForEditor(
  tune: CiTemplate | undefined,
  variantId: string,
): CiPatternForEditor {
  const variant = tune?.variants.find((item) => item.id === variantId);
  if (!variant) return { lines: [], rhymeGroups: [], sectionBreaks: [] };

  const lines: ToneConstraint[][] = [];
  const rhymeGroups: number[][] = [];
  const sectionBreaks: number[] = [];
  let lineOffset = 0;
  let groupBuffer: number[] = [];

  const flushGroup = () => {
    if (groupBuffer.length === 0) return;
    rhymeGroups.push(groupBuffer);
    groupBuffer = [];
  };

  variant.sections.forEach((section, index) => {
    flushGroup();
    if (index > 0 && section.lines.length > 0) sectionBreaks.push(rhymeGroups.length);

    section.lines.forEach((line) => {
      const logicalLine = lineOffset;
      lines.push(line.pattern);
      groupBuffer.push(logicalLine);
      lineOffset += 1;

      // isRhymeLine is the template-side display boundary: non-rhyme句 stay
      // in the same visual row until the rhyme句 closes the group.
      if (line.isRhymeLine) flushGroup();
    });
  });
  flushGroup();

  return { lines, rhymeGroups, sectionBreaks };
}

export function inferCiRhymeTone(text: string): Tone | null {
  const hasPing = text.includes('平韵');
  const hasZe = text.includes('仄韵');
  if (hasPing && !hasZe) return Tone.Ping;
  if (hasZe && !hasPing) return Tone.Ze;
  return null;
}
