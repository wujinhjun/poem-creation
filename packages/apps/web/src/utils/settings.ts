const SETTINGS_KEY = 'poem-creation-web:settings';

export const SUPABASE_BYOK_ENABLED = false;

export type UserSettings = {
  defaultAuthor: string;
  persistence: PersistenceSettings;
};

export type PersistenceSettings =
  | {
      mode: 'local';
      supabase: SupabasePersistenceSettings;
    }
  | {
      mode: 'supabase';
      supabase: SupabasePersistenceSettings;
    };

export type SupabasePersistenceSettings = {
  url: string;
  anonKey: string;
  draftsTable: string;
  metaTable: string;
};

export const DEFAULT_SUPABASE_SETTINGS: SupabasePersistenceSettings = {
  url: '',
  anonKey: '',
  draftsTable: 'poem_creation_drafts',
  metaTable: 'poem_creation_meta',
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultAuthor: '',
  persistence: {
    mode: 'local',
    supabase: DEFAULT_SUPABASE_SETTINGS,
  },
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const parsedPersistence = {
      ...DEFAULT_USER_SETTINGS.persistence,
      ...parsed.persistence,
      supabase: {
        ...DEFAULT_SUPABASE_SETTINGS,
        ...parsed.persistence?.supabase,
      },
    };
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      persistence: {
        ...parsedPersistence,
        mode: SUPABASE_BYOK_ENABLED ? parsedPersistence.mode : 'local',
      },
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
