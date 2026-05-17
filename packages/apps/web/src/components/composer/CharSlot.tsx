import type { ClipboardEvent, KeyboardEvent } from 'react';
import type { ToneConstraint } from '@poem/parser/kernel';
import type { SlotEvaluation } from './types';

export function CharSlot({
  constraint,
  value,
  evaluation,
  active,
  draft,
  inputRef,
  onDraftChange,
  onCompositionStart,
  onCompositionEnd,
  onKeyDown,
  onPaste,
  onSelect,
}: {
  constraint: ToneConstraint;
  value: string;
  evaluation: SlotEvaluation;
  active: boolean;
  draft: string;
  inputRef: (input: HTMLInputElement | null) => void;
  onDraftChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onSelect: () => void;
}) {
  return (
    <span className='char-slot'>
      <span className={`slot-label slot-label-${constraint.type}`}>
        {evaluation.label}
      </span>
      <button
        type='button'
        aria-label={evaluation.title}
        className={`char-input status-${evaluation.status}${active ? ' is-active' : ''}`}
        title={evaluation.title}
        onClick={onSelect}
      >
        {value}
      </button>
      {active && (
        <input
          ref={inputRef}
          className={`active-cell-editor${value ? ' after-char' : ''}`}
          value={draft}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={(event) =>
            onCompositionEnd(event.currentTarget.value)
          }
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
    </span>
  );
}
