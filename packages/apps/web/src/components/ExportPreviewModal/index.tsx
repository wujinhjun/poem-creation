import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  DEFAULT_POEM_EXPORT_TEMPLATE_ID,
  DEFAULT_POEM_EXPORT_RATIO_ID,
  POEM_EXPORT_RATIOS,
  type PoemExportRatioId,
  type PoemExportTemplateId,
  type PoemLayoutDocument,
} from '@poem/layout-core';
import { createTextImageDataUrl, downloadImageDataUrl } from '../../utils/exportImage';
import { exportTemplateOptions, type UserExportTemplate } from '../../utils/exportTemplates';

type ExportPreviewModalProps = {
  layoutDocument: PoemLayoutDocument;
  userTemplates: UserExportTemplate[];
  onCopy: () => void;
  onClose: () => void;
};

export function ExportPreviewModal({
  layoutDocument,
  userTemplates,
  onCopy,
  onClose,
}: ExportPreviewModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [templateKey, setTemplateKey] = useState(DEFAULT_POEM_EXPORT_TEMPLATE_ID);
  const [ratioId, setRatioId] = useState<PoemExportRatioId>(
    DEFAULT_POEM_EXPORT_RATIO_ID,
  );
  const templateOptions = useMemo(
    () => exportTemplateOptions(userTemplates),
    [userTemplates],
  );
  const selectedTemplate = useMemo(
    () =>
      templateOptions.find((template) => template.id === templateKey) ??
      templateOptions.find((template) => template.id === DEFAULT_POEM_EXPORT_TEMPLATE_ID) ??
      templateOptions[0],
    [templateKey, templateOptions],
  );
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const templateInput =
          selectedTemplate.source === 'user'
            ? selectedTemplate.template
            : selectedTemplate.id as PoemExportTemplateId;
        setImageUrl(createTextImageDataUrl(layoutDocument, templateInput, ratioId));
        setImageError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setImageUrl('');
        setImageError(`图片预览生成失败：${message}`);
      }
    });
  }, [layoutDocument, ratioId, selectedTemplate]);

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
              onClick={() => downloadImageDataUrl(imageUrl, layoutDocument.title)}
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
        <div className='export-modal-body'>
          <div className='export-control-panel'>
            <div className='export-control-group'>
              <span className='export-control-label'>模板</span>
              <div className='export-segmented-control' aria-label='图片模板'>
                {templateOptions.map((template) => (
                  <button
                    key={template.id}
                    type='button'
                    className={`export-segmented-button${
                      template.id === selectedTemplate.id ? ' is-active' : ''
                    }`}
                    title={template.description}
                    aria-pressed={template.id === selectedTemplate.id}
                    onClick={() => setTemplateKey(template.id)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
            <div className='export-control-group'>
              <span className='export-control-label'>比例</span>
              <div className='export-segmented-control' aria-label='图片比例'>
                {POEM_EXPORT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    type='button'
                    className={`export-segmented-button${
                      ratio.id === ratioId ? ' is-active' : ''
                    }`}
                    aria-pressed={ratio.id === ratioId}
                    onClick={() => setRatioId(ratio.id)}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className='export-preview-panel'>
            {imageError && (
              <div className='export-modal-error'>{imageError}</div>
            )}
            {!imageUrl && !imageError && (
              <div className='export-modal-loading'>生成图片预览中...</div>
            )}
            {imageUrl && (
              <div className='export-modal-preview'>
                <div
                  role='img'
                  aria-label='导出图片预览'
                  className='export-modal-art'
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
