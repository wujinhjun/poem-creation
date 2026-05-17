import { useEffect, useMemo, useState } from 'react';
import { findCiTune } from '@poem/parser/catalog';
import { Tone } from '@poem/parser/kernel';
import type { AnyTemplate, CiTemplate, ToneConstraint } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import {
  ciPatternForEditor,
  inferCiRhymeTone,
  loadCiBundle,
} from '../utils/ciTemplate';
import {
  meterMap,
  pairLineGroups,
  variantSummary,
} from '../utils/templateSelection';

type CiPatternState = {
  key: string;
  pattern: ToneConstraint[][];
  visualLineGroups: number[][];
  sectionBreakBeforeGroups: number[];
};

export function useEditorPattern({
  genre,
  selectedTune,
  selectedVariant,
  onError,
}: {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  onError: (message: string) => void;
}) {
  const [ciPatternState, setCiPatternState] = useState<CiPatternState | null>(
    null,
  );
  const [ciTemplateState, setCiTemplateState] = useState<{
    key: string;
    template: CiTemplate;
  } | null>(null);
  const editorTuneDetail =
    genre === 'ci' ? findCiTune(selectedTune) : undefined;
  const selectedCiVariant = editorTuneDetail?.variants.find(
    (v) => v.id === selectedVariant,
  );

  useEffect(() => {
    if (genre !== 'ci' || !selectedVariant) return;
    const key = `${selectedTune}::${selectedVariant}`;
    let alive = true;
    onError('');
    (async () => {
      try {
        const bundle = await loadCiBundle();
        const tune = bundle[selectedTune];
        if (!tune) {
          if (alive) onError(`未找到词牌「${selectedTune}」的格律数据。`);
          return;
        }
        const patternForEditor = ciPatternForEditor(tune, selectedVariant);
        if (alive) {
          setCiTemplateState({ key, template: tune });
          setCiPatternState({
            key,
            pattern: patternForEditor.lines,
            visualLineGroups: patternForEditor.rhymeGroups,
            sectionBreakBeforeGroups: patternForEditor.sectionBreaks,
          });
        }
      } catch (error: unknown) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        onError(`词牌格律加载失败：${message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [genre, onError, selectedTune, selectedVariant]);

  const pattern: ToneConstraint[][] = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === 'meter') {
      const t = meterMap.get(selectedVariant);
      return t?.pattern ?? [];
    }
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key ? ciPatternState.pattern : [];
  }, [genre, selectedTune, selectedVariant, ciPatternState]);

  const expectedRhymeTone = useMemo(() => {
    if (genre === 'meter') return Tone.Ping;
    if (!selectedCiVariant) return null;
    return inferCiRhymeTone(
      `${selectedCiVariant.author} ${selectedCiVariant.sketch}`,
    );
  }, [genre, selectedCiVariant]);

  const visualLineGroups = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === 'meter') return pairLineGroups(pattern);
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key
      ? ciPatternState.visualLineGroups
      : [];
  }, [ciPatternState, genre, pattern, selectedTune, selectedVariant]);

  const sectionBreakBeforeGroups = useMemo(() => {
    if (genre !== 'ci' || !selectedVariant) return [];
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key
      ? ciPatternState.sectionBreakBeforeGroups
      : [];
  }, [ciPatternState, genre, selectedTune, selectedVariant]);

  const selectedVariantLabel = useMemo(
    () => variantSummary(genre, selectedTune, selectedVariant),
    [genre, selectedTune, selectedVariant],
  );

  const analysisTemplate: AnyTemplate | undefined =
    genre === 'meter'
      ? meterMap.get(selectedVariant)
      : ciTemplateState?.key === `${selectedTune}::${selectedVariant}`
        ? ciTemplateState.template
        : undefined;

  return {
    pattern,
    expectedRhymeTone,
    visualLineGroups,
    sectionBreakBeforeGroups,
    selectedVariantLabel,
    analysisTemplate,
  };
}
