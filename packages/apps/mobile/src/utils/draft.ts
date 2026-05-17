import { RhymeDictType } from "@poem/parser/kernel";
import type { TemplateEntry } from "@poem/parser/catalog";

import type { PoemCreationDraft } from "../persist";

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
  templates: TemplateEntry[],
): PoemCreationDraft {
  if (draft.selectedTune || !draft.selectedVariant) return draft;
  return {
    ...draft,
    selectedTune: inferTemplateNameFromVariant(draft.selectedVariant, templates),
  };
}
