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

const COMPACT_CI_BUNDLE_PATH = 'data/ci-tunes-bundle-compact.json';

let ciBundlePromise: Promise<Record<string, CiTemplate>> | null = null;

async function fetchCompactCiBundle(): Promise<CompactBundleRaw> {
  if ('DecompressionStream' in globalThis) {
    try {
      const response = await fetch(publicAssetPath(`${COMPACT_CI_BUNDLE_PATH}.gz`));
      if (!response.ok) {
        throw new Error(`词谱压缩包加载失败：${response.status}`);
      }
      if (!response.body) {
        throw new Error('词谱压缩包内容为空');
      }

      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).json() as CompactBundleRaw;
    } catch (error) {
      console.warn('词谱压缩包加载失败，改用原始词谱。', error);
    }
  }

  const response = await fetch(publicAssetPath(COMPACT_CI_BUNDLE_PATH));
  if (!response.ok) {
    throw new Error(`词谱加载失败：${response.status}`);
  }
  return await response.json() as CompactBundleRaw;
}

// Full ci patterns are large, so keep the initial catalog light and fetch once
// only when the editor actually needs a selected ci variant.
export function loadCiBundle(): Promise<Record<string, CiTemplate>> {
  if (!ciBundlePromise) {
    ciBundlePromise = fetchCompactCiBundle()
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
