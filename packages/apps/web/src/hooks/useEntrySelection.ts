import { useCallback, useMemo } from 'react';
import { findCiTune } from '@poem/parser/catalog';
import { RhymeDictType } from '@poem/parser/kernel';
import {
  allTemplates,
  defaultRhymeType,
  firstVariantForTune,
} from '@poem/shared';
import type { Genre } from '../constants/poem';
import type { SelectOption } from '../components/CustomSelect';

export function useEntrySelection({
  entryGenre,
  entrySelectedTune,
  setEntryGenre,
  setEntrySelectedTune,
  setEntrySelectedVariant,
  setEntryRhymeType,
}: {
  entryGenre: Genre;
  entrySelectedTune: string;
  setEntryGenre: (genre: Genre) => void;
  setEntrySelectedTune: (tune: string) => void;
  setEntrySelectedVariant: (variant: string) => void;
  setEntryRhymeType: (rhymeType: RhymeDictType) => void;
}) {
  const meterOptions = useMemo(
    () => allTemplates.filter((t) => t.genre === 'meter'),
    [],
  );
  const ciOptions = useMemo(
    () => allTemplates.filter((t) => t.genre === 'ci'),
    [],
  );
  const entryCurrentTemplates =
    entryGenre === 'meter' ? meterOptions : ciOptions;
  const entrySelectedCatalog = entryCurrentTemplates.find(
    (t) => t.name === entrySelectedTune,
  );
  const entryTuneDetail =
    entryGenre === 'ci' ? findCiTune(entrySelectedTune) : undefined;

  const templateOptions = useMemo<SelectOption<string>[]>(
    () =>
      entryCurrentTemplates.map((t) => ({
        value: t.name,
        label: `${t.name}（${t.variantCount} 体）`,
      })),
    [entryCurrentTemplates],
  );

  const variantOptions = useMemo<SelectOption<string>[]>(() => {
    if (entryGenre === 'ci' && entryTuneDetail) {
      return entryTuneDetail.variants.map((v) => ({
        value: v.id,
        label: `${v.author} · ${v.sketch}（${v.charCount}字）`,
      }));
    }

    if (entryGenre === 'meter' && entrySelectedCatalog) {
      return entrySelectedCatalog.variants.map((v) => ({
        value: v.id,
        label: `${v.rhymeFirst ? '首句押韵' : '首句不押韵'} · ${v.author}`,
      }));
    }

    return [];
  }, [entryGenre, entrySelectedCatalog, entryTuneDetail]);

  const handleEntryGenreChange = useCallback((nextGenre: Genre) => {
    setEntryGenre(nextGenre);
    setEntrySelectedTune('');
    setEntrySelectedVariant('');
    setEntryRhymeType(defaultRhymeType(nextGenre));
  }, [
    setEntryGenre,
    setEntryRhymeType,
    setEntrySelectedTune,
    setEntrySelectedVariant,
  ]);

  const handleEntryTuneChange = useCallback(
    (nextTune: string) => {
      setEntrySelectedTune(nextTune);
      setEntrySelectedVariant(firstVariantForTune(entryGenre, nextTune));
    },
    [
      entryGenre,
      setEntrySelectedTune,
      setEntrySelectedVariant,
    ],
  );

  return {
    templateOptions,
    variantOptions,
    handleEntryGenreChange,
    handleEntryTuneChange,
  };
}
