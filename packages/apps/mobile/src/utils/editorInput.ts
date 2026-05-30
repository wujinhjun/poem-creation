import type { EditorConstraint } from "@poem/editor-core";
import { formatRhymeToneLabel } from "@poem/shared";

const HAN_CHAR_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;

/** RN 输入法会暴露拼音组合串，这里只把真正的汉字写入格子。 */
export function normalizeHanInput(text: string): string[] {
  return Array.from(text).filter((char) => HAN_CHAR_PATTERN.test(char));
}

export function constraintLabel(constraint: EditorConstraint): string {
  if (constraint.type === "flexible") return "中";
  if (constraint.type === "rhyme") {
    return formatRhymeToneLabel(constraint.tone, constraint.xieyun);
  }
  return constraint.tone ?? "";
}

export function linePunctuation(
  patternLine: readonly EditorConstraint[] | undefined,
): string {
  return patternLine?.at(-1)?.type === "rhyme" ? "。" : "，";
}
