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
    <main className='page page-editor'>
      <section className='editor-layout'>
        <section className='editor-sheet'>
          <div className='editor-mode-tabs' aria-label='编辑模式'>
            <button type='button'>入门</button>
            <button type='button' className='is-active'>创作</button>
            <button type='button'>考据</button>
          </div>
          <WorkMetadataFields
            title={title}
            description={description}
            author={author}
            onTitleChange={onTitleChange}
            onDescriptionChange={onDescriptionChange}
            onAuthorChange={onAuthorChange}
          />

          {errorMessage && (
            <p className='notice-inline is-error'>
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
                  校验格律
                </button>
                {analyzeResult && (
                  <pre className='analysis-result'>
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
      </section>
    </main>
  );
}
