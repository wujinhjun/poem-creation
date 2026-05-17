import { useEffect, useState } from 'react';
import { createTextImageDataUrl, downloadImageDataUrl } from '../utils/exportText';

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
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        setImageUrl(createTextImageDataUrl(text));
        setImageError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setImageUrl('');
        setImageError(`图片预览生成失败：${message}`);
      }
    });
  }, [text]);

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
      <section className='max-h-[min(820px,calc(100vh-64px))] w-[min(900px,100%)] overflow-auto border border-[#8b6a4c] bg-[#fffaf0] p-5 shadow-[0_24px_60px_rgba(32,22,16,0.28)]'>
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
              复制文字
            </button>
            <button
              type='button'
              className='border border-[#8b6a4c] px-3 py-1.5 text-[14px] text-[#5b402f] transition hover:bg-[#efe1c6] disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!imageUrl}
              onClick={() => downloadImageDataUrl(imageUrl)}
            >
              下载图片
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
        {imageError && (
          <div className='border border-[#a43c2f] bg-[#f6e2dc] px-3 py-2 text-[14px] text-[#7d2e25]'>
            {imageError}
          </div>
        )}
        {!imageUrl && !imageError && (
          <div className='grid min-h-80 place-items-center text-[15px] text-[#806851]'>
            生成图片预览中...
          </div>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt='导出图片预览'
            className='mx-auto block h-auto max-w-full bg-[#fff7e6]'
          />
        )}
      </section>
    </div>
  );
}
