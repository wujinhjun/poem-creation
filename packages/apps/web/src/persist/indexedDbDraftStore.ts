import type {
  PoemCreationDraft,
  PoemCreationDraftStore,
  PoemCreationDraftSummary,
} from "./types";

const DB_NAME = "poem-creation-web";
const DB_VERSION = 2;
const STORE_NAME = "drafts";
const META_STORE_NAME = "meta";
const ACTIVE_DRAFT_ID = "active";
const ACTIVE_META_ID = "activeDraftId";

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runDraftTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
  storeName = STORE_NAME,
): Promise<T> {
  return openDraftDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  }));
}

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
    const drafts = await runDraftTransaction<PoemCreationDraft[]>(
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
    const activeId = await runDraftTransaction<string | undefined>(
      "readonly",
      (store) => store.get(ACTIVE_META_ID),
      META_STORE_NAME,
    );
    if (activeId) return activeId;

    const legacyDraft = await this.loadDraft(ACTIVE_DRAFT_ID);
    return legacyDraft?.id ?? null;
  }

  async setActiveDraftId(id: string): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDraftTransaction<IDBValidKey>(
      "readwrite",
      (store) => store.put(id, ACTIVE_META_ID),
      META_STORE_NAME,
    );
  }

  async loadDraft(id: string): Promise<PoemCreationDraft | null> {
    if (!("indexedDB" in window)) return null;
    const draft = await runDraftTransaction<PoemCreationDraft | undefined>(
      "readonly",
      (store) => store.get(id),
    );
    return draft ? legacyDraftToCurrent(draft) : null;
  }

  async saveDraft(draft: PoemCreationDraft): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDraftTransaction<IDBValidKey>(
      "readwrite",
      (store) => store.put(draft, draft.id),
    );
    await this.setActiveDraftId(draft.id);
  }

  async deleteDraft(id: string): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDraftTransaction<undefined>(
      "readwrite",
      (store) => store.delete(id),
    );
  }
}
