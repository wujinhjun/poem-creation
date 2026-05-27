import {
  loadCiBundle as materializeCiBundle,
} from '@poem/parser/kernel';
import type {
  CiTemplate,
  CompactBundleRaw,
  ToneConstraint,
} from '@poem/parser/kernel';
import {
  ciPatternForEditor,
  inferCiRhymeTone,
} from '@poem/poem-kit';
import type { CiPatternForEditor } from '@poem/poem-kit';
import { publicAssetPath } from './publicAsset';

export type { CiPatternForEditor };

let ciBundlePromise: Promise<Record<string, CiTemplate>> | null = null;

// Full ci patterns are large, so keep the initial catalog light and fetch once
// only when the editor actually needs a selected ci variant.
export function loadCiBundle(): Promise<Record<string, CiTemplate>> {
  if (!ciBundlePromise) {
    ciBundlePromise = fetch(publicAssetPath('data/ci-tunes-bundle-compact.json'))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`词谱加载失败：${response.status}`);
        }
        return response.json() as Promise<CompactBundleRaw>;
      })
      .then((raw) => materializeCiBundle(raw));
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
