import { findCiTune } from "@poem/parser/catalog";
import {
  loadCiBundle as materializeCiBundle,
  Tone,
} from "@poem/parser/kernel";
import type {
  CiTemplate,
  CompactBundleRaw,
  ToneConstraint,
} from "@poem/parser/kernel";
import {
  ciPatternForEditor,
  firstVariantForTune,
  getAllTemplates,
  getMeterMap,
  inferCiRhymeTone,
  pairLineGroups,
  variantSummary,
} from "@poem/poem-kit";
import type { CiPatternForEditor } from "@poem/poem-kit";

import compactCiBundleData from "../../../../core/poem-parser/data/ci-tunes-bundle-compact.json";
import type { Genre } from "../constants/poem";

const ciBundle = materializeCiBundle(compactCiBundleData as CompactBundleRaw);

export function patternForSelection(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
): CiPatternForEditor {
  if (!selectedVariant) return { lines: [], rhymeGroups: [], sectionBreaks: [] };
  if (genre === "meter") {
    const lines = getMeterMap().get(selectedVariant)?.pattern ?? [];
    return { lines, rhymeGroups: pairLineGroups(lines), sectionBreaks: [] };
  }

  const pattern = ciPatternForEditor(ciBundle[selectedTune], selectedVariant);
  return pattern;
}

export function templateOptions(genre: Genre) {
  return getAllTemplates()
    .filter((item) => item.genre === genre)
    .map((item) => ({
      value: item.name,
      label: `${item.name}（${item.variantCount} 体）`,
    }));
}

export function variantOptions(genre: Genre, selectedTune: string) {
  const catalog = getAllTemplates().find(
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
  return genre === "meter"
    ? getMeterMap().get(selectedVariant)
    : ciBundle[selectedTune];
}

export {
  ciPatternForEditor,
  firstVariantForTune,
  inferCiRhymeTone,
  pairLineGroups,
  variantSummary,
};
export type { CiPatternForEditor };
