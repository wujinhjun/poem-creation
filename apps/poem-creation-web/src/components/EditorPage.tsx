import type { Tone, ToneConstraint, RhymeDictType } from '@poem/parser/kernel';
import type { RhymeDict } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import Composer from '../Composer';
import { ExportPreviewModal } from './ExportPreviewModal';
import { ComposerEmptyState } from './editor/ComposerEmptyState';
import { EditorSidebar } from './editor/EditorSidebar';
import { WorkMetadataFields } from './editor/WorkMetadataFields';

type EditorPageProps = {
  activeDraftId: string;
  draftRevision: number;
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  selectedVariantLabel: string;
  rhymeType: RhymeDictType;
  title: string;
  description: string;
  author: string;
  chars: string[][];
  dict: RhymeDict | null;
  pattern: ToneConstraint[][];
  expectedRhymeTone: Tone | null;
  visualLineGroups: number[][];
  sectionBreakBeforeGroups: number[];
  analyzeResult: string;
  errorMessage: string;
  exportStatus: string;
  exportPreviewText: string;
  exportPreviewOpen: boolean;
  persistReady: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onCharsChange: (chars: string[][]) => void;
  onAnalyze: (chars?: string[][]) => void;
  onOpenExportPreview: () => void;
  onCloseExportPreview: () => void;
  onCopyExportText: () => void;
  onReturn: () => void;
};

export function EditorPage({
  activeDraftId,
  draftRevision,
  genre,
  selectedTune,
  selectedVariant,
  selectedVariantLabel,
  rhymeType,
  title,
  description,
  author,
  chars,
  dict,
  pattern,
  expectedRhymeTone,
  visualLineGroups,
  sectionBreakBeforeGroups,
  analyzeResult,
  errorMessage,
  exportStatus,
  exportPreviewText,
  exportPreviewOpen,
  persistReady,
  onTitleChange,
  onDescriptionChange,
  onAuthorChange,
  onCharsChange,
  onAnalyze,
  onOpenExportPreview,
  onCloseExportPreview,
  onCopyExportText,
  onReturn,
}: EditorPageProps) {
  return (
    <main className='mx-auto w-[min(1180px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
      <section className='mt-[18px] grid grid-cols-[300px_minmax(0,1fr)] items-start gap-[18px] max-[820px]:grid-cols-1'>
        <EditorSidebar
          genre={genre}
          selectedTune={selectedTune}
          selectedVariant={selectedVariant}
          selectedVariantLabel={selectedVariantLabel}
          rhymeType={rhymeType}
          exportStatus={exportStatus}
          onOpenExportPreview={onOpenExportPreview}
          onCopyExportText={onCopyExportText}
          onReturn={onReturn}
        />

        <section className='min-h-[430px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-6 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:overflow-x-auto max-[820px]:px-3.5 max-[820px]:py-[18px]'>
          <WorkMetadataFields
            title={title}
            description={description}
            author={author}
            onTitleChange={onTitleChange}
            onDescriptionChange={onDescriptionChange}
            onAuthorChange={onAuthorChange}
          />

          {errorMessage && (
            <p className='border border-[#a43c2f] bg-[#f6e2dc] px-3 py-2 text-[14px] text-[#7d2e25]'>
              {errorMessage}
            </p>
          )}

          {!dict && !errorMessage && <p className='loading-text'>加载韵书中...</p>}

          {genre === 'ci' && selectedVariant && pattern.length === 0 && (
            <p className='loading-text'>加载词牌格律中...</p>
          )}

          {pattern.length === 0 && <ComposerEmptyState onReturn={onReturn} />}

          {pattern.length > 0 && dict && persistReady && (
            <>
              <Composer
                key={`${activeDraftId}:${selectedVariant}:${draftRevision}`}
                pattern={pattern}
                dict={dict}
                expectedRhymeTone={expectedRhymeTone}
                visualLineGroups={visualLineGroups}
                sectionBreakBeforeGroups={sectionBreakBeforeGroups}
                initialChars={chars}
                onChange={onCharsChange}
                onComplete={onAnalyze}
              />
              <div className='analysis-bar'>
                <button className='primary-button' onClick={() => onAnalyze()}>
                  分析
                </button>
                {analyzeResult && (
                  <pre className='analysis-result m-0 whitespace-pre-wrap font-serif text-[14px] leading-7'>
                    {analyzeResult}
                  </pre>
                )}
              </div>
            </>
          )}
          {exportPreviewOpen && (
            <ExportPreviewModal
              text={exportPreviewText}
              onCopy={onCopyExportText}
              onClose={onCloseExportPreview}
            />
          )}
        </section>
      </section>
    </main>
  );
}
