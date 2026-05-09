import { useCallback, useEffect, useMemo, useState } from "react";
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
function CharSlot({
  constraint,
  value,
  dict,
  onChange,
}: {
  constraint: ToneConstraint;
  value: string;
  dict: RhymeDict | null;
  onChange: (ch: string) => void;
}) {
  const label = constraintLabel(constraint);
  const isEmpty = value === "";

  // 校验
  let status: "empty" | "pass" | "fail" | "flexible" = "empty";
  if (!isEmpty && dict) {
    if (constraint.type === "flexible") {
      status = "flexible";
    } else if (constraint.type === "rhyme") {
      const entries = dict.lookup(value);
      status = entries.length > 0 ? "pass" : "fail";
    } else {
      const entries = dict.lookup(value);
      if (entries.length === 0) {
        status = "fail";
      } else {
        const matches = entries.some(
          (e) => e.tone === constraint.tone,
        );
        status = matches ? "pass" : "fail";
      }
    }
  }

  const bg =
    status === "pass" ? "#d4edda"
    : status === "fail" ? "#f8d7da"
    : status === "flexible" ? "#e2e3e5"
    : "#fff";
  const border =
    status === "pass" ? "#28a745"
    : status === "fail" ? "#dc3545"
    : "#ccc";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: 1 }}>
      <span style={{ fontSize: 10, color: label === "韵" ? "#e67e22" : label === "中" ? "#999" : "#333", fontWeight: label === "韵" ? 700 : 400 }}>
        {label}
      </span>
      <input
        maxLength={1}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(-1))}
        style={{
          width: 36, height: 36, textAlign: "center", fontSize: 18,
          border: `2px solid ${border}`, borderRadius: 4, background: bg,
          outline: "none",
        }}
      />
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
  const [grid, setGrid] = useState<string[][]>(() =>
    pattern.map((row) => row.map(() => "")),
  );

  // 模板变化时重建空表格
  useEffect(() => {
    setGrid(pattern.map((row) => row.map(() => "")));
  }, [pattern]);

  const handleChange = useCallback(
    (lineIdx: number, colIdx: number, ch: string) => {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[lineIdx][colIdx] = ch;
        return next;
      });
    },
    [],
  );

  // 通知父组件
  useEffect(() => {
    onChange(grid);
  }, [grid, onChange]);

  // 自动跳下一格
  const inputRefs = useMemo(() => {
    const refs: (HTMLInputElement | null)[][] = [];
    for (let i = 0; i < pattern.length; i++) {
      refs[i] = [];
      for (let j = 0; j < pattern[i].length; j++) {
        refs[i][j] = null;
      }
    }
    return refs;
  }, [pattern]);

  return (
    <div>
      {pattern.map((row, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 2,
            marginBottom: 12,
            padding: "4px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <span style={{ fontSize: 11, color: "#999", minWidth: 24, textAlign: "right", marginRight: 4 }}>
            {li + 1}
          </span>
          {row.map((constraint, ci) => (
            <CharSlot
              key={ci}
              constraint={constraint}
              value={grid[li]?.[ci] ?? ""}
              dict={dict}
              onChange={(ch) => {
                handleChange(li, ci, ch);
                // 输入后自动跳下一格
                if (ch && ci + 1 < row.length) {
                  inputRefs[li]?.[ci + 1]?.focus();
                }
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
