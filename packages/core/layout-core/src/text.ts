import { lineEndsWithRhyme } from "@poem/editor-core";
import type {
  PoemBodyLayoutInput,
  PoemLayoutDocument,
  PoemLayoutSection,
  PoemTextLayoutInput,
} from "./schema.js";

export function poemLinePunctuation(
  patternLine: PoemBodyLayoutInput["pattern"][number] | undefined,
): string {
  return lineEndsWithRhyme(patternLine) ? "。" : "，";
}

export function poemVisualLineGroups({
  pattern,
  visualLineGroups,
}: Pick<PoemBodyLayoutInput, "pattern" | "visualLineGroups">): number[][] {
  return visualLineGroups && visualLineGroups.length > 0
    ? visualLineGroups
    : pattern.map((_, index) => [index]);
}

export function formatPoemBodyLines({
  chars,
  pattern,
  visualLineGroups,
  sectionBreakBeforeGroups = [],
}: PoemBodyLayoutInput): string[] {
  const body: string[] = [];
  const groups = poemVisualLineGroups({ pattern, visualLineGroups });

  groups.forEach((group, groupIndex) => {
    let paragraph = "";

    group.forEach((lineIndex) => {
      const text = chars[lineIndex]?.join("").trim() ?? "";
      if (!text) return;
      paragraph += `${text}${poemLinePunctuation(pattern[lineIndex])}`;
    });

    if (paragraph) {
      if (body.length > 0 && sectionBreakBeforeGroups.includes(groupIndex)) {
        body.push("");
      }
      body.push(paragraph);
    }
  });

  return body;
}

export function createPoemLayoutDocument({
  title,
  author,
  description,
  chars,
  pattern,
  visualLineGroups,
  sectionBreakBeforeGroups,
}: PoemTextLayoutInput): PoemLayoutDocument {
  const groups = poemVisualLineGroups({ pattern, visualLineGroups });
  const sectionBreaks = new Set(sectionBreakBeforeGroups);
  const sections: PoemLayoutSection[] = [];
  let currentSection: string[] = [];

  groups.forEach((group, groupIndex) => {
    if (sectionBreaks.has(groupIndex) && currentSection.length > 0) {
      sections.push({ lines: currentSection });
      currentSection = [];
    }

    let paragraph = "";
    group.forEach((lineIndex) => {
      const text = chars[lineIndex]?.join("").trim() ?? "";
      if (!text) return;
      paragraph += `${text}${poemLinePunctuation(pattern[lineIndex])}`;
    });

    if (paragraph) currentSection.push(paragraph);
  });

  if (currentSection.length > 0) {
    sections.push({ lines: currentSection });
  }

  return {
    title: title.trim() || "无题",
    author: author.trim(),
    description: description.trim(),
    sections,
  };
}

export function formatPoemText(input: PoemTextLayoutInput): string {
  const document = createPoemLayoutDocument(input);
  const header = [
    document.title,
    document.author,
    document.description,
  ].filter(Boolean);
  const body = document.sections.flatMap((section, index) =>
    index === 0 ? section.lines : ["", ...section.lines],
  );

  return [...header, "", ...body].join("\n");
}
