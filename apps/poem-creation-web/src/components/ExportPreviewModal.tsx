type ExportPreviewModalProps = {
  text: string;
  onCopy: () => void;
  onClose: () => void;
};

export function ExportPreviewModal({
  text,
  onCopy,
  onClose,
}: ExportPreviewModalProps) {
  return (
    <div
      className='fixed inset-0 z-40 grid place-items-center bg-[#201610]/35 px-4 py-8'
      role='dialog'
      aria-modal='true'
      aria-labelledby='export-preview-title'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className='max-h-[min(720px,calc(100vh-64px))] w-[min(760px,100%)] overflow-auto border border-[#8b6a4c] bg-[#fffaf0] p-5 shadow-[0_24px_60px_rgba(32,22,16,0.28)]'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <h3
            id='export-preview-title'
            className='m-0 text-[22px] font-bold text-[#4b3729]'
          >
            导出预览
          </h3>
          <div className='flex gap-2'>
            <button
              type='button'
              className='border border-[#8b6a4c] px-3 py-1.5 text-[14px] text-[#5b402f] transition hover:bg-[#efe1c6]'
              onClick={onCopy}
            >
              复制
            </button>
            <button
              type='button'
              className='border border-[#8b6a4c] px-3 py-1.5 text-[14px] text-[#5b402f] transition hover:bg-[#efe1c6]'
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
        <pre className='m-0 whitespace-pre-wrap break-words font-serif text-[18px] leading-9 text-[#2d2118]'>
          {text}
        </pre>
      </section>
    </div>
  );
}

