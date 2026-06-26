import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  cloneEditorGrid,
  createEditorPatternSignature,
  createEmptyEditorGrid,
  normalizeEditorInput,
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
import {
  positionKey,
  useEditorSelection,
} from './hooks/useEditorSelection';
import type { CellPosition } from './hooks/useEditorSelection';
import { useEditorHistory } from './hooks/useEditorHistory';
import type { EditorGridState } from './hooks/editorGridState';
import { useEditorClipboard } from './hooks/useEditorClipboard';

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
  const [gridState, setGridState] = useState<EditorGridState>(() => ({
    signature: patternSignature,
    grid: createInitialGrid(pattern, initialChars),
  }));
  const grid =
    gridState.signature === patternSignature
      ? gridState.grid
      : createEmptyEditorGrid(pattern);
  const gridRef = useRef(grid);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const dragSelectingRef = useRef(false);
  const pendingCompleteRef = useRef<string[][] | null>(null);
  const [draft, setDraft] = useState('');
  const {
    activeCell,
    setActiveCell,
    selectedPositionKeys,
    selectedPositions,
    selectedText,
    clearSelection,
    beginSelection,
    extendSelection,
    selectCell,
  } = useEditorSelection({
    pattern,
    gridRef,
    visualLineGroups,
    sectionBreakBeforeGroups,
    focusTarget,
  });
  const { pushHistory, undo } = useEditorHistory({
    patternSignature,
    setDraft,
    clearSelection,
    setGridState,
  });
  const groups = useMemo(
    () =>
      visualLineGroups && visualLineGroups.length > 0
        ? visualLineGroups
        : pattern.map((_, index) => [index]),
    [pattern, visualLineGroups],
  );

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

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
      clearSelection();
      setActiveCell(result.nextPosition);
    },
    [clearSelection, grid, pattern, patternSignature, pushHistory, setActiveCell],
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
        const next = cloneEditorGrid(source);
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
    [lastFilledCol, pattern, setActiveCell],
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
    [lastFilledCol, pattern, setActiveCell],
  );

  const {
    clearSelectionInGrid,
    copySelectionToClipboard,
    cutSelectionToClipboard,
    pasteAt,
    replaceSelectionWithText,
  } = useEditorClipboard({
    activeCell,
    clearSelection,
    grid,
    gridRef,
    pattern,
    patternSignature,
    pendingCompleteRef,
    pushHistory,
    selectedPositions,
    selectedText,
    setActiveCell,
    setDraft,
    setGridState,
  });

  useEffect(() => {
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'x') return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        const isGridEditor = target.classList.contains('active-cell-editor');
        const isEditable =
          target.isContentEditable ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          (tagName === 'input' && !isGridEditor);
        if (isEditable) return;
      }

      event.preventDefault();
      if (key === 'z') {
        undo();
      } else {
        cutSelectionToClipboard();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [cutSelectionToClipboard, undo]);

  useEffect(() => {
    const positionFromPointer = (event: globalThis.PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const cell = target?.closest?.('[data-editor-cell="true"]');
      if (!(cell instanceof HTMLElement)) return null;
      const line = Number(cell.dataset.line);
      const col = Number(cell.dataset.col);
      if (!Number.isInteger(line) || !Number.isInteger(col)) return null;
      if (!pattern[line]?.[col]) return null;
      return { line, col };
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!dragSelectingRef.current) return;
      if (event.buttons !== 1) return;
      const position = positionFromPointer(event);
      if (!position) return;
      extendSelection(position);
    };

    const handlePointerUp = () => {
      dragSelectingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [extendSelection, pattern]);

  const handleCellPointerDown = useCallback(
    (
      position: CellPosition,
      event: PointerEvent<HTMLButtonElement>,
    ) => {
      if (event.button !== 0) return;
      event.preventDefault();
      setDraft('');
      dragSelectingRef.current = true;
      beginSelection(position, event.shiftKey);
    },
    [beginSelection],
  );

  const handleCellPointerEnter = useCallback(
    (
      position: CellPosition,
      event: PointerEvent<HTMLButtonElement>,
    ) => {
      if (event.buttons !== 1) return;
      dragSelectingRef.current = true;
      extendSelection(position);
    },
    [extendSelection],
  );

  const handleComposerPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-editor-cell="true"]')) return;
      dragSelectingRef.current = false;
      clearSelection();
      setDraft('');
      setActiveCell(null);
    },
    [clearSelection, setActiveCell],
  );

  const handleCellSelect = useCallback((position: CellPosition) => {
    dragSelectingRef.current = false;
    setDraft('');
    selectCell(position);
  }, [selectCell]);

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
      if (shortcut && event.key.toLowerCase() === 'x') {
        cutSelectionToClipboard();
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        clearSelection();
        setDraft('');
        return;
      }

      const { line: li, col: ci } = position;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        clearSelection();
        moveActiveCellHorizontal(li, ci, -1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        clearSelection();
        moveActiveCellHorizontal(li, ci, 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        clearSelection();
        moveActiveCellVertical(li, ci, -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        clearSelection();
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
          clearSelection();
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
          clearSelection();
          return;
        }
        clearCellAt(li, ci);
      }
    },
    [
      clearCellAt,
      clearSelectionInGrid,
      clearSelection,
      copySelectionToClipboard,
      cutSelectionToClipboard,
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
          constraint.type === 'rhyme'
            ? (constraint.tone ?? expectedRhymeTone)
            : null;
        const baseLabel = expectedTone
          ? rhymeToneLabel(
              expectedTone,
              constraint.type === 'rhyme' ? constraint.xieyun : false,
            )
          : constraintLabel(constraint);
        if (!value || !dict) {
          return {
            status: 'empty',
            label: baseLabel,
            title: baseLabel === '中' ? '可平可仄' : baseLabel,
          };
        }

        if (constraint.type === 'flexible') {
          return { status: 'pass', label: '中', title: '可平可仄' };
        }

        const entries = dict.lookup(value);
        if (entries.length === 0) {
          return { status: 'fail', label: baseLabel, title: '韵书未收此字' };
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
    <div className='composer-grid' onPointerDown={handleComposerPointerDown}>
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
                  line={li}
                  col={ci}
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
                  onCut={cutSelectionToClipboard}
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
                    handleCellPointerDown({ line: li, col: ci }, event)
                  }
                  onSelectExtend={(event) =>
                    handleCellPointerEnter({ line: li, col: ci }, event)
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
