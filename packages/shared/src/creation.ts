import { listAllTemplates } from "@poem/parser/catalog";
import {
  loadMeterTemplates,
  RhymeDictType,
  Tone,
} from "@poem/parser/kernel";
import type {
  CiTemplate,
  ToneConstraint,
} from "@poem/parser/kernel";
import type { TemplateEntry } from "@poem/parser/catalog";

export type Genre = "meter" | "ci";
export type AppView = "home" | "works" | "entry" | "editor" | "settings";

export const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: "平水韵" },
  { value: RhymeDictType.Cilin, label: "词林正韵" },
  { value: RhymeDictType.Zhonghua, label: "中华新韵" },
] as const;

export type PoemCreationDraft = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  author: string;
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  chars: string[][];
  updatedAt: string;
};

export type PoemCreationDraftSummary = {
  id: string;
  title: string;
  description: string;
  author: string;
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  updatedAt: string;
};

export interface PoemCreationDraftStore {
  listDrafts(): Promise<PoemCreationDraftSummary[]>;
  loadActiveDraftId(): Promise<string | null>;
  setActiveDraftId(id: string): Promise<void>;
  loadDraft(id: string): Promise<PoemCreationDraft | null>;
  saveDraft(draft: PoemCreationDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
}

export type CiPatternForEditor = {
  lines: ToneConstraint[][];
  rhymeGroups: number[][];
  sectionBreaks: number[];
};

export const allTemplates = listAllTemplates();
export const meterMap = new Map(
  loadMeterTemplates().map((template) => [template.id, template]),
);

export function defaultRhymeType(genre: Genre): RhymeDictType {
  return genre === "meter" ? RhymeDictType.Pingshui : RhymeDictType.Cilin;
}

export function createDraftId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyDraft(): PoemCreationDraft {
  return {
    schemaVersion: 1,
    id: createDraftId(),
    title: "",
    description: "",
    author: "",
    genre: "meter",
    selectedTune: "",
    selectedVariant: "",
    rhymeType: RhymeDictType.Pingshui,
    chars: [],
    updatedAt: new Date().toISOString(),
  };
}

export function formatDraftTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function inferTemplateNameFromVariant(
  variantId: string,
  templates: TemplateEntry[],
): string {
  for (const entry of templates) {
    if (entry.variants.some((variant) => variant.id === variantId)) {
      return entry.name;
    }
  }
  return "";
}

export function normalizeDraft(
  draft: PoemCreationDraft,
  templates: TemplateEntry[] = allTemplates,
): PoemCreationDraft {
  const id = draft.id || "active";
  if (draft.selectedTune || !draft.selectedVariant) return { ...draft, id };

  return {
    ...draft,
    id,
    selectedTune: inferTemplateNameFromVariant(draft.selectedVariant, templates),
  };
}

export function pairLineGroups(pattern: ToneConstraint[][]): number[][] {
  const groups: number[][] = [];
  for (let index = 0; index < pattern.length; index += 2) {
    groups.push(index + 1 < pattern.length ? [index, index + 1] : [index]);
  }
  return groups;
}

export function ciPatternForEditor(
  tune: CiTemplate | undefined,
  variantId: string,
): CiPatternForEditor {
  const variant = tune?.variants.find((item) => item.id === variantId);
  if (!variant) return { lines: [], rhymeGroups: [], sectionBreaks: [] };

  const lines: ToneConstraint[][] = [];
  const rhymeGroups: number[][] = [];
  const sectionBreaks: number[] = [];
  let lineOffset = 0;
  let groupBuffer: number[] = [];

  const flushGroup = () => {
    if (groupBuffer.length === 0) return;
    rhymeGroups.push(groupBuffer);
    groupBuffer = [];
  };

  variant.sections.forEach((section, sectionIndex) => {
    flushGroup();
    if (sectionIndex > 0 && section.lines.length > 0) {
      sectionBreaks.push(rhymeGroups.length);
    }

    section.lines.forEach((line) => {
      lines.push(line.pattern);
      groupBuffer.push(lineOffset);
      lineOffset += 1;
      if (line.isRhymeLine) flushGroup();
    });
  });
  flushGroup();

  return { lines, rhymeGroups, sectionBreaks };
}

export function inferCiRhymeTone(text: string): Tone | null {
  const hasPing = text.includes("平韵");
  const hasZe = text.includes("仄韵");
  if (hasPing && !hasZe) return Tone.Ping;
  if (hasZe && !hasPing) return Tone.Ze;
  return null;
}

export function variantSummary(
  genre: Genre,
  tuneName: string,
  variantId: string,
): string {
  if (!variantId) return "";
  const template = allTemplates.find(
    (entry) => entry.genre === genre && entry.name === tuneName,
  );
  const variant = template?.variants.find((item) => item.id === variantId);
  if (!variant) return variantId;
  if (genre === "meter") {
    return `${variant.rhymeFirst ? "首句押韵" : "首句不押韵"} · ${variant.author}`;
  }
  return `${variant.author} · ${variant.sketch}`;
}

export function firstVariantForTune(genre: Genre, tuneName: string): string {
  return (
    allTemplates.find((item) => item.genre === genre && item.name === tuneName)
      ?.variants[0]?.id ?? ""
  );
}
