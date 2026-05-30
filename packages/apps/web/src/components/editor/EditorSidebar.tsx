import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../../constants/poem';
import { RHYME_OPTIONS } from '../../constants/poem';

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

type EditorInfoContentProps = Omit<EditorSidebarProps, 'onReturn'>;

export function EditorInfoContent({
  genre,
  selectedTune,
  selectedVariant,
  selectedVariantLabel,
  rhymeType,
  exportStatus,
  onOpenExportPreview,
  onCopyExportText,
}: EditorInfoContentProps) {
  return (
    <>
      <div className='aside-section'>
        <h3>导出</h3>
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
        </div>
        {exportStatus && (
          <div className='notice-inline'>{exportStatus}</div>
        )}
        <div className='selection-summary'>
          <h3>模板</h3>
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
          <i className='legend-swatch legend-swatch-pass' />合
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <i className='legend-swatch legend-swatch-fail' />误
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <i className='legend-swatch legend-swatch-empty' />
          待填
        </span>
      </div>
    </>
  );
}

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
          <p className='section-kicker'>工具</p>
          <h2>作品信息</h2>
        </div>
        <button
          type='button'
          className='ghost-button'
          onClick={onReturn}
        >
          返回
        </button>
      </div>
      <EditorInfoContent
        genre={genre}
        selectedTune={selectedTune}
        selectedVariant={selectedVariant}
        selectedVariantLabel={selectedVariantLabel}
        rhymeType={rhymeType}
        exportStatus={exportStatus}
        onOpenExportPreview={onOpenExportPreview}
        onCopyExportText={onCopyExportText}
      />
    </aside>
  );
}
