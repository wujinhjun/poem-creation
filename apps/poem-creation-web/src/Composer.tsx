import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Tone } from "@poem/parser/kernel";
import type { ToneConstraint } from "@poem/parser/kernel";
import type { RhymeDict } from "@poem/parser/kernel";

/** 约束 → 显示标签 */
function constraintLabel(c: ToneConstraint): string {
  if (c.type === "flexible") return "中";
  if (c.type === "rhyme") return "韵";
  return c.tone === Tone.Ping ? "平" : "仄";
}

/** 单个字位 */
type SlotStatus = "empty" | "pass" | "fail" | "pending";

type SlotEvaluation = {
  status: SlotStatus;
  label: string;
  title: string;
};

type GridState = {
  signature: string;
  grid: string[][];
};

function createEmptyGrid(pattern: ToneConstraint[][]): string[][] {
  return pattern.map((row) => row.map(() => ""));
}

function createPatternSignature(pattern: ToneConstraint[][]): string {
  return pattern
    .map((row) => row.map((constraint) => {
      if (constraint.type === "fixed") return constraint.tone;
      if (constraint.type === "rhyme") return "韵";
      return "中";
    }).join(""))
    .join("|");
}

function normalizePoemInput(text: string): string[] {
  return Array.from(text).filter((ch) => !/[\s，。！？；：、,.!?;:]/u.test(ch));
}

function CharSlot({
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
    <span className="char-slot">
      <span className={`slot-label slot-label-${constraint.type}`}>
        {evaluation.label}
      </span>
      <button
        type="button"
        aria-label={evaluation.title}
        className={`char-input status-${evaluation.status}${active ? " is-active" : ""}`}
        title={evaluation.title}
        onClick={onSelect}
      >
        {value}
      </button>
      {active && (
        <input
          ref={inputRef}
          className="active-cell-editor"
          value={draft}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={(event) => onCompositionEnd(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      )}
    </span>
  );
}

/** 正文编辑器 */
export default function Composer({
  pattern,
  dict,
  onChange,
}: {
  pattern: ToneConstraint[][];
  dict: RhymeDict | null;
  onChange: (chars: string[][]) => void;
}) {
  const patternSignature = useMemo(() => createPatternSignature(pattern), [pattern]);
  const [gridState, setGridState] = useState<GridState>(() => ({
    signature: patternSignature,
    grid: createEmptyGrid(pattern),
  }));
  const grid = gridState.signature === patternSignature
    ? gridState.grid
    : createEmptyGrid(pattern);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const [activeCell, setActiveCell] = useState<{ line: number; col: number } | null>(null);
  const [draft, setDraft] = useState("");

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
        const source = prev.signature === patternSignature ? prev.grid : createEmptyGrid(pattern);
        const next = source.map((row) => [...row]);
        const rowLength = pattern[lineIdx]?.length ?? 0;
        for (let offset = 0; offset < chars.length && colIdx + offset < rowLength; offset++) {
          next[lineIdx][colIdx + offset] = chars[offset];
        }
        return { signature: patternSignature, grid: next };
      });

      const rowLength = pattern[lineIdx]?.length ?? 0;
      const nextCol = Math.min(colIdx + chars.length, Math.max(rowLength - 1, 0));
      setDraft("");
      setActiveCell({ line: lineIdx, col: nextCol });
    },
    [pattern, patternSignature],
  );

  const clearCellAt = useCallback((lineIdx: number, colIdx: number) => {
    setGridState((prev) => {
      const source = prev.signature === patternSignature ? prev.grid : createEmptyGrid(pattern);
      const next = source.map((row) => [...row]);
      if (next[lineIdx]) next[lineIdx][colIdx] = "";
      return { signature: patternSignature, grid: next };
    });
  }, [pattern, patternSignature]);

  const moveActiveCell = useCallback((lineIdx: number, colIdx: number, delta: number) => {
    const rowLength = pattern[lineIdx]?.length ?? 0;
    if (rowLength === 0) return;
    setDraft("");
    setActiveCell({ line: lineIdx, col: Math.max(0, Math.min(colIdx + delta, rowLength - 1)) });
  }, [pattern]);

  const pasteAt = useCallback((
    lineIdx: number,
    colIdx: number,
    text: string,
  ) => {
    const lines = text.split(/\r?\n/).map((line) => normalizePoemInput(line).join("")).filter(Boolean);

    setGridState((prev) => {
      const source = prev.signature === patternSignature ? prev.grid : createEmptyGrid(pattern);
      const next = source.map((row) => [...row]);

      if (lines.length > 1) {
        for (let offset = 0; offset < lines.length && lineIdx + offset < pattern.length; offset++) {
          const targetLine = lineIdx + offset;
          const startCol = offset === 0 ? colIdx : 0;
          const chars = normalizePoemInput(lines[offset]);
          for (let charOffset = 0; charOffset < chars.length && startCol + charOffset < pattern[targetLine].length; charOffset++) {
            next[targetLine][startCol + charOffset] = chars[charOffset];
          }
        }
      } else {
        const chars = normalizePoemInput(text);
        for (let offset = 0; offset < chars.length && colIdx + offset < (pattern[lineIdx]?.length ?? 0); offset++) {
          next[lineIdx][colIdx + offset] = chars[offset];
        }
      }

      return { signature: patternSignature, grid: next };
    });
  }, [pattern, patternSignature]);

  const handleDraftChange = useCallback((lineIdx: number, colIdx: number, value: string) => {
    if (composingRef.current) {
      setDraft(value);
      return;
    }

    const chars = normalizePoemInput(value);
    if (chars.length > 0) {
      writeCharsAt(lineIdx, colIdx, chars);
      setDraft("");
    } else {
      setDraft(value);
    }
  }, [writeCharsAt]);

  const evaluations = useMemo(() => {
    const rhymeAnchors = new Map<Tone, string>();

    return pattern.map((row, li) => row.map((constraint, ci): SlotEvaluation => {
      const value = grid[li]?.[ci] ?? "";
      const baseLabel = constraintLabel(constraint);
      if (!value || !dict) {
        return {
          status: "empty",
          label: baseLabel,
          title: baseLabel === "中" ? "可平可仄" : baseLabel,
        };
      }

      const entries = dict.lookup(value);
      if (entries.length === 0) {
        return { status: "fail", label: baseLabel, title: "韵书未收此字" };
      }

      if (constraint.type === "flexible") {
        return { status: "pass", label: "中", title: "可平可仄，韵书有收录" };
      }

      if (constraint.type === "fixed") {
        const matches = entries.some((entry) => entry.tone === constraint.tone);
        return {
          status: matches ? "pass" : "fail",
          label: baseLabel,
          title: matches ? `符合${baseLabel}声` : `此处应为${baseLabel}声`,
        };
      }

      const rhymeEntries = entries.filter((entry) => entry.rhymeGroup);
      const matchingEntry = rhymeEntries.find((entry) => {
        const anchor = rhymeAnchors.get(entry.tone);
        return !anchor || anchor === entry.rhymeGroup;
      });

      if (!matchingEntry) {
        return { status: "fail", label: "韵", title: "韵部或平仄不合" };
      }

      if (!rhymeAnchors.has(matchingEntry.tone)) {
        rhymeAnchors.set(matchingEntry.tone, matchingEntry.rhymeGroup);
      }

      const toneLabel = matchingEntry.tone === Tone.Ping ? "平韵" : "仄韵";
      return {
        status: "pass",
        label: toneLabel,
        title: `${toneLabel}：${matchingEntry.rhymeGroup}`,
      };
    }));
  }, [dict, grid, pattern]);

  // 通知父组件
  useEffect(() => {
    onChange(grid);
  }, [grid, onChange]);

  return (
    <div className="composer-grid">
      {pattern.map((row, li) => (
        <div
          key={li}
          className="composer-line"
        >
          <span className="line-number">
            {li + 1}
          </span>
          {row.map((constraint, ci) => (
            <CharSlot
              key={ci}
              constraint={constraint}
              value={grid[li]?.[ci] ?? ""}
              evaluation={evaluations[li]?.[ci] ?? { status: "empty", label: constraintLabel(constraint), title: "" }}
              active={activeCell?.line === li && activeCell.col === ci}
              draft={activeCell?.line === li && activeCell.col === ci ? draft : ""}
              inputRef={(input) => {
                if (activeCell?.line === li && activeCell.col === ci) activeInputRef.current = input;
              }}
              onDraftChange={(value) => handleDraftChange(li, ci, value)}
              onCompositionStart={() => {
                composingRef.current = true;
                setDraft("");
              }}
              onCompositionEnd={(value) => {
                composingRef.current = false;
                writeCharsAt(li, ci, normalizePoemInput(value));
                setDraft("");
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveActiveCell(li, ci, -1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveActiveCell(li, ci, 1);
                } else if (event.key === "Backspace" && draft === "") {
                  event.preventDefault();
                  if (grid[li]?.[ci]) {
                    clearCellAt(li, ci);
                  } else {
                    moveActiveCell(li, ci, -1);
                  }
                } else if (event.key === "Delete" && draft === "") {
                  event.preventDefault();
                  clearCellAt(li, ci);
                }
              }}
              onPaste={(event) => {
                event.preventDefault();
                pasteAt(li, ci, event.clipboardData.getData("text"));
                setDraft("");
              }}
              onSelect={() => {
                setDraft("");
                setActiveCell({ line: li, col: ci });
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
