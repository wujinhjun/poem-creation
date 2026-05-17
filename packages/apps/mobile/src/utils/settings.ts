import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "poem-creation-app:settings";

export type UserSettings = {
  defaultAuthor: string;
};

export const defaultSettings: UserSettings = {
  defaultAuthor: "",
};

export async function loadUserSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
