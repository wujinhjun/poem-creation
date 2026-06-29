import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { PoemCreationDraftSummary } from '../../persist';
import { formatDraftTime } from '../../utils/draft';
import {
  draftAuthorLabel,
  draftDisplayTitle,
  draftGenreLabel,
} from '../../utils/draftDisplay';

type DraftListPanelProps = {
  drafts: PoemCreationDraftSummary[];
  draftQuery: string;
  filteredDrafts: PoemCreationDraftSummary[];
  onDraftQueryChange: (value: string) => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onExportDrafts: () => void;
  onImportDrafts: (file: File) => void;
  onCreateDraft: () => void;
  onOpenQuickFill: () => void;
};

export function DraftListPanel({
  drafts,
  draftQuery,
  filteredDrafts,
  onDraftQueryChange,
  onOpenDraft,
  onDeleteDraft,
  onExportDrafts,
  onImportDrafts,
  onCreateDraft,
  onOpenQuickFill,
}: DraftListPanelProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const swipeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [swipedDraftId, setSwipedDraftId] = useState<string | null>(null);

  const beginSwipe = (draftId: string, event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    swipeRef.current = {
      id: draftId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const updateSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe) return;

    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      swipeRef.current = null;
      return;
    }

    if (deltaX < -48) {
      setSwipedDraftId(swipe.id);
      swipeRef.current = null;
    } else if (deltaX > 36 && swipedDraftId === swipe.id) {
      setSwipedDraftId(null);
      swipeRef.current = null;
    }
  };

  const endSwipe = () => {
    swipeRef.current = null;
  };

  return (
    <section className='panel draft-list-panel'>
      <div className='panel-heading'>
        <div>
          <p className='section-kicker'>作品</p>
          <h2>最近作品</h2>
        </div>
        <div className='panel-actions'>
          <button
            type='button'
            className='ghost-button'
            onClick={onExportDrafts}
          >
            导出
          </button>
          <button
            type='button'
            className='ghost-button'
            onClick={() => importInputRef.current?.click()}
          >
            导入
          </button>
          <input
            ref={importInputRef}
            className='hidden'
            type='file'
            accept='application/json,.json'
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) onImportDrafts(file);
            }}
          />
        </div>
      </div>
      <input
        value={draftQuery}
        placeholder='搜索标题、署名或体裁'
        className='line-input'
        onChange={(event) => onDraftQueryChange(event.currentTarget.value)}
      />
      <div className='draft-list-scroll'>
        {drafts.length === 0 && (
          <div className='draft-empty-state'>
            <p>还没有作品。</p>
            <div className='draft-empty-actions'>
              <button
                type='button'
                className='primary-button'
                onClick={onCreateDraft}
              >
                按格律起笔
              </button>
              <button
                type='button'
                className='ghost-button'
                onClick={onOpenQuickFill}
              >
                进入快填
              </button>
            </div>
          </div>
        )}
        {drafts.length > 0 && filteredDrafts.length === 0 && (
          <div className='empty-copy'>
            无匹配作品
          </div>
        )}
        {filteredDrafts.map((draft) => (
          <div
            key={draft.id}
            className={`draft-swipe-row${swipedDraftId === draft.id ? ' is-swiped' : ''}`}
            onPointerDown={(event) => beginSwipe(draft.id, event)}
            onPointerMove={updateSwipe}
            onPointerCancel={endSwipe}
            onPointerUp={endSwipe}
          >
            <button
              type='button'
              className='draft-swipe-delete'
              onClick={() => onDeleteDraft(draft.id)}
            >
              删除
            </button>
            <div className='draft-row'>
              <button
                type='button'
                className='draft-open-button'
                onClick={() => {
                  if (swipedDraftId === draft.id) {
                    setSwipedDraftId(null);
                    return;
                  }
                  onOpenDraft(draft.id);
                }}
              >
                <span className='draft-title'>
                  {draftDisplayTitle(draft)}
                </span>
                <span className='draft-meta'>
                  {draftAuthorLabel(draft)}
                </span>
                <span className='draft-template'>
                  体裁：{draftGenreLabel(draft)}
                </span>
                <span className='draft-time'>
                  {formatDraftTime(draft.updatedAt)}
                </span>
              </button>
              <button
                type='button'
                className='danger-button'
                onClick={() => onDeleteDraft(draft.id)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
