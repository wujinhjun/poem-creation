import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function getLastComposedChar(text: string): string {
  return Array.from(text.trim()).at(-1) ?? "";
}

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

const CharSlot = forwardRef<HTMLInputElement, {
  constraint: ToneConstraint;
  value: string;
  evaluation: SlotEvaluation;
  onChange: (ch: string) => void;
  onAdvance: () => void;
}>(function CharSlot({
  constraint,
  value,
  evaluation,
  onChange,
  onAdvance,
}, ref) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current) setDraft(value);
  }, [value]);

  const commit = useCallback((text: string, shouldAdvance: boolean) => {
    const next = getLastComposedChar(text);
    setDraft(next);
    onChange(next);
    if (next && shouldAdvance) onAdvance();
  }, [onAdvance, onChange]);

  return (
    <span className="char-slot">
      <span className={`slot-label slot-label-${constraint.type}`}>
        {evaluation.label}
      </span>
      <input
        aria-label={evaluation.title}
        className={`char-input status-${evaluation.status}`}
        ref={ref}
        title={evaluation.title}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!composingRef.current) commit(e.target.value, true);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          commit(e.currentTarget.value, true);
        }}
      />
    </span>
  );
});

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
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const handleChange = useCallback(
    (lineIdx: number, colIdx: number, ch: string) => {
      setGridState((prev) => {
        const source = prev.signature === patternSignature ? prev.grid : createEmptyGrid(pattern);
        const next = source.map((row) => [...row]);
        next[lineIdx][colIdx] = ch;
        return { signature: patternSignature, grid: next };
      });
    },
    [pattern, patternSignature],
  );

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
              onChange={(ch) => handleChange(li, ci, ch)}
              onAdvance={() => {
                if (ci + 1 < row.length) inputRefs.current[li]?.[ci + 1]?.focus();
              }}
              ref={(input) => {
                if (!inputRefs.current[li]) inputRefs.current[li] = [];
                inputRefs.current[li][ci] = input;
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
