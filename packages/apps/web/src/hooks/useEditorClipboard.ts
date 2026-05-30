import { useCallback } from 'react';
import type { ClipboardEvent, RefObject } from 'react';
import {
  cloneEditorGrid,
  normalizeEditorInput,
  pasteEditorTextAt,
} from '@poem/editor-core';
import type { ToneConstraint } from '@poem/parser/kernel';
import type { CellPosition } from './useEditorSelection';
import type { EditorGridState } from './editorGridState';
import type { Dispatch, SetStateAction } from 'react';

export function useEditorClipboard({
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
}: {
  activeCell: CellPosition | null;
  clearSelection: () => void;
  grid: string[][];
  gridRef: RefObject<string[][]>;
  pattern: ToneConstraint[][];
  patternSignature: string;
  pendingCompleteRef: RefObject<string[][] | null>;
  pushHistory: (source: string[][]) => void;
  selectedPositions: CellPosition[];
  selectedText: () => string;
  setActiveCell: (position: CellPosition | null) => void;
  setDraft: (value: string) => void;
  setGridState: Dispatch<SetStateAction<EditorGridState>>;
}) {
  const clearSelectionInGrid = useCallback(
    (source: string[][]) => {
      if (selectedPositions.length === 0) return source;
      const next = cloneEditorGrid(source);
      selectedPositions.forEach(({ line, col }) => {
        if (next[line]) next[line][col] = '';
      });
      return next;
    },
    [selectedPositions],
  );

  const pasteAt = useCallback(
    (lineIdx: number, colIdx: number, text: string) => {
      const normalized = normalizeEditorInput(text);
      if (normalized.length === 0) return;
      const result = pasteEditorTextAt(grid, pattern, lineIdx, colIdx, text);
      pushHistory(grid);
      if (result.completed) pendingCompleteRef.current = result.grid;
      setGridState({ signature: patternSignature, grid: result.grid });
      clearSelection();
      setActiveCell(result.nextPosition);
    },
    [
      clearSelection,
      grid,
      pattern,
      patternSignature,
      pendingCompleteRef,
      pushHistory,
      setActiveCell,
      setGridState,
    ],
  );

  const replaceSelectionWithText = useCallback(
    (text: string) => {
      const normalized = normalizeEditorInput(text);
      if (normalized.length === 0) return;
      const start = selectedPositions[0] ?? activeCell;
      if (!start) return;

      pushHistory(grid);
      const result = pasteEditorTextAt(
        clearSelectionInGrid(grid),
        pattern,
        start.line,
        start.col,
        text,
      );
      if (result.completed) pendingCompleteRef.current = result.grid;
      setGridState({ signature: patternSignature, grid: result.grid });
      setDraft('');
      clearSelection();
      setActiveCell(result.nextPosition);
    },
    [
      activeCell,
      clearSelection,
      clearSelectionInGrid,
      grid,
      pattern,
      patternSignature,
      pendingCompleteRef,
      pushHistory,
      selectedPositions,
      setActiveCell,
      setDraft,
      setGridState,
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
    [activeCell, gridRef, selectedPositions.length, selectedText],
  );

  return {
    clearSelectionInGrid,
    copySelectionToClipboard,
    pasteAt,
    replaceSelectionWithText,
  };
}
