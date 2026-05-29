import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type EditorGridState = {
  signature: string;
  grid: string[][];
};

export function cloneEditorGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

export function useEditorHistory({
  patternSignature,
  setDraft,
  clearSelection,
  setGridState,
}: {
  patternSignature: string;
  setDraft: (value: string) => void;
  clearSelection: () => void;
  setGridState: Dispatch<SetStateAction<EditorGridState>>;
}) {
  const historyRef = useRef<string[][][]>([]);

  useEffect(() => {
    historyRef.current = [];
  }, [patternSignature]);

  const pushHistory = useCallback((source: string[][]) => {
    historyRef.current = [
      ...historyRef.current.slice(-49),
      cloneEditorGrid(source),
    ];
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setDraft('');
    clearSelection();
    setGridState({
      signature: patternSignature,
      grid: cloneEditorGrid(previous),
    });
  }, [clearSelection, patternSignature, setDraft, setGridState]);

  return { pushHistory, undo };
}
