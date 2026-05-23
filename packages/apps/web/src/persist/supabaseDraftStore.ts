import type {
  PoemCreationDraft,
  PoemCreationDraftStore,
  PoemCreationDraftSummary,
} from './types';
import type { SupabasePersistenceSettings } from '../utils/settings';

const ACTIVE_META_KEY = 'activeDraftId';

type SupabaseDraftRow = {
  id: string;
  payload: PoemCreationDraft;
  updated_at?: string;
};

type SupabaseMetaRow = {
  key: string;
  value: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function encodeFilterValue(value: string): string {
  return encodeURIComponent(value);
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

export function supabaseStoreReady(settings: SupabasePersistenceSettings): boolean {
  return Boolean(settings.url.trim() && settings.anonKey.trim());
}

export class SupabaseDraftStore implements PoemCreationDraftStore {
  private readonly baseUrl: string;
  private readonly settings: SupabasePersistenceSettings;

  constructor(settings: SupabasePersistenceSettings) {
    this.settings = settings;
    this.baseUrl = `${trimTrailingSlash(settings.url)}/rest/v1`;
  }

  private headers(extra?: HeadersInit): HeadersInit {
    return {
      apikey: this.settings.anonKey,
      Authorization: `Bearer ${this.settings.anonKey}`,
      ...extra,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers(init.headers),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Supabase ${response.status}: ${detail || response.statusText}`,
      );
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  async listDrafts(): Promise<PoemCreationDraftSummary[]> {
    const rows = await this.request<SupabaseDraftRow[]>(
      `/${this.settings.draftsTable}?select=id,payload,updated_at&order=updated_at.desc`,
    );
    return rows
      .map((row) => row.payload)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
  }

  async loadActiveDraftId(): Promise<string | null> {
    const rows = await this.request<SupabaseMetaRow[]>(
      `/${this.settings.metaTable}?select=key,value&key=eq.${encodeFilterValue(ACTIVE_META_KEY)}&limit=1`,
    );
    return rows[0]?.value ?? null;
  }

  async setActiveDraftId(id: string): Promise<void> {
    await this.request<void>(
      `/${this.settings.metaTable}?on_conflict=key`,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ key: ACTIVE_META_KEY, value: id }),
      },
    );
  }

  async loadDraft(id: string): Promise<PoemCreationDraft | null> {
    const rows = await this.request<SupabaseDraftRow[]>(
      `/${this.settings.draftsTable}?select=id,payload&id=eq.${encodeFilterValue(id)}&limit=1`,
    );
    return rows[0]?.payload ?? null;
  }

  async saveDraft(draft: PoemCreationDraft): Promise<void> {
    await this.request<void>(
      `/${this.settings.draftsTable}?on_conflict=id`,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: draft.id,
        payload: draft,
        updated_at: draft.updatedAt,
      }),
      },
    );
    await this.setActiveDraftId(draft.id);
  }

  async deleteDraft(id: string): Promise<void> {
    await this.request<void>(
      `/${this.settings.draftsTable}?id=eq.${encodeFilterValue(id)}`,
      {
        method: 'DELETE',
      },
    );
  }
}
