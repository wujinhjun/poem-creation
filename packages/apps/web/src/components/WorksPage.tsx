import { useMemo, useState } from 'react';
import type { PoemCreationDraftSummary } from '../persist';
import { draftSearchText } from '../utils/draftDisplay';
import { DraftListPanel } from './entry/DraftListPanel';

type WorksPageProps = {
  drafts: PoemCreationDraftSummary[];
  persistenceMode: 'local' | 'supabase';
  onCreateDraft: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportDrafts: () => void;
  onImportDrafts: (file: File) => void;
};

export function WorksPage({
  drafts,
  persistenceMode,
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
      draftSearchText(draft).toLowerCase().includes(keyword),
    );
  }, [draftQuery, drafts]);
  const hasSearch = draftQuery.trim().length > 0;

  return (
    <main className='page page-works'>
      <section className='works-header'>
        <div>
          <p className='section-kicker'>作品</p>
          <h1>{persistenceMode === 'supabase' ? '云端作品' : '本地作品'}</h1>
          <p className='page-lede'>
            {persistenceMode === 'supabase'
              ? '草稿会自动同步到你的 Supabase 项目。这里用于继续编辑、导入导出和清理旧作。'
              : '草稿会自动保存，只保存在当前浏览器。这里用于继续编辑、导入导出和清理旧作。'}
          </p>
        </div>
        <button type='button' className='primary-button' onClick={onCreateDraft}>
          新建作品
        </button>
      </section>

      <section className='works-grid'>
        <div className='works-stat-line'>
          <div className='works-stat'>
            <span>{hasSearch ? filteredDrafts.length : drafts.length}</span>
            <small>
              {hasSearch
                ? `${drafts.length} 首中匹配 ${filteredDrafts.length} 首`
                : `共 ${drafts.length} 首`}
            </small>
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
