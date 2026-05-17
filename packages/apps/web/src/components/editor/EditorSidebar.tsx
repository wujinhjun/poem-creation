import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../../constants/poem';
import { RHYME_OPTIONS } from '../../constants/poem';
import { WordLookupPanel } from './WordLookupPanel';

type EditorSidebarProps = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  selectedVariantLabel: string;
  rhymeType: RhymeDictType;
  exportStatus: string;
  onOpenExportPreview: () => void;
  onCopyExportText: () => void;
  onReturn: () => void;
};

export function EditorSidebar({
  genre,
  selectedTune,
  selectedVariant,
  selectedVariantLabel,
  rhymeType,
  exportStatus,
  onOpenExportPreview,
  onCopyExportText,
  onReturn,
}: EditorSidebarProps) {
  return (
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
            className='border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
            onClick={onOpenExportPreview}
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
      <WordLookupPanel />
    </aside>
  );
}
