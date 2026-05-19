import type { Genre } from '../constants/poem';
import type { PoemCreationDraftSummary } from '../persist';
import { EntryEditorPanel } from './entry/EntryEditorPanel';

type EntryPageProps = {
  drafts: PoemCreationDraftSummary[];
  onStartWithTemplate: (genre: Genre, tuneName: string) => void;
  onOpenTemplateSelection: () => void;
  onOpenQuickFill: () => void;
  onOpenWorks: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
};

export function EntryPage({
  drafts,
  onStartWithTemplate,
  onOpenTemplateSelection,
  onOpenQuickFill,
  onOpenWorks,
  onOpenDraft,
}: EntryPageProps) {
  const recentDrafts = drafts.slice(0, 2);
  const quickTemplates = [
    { genre: 'meter' as const, tune: '五绝', title: '五言绝句', meta: '五言四句' },
    { genre: 'meter' as const, tune: '七律', title: '七言律诗', meta: '七言八句' },
    { genre: 'ci' as const, tune: '如梦令', title: '如梦令', meta: '词 · 双调' },
  ];

  return (
    <main className='page page-entry home-stage'>
      <section className='home-primary'>
        <EntryEditorPanel
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
              <p className='empty-copy'>暂无旧作，先从左侧新建一首。</p>
            )}
            {recentDrafts.map((draft) => (
              <div key={draft.id} className='recent-row'>
                <button type='button' onClick={() => onOpenDraft(draft.id)}>
                  <strong>{draft.title || '未题'}</strong>
                  <span>{draft.selectedTune || '未选模板'} · {draft.author || '佚名'}</span>
                </button>
                <button type='button' className='ghost-button' onClick={() => onOpenDraft(draft.id)}>
                  继续编辑
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className='panel home-card quick-card'>
          <h2>快速新建</h2>
          <div className='quick-template-grid'>
            {quickTemplates.map((item) => (
              <button
                key={`${item.genre}-${item.tune}`}
                type='button'
                className='quick-template'
                onClick={() => onStartWithTemplate(item.genre, item.tune)}
              >
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </button>
            ))}
            <button type='button' className='quick-template' onClick={onOpenTemplateSelection}>
              <strong>更多体裁</strong>
              <span>进入选择</span>
            </button>
          </div>
          <p className='hint-line'>新建后可随时在编辑器里切换体裁与韵书。</p>
        </section>
      </aside>
    </main>
  );
}
