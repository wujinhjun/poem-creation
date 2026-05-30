import { useState } from 'react';
import type { Tone, ToneConstraint, RhymeDictType } from '@poem/parser/kernel';
import type { RhymeDict } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import type { StrictCharIssue } from '../utils/strictGridValidation';
import Composer from '../Composer';
import { ExportPreviewModal } from './ExportPreviewModal';
import { ComposerEmptyState } from './editor/ComposerEmptyState';
import { EditorInfoModal } from './editor/EditorInfoModal';
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
  analysisIssues: StrictCharIssue[];
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
  analysisIssues,
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
  const [liveFailCount, setLiveFailCount] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{
    lineIndex: number;
    col: number;
    requestId: number;
  } | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const issueCount = analysisIssues.length;
  const needsAttentionCount = issueCount > 0 ? issueCount : liveFailCount;
  const openExportFromInfo = () => {
    setInfoModalOpen(false);
    onOpenExportPreview();
  };

  return (
    <main className='page page-editor'>
      <section className='editor-layout'>
        <section className='editor-sheet'>
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
                key={`${activeDraftId}:${selectedVariant}:${draftRevision}:${focusTarget?.requestId ?? 0}`}
                pattern={pattern}
                dict={dict}
                expectedRhymeTone={expectedRhymeTone}
                visualLineGroups={visualLineGroups}
                sectionBreakBeforeGroups={sectionBreakBeforeGroups}
                initialChars={chars}
                onChange={onCharsChange}
                onComplete={onAnalyze}
                onFailCountChange={setLiveFailCount}
                focusTarget={focusTarget}
              />
              <div className='analysis-bar'>
                <button className='primary-button' onClick={() => onAnalyze()}>
                  校验格律
                  {needsAttentionCount > 0 && (
                    <span className='button-count'>
                      {needsAttentionCount} 处需斟酌
                    </span>
                  )}
                </button>
                {analyzeResult && (
                  <div className='analysis-result'>
                    <pre className='analysis-result-text'>{analyzeResult}</pre>
                    {analysisIssues.length > 0 && (
                      <div className='analysis-issue-list'>
                        {analysisIssues.map((issue) => (
                          <button
                            key={`${issue.lineIndex}-${issue.col}-${issue.char}-${issue.reason}`}
                            type='button'
                            className='analysis-issue'
                            onClick={() =>
                              setFocusTarget((current) => ({
                                lineIndex: issue.lineIndex,
                                col: issue.col,
                                requestId: (current?.requestId ?? 0) + 1,
                              }))
                            }
                          >
                            第 {issue.lineIndex + 1} 句第 {issue.col + 1} 字：
                            {issue.char}，应{issue.expected}，实{issue.actual}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
        <div className='editor-mobile-actions' aria-label='移动端编辑操作'>
          <button type='button' className='primary-button' onClick={() => onAnalyze()}>
            校验
          </button>
          <button type='button' className='ghost-button' onClick={onOpenExportPreview}>
            导出
          </button>
          <button type='button' className='ghost-button' onClick={() => setInfoModalOpen(true)}>
            信息
          </button>
          <button type='button' className='ghost-button' onClick={onReturn}>
            返回
          </button>
        </div>
        <EditorSidebar
          genre={genre}
          selectedTune={selectedTune}
          selectedVariant={selectedVariant}
          selectedVariantLabel={selectedVariantLabel}
          rhymeType={rhymeType}
          exportStatus={exportStatus}
          onOpenExportPreview={onOpenExportPreview}
          onCopyExportText={onCopyExportText}
        />
        {infoModalOpen && (
          <EditorInfoModal
            genre={genre}
            selectedTune={selectedTune}
            selectedVariant={selectedVariant}
            selectedVariantLabel={selectedVariantLabel}
            rhymeType={rhymeType}
            exportStatus={exportStatus}
            onOpenExportPreview={openExportFromInfo}
            onCopyExportText={onCopyExportText}
            onClose={() => setInfoModalOpen(false)}
          />
        )}
      </section>
    </main>
  );
}
