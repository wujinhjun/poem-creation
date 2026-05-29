import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { ToneConstraint } from '@poem/parser/kernel';

export type CellPosition = {
  line: number;
  col: number;
};

type CellSelection = {
  anchor: CellPosition;
  focus: CellPosition;
};

export function positionKey(position: CellPosition): string {
  return `${position.line}:${position.col}`;
}

export function useEditorSelection({
  pattern,
  gridRef,
  focusTarget,
}: {
  pattern: ToneConstraint[][];
  gridRef: RefObject<string[][]>;
  focusTarget?: { lineIndex: number; col: number } | null;
}) {
  const [activeCell, setActiveCell] = useState<CellPosition | null>(
    focusTarget
      ? {
          line: focusTarget.lineIndex,
          col: focusTarget.col,
        }
      : null,
  );
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [selecting, setSelecting] = useState(false);

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
    const handlePointerUp = () => setSelecting(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

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
  }, [gridRef, selectedPositions]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const beginSelection = useCallback(
    (position: CellPosition, extendExisting: boolean) => {
      setActiveCell(position);
      setSelecting(true);
      setSelection((current) =>
        extendExisting && current
          ? { anchor: current.anchor, focus: position }
          : { anchor: position, focus: position },
      );
    },
    [],
  );

  const extendSelection = useCallback(
    (position: CellPosition) => {
      if (!selecting) return false;
      setSelection((current) =>
        current ? { anchor: current.anchor, focus: position } : current,
      );
      setActiveCell(position);
      return true;
    },
    [selecting],
  );

  const selectCell = useCallback((position: CellPosition) => {
    setSelection(null);
    setActiveCell(position);
  }, []);

  return {
    activeCell,
    setActiveCell,
    selectedPositionKeys,
    selectedPositions,
    selectedText,
    clearSelection,
    beginSelection,
    extendSelection,
    selectCell,
  };
}
