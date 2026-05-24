import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frameId = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      cancelAnimationFrame(frameId);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.offsetParent !== null);

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (
      event.shiftKey &&
      (document.activeElement === firstElement || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      className='export-modal-backdrop'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className='export-modal-panel'
        role='dialog'
        aria-modal='true'
        aria-labelledby='export-preview-title'
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className='export-modal-header'>
          <h3 id='export-preview-title' className='export-modal-title'>
            导出预览
          </h3>
          <div className='export-modal-actions'>
            <button
              type='button'
              className='export-modal-button'
              onClick={onCopy}
            >
              复制文字
            </button>
            <button
              type='button'
              className='export-modal-button'
              disabled={!imageUrl}
              onClick={() => downloadImageDataUrl(imageUrl)}
            >
              下载图片
            </button>
            <button
              type='button'
              className='export-modal-button'
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
        {imageError && (
          <div className='export-modal-error'>{imageError}</div>
        )}
        {!imageUrl && !imageError && (
          <div className='export-modal-loading'>生成图片预览中...</div>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt='导出图片预览'
            className='export-modal-image'
          />
        )}
      </section>
    </div>
  );
}
