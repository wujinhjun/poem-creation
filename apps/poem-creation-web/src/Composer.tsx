import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEditorPatternSignature,
  createEmptyEditorGrid,
  normalizeEditorInput,
  pasteEditorTextAt,
  writeEditorCharsAt,
} from '@poem/shared';
import { Tone } from '@poem/parser/kernel';
import type { ToneConstraint } from '@poem/parser/kernel';
import type { RhymeDict } from '@poem/parser/kernel';
import { CharSlot } from './components/composer/CharSlot';
import type { SlotEvaluation } from './components/composer/types';
import {
  constraintLabel,
  linePunctuation,
  rhymeToneLabel,
} from './components/composer/utils';

type GridState = {
  signature: string;
  grid: string[][];
};

function createInitialGrid(
  pattern: ToneConstraint[][],
  initialChars?: string[][],
): string[][] {
  if (!initialChars) return createEmptyEditorGrid(pattern);
  return pattern.map((row, lineIdx) =>
    row.map((_, colIdx) => initialChars[lineIdx]?.[colIdx] ?? ''),
  );
}

/** 正文编辑器 */
export default function Composer({
  pattern,
  dict,
  expectedRhymeTone,
  visualLineGroups,
  sectionBreakBeforeGroups = [],
  initialChars,
  onChange,
  onComplete,
}: {
  pattern: ToneConstraint[][];
  dict: RhymeDict | null;
  expectedRhymeTone: Tone | null;
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
  initialChars?: string[][];
  onChange: (chars: string[][]) => void;
  onComplete: (chars: string[][]) => void;
}) {
  const patternSignature = useMemo(
    () => createEditorPatternSignature(pattern),
    [pattern],
  );
  const [gridState, setGridState] = useState<GridState>(() => ({
    signature: patternSignature,
    grid: createInitialGrid(pattern, initialChars),
  }));
  const grid =
    gridState.signature === patternSignature
      ? gridState.grid
      : createEmptyEditorGrid(pattern);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const pendingCompleteRef = useRef<string[][] | null>(null);
  const [activeCell, setActiveCell] = useState<{
    line: number;
    col: number;
  } | null>(null);
  const [draft, setDraft] = useState('');
  const groups = useMemo(
    () =>
      visualLineGroups && visualLineGroups.length > 0
        ? visualLineGroups
        : pattern.map((_, index) => [index]),
    [pattern, visualLineGroups],
  );

  useEffect(() => {
    if (!activeCell) return;
    requestAnimationFrame(() => {
      activeInputRef.current?.focus();
    });
  }, [activeCell]);

  const writeCharsAt = useCallback(
    (lineIdx: number, colIdx: number, chars: string[]) => {
      if (chars.length === 0) return;
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        const result = writeEditorCharsAt(
          source,
          pattern,
          lineIdx,
          colIdx,
          chars,
        );
        if (result.completed) pendingCompleteRef.current = result.grid;
        return { signature: patternSignature, grid: result.grid };
      });

      const result = writeEditorCharsAt(grid, pattern, lineIdx, colIdx, chars);
      setDraft('');
      setActiveCell(result.nextPosition);
    },
    [grid, pattern, patternSignature],
  );

  const clearCellAt = useCallback(
    (lineIdx: number, colIdx: number) => {
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        const next = source.map((row) => [...row]);
        if (next[lineIdx]) next[lineIdx][colIdx] = '';
        return { signature: patternSignature, grid: next };
      });
    },
    [pattern, patternSignature],
  );

  const lastFilledCol = useCallback(
    (lineIdx: number) => {
      const row = grid[lineIdx] ?? [];
      for (let idx = row.length - 1; idx >= 0; idx -= 1) {
        if (row[idx]) return idx;
      }
      return -1;
    },
    [grid],
  );

  const moveActiveCellHorizontal = useCallback(
    (lineIdx: number, colIdx: number, delta: -1 | 1) => {
      const rowLength = pattern[lineIdx]?.length ?? 0;
      if (rowLength === 0) return;

      if (delta === -1 && colIdx === 0) {
        const prevLine = lineIdx - 1;
        const prevRowLength = pattern[prevLine]?.length ?? 0;
        if (prevRowLength > 0) {
          const filledCol = lastFilledCol(prevLine);
          setDraft('');
          setActiveCell({
            line: prevLine,
            col: filledCol >= 0 ? filledCol : prevRowLength - 1,
          });
        }
        return;
      }

      if (delta === 1 && colIdx === rowLength - 1) {
        const nextLine = lineIdx + 1;
        const nextRowLength = pattern[nextLine]?.length ?? 0;
        if (nextRowLength > 0) {
          setDraft('');
          setActiveCell({ line: nextLine, col: 0 });
        }
        return;
      }

      setDraft('');
      setActiveCell({
        line: lineIdx,
        col: Math.max(0, Math.min(colIdx + delta, rowLength - 1)),
      });
    },
    [lastFilledCol, pattern],
  );

  const moveActiveCellVertical = useCallback(
    (lineIdx: number, colIdx: number, delta: -1 | 1) => {
      const nextLine = Math.max(
        0,
        Math.min(lineIdx + delta, pattern.length - 1),
      );
      const nextRowLength = pattern[nextLine]?.length ?? 0;
      if (nextRowLength === 0) return;

      const filledCol = lastFilledCol(nextLine);
      const targetCol =
        filledCol >= 0
          ? filledCol
          : Math.max(0, Math.min(colIdx, nextRowLength - 1));
      setDraft('');
      setActiveCell({
        line: nextLine,
        col: targetCol,
      });
    },
    [lastFilledCol, pattern],
  );

  const pasteAt = useCallback(
    (lineIdx: number, colIdx: number, text: string) => {
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        const result = pasteEditorTextAt(
          source,
          pattern,
          lineIdx,
          colIdx,
          text,
        );
        if (result.completed) pendingCompleteRef.current = result.grid;
        return { signature: patternSignature, grid: result.grid };
      });

      const result = pasteEditorTextAt(grid, pattern, lineIdx, colIdx, text);
      setActiveCell(result.nextPosition);
    },
    [grid, pattern, patternSignature],
  );

  const handleDraftChange = useCallback(
    (lineIdx: number, colIdx: number, value: string) => {
      if (composingRef.current) {
        setDraft(value);
        return;
      }

      const chars = normalizeEditorInput(value);
      if (chars.length > 0) {
        writeCharsAt(lineIdx, colIdx, chars);
        setDraft('');
      } else {
        setDraft(value);
      }
    },
    [writeCharsAt],
  );

  const evaluations = useMemo(() => {
    const rhymeAnchors = new Map<Tone, string>();

    return pattern.map((row, li) => {
      return row.map((constraint, ci): SlotEvaluation => {
        const value = grid[li]?.[ci] ?? '';
        const expectedTone =
          constraint.type === 'rhyme' ? expectedRhymeTone : null;
        const baseLabel = expectedTone
          ? rhymeToneLabel(expectedTone)
          : constraintLabel(constraint);
        if (!value || !dict) {
          return {
            status: 'empty',
            label: baseLabel,
            title: baseLabel === '中' ? '可平可仄' : baseLabel,
          };
        }

        const entries = dict.lookup(value);
        if (entries.length === 0) {
          return { status: 'fail', label: baseLabel, title: '韵书未收此字' };
        }

        if (constraint.type === 'flexible') {
          return { status: 'pass', label: '中', title: '可平可仄，韵书有收录' };
        }

        if (constraint.type === 'fixed') {
          const matches = entries.some(
            (entry) => entry.tone === constraint.tone,
          );
          return {
            status: matches ? 'pass' : 'fail',
            label: baseLabel,
            title: matches ? `符合${baseLabel}声` : `此处应为${baseLabel}声`,
          };
        }

        const rhymeEntries = entries.filter(
          (entry) =>
            entry.rhymeGroup && (!expectedTone || entry.tone === expectedTone),
        );
        const matchingEntry = rhymeEntries.find((entry) => {
          const anchor = rhymeAnchors.get(entry.tone);
          return !anchor || anchor === entry.rhymeGroup;
        });

        if (!matchingEntry) {
          return {
            status: 'fail',
            label: baseLabel,
            title: `${baseLabel}不合`,
          };
        }

        if (!rhymeAnchors.has(matchingEntry.tone)) {
          rhymeAnchors.set(matchingEntry.tone, matchingEntry.rhymeGroup);
        }

        return {
          status: 'pass',
          label: baseLabel,
          title: `${baseLabel}：${matchingEntry.rhymeGroup}`,
        };
      });
    });
  }, [dict, expectedRhymeTone, grid, pattern]);

  // 通知父组件
  useEffect(() => {
    onChange(grid);
  }, [grid, onChange]);

  useEffect(() => {
    const pending = pendingCompleteRef.current;
    if (!pending || pending !== grid) return;
    pendingCompleteRef.current = null;
    onComplete(pending);
  }, [grid, onComplete]);

  return (
    <div className='composer-grid'>
      {groups.map((group, groupIdx) => (
        <div
          key={group.join('-')}
          className={`composer-line${sectionBreakBeforeGroups.includes(groupIdx) ? ' is-section-break' : ''}`}
        >
          {group.map((li) => (
            <span key={li} className='composer-logical-line'>
              {pattern[li]?.map((constraint, ci) => (
                <CharSlot
                  key={`${li}-${ci}`}
                  constraint={constraint}
                  value={grid[li]?.[ci] ?? ''}
                  evaluation={
                    evaluations[li]?.[ci] ?? {
                      status: 'empty',
                      label: constraintLabel(constraint),
                      title: '',
                    }
                  }
                  active={activeCell?.line === li && activeCell.col === ci}
                  draft={
                    activeCell?.line === li && activeCell.col === ci ? draft : ''
                  }
                  inputRef={(input) => {
                    if (activeCell?.line === li && activeCell.col === ci)
                      activeInputRef.current = input;
                  }}
                  onDraftChange={(value) => handleDraftChange(li, ci, value)}
                  onCompositionStart={() => {
                    composingRef.current = true;
                    setDraft('');
                  }}
                  onCompositionEnd={(value) => {
                    composingRef.current = false;
                    writeCharsAt(li, ci, normalizeEditorInput(value));
                    setDraft('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      moveActiveCellHorizontal(li, ci, -1);
                    } else if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      moveActiveCellHorizontal(li, ci, 1);
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      moveActiveCellVertical(li, ci, -1);
                    } else if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      moveActiveCellVertical(li, ci, 1);
                    } else if (event.key === 'Backspace' && draft === '') {
                      event.preventDefault();
                      if (grid[li]?.[ci]) {
                        clearCellAt(li, ci);
                      } else {
                        moveActiveCellHorizontal(li, ci, -1);
                      }
                    } else if (event.key === 'Delete' && draft === '') {
                      event.preventDefault();
                      clearCellAt(li, ci);
                    }
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    pasteAt(li, ci, event.clipboardData.getData('text'));
                    setDraft('');
                  }}
                  onSelect={() => {
                    setDraft('');
                    setActiveCell({ line: li, col: ci });
                  }}
                />
              ))}
              <span className='line-punctuation'>
                {linePunctuation(pattern[li])}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
