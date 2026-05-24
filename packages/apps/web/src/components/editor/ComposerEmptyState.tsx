export function ComposerEmptyState({ onReturn }: { onReturn: () => void }) {
  return (
    <div className='empty-state'>
      <div className='grid justify-items-center gap-3 text-center'>
        <span>当前作品缺少可用格律。</span>
        <button
          type='button'
          className='empty-state-action'
          onClick={onReturn}
        >
          返回入口重新选择
        </button>
      </div>
    </div>
  );
}
