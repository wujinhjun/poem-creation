type EntryEditorPanelProps = {
  onOpenQuickFill: () => void;
  onOpenTemplateSelection: () => void;
};

export function EntryEditorPanel({
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
        <p>无需登录，内容只保存在本地浏览器。</p>
      </div>

      <div className='start-method-grid'>
        <article className='start-method is-active'>
          <span className='method-mark'>格</span>
          <h2>按格律起笔</h2>
          <p>先选诗词、格律与变体，再开始写。</p>
          <button
            type='button'
            className='ghost-button'
            onClick={onOpenTemplateSelection}
          >
            选择模板
          </button>
        </article>
        <article className='start-method'>
          <span className='method-mark'>识</span>
          <h2>快填识别</h2>
          <p>先把灵感写下来，稍后由 parser 匹配模板。</p>
          <button
            type='button'
            className='primary-button'
            onClick={onOpenQuickFill}
          >
            直接开写
          </button>
        </article>
      </div>
    </section>
  );
}
