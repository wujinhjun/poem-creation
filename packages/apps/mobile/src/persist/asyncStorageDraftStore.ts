import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  PoemCreationDraft,
  PoemCreationDraftStore,
  PoemCreationDraftSummary,
} from "./types";

const DRAFT_INDEX_KEY = "poem-creation-app:draft-index";
const ACTIVE_DRAFT_KEY = "poem-creation-app:active-draft-id";
const DRAFT_PREFIX = "poem-creation-app:draft:";

function draftKey(id: string): string {
  return `${DRAFT_PREFIX}${id}`;
}

async function readIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DRAFT_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function writeIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify([...new Set(ids)]));
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

export class AsyncStorageDraftStore implements PoemCreationDraftStore {
  async listDrafts(): Promise<PoemCreationDraftSummary[]> {
    const ids = await readIndex();
    const rows = await AsyncStorage.multiGet(ids.map(draftKey));
    return rows
      .map(([, raw]) => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as PoemCreationDraft;
        } catch {
          return null;
        }
      })
      .filter((draft): draft is PoemCreationDraft => draft?.schemaVersion === 1)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
  }

  loadActiveDraftId(): Promise<string | null> {
    return AsyncStorage.getItem(ACTIVE_DRAFT_KEY);
  }

  async setActiveDraftId(id: string): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_DRAFT_KEY, id);
  }

  async loadDraft(id: string): Promise<PoemCreationDraft | null> {
    const raw = await AsyncStorage.getItem(draftKey(id));
    if (!raw) return null;
    try {
      const draft = JSON.parse(raw) as PoemCreationDraft;
      return draft.schemaVersion === 1 ? draft : null;
    } catch {
      return null;
    }
  }

  async saveDraft(draft: PoemCreationDraft): Promise<void> {
    const ids = await readIndex();
    await AsyncStorage.multiSet([
      [draftKey(draft.id), JSON.stringify(draft)],
      [ACTIVE_DRAFT_KEY, draft.id],
    ]);
    await writeIndex([draft.id, ...ids]);
  }

  async deleteDraft(id: string): Promise<void> {
    const ids = await readIndex();
    await AsyncStorage.removeItem(draftKey(id));
    await writeIndex(ids.filter((item) => item !== id));
    const activeId = await this.loadActiveDraftId();
    if (activeId === id) await AsyncStorage.removeItem(ACTIVE_DRAFT_KEY);
  }
}
