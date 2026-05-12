import { analyzeSync } from "@poem/parser/kernel";
import type { RhymeDict, ToneConstraint } from "@poem/parser/kernel";

import type { Genre } from "../constants/poem";
import { templateForAnalyze } from "./templates";

export function analyzeGrid({
  genre,
  selectedTune,
  selectedVariant,
  chars,
  dict,
  pattern,
}: {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  chars: string[][];
  dict: RhymeDict;
  pattern: ToneConstraint[][];
}): string {
  if (!selectedVariant || pattern.length === 0) return "";
  const text = chars.map((row) => row.join("")).join("\n");
  if (!text.trim()) return "";
  const template = templateForAnalyze(genre, selectedTune, selectedVariant);
  if (!template) return "错误: 未找到模板";

  const result = analyzeSync(text, template, dict, { variantId: selectedVariant });
  return (
    `合律率: ${(result.complianceRate * 100).toFixed(0)}% | ` +
    `完全合律: ${result.fullyCompliant ? "是" : "否"} | ` +
    `多音字: ${result.ambiguities.map((item) => item.char).join(", ") || "无"}`
  );
}
