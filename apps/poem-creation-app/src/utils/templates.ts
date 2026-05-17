import { findCiTune, listAllTemplates } from "@poem/parser/catalog";
import { loadMeterTemplates, Tone } from "@poem/parser/kernel";
import type { CiTemplate, ToneConstraint } from "@poem/parser/kernel";

import ciBundleData from "../../../../packages/parser/data/ci-tunes-bundle.json";
import type { Genre } from "../constants/poem";

export type CiPatternForEditor = {
  lines: ToneConstraint[][];
  rhymeGroups: number[][];
  sectionBreaks: number[];
};

export const allTemplates = listAllTemplates();
export const meterMap = new Map(loadMeterTemplates().map((item) => [item.id, item]));
const ciBundle = ciBundleData as Record<string, CiTemplate>;

export function pairLineGroups(pattern: ToneConstraint[][]): number[][] {
  const groups: number[][] = [];
  for (let index = 0; index < pattern.length; index += 2) {
    groups.push(index + 1 < pattern.length ? [index, index + 1] : [index]);
  }
  return groups;
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

  variant.sections.forEach((section, sectionIndex) => {
    flushGroup();
    if (sectionIndex > 0 && section.lines.length > 0) {
      sectionBreaks.push(rhymeGroups.length);
    }

    section.lines.forEach((line) => {
      lines.push(line.pattern);
      groupBuffer.push(lineOffset);
      lineOffset += 1;
      if (line.isRhymeLine) flushGroup();
    });
  });
  flushGroup();

  return { lines, rhymeGroups, sectionBreaks };
}

export function patternForSelection(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
): CiPatternForEditor {
  if (!selectedVariant) return { lines: [], rhymeGroups: [], sectionBreaks: [] };
  if (genre === "meter") {
    const lines = meterMap.get(selectedVariant)?.pattern ?? [];
    return { lines, rhymeGroups: pairLineGroups(lines), sectionBreaks: [] };
  }

  const pattern = ciPatternForEditor(ciBundle[selectedTune], selectedVariant);
  return pattern;
}

export function templateOptions(genre: Genre) {
  return allTemplates
    .filter((item) => item.genre === genre)
    .map((item) => ({
      value: item.name,
      label: `${item.name}（${item.variantCount} 体）`,
    }));
}

export function variantOptions(genre: Genre, selectedTune: string) {
  const catalog = allTemplates.find(
    (item) => item.genre === genre && item.name === selectedTune,
  );
  if (!catalog) return [];
  if (genre === "ci") {
    const tune = findCiTune(selectedTune);
    return (
      tune?.variants.map((variant) => ({
        value: variant.id,
        label: `${variant.author} · ${variant.sketch}（${variant.charCount}字）`,
      })) ?? []
    );
  }

  return catalog.variants.map((variant) => ({
    value: variant.id,
    label: `${variant.rhymeFirst ? "首句押韵" : "首句不押韵"} · ${variant.author}`,
  }));
}

export function firstVariantForTune(genre: Genre, tuneName: string): string {
  return (
    allTemplates.find((item) => item.genre === genre && item.name === tuneName)
      ?.variants[0]?.id ?? ""
  );
}

export function variantSummary(
  genre: Genre,
  tuneName: string,
  variantId: string,
): string {
  if (!variantId) return "";
  const template = allTemplates.find(
    (item) => item.genre === genre && item.name === tuneName,
  );
  const variant = template?.variants.find((item) => item.id === variantId);
  if (!variant) return variantId;
  if (genre === "meter") {
    return `${variant.rhymeFirst ? "首句押韵" : "首句不押韵"} · ${variant.author}`;
  }
  return `${variant.author} · ${variant.sketch}`;
}

export function inferCiRhymeTone(text: string): Tone | null {
  const hasPing = text.includes("平韵");
  const hasZe = text.includes("仄韵");
  if (hasPing && !hasZe) return Tone.Ping;
  if (hasZe && !hasPing) return Tone.Ze;
  return null;
}

export function expectedRhymeToneForSelection(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
): Tone | null {
  if (genre === "meter") return Tone.Ping;
  const variant = findCiTune(selectedTune)?.variants.find(
    (item) => item.id === selectedVariant,
  );
  if (!variant) return null;
  return inferCiRhymeTone(`${variant.author} ${variant.sketch}`);
}

export function templateForAnalyze(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
) {
  return genre === "meter" ? meterMap.get(selectedVariant) : ciBundle[selectedTune];
}
