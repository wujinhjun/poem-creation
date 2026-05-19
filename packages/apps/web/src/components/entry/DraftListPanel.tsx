import { useRef } from 'react';
import type { PoemCreationDraftSummary } from '../../persist';
import { formatDraftTime } from '../../utils/draft';

type DraftListPanelProps = {
  drafts: PoemCreationDraftSummary[];
  draftQuery: string;
  filteredDrafts: PoemCreationDraftSummary[];
  onDraftQueryChange: (value: string) => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportDrafts: () => void;
  onImportDrafts: (file: File) => void;
};

export function DraftListPanel({
  drafts,
  draftQuery,
  filteredDrafts,
  onDraftQueryChange,
  onOpenDraft,
  onDeleteDraft,
  onExportDrafts,
  onImportDrafts,
}: DraftListPanelProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className='panel draft-list-panel'>
      <div className='panel-heading'>
        <div>
          <p className='section-kicker'>本地</p>
          <h2>最近作品</h2>
        </div>
        <div className='panel-actions'>
          <button
            type='button'
            className='ghost-button'
            onClick={onExportDrafts}
          >
            导出
          </button>
          <button
            type='button'
            className='ghost-button'
            onClick={() => importInputRef.current?.click()}
          >
            导入
          </button>
          <input
            ref={importInputRef}
            className='hidden'
            type='file'
            accept='application/json,.json'
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) onImportDrafts(file);
            }}
          />
        </div>
      </div>
      <input
        value={draftQuery}
        placeholder='搜索标题、署名或模板'
        className='line-input'
        onChange={(event) => onDraftQueryChange(event.currentTarget.value)}
      />
      <div className='draft-list-scroll'>
        {drafts.length === 0 && (
          <div className='empty-copy'>
            暂无旧作
          </div>
        )}
        {drafts.length > 0 && filteredDrafts.length === 0 && (
          <div className='empty-copy'>
            无匹配作品
          </div>
        )}
        {filteredDrafts.map((draft) => (
          <div
            key={draft.id}
            className='draft-row'
          >
            <button
              type='button'
              className='draft-open-button'
              onClick={() => onOpenDraft(draft.id)}
            >
              <span className='draft-title'>
                {draft.title || '未题'}
              </span>
              <span className='draft-meta'>
                {draft.author || '佚名'} · {draft.selectedTune || '未选模板'}
              </span>
              <span className='draft-time'>
                {formatDraftTime(draft.updatedAt)}
              </span>
            </button>
            <button
              type='button'
              className='danger-button'
              onClick={() => onDeleteDraft(draft.id)}
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
