import type { ClipboardEvent, KeyboardEvent, PointerEvent } from 'react';
import type { ToneConstraint } from '@poem/parser/kernel';
import type { SlotEvaluation } from './types';

export function CharSlot({
  line,
  col,
  constraint,
  value,
  evaluation,
  active,
  selected,
  draft,
  inputRef,
  onDraftChange,
  onCompositionStart,
  onCompositionEnd,
  onKeyDown,
  onCopy,
  onCut,
  onPaste,
  onSelect,
  onSelectStart,
  onSelectExtend,
}: {
  line: number;
  col: number;
  constraint: ToneConstraint;
  value: string;
  evaluation: SlotEvaluation;
  active: boolean;
  selected: boolean;
  draft: string;
  inputRef: (input: HTMLInputElement | null) => void;
  onDraftChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCopy: (event: ClipboardEvent<HTMLInputElement>) => void;
  onCut: (event: ClipboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onSelect: () => void;
  onSelectStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onSelectExtend: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <span
      className='char-slot'
      data-editor-cell='true'
      data-line={line}
      data-col={col}
    >
      <span className={`slot-label slot-label-${constraint.type}`}>
        {evaluation.label}
      </span>
      <button
        type='button'
        aria-label={evaluation.title}
        data-editor-cell='true'
        data-line={line}
        data-col={col}
        className={`char-input status-${evaluation.status}${active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
        title={evaluation.title}
        onClick={(event) => {
          if (event.detail === 0) onSelect();
        }}
        onPointerDown={onSelectStart}
        onPointerEnter={onSelectExtend}
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
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
        />
      )}
    </span>
  );
}
