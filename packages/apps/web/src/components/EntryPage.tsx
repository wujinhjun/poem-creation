import type { PoemCreationDraftSummary } from '../persist';
import {
  draftAuthorLabel,
  draftDisplayTitle,
  draftGenreLabel,
} from '../utils/draftDisplay';
import { EntryEditorPanel } from './entry/EntryEditorPanel';

type EntryPageProps = {
  drafts: PoemCreationDraftSummary[];
  persistenceMode: 'local' | 'supabase';
  onOpenQuickFill: () => void;
  onOpenTemplateSelection: () => void;
  onOpenWorks: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
};

export function EntryPage({
  drafts,
  persistenceMode,
  onOpenQuickFill,
  onOpenTemplateSelection,
  onOpenWorks,
  onOpenDraft,
}: EntryPageProps) {
  const recentDrafts = drafts.slice(0, 2);

  return (
    <main className='page page-entry home-stage'>
      <section className='home-primary'>
        <EntryEditorPanel
          persistenceMode={persistenceMode}
          onOpenQuickFill={onOpenQuickFill}
          onOpenTemplateSelection={onOpenTemplateSelection}
        />
      </section>
      <aside className='home-aside'>
        <section className='panel home-card recent-card'>
          <div className='panel-heading'>
            <h2>继续最近草稿</h2>
            <button type='button' className='text-link' onClick={onOpenWorks}>
              查看全部
            </button>
          </div>
          <div className='recent-list'>
            {recentDrafts.length === 0 && (
              <p className='empty-copy'>还没有作品，按起笔卡片开始。</p>
            )}
            {recentDrafts.map((draft) => (
              <div key={draft.id} className='recent-row'>
                <button type='button' onClick={() => onOpenDraft(draft.id)}>
                  <strong>{draftDisplayTitle(draft)}</strong>
                  <span>{draftAuthorLabel(draft)}</span>
                  <span>体裁：{draftGenreLabel(draft)}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
