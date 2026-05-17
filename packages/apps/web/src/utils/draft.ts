import { RhymeDictType } from '@poem/parser/kernel';
import type { TemplateEntry } from '@poem/parser/catalog';
import type { PoemCreationDraft } from '../persist';

const ACTIVE_DRAFT_ID_FALLBACK = 'active';

export function createDraftId(): string {
  if ('crypto' in window && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyDraft(): PoemCreationDraft {
  return {
    schemaVersion: 1,
    id: createDraftId(),
    title: '',
    description: '',
    author: '',
    genre: 'meter',
    selectedTune: '',
    selectedVariant: '',
    rhymeType: RhymeDictType.Pingshui,
    chars: [],
    updatedAt: new Date().toISOString(),
  };
}

export function formatDraftTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
  return '';
}

export function normalizeDraft(
  draft: PoemCreationDraft,
  templates: TemplateEntry[],
): PoemCreationDraft {
  const id = draft.id || ACTIVE_DRAFT_ID_FALLBACK;
  if (draft.selectedTune || !draft.selectedVariant) return { ...draft, id };

  // Older IndexedDB rows may have a variant id but no tune name. Recovering it
  // here keeps legacy work editable without a one-off migration.
  return {
    ...draft,
    id,
    selectedTune: inferTemplateNameFromVariant(draft.selectedVariant, templates),
  };
}
