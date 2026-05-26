import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from 'react';
import {
  createEditorPatternSignature,
  createEmptyEditorGrid,
  normalizeEditorInput,
  pasteEditorTextAt,
  writeEditorCharsAt,
} from '@poem/editor-core';
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

type CellPosition = {
  line: number;
  col: number;
};

type CellSelection = {
  anchor: CellPosition;
  focus: CellPosition;
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

function cloneGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

function positionKey(position: CellPosition): string {
  return `${position.line}:${position.col}`;
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
  onFailCountChange,
  focusTarget,
}: {
  pattern: ToneConstraint[][];
  dict: RhymeDict | null;
  expectedRhymeTone: Tone | null;
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
  initialChars?: string[][];
  onChange: (chars: string[][]) => void;
  onComplete: (chars: string[][]) => void;
  onFailCountChange?: (count: number) => void;
  focusTarget?: { lineIndex: number; col: number } | null;
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
  const gridRef = useRef(grid);
  const historyRef = useRef<string[][][]>([]);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const pendingCompleteRef = useRef<string[][] | null>(null);
  const [activeCell, setActiveCell] = useState<{
    line: number;
    col: number;
  } | null>(
    focusTarget
      ? {
          line: focusTarget.lineIndex,
          col: focusTarget.col,
        }
      : null,
  );
  const [draft, setDraft] = useState('');
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [selecting, setSelecting] = useState(false);
  const groups = useMemo(
    () =>
      visualLineGroups && visualLineGroups.length > 0
        ? visualLineGroups
        : pattern.map((_, index) => [index]),
    [pattern, visualLineGroups],
  );
  const flatPositions = useMemo(
    () =>
      pattern.flatMap((row, line) =>
        row.map((_, col): CellPosition => ({ line, col })),
      ),
    [pattern],
  );
  const positionIndex = useMemo(() => {
    const map = new Map<string, number>();
    flatPositions.forEach((position, index) => {
      map.set(positionKey(position), index);
    });
    return map;
  }, [flatPositions]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    if (!activeCell) return;
    requestAnimationFrame(() => {
      activeInputRef.current?.focus();
    });
  }, [activeCell]);

  useEffect(() => {
    const handlePointerUp = () => setSelecting(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  useEffect(() => {
    historyRef.current = [];
  }, [patternSignature]);

  const selectionRange = useMemo(() => {
    if (!selection) return null;
    const anchorIndex = positionIndex.get(positionKey(selection.anchor));
    const focusIndex = positionIndex.get(positionKey(selection.focus));
    if (anchorIndex === undefined || focusIndex === undefined) return null;
    return {
      start: Math.min(anchorIndex, focusIndex),
      end: Math.max(anchorIndex, focusIndex),
    };
  }, [positionIndex, selection]);

  const selectedPositions = useMemo(() => {
    if (!selectionRange) return [];
    return flatPositions.slice(selectionRange.start, selectionRange.end + 1);
  }, [flatPositions, selectionRange]);

  const selectedPositionKeys = useMemo(
    () => new Set(selectedPositions.map(positionKey)),
    [selectedPositions],
  );

  const selectedText = useCallback(() => {
    if (selectedPositions.length === 0) return '';
    const lineMap = new Map<number, string[]>();
    selectedPositions.forEach((position) => {
      const cells = lineMap.get(position.line) ?? [];
      cells.push(gridRef.current[position.line]?.[position.col] ?? '');
      lineMap.set(position.line, cells);
    });
    return [...lineMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, cells]) => cells.join(''))
      .join('\n');
  }, [selectedPositions]);

  const pushHistory = useCallback((source: string[][]) => {
    historyRef.current = [...historyRef.current.slice(-49), cloneGrid(source)];
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setDraft('');
    setSelection(null);
    setGridState({ signature: patternSignature, grid: cloneGrid(previous) });
  }, [patternSignature]);

  const clearSelectionInGrid = useCallback(
    (source: string[][]) => {
      if (selectedPositions.length === 0) return source;
      const next = cloneGrid(source);
      selectedPositions.forEach(({ line, col }) => {
        if (next[line]) next[line][col] = '';
      });
      return next;
    },
    [selectedPositions],
  );

  const writeCharsAt = useCallback(
    (lineIdx: number, colIdx: number, chars: string[]) => {
      if (chars.length === 0) return;
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        pushHistory(source);
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
      setSelection(null);
      setActiveCell(result.nextPosition);
    },
    [grid, pattern, patternSignature, pushHistory],
  );

  const clearCellAt = useCallback(
    (lineIdx: number, colIdx: number) => {
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        if (!source[lineIdx]?.[colIdx]) return prev;
        pushHistory(source);
        const next = source.map((row) => [...row]);
        if (next[lineIdx]) next[lineIdx][colIdx] = '';
        return { signature: patternSignature, grid: next };
      });
    },
    [pattern, patternSignature, pushHistory],
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
      const normalized = normalizeEditorInput(text);
      if (normalized.length === 0) return;
      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        pushHistory(source);
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
      setSelection(null);
      setActiveCell(result.nextPosition);
    },
    [grid, pattern, patternSignature, pushHistory],
  );

  const replaceSelectionWithText = useCallback(
    (text: string) => {
      const normalized = normalizeEditorInput(text);
      if (normalized.length === 0) return;
      const start = selectedPositions[0] ?? activeCell;
      if (!start) return;

      setGridState((prev) => {
        const source =
          prev.signature === patternSignature
            ? prev.grid
            : createEmptyEditorGrid(pattern);
        pushHistory(source);
        const cleared = clearSelectionInGrid(source);
        const result = pasteEditorTextAt(
          cleared,
          pattern,
          start.line,
          start.col,
          text,
        );
        if (result.completed) pendingCompleteRef.current = result.grid;
        return { signature: patternSignature, grid: result.grid };
      });

      const result = pasteEditorTextAt(
        clearSelectionInGrid(grid),
        pattern,
        start.line,
        start.col,
        text,
      );
      setDraft('');
      setSelection(null);
      setActiveCell(result.nextPosition);
    },
    [
      activeCell,
      clearSelectionInGrid,
      grid,
      pattern,
      patternSignature,
      pushHistory,
      selectedPositions,
    ],
  );

  const copySelectionToClipboard = useCallback(
    (event?: ClipboardEvent<HTMLInputElement>) => {
      const text =
        selectedPositions.length > 0
          ? selectedText()
          : activeCell
            ? gridRef.current[activeCell.line]?.[activeCell.col] ?? ''
            : '';
      if (!text) return;
      event?.preventDefault();
      if (event?.clipboardData) {
        event.clipboardData.setData('text/plain', text);
        return;
      }
      void navigator.clipboard?.writeText(text);
    },
    [activeCell, selectedPositions.length, selectedText],
  );

  const handleCellMouseDown = useCallback(
    (
      position: CellPosition,
      event: MouseEvent<HTMLButtonElement>,
    ) => {
      event.preventDefault();
      setDraft('');
      setActiveCell(position);
      setSelecting(true);
      setSelection((current) =>
        event.shiftKey && current
          ? { anchor: current.anchor, focus: position }
          : { anchor: position, focus: position },
      );
    },
    [],
  );

  const handleCellMouseEnter = useCallback(
    (
      position: CellPosition,
      event: MouseEvent<HTMLButtonElement>,
    ) => {
      if (!selecting || event.buttons !== 1) return;
      setSelection((current) =>
        current ? { anchor: current.anchor, focus: position } : current,
      );
      setActiveCell(position);
    },
    [selecting],
  );

  const handleCellSelect = useCallback((position: CellPosition) => {
    setDraft('');
    setSelection(null);
    setActiveCell(position);
  }, []);

  const handleEditorKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLInputElement>,
      position: CellPosition,
    ) => {
      const shortcut = event.metaKey || event.ctrlKey;
      if (shortcut && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
        return;
      }
      if (shortcut && event.key.toLowerCase() === 'c') {
        copySelectionToClipboard();
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        setSelection(null);
        setDraft('');
        return;
      }

      const { line: li, col: ci } = position;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelection(null);
        moveActiveCellHorizontal(li, ci, -1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelection(null);
        moveActiveCellHorizontal(li, ci, 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelection(null);
        moveActiveCellVertical(li, ci, -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelection(null);
        moveActiveCellVertical(li, ci, 1);
      } else if (event.key === 'Backspace' && draft === '') {
        event.preventDefault();
        if (selectedPositions.length > 0) {
          setGridState((prev) => {
            const source =
              prev.signature === patternSignature
                ? prev.grid
                : createEmptyEditorGrid(pattern);
            pushHistory(source);
            return {
              signature: patternSignature,
              grid: clearSelectionInGrid(source),
            };
          });
          setSelection(null);
          return;
        }
        if (grid[li]?.[ci]) {
          clearCellAt(li, ci);
        } else {
          moveActiveCellHorizontal(li, ci, -1);
        }
      } else if (event.key === 'Delete' && draft === '') {
        event.preventDefault();
        if (selectedPositions.length > 0) {
          setGridState((prev) => {
            const source =
              prev.signature === patternSignature
                ? prev.grid
                : createEmptyEditorGrid(pattern);
            pushHistory(source);
            return {
              signature: patternSignature,
              grid: clearSelectionInGrid(source),
            };
          });
          setSelection(null);
          return;
        }
        clearCellAt(li, ci);
      }
    },
    [
      clearCellAt,
      clearSelectionInGrid,
      copySelectionToClipboard,
      draft,
      grid,
      moveActiveCellHorizontal,
      moveActiveCellVertical,
      pattern,
      patternSignature,
      pushHistory,
      selectedPositions.length,
      undo,
    ],
  );

  const handleDraftChange = useCallback(
    (lineIdx: number, colIdx: number, value: string) => {
      if (composingRef.current) {
        setDraft(value);
        return;
      }

      const chars = normalizeEditorInput(value);
      if (chars.length > 0) {
        if (selectedPositions.length > 0) {
          replaceSelectionWithText(value);
        } else {
          writeCharsAt(lineIdx, colIdx, chars);
        }
        setDraft('');
      } else {
        setDraft(value);
      }
    },
    [replaceSelectionWithText, selectedPositions.length, writeCharsAt],
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

  const failCount = useMemo(
    () =>
      evaluations.reduce(
        (count, row) =>
          count + row.filter((evaluation) => evaluation.status === 'fail').length,
        0,
      ),
    [evaluations],
  );

  // 通知父组件
  useEffect(() => {
    onChange(grid);
  }, [grid, onChange]);

  useEffect(() => {
    onFailCountChange?.(failCount);
  }, [failCount, onFailCountChange]);

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
                  selected={selectedPositionKeys.has(positionKey({ line: li, col: ci }))}
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
                    if (selectedPositions.length > 0) {
                      replaceSelectionWithText(value);
                    } else {
                      writeCharsAt(li, ci, normalizeEditorInput(value));
                    }
                    setDraft('');
                  }}
                  onKeyDown={(event) =>
                    handleEditorKeyDown(event, { line: li, col: ci })
                  }
                  onCopy={copySelectionToClipboard}
                  onPaste={(event) => {
                    event.preventDefault();
                    if (selectedPositions.length > 0) {
                      replaceSelectionWithText(event.clipboardData.getData('text'));
                    } else {
                      pasteAt(li, ci, event.clipboardData.getData('text'));
                    }
                    setDraft('');
                  }}
                  onSelect={() => handleCellSelect({ line: li, col: ci })}
                  onSelectStart={(event) =>
                    handleCellMouseDown({ line: li, col: ci }, event)
                  }
                  onSelectExtend={(event) =>
                    handleCellMouseEnter({ line: li, col: ci }, event)
                  }
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
