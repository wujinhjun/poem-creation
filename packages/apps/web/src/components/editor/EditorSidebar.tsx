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
    <aside className='panel editor-aside'>
      <div className='panel-heading'>
        <div>
          <p className='section-kicker'>旁注</p>
          <h2>轻提示</h2>
        </div>
        <button
          type='button'
          className='ghost-button'
          onClick={onReturn}
        >
          返回
        </button>
      </div>
      <div className='aside-section'>
        <div className='button-stack'>
          <button
            type='button'
            className='ghost-button'
            onClick={onOpenExportPreview}
          >
            导出预览
          </button>
          <button
            type='button'
            className='ghost-button'
            onClick={onCopyExportText}
          >
            复制文字
          </button>
          <button
            type='button'
            className='ghost-button'
            onClick={onOpenExportPreview}
          >
            导出图片
          </button>
        </div>
        {exportStatus && (
          <div className='notice-inline'>{exportStatus}</div>
        )}
        <div className='selection-summary'>
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

      <div className='legend-strip'>
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
