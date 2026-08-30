export const USER_SETTINGS_SCHEMA_VERSION = 1;
export const USER_SETTINGS_STORAGE_KEY = 'user-settings';

export const DICTIONARY_SOURCE = Object.freeze({
  AUTO: 'auto',
  VOCABULARY: 'vocabulary',
  CAMBRIDGE: 'cambridge',
  FREEDICTIONARY: 'freedictionary',
});

export const DEFAULT_USER_SETTINGS = Object.freeze({
  schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
  autoPopupEnabled: true,
  darkMode: false,
  dictionarySource: DICTIONARY_SOURCE.AUTO,
});

function toBooleanOrNull(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function normalizeDictionarySource(source) {
  if (typeof source !== 'string') {
    return DEFAULT_USER_SETTINGS.dictionarySource;
  }

  const trimmed = source.trim().toLowerCase();
  if (
    trimmed === DICTIONARY_SOURCE.AUTO ||
    trimmed === DICTIONARY_SOURCE.VOCABULARY ||
    trimmed === DICTIONARY_SOURCE.CAMBRIDGE ||
    trimmed === DICTIONARY_SOURCE.FREEDICTIONARY
  ) {
    return trimmed;
  }

  return DEFAULT_USER_SETTINGS.dictionarySource;
}

export function normalizeUserSettings(rawValue) {
  if (rawValue == null) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  if (typeof rawValue === 'boolean') {
    return {
      schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
      autoPopupEnabled: rawValue,
      darkMode: DEFAULT_USER_SETTINGS.darkMode,
      dictionarySource: DEFAULT_USER_SETTINGS.dictionarySource,
    };
  }

  if (typeof rawValue !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const normalizedAutoPopupEnabled =
    toBooleanOrNull(rawValue.autoPopupEnabled) ?? DEFAULT_USER_SETTINGS.autoPopupEnabled;

  const normalizedDarkMode =
    toBooleanOrNull(rawValue.darkMode) ?? DEFAULT_USER_SETTINGS.darkMode;

  const normalizedDictionarySource = normalizeDictionarySource(rawValue.dictionarySource);

  return {
    schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
    autoPopupEnabled: normalizedAutoPopupEnabled,
    darkMode: normalizedDarkMode,
    dictionarySource: normalizedDictionarySource,
  };
}

export function mergeUserSettings(currentSettings, patch) {
  const normalizedCurrent = normalizeUserSettings(currentSettings);

  if (!patch || typeof patch !== 'object') {
    return normalizedCurrent;
  }

  return normalizeUserSettings({
    ...normalizedCurrent,
    ...patch,
  });
}
