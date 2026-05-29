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

import type { Genre } from "../constants/poem";

const EMPTY_CI_PATTERN: CiPatternForEditor = {
  lines: [],
  rhymeGroups: [],
  sectionBreaks: [],
};

type CiBundle = Record<string, CiTemplate>;

let ciBundlePromise: Promise<CiBundle> | null = null;

function normalizeBundleError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`词谱准备失败：${message}`);
}

function compactBundleFromModule(module: { default?: unknown }): CompactBundleRaw {
  return (module.default ?? module) as CompactBundleRaw;
}

export function loadMobileCiBundle(): Promise<CiBundle> {
  if (!ciBundlePromise) {
    ciBundlePromise = import(
      "../../../../core/poem-parser/data/ci-tunes-bundle-compact.json"
    )
      .then((module) =>
        materializeCiBundle(compactBundleFromModule(module)) as CiBundle,
      )
      .catch((error: unknown) => {
        ciBundlePromise = null;
        throw normalizeBundleError(error);
      });
  }
  return ciBundlePromise;
}

export async function patternForSelection(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
): Promise<CiPatternForEditor> {
  if (!selectedVariant) return EMPTY_CI_PATTERN;
  if (genre === "meter") {
    const lines = getMeterMap().get(selectedVariant)?.pattern ?? [];
    return { lines, rhymeGroups: pairLineGroups(lines), sectionBreaks: [] };
  }

  const ciBundle = await loadMobileCiBundle();
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

export async function templateForAnalyze(
  genre: Genre,
  selectedTune: string,
  selectedVariant: string,
) {
  return genre === "meter"
    ? getMeterMap().get(selectedVariant)
    : (await loadMobileCiBundle())[selectedTune];
}

export {
  ciPatternForEditor,
  firstVariantForTune,
  inferCiRhymeTone,
  pairLineGroups,
  variantSummary,
};
export type { CiPatternForEditor };
