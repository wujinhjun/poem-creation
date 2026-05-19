import { useMemo, useState } from 'react';
import type { PoemCreationDraftSummary } from '../persist';
import { DraftListPanel } from './entry/DraftListPanel';

type WorksPageProps = {
  drafts: PoemCreationDraftSummary[];
  onCreateDraft: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportDrafts: () => void;
  onImportDrafts: (file: File) => void;
};

export function WorksPage({
  drafts,
  onCreateDraft,
  onOpenDraft,
  onDeleteDraft,
  onExportDrafts,
  onImportDrafts,
}: WorksPageProps) {
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
    <main className='page page-works'>
      <section className='works-header'>
        <div>
          <p className='section-kicker'>作品</p>
          <h1>本地作品</h1>
          <p className='page-lede'>
            草稿会自动保存，只保存在当前浏览器。这里用于继续编辑、导入导出和清理旧作。
          </p>
        </div>
        <button type='button' className='primary-button' onClick={onCreateDraft}>
          新建作品
        </button>
      </section>

      <section className='works-grid'>
        <div className='works-stat-line'>
          <div className='works-stat'>
            <span>{drafts.length}</span>
            <small>本地草稿</small>
          </div>
          <div className='works-stat'>
            <span>{filteredDrafts.length}</span>
            <small>当前结果</small>
          </div>
        </div>
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
