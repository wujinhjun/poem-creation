const SETTINGS_KEY = 'poem-creation-web:settings';

export type UserSettings = {
  defaultAuthor: string;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultAuthor: '',
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

