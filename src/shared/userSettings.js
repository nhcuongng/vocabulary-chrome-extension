export const USER_SETTINGS_SCHEMA_VERSION = 2;
export const USER_SETTINGS_STORAGE_KEY = 'user-settings';

export const DICTIONARY_SOURCE = Object.freeze({
  VOCABULARY: 'vocabulary',
  FREEDICTIONARY: 'freedictionary',
});

export const PRONUNCIATION_ACCENT = Object.freeze({
  US: 'us',
  UK: 'uk',
});

export const DEFAULT_USER_SETTINGS = Object.freeze({
  schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
  autoPopupEnabled: true,
  darkMode: false,
  simpleLearn: false,
  rememberLastLookup: true,
  ctrlPronounceEnabled: true,
  defaultPronunciation: 'us',
  tabOrderPreference: Object.freeze([]),
  hiddenTabsPreference: Object.freeze([]),
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

export function normalizeUserSettings(rawValue) {
  if (rawValue == null) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  if (typeof rawValue === 'boolean') {
    return {
      schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
      autoPopupEnabled: rawValue,
      darkMode: DEFAULT_USER_SETTINGS.darkMode,
      simpleLearn: DEFAULT_USER_SETTINGS.simpleLearn,
      rememberLastLookup: DEFAULT_USER_SETTINGS.rememberLastLookup,
      ctrlPronounceEnabled: DEFAULT_USER_SETTINGS.ctrlPronounceEnabled,
      defaultPronunciation: DEFAULT_USER_SETTINGS.defaultPronunciation,
      tabOrderPreference: DEFAULT_USER_SETTINGS.tabOrderPreference,
      hiddenTabsPreference: DEFAULT_USER_SETTINGS.hiddenTabsPreference,
    };
  }

  if (typeof rawValue !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const normalizedAutoPopupEnabled =
    toBooleanOrNull(rawValue.autoPopupEnabled) ?? DEFAULT_USER_SETTINGS.autoPopupEnabled;

  const normalizedDarkMode =
    toBooleanOrNull(rawValue.darkMode) ?? DEFAULT_USER_SETTINGS.darkMode;

  const normalizedRememberLastLookup =
    toBooleanOrNull(rawValue.rememberLastLookup) ?? DEFAULT_USER_SETTINGS.rememberLastLookup;

  const normalizedCtrlPronounceEnabled =
    toBooleanOrNull(rawValue.ctrlPronounceEnabled) ?? DEFAULT_USER_SETTINGS.ctrlPronounceEnabled;

  let normalizedDefaultPronunciation = DEFAULT_USER_SETTINGS.defaultPronunciation;
  if (typeof rawValue.defaultPronunciation === 'string') {
    const cleanPron = rawValue.defaultPronunciation.trim().toLowerCase();
    if (cleanPron === 'uk' || cleanPron === 'en-gb' || cleanPron === 'gb') {
      normalizedDefaultPronunciation = 'uk';
    } else if (cleanPron === 'us' || cleanPron === 'en-us') {
      normalizedDefaultPronunciation = 'us';
    }
  }

  let normalizedSimpleLearn = toBooleanOrNull(rawValue.simpleLearn);
  if (normalizedSimpleLearn === null) {
    // Migration: If legacy dictionarySource was freedictionary, map to simpleLearn = true
    if (rawValue.dictionarySource === 'freedictionary') {
      normalizedSimpleLearn = true;
    } else {
      normalizedSimpleLearn = DEFAULT_USER_SETTINGS.simpleLearn;
    }
  }

  let normalizedTabOrderPreference = [];
  if (Array.isArray(rawValue.tabOrderPreference)) {
    normalizedTabOrderPreference = rawValue.tabOrderPreference
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  let normalizedHiddenTabsPreference = [];
  if (Array.isArray(rawValue.hiddenTabsPreference)) {
    normalizedHiddenTabsPreference = rawValue.hiddenTabsPreference
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return {
    schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
    autoPopupEnabled: normalizedAutoPopupEnabled,
    darkMode: normalizedDarkMode,
    simpleLearn: normalizedSimpleLearn,
    rememberLastLookup: normalizedRememberLastLookup,
    ctrlPronounceEnabled: normalizedCtrlPronounceEnabled,
    defaultPronunciation: normalizedDefaultPronunciation,
    tabOrderPreference: normalizedTabOrderPreference,
    hiddenTabsPreference: normalizedHiddenTabsPreference,
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

