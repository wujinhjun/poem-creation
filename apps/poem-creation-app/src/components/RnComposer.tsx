import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputInstance,
} from "react-native";
import {
  createEditorPatternSignature,
  createEmptyEditorGrid,
  pasteEditorTextAt,
  writeEditorCharsAt,
  type EditorConstraint,
  type EditorPosition,
} from "@poem/shared";
import { Tone } from "@poem/parser/kernel";
import type { RhymeDict } from "@poem/parser/kernel";

import { appColors } from "../theme/colors";
import {
  constraintLabel,
  linePunctuation,
  normalizeHanInput,
} from "../utils/editorInput";

type RnComposerProps = {
  pattern: EditorConstraint[][];
  dict: RhymeDict | null;
  expectedRhymeTone: Tone | null;
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
  initialChars?: string[][];
  onChange?: (grid: string[][]) => void;
  onComplete?: (grid: string[][]) => void;
};

type SlotStatus = "empty" | "pass" | "fail";

type SlotEvaluation = {
  status: SlotStatus;
  label: string;
};

function createInitialGrid(
  pattern: EditorConstraint[][],
  initialChars?: string[][],
): string[][] {
  if (!initialChars) return createEmptyEditorGrid(pattern);
  return pattern.map((line, lineIndex) =>
    line.map((_, colIndex) => initialChars[lineIndex]?.[colIndex] ?? ""),
  );
}

function previousPosition(
  pattern: EditorConstraint[][],
  position: EditorPosition,
): EditorPosition {
  if (position.col > 0) return { line: position.line, col: position.col - 1 };

  const previousLine = position.line - 1;
  const previousLength = pattern[previousLine]?.length ?? 0;
  if (previousLength === 0) return position;
  return { line: previousLine, col: previousLength - 1 };
}

function nextPosition(
  pattern: EditorConstraint[][],
  position: EditorPosition,
): EditorPosition {
  const rowLength = pattern[position.line]?.length ?? 0;
  if (position.col < rowLength - 1) {
    return { line: position.line, col: position.col + 1 };
  }

  const nextLine = position.line + 1;
  if (!pattern[nextLine]?.length) return position;
  return { line: nextLine, col: 0 };
}

export function RnComposer({
  pattern,
  dict,
  expectedRhymeTone,
  visualLineGroups,
  sectionBreakBeforeGroups = [],
  initialChars,
  onChange,
  onComplete,
}: RnComposerProps) {
  const inputRef = useRef<TextInputInstance | null>(null);
  const signature = useMemo(
    () => createEditorPatternSignature(pattern),
    [pattern],
  );
  const [gridState, setGridState] = useState(() => ({
    signature,
    grid: createInitialGrid(pattern, initialChars),
  }));
  const [activeCell, setActiveCell] = useState<EditorPosition>({
    line: 0,
    col: 0,
  });
  const [draft, setDraft] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const grid =
    gridState.signature === signature
      ? gridState.grid
      : createEmptyEditorGrid(pattern);
  const groups =
    visualLineGroups && visualLineGroups.length > 0
      ? visualLineGroups
      : pattern.map((_, index) => [index]);

  const evaluations = useMemo(() => {
    const rhymeAnchors = new Map<Tone, string>();

    return pattern.map((line, lineIndex) =>
      line.map((constraint, colIndex): SlotEvaluation => {
        const value = grid[lineIndex]?.[colIndex] ?? "";
        const expectedTone =
          constraint.type === "rhyme" ? expectedRhymeTone : null;
        const baseLabel = expectedTone
          ? expectedTone === Tone.Ping
            ? "平韵"
            : "仄韵"
          : constraintLabel(constraint);

        if (!value || !dict) return { status: "empty", label: baseLabel };

        const entries = dict.lookup(value);
        if (entries.length === 0) return { status: "fail", label: baseLabel };

        if (constraint.type === "flexible") {
          return { status: "pass", label: "中" };
        }

        if (constraint.type === "fixed") {
          return {
            status: entries.some((entry) => entry.tone === constraint.tone)
              ? "pass"
              : "fail",
            label: baseLabel,
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
        if (!matchingEntry) return { status: "fail", label: baseLabel };
        if (!rhymeAnchors.has(matchingEntry.tone)) {
          rhymeAnchors.set(matchingEntry.tone, matchingEntry.rhymeGroup);
        }
        return { status: "pass", label: baseLabel };
      }),
    );
  }, [dict, expectedRhymeTone, grid, pattern]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeCell]);

  function commitText(text: string, position = activeCell) {
    if (text.includes("\n")) {
      const result = pasteEditorTextAt(
        grid,
        pattern,
        position.line,
        position.col,
        text,
      );
      setGridState({ signature, grid: result.grid });
      setActiveCell(result.nextPosition);
      setDraft("");
      setIsComposing(false);
      onChange?.(result.grid);

      if (result.completed) onComplete?.(result.grid);
      return;
    }

    const chars = normalizeHanInput(text);
    if (chars.length === 0) {
      setDraft(text);
      setIsComposing(text.length > 0);
      return;
    }

    const result = writeEditorCharsAt(
      grid,
      pattern,
      position.line,
      position.col,
      chars,
    );
    setGridState({ signature, grid: result.grid });
    setActiveCell(result.nextPosition);
    setDraft("");
    setIsComposing(false);
    onChange?.(result.grid);

    if (result.completed) onComplete?.(result.grid);
  }

  function clearActiveCell() {
    setGridState((current) => {
      const source =
        current.signature === signature
          ? current.grid
          : createEmptyEditorGrid(pattern);
      const next = source.map((line) => [...line]);
      next[activeCell.line][activeCell.col] = "";
      onChange?.(next);
      return { signature, grid: next };
    });
    setDraft("");
    setIsComposing(false);
  }

  function activateCell(position: EditorPosition) {
    setDraft("");
    setIsComposing(false);
    setActiveCell(position);
  }

  return (
    <View style={styles.composer}>
      {groups.map((group, groupIndex) => (
        <View
          key={group.join("-")}
          style={[
            styles.visualLine,
            sectionBreakBeforeGroups.includes(groupIndex)
              ? styles.sectionBreak
              : null,
          ]}
        >
          {group.map((lineIndex) => (
            <View key={lineIndex} style={styles.logicalLine}>
              {pattern[lineIndex]?.map((constraint, colIndex) => {
                const isActive =
                  activeCell.line === lineIndex && activeCell.col === colIndex;
                const value = grid[lineIndex]?.[colIndex] ?? "";
                const evaluation = evaluations[lineIndex]?.[colIndex] ?? {
                  status: "empty",
                  label: constraintLabel(constraint),
                };

                return (
                  <View key={`${lineIndex}-${colIndex}`} style={styles.slotWrap}>
                    <Text
                      style={[
                        styles.tone,
                        constraint.type === "rhyme" ? styles.rhymeTone : null,
                      ]}
                    >
                      {evaluation.label}
                    </Text>
                    <Pressable
                      style={[
                        styles.slot,
                        evaluation.status === "pass" ? styles.passSlot : null,
                        evaluation.status === "fail" ? styles.failSlot : null,
                        isActive ? styles.activeSlot : null,
                      ]}
                      onPress={() => {
                        activateCell({ line: lineIndex, col: colIndex });
                      }}
                    >
                      <Text style={styles.slotText}>{value}</Text>
                      {isActive ? (
                        <>
                          <View
                            pointerEvents="none"
                            style={[
                              styles.fixedCaret,
                              value ? styles.fixedCaretAfterChar : null,
                              isComposing ? styles.composingCaret : null,
                            ]}
                          />
                          <TextInput
                            ref={inputRef}
                            autoCorrect={false}
                            autoCapitalize="none"
                            caretHidden
                            multiline={false}
                            style={styles.activeInput}
                            value={draft}
                            onChangeText={commitText}
                            onKeyPress={({ nativeEvent }) => {
                              if (nativeEvent.key === "Backspace") {
                                if (draft.length > 0) {
                                  setDraft("");
                                  setIsComposing(false);
                                } else if (value) clearActiveCell();
                                else {
                                  setActiveCell(
                                    previousPosition(pattern, activeCell),
                                  );
                                }
                              }
                            }}
                          />
                        </>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
              <Text style={styles.punctuation}>
                {linePunctuation(pattern[lineIndex])}
              </Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.toolbar}>
        <Pressable
          style={styles.toolbarButton}
          onPress={() => activateCell(previousPosition(pattern, activeCell))}
        >
          <Text style={styles.toolbarButtonText}>上一格</Text>
        </Pressable>
        <Pressable style={styles.toolbarButton} onPress={clearActiveCell}>
          <Text style={styles.toolbarButtonText}>删除</Text>
        </Pressable>
        <Pressable
          style={styles.toolbarButton}
          onPress={() => activateCell(nextPosition(pattern, activeCell))}
        >
          <Text style={styles.toolbarButtonText}>下一格</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: 14,
  },
  visualLine: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 10,
  },
  sectionBreak: {
    marginTop: 20,
  },
  logicalLine: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotWrap: {
    alignItems: "center",
    gap: 4,
  },
  tone: {
    color: appColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rhymeTone: {
    color: appColors.cinnabar,
  },
  slot: {
    alignItems: "center",
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
    width: 42,
  },
  activeSlot: {
    backgroundColor: "#f7ead4",
    borderColor: appColors.cinnabar,
    borderWidth: 1.5,
  },
  passSlot: {
    backgroundColor: "#edf4df",
    borderColor: "#5d7f3d",
  },
  failSlot: {
    backgroundColor: "#f7e2dc",
    borderColor: appColors.cinnabar,
  },
  slotText: {
    color: appColors.ink,
    fontSize: 25,
    lineHeight: 32,
  },
  activeInput: {
    color: "transparent",
    height: 42,
    left: 0,
    opacity: 0.02,
    position: "absolute",
    top: 0,
    width: 42,
  },
  fixedCaret: {
    backgroundColor: appColors.cinnabar,
    height: 28,
    left: "50%",
    marginLeft: -1,
    position: "absolute",
    top: 7,
    width: 2,
  },
  fixedCaretAfterChar: {
    left: 31,
  },
  composingCaret: {
    backgroundColor: "#5d5ed8",
  },
  punctuation: {
    color: appColors.cinnabar,
    fontSize: 18,
    lineHeight: 42,
    paddingLeft: 2,
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingTop: 8,
  },
  toolbarButton: {
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  toolbarButtonText: {
    color: appColors.ink,
    fontSize: 15,
  },
});
