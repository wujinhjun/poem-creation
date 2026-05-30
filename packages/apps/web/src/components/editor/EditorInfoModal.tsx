import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../../constants/poem';
import { EditorInfoContent } from './EditorSidebar';

type EditorInfoModalProps = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  selectedVariantLabel: string;
  rhymeType: RhymeDictType;
  exportStatus: string;
  onOpenExportPreview: () => void;
  onCopyExportText: () => void;
  onClose: () => void;
};

export function EditorInfoModal({
  genre,
  selectedTune,
  selectedVariant,
  selectedVariantLabel,
  rhymeType,
  exportStatus,
  onOpenExportPreview,
  onCopyExportText,
  onClose,
}: EditorInfoModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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
      className='export-modal-backdrop editor-info-modal-backdrop'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className='export-modal-panel editor-info-modal-panel'
        role='dialog'
        aria-modal='true'
        aria-labelledby='editor-info-title'
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className='export-modal-header'>
          <div>
            <p className='section-kicker'>工具</p>
            <h3 id='editor-info-title' className='export-modal-title'>
              作品信息
            </h3>
          </div>
          <button
            type='button'
            className='export-modal-button'
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <EditorInfoContent
          genre={genre}
          selectedTune={selectedTune}
          selectedVariant={selectedVariant}
          selectedVariantLabel={selectedVariantLabel}
          rhymeType={rhymeType}
          exportStatus={exportStatus}
          onOpenExportPreview={onOpenExportPreview}
          onCopyExportText={onCopyExportText}
        />
      </section>
    </div>
  );
}
