import { useMemo, useState } from 'react';
import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import type { PoemCreationDraftSummary } from '../persist';
import type { SelectOption } from './CustomSelect';
import { DraftListPanel } from './entry/DraftListPanel';
import { EntryEditorPanel } from './entry/EntryEditorPanel';

type EntryPageProps = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  templateOptions: SelectOption<string>[];
  variantOptions: SelectOption<string>[];
  drafts: PoemCreationDraftSummary[];
  onGenreChange: (genre: Genre) => void;
  onTuneChange: (tune: string) => void;
  onVariantChange: (variant: string) => void;
  onRhymeTypeChange: (rhymeType: RhymeDictType) => void;
  onStartDraft: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportDrafts: () => void;
  onImportDrafts: (file: File) => void;
  onOpenSettings: () => void;
};

export function EntryPage({
  genre,
  selectedTune,
  selectedVariant,
  rhymeType,
  templateOptions,
  variantOptions,
  drafts,
  onGenreChange,
  onTuneChange,
  onVariantChange,
  onRhymeTypeChange,
  onStartDraft,
  onOpenDraft,
  onDeleteDraft,
  onExportDrafts,
  onImportDrafts,
  onOpenSettings,
}: EntryPageProps) {
  const [draftQuery, setDraftQuery] = useState('');
  const filteredDrafts = useMemo(() => {
    const keyword = draftQuery.trim().toLowerCase();
    if (!keyword) return drafts;
    return drafts.filter((draft) =>
      [draft.title, draft.author, draft.selectedTune, draft.selectedVariant]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [draftQuery, drafts]);

  return (
    <main className='mx-auto w-[min(1180px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
      <section className='mt-[18px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-[18px] max-[820px]:grid-cols-1'>
        <EntryEditorPanel
          genre={genre}
          selectedTune={selectedTune}
          selectedVariant={selectedVariant}
          rhymeType={rhymeType}
          templateOptions={templateOptions}
          variantOptions={variantOptions}
          onGenreChange={onGenreChange}
          onTuneChange={onTuneChange}
          onVariantChange={onVariantChange}
          onRhymeTypeChange={onRhymeTypeChange}
          onStartDraft={onStartDraft}
          onOpenSettings={onOpenSettings}
        />
        <DraftListPanel
          drafts={drafts}
          draftQuery={draftQuery}
          filteredDrafts={filteredDrafts}
          onDraftQueryChange={setDraftQuery}
          onOpenDraft={onOpenDraft}
          onDeleteDraft={onDeleteDraft}
          onExportDrafts={onExportDrafts}
          onImportDrafts={onImportDrafts}
        />
      </section>
    </main>
  );
}
