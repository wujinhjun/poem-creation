type EntryEditorPanelProps = {
  persistenceMode: 'local' | 'supabase';
  onOpenQuickFill: () => void;
  onOpenTemplateSelection: () => void;
};

export function EntryEditorPanel({
  persistenceMode,
  onOpenQuickFill,
  onOpenTemplateSelection,
}: EntryEditorPanelProps) {
  return (
    <section className='entry-compose-panel home-compose'>
      <div className='home-copy'>
        <h1>起笔，写下心中之诗</h1>
        <div className='home-divider' aria-hidden='true'>
          <span />
          <i>诗</i>
          <span />
        </div>
        <p>
          {persistenceMode === 'supabase'
            ? '已开启云端保存，作品会自动同步。'
            : '无需登录，作品会保存在这台设备上。'}
        </p>
      </div>

      <div className='start-method-grid'>
        <article className='start-method start-method-template'>
          <div className='start-method-copy'>
            <span className='method-mark'>格</span>
            <h2>按格律起笔</h2>
            <p>先选诗词、格律与变体，再开始写。</p>
          </div>
          <div className='start-method-action'>
            <button
              type='button'
              className='primary-button'
              onClick={onOpenTemplateSelection}
            >
              选择模板
            </button>
          </div>
        </article>
        <article className='start-method start-method-quick'>
          <div className='start-method-copy'>
            <span className='method-mark'>识</span>
            <h2>快填识别</h2>
            <p>先把灵感写下来，再自动识别适合的体式。</p>
          </div>
          <div className='start-method-action'>
            <button
              type='button'
              className='ghost-button'
              onClick={onOpenQuickFill}
            >
              进入快填
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
