import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ToneConstraint } from '@poem/parser/kernel';
import { lineEndsWithRhyme } from '@poem/editor-core';

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
  visualLineGroups,
  sectionBreakBeforeGroups = [],
  focusTarget,
}: {
  pattern: ToneConstraint[][];
  gridRef: RefObject<string[][]>;
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
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
  const selectingRef = useRef(false);

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
    const handlePointerUp = () => {
      selectingRef.current = false;
    };
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

  const selectedLineGroups = useMemo(
    () =>
      visualLineGroups && visualLineGroups.length > 0
        ? visualLineGroups
        : pattern.map((_, index) => [index]),
    [pattern, visualLineGroups],
  );

  const selectedText = useCallback(() => {
    if (selectedPositions.length === 0) return '';
    const selectedKeys = new Set(selectedPositions.map(positionKey));
    const copiedLines: string[] = [];

    selectedLineGroups.forEach((group, groupIndex) => {
      let text = '';
      group.forEach((lineIndex) => {
        const selectedChars = pattern[lineIndex]
          ?.map((_, col): CellPosition => ({ line: lineIndex, col }))
          .filter((position) => selectedKeys.has(positionKey(position)))
          .map(({ line, col }) => gridRef.current[line]?.[col] ?? '')
          .join('');
        if (!selectedChars) return;
        text += `${selectedChars}${lineEndsWithRhyme(pattern[lineIndex]) ? '。' : '，'}`;
      });
      if (!text) return;
      if (
        copiedLines.length > 0 &&
        sectionBreakBeforeGroups.includes(groupIndex)
      ) {
        copiedLines.push('');
      }
      copiedLines.push(text);
    });

    return copiedLines.join('\n');
  }, [
    gridRef,
    pattern,
    sectionBreakBeforeGroups,
    selectedLineGroups,
    selectedPositions,
  ]);

  const clearSelection = useCallback(() => {
    selectingRef.current = false;
    setSelection(null);
  }, []);

  const beginSelection = useCallback(
    (position: CellPosition, extendExisting: boolean) => {
      setActiveCell(position);
      selectingRef.current = true;
      setSelection((current) => {
        if (!extendExisting) {
          return { anchor: position, focus: position };
        }
        if (current) {
          return { anchor: current.anchor, focus: position };
        }
        return {
          anchor: activeCell ?? position,
          focus: position,
        };
      });
    },
    [activeCell],
  );

  const extendSelection = useCallback(
    (position: CellPosition) => {
      if (!selectingRef.current) return false;
      setSelection((current) =>
        current ? { anchor: current.anchor, focus: position } : current,
      );
      setActiveCell(position);
      return true;
    },
    [],
  );

  const selectCell = useCallback((position: CellPosition) => {
    selectingRef.current = false;
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
