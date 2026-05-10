import type { Tone, ToneConstraint, RhymeDictType } from '@poem/parser/kernel';
import type { RhymeDict } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import { RHYME_OPTIONS } from '../constants/poem';
import Composer from '../Composer';
import { ExportPreviewModal } from './ExportPreviewModal';

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
        <aside className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
          <div className='grid gap-3'>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className='border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
                onClick={onReturn}
              >
                返回
              </button>
              <button
                type='button'
                className='border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
                onClick={onOpenExportPreview}
              >
                导出预览
              </button>
              <button
                type='button'
                className='border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
                onClick={onCopyExportText}
              >
                复制文字
              </button>
              <button
                type='button'
                className='cursor-not-allowed border border-[#b8a287] px-4 py-2 text-[15px] text-[#a18b70] opacity-60'
                disabled
              >
                导出图片
              </button>
            </div>
            {exportStatus && (
              <div className='text-[13px] text-[#806851]'>{exportStatus}</div>
            )}
            <div className='border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-3 text-[14px] leading-7 text-[#806851]'>
              <div>体裁：{genre === 'meter' ? '诗' : '词'}</div>
              <div>模板：{selectedTune || '未选模板'}</div>
              <div>
                变体：{selectedVariantLabel || selectedVariant || '未选变体'}
              </div>
              <div>
                韵书：
                {RHYME_OPTIONS.find((option) => option.value === rhymeType)
                  ?.label ?? rhymeType}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap gap-4 text-[13px] text-[#725c47]'>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#4d7a35] bg-[#e8f1df]' />合
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#a43c2f] bg-[#f6e2dc]' />误
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#9b7a5d] bg-[#fffaf0]' />
              待填
            </span>
          </div>
        </aside>

        <section className='min-h-[430px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-6 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:overflow-x-auto max-[820px]:px-3.5 max-[820px]:py-[18px]'>
          <div className='mx-auto mb-8 grid max-w-[760px] gap-3 border-b border-[#8b6a4c]/20 pb-6 text-center'>
            <input
              value={title}
              placeholder='未题'
              className='w-full border-0 bg-transparent px-2 text-center font-serif text-[30px] font-bold leading-tight text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:bg-[#fff9ea]/60'
              onChange={(event) => onTitleChange(event.currentTarget.value)}
            />
            <input
              value={description}
              placeholder='题记、说明或备注'
              className='w-full border-0 bg-transparent px-2 text-center text-[15px] leading-7 text-[#806851] outline-none placeholder:text-[#a78d73] focus:bg-[#fff9ea]/60'
              onChange={(event) =>
                onDescriptionChange(event.currentTarget.value)
              }
            />
            <input
              value={author}
              placeholder='佚名'
              className='ml-auto w-[min(240px,100%)] border-0 bg-transparent px-2 text-right text-[16px] text-[#5e4735] outline-none placeholder:text-[#a78d73] focus:bg-[#fff9ea]/60'
              onChange={(event) => onAuthorChange(event.currentTarget.value)}
            />
          </div>

          {!dict && <p className='loading-text'>加载韵书中...</p>}

          {genre === 'ci' && selectedVariant && pattern.length === 0 && (
            <p className='loading-text'>加载词牌格律中...</p>
          )}

          {pattern.length === 0 && (
            <div className='empty-state'>择一格律，即可开始填字。</div>
          )}

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
                  <span className='analysis-result'>{analyzeResult}</span>
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
