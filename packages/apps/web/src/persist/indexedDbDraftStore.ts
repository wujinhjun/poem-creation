import type {
  PoemCreationDraft,
  PoemCreationDraftStore,
  PoemCreationDraftSummary,
} from "./types";
import {
  DRAFT_STORE_NAME,
  META_STORE_NAME,
  runDbTransaction,
} from "./indexedDb";
const ACTIVE_DRAFT_ID = "active";
const ACTIVE_META_ID = "activeDraftId";

function legacyDraftToCurrent(draft: PoemCreationDraft | (Omit<PoemCreationDraft, "id"> & { id?: string })): PoemCreationDraft {
  return {
    ...draft,
    id: draft.id ?? ACTIVE_DRAFT_ID,
    description: draft.description ?? "",
  };
}

function toSummary(draft: PoemCreationDraft): PoemCreationDraftSummary {
  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    author: draft.author,
    genre: draft.genre,
    selectedTune: draft.selectedTune,
    selectedVariant: draft.selectedVariant,
    updatedAt: draft.updatedAt,
  };
}

export class IndexedDbDraftStore implements PoemCreationDraftStore {
  async listDrafts(): Promise<PoemCreationDraftSummary[]> {
    if (!("indexedDB" in window)) return [];
    const drafts = await runDbTransaction<PoemCreationDraft[]>(
      DRAFT_STORE_NAME,
      "readonly",
      (store) => store.getAll(),
    );
    return drafts
      .map(legacyDraftToCurrent)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
  }

  async loadActiveDraftId(): Promise<string | null> {
    if (!("indexedDB" in window)) return null;
    const activeId = await runDbTransaction<string | undefined>(
      META_STORE_NAME,
      "readonly",
      (store) => store.get(ACTIVE_META_ID),
    );
    if (activeId) return activeId;

    const legacyDraft = await this.loadDraft(ACTIVE_DRAFT_ID);
    return legacyDraft?.id ?? null;
  }

  async setActiveDraftId(id: string): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDbTransaction<IDBValidKey>(
      META_STORE_NAME,
      "readwrite",
      (store) => store.put(id, ACTIVE_META_ID),
    );
  }

  async loadDraft(id: string): Promise<PoemCreationDraft | null> {
    if (!("indexedDB" in window)) return null;
    const draft = await runDbTransaction<PoemCreationDraft | undefined>(
      DRAFT_STORE_NAME,
      "readonly",
      (store) => store.get(id),
    );
    return draft ? legacyDraftToCurrent(draft) : null;
  }

  async saveDraft(draft: PoemCreationDraft): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDbTransaction<IDBValidKey>(
      DRAFT_STORE_NAME,
      "readwrite",
      (store) => store.put(draft, draft.id),
    );
    await this.setActiveDraftId(draft.id);
  }

  async deleteDraft(id: string): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDbTransaction<undefined>(
      DRAFT_STORE_NAME,
      "readwrite",
      (store) => store.delete(id),
    );
  }
}
