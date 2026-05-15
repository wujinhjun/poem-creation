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
    <section className='grid h-[500px] grid-rows-[auto_auto_minmax(0,1fr)] gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:h-[460px]'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>作品</h2>
        <div className='flex gap-2'>
          <button
            type='button'
            className='border border-[#8b6a4c] px-2.5 py-1.5 text-[13px] text-[#5b402f] transition hover:bg-[#efe1c6]'
            onClick={onExportDrafts}
          >
            导出
          </button>
          <button
            type='button'
            className='border border-[#8b6a4c] px-2.5 py-1.5 text-[13px] text-[#5b402f] transition hover:bg-[#efe1c6]'
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
        className='h-11 w-full border border-[#9b7a5d] bg-[#fff9ea] px-3 text-[16px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
        onChange={(event) => onDraftQueryChange(event.currentTarget.value)}
      />
      <div className='grid min-h-0 content-start gap-2 overflow-auto border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-2'>
        {drafts.length === 0 && (
          <div className='px-2 py-3 text-[14px] text-[#806851]'>
            暂无旧作
          </div>
        )}
        {drafts.length > 0 && filteredDrafts.length === 0 && (
          <div className='px-2 py-3 text-[14px] text-[#806851]'>
            无匹配作品
          </div>
        )}
        {filteredDrafts.map((draft) => (
          <div
            key={draft.id}
            className='grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#c8ad8a] px-3 py-2 transition hover:bg-[#efe1c6]'
          >
            <button
              type='button'
              className='grid min-w-0 gap-1 text-left'
              onClick={() => onOpenDraft(draft.id)}
            >
              <span className='truncate text-[16px] font-bold text-[#2d2118]'>
                {draft.title || '未题'}
              </span>
              <span className='truncate text-[13px] text-[#806851]'>
                {draft.author || '佚名'} · {draft.selectedTune || '未选模板'}
              </span>
              <span className='text-[12px] text-[#9a8066]'>
                {formatDraftTime(draft.updatedAt)}
              </span>
            </button>
            <button
              type='button'
              className='self-start border border-[#a43c2f] px-2 py-1 text-[12px] text-[#8b2d24] transition hover:bg-[#f6e2dc]'
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
