import type { CiTemplate, ToneConstraint } from '@poem/parser/kernel';
import {
  ciPatternForEditor,
  inferCiRhymeTone,
} from '@poem/shared';
import type { CiPatternForEditor } from '@poem/shared';

export type { CiPatternForEditor };

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

export { ciPatternForEditor, inferCiRhymeTone };
