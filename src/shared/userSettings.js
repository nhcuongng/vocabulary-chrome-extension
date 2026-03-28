export const USER_SETTINGS_SCHEMA_VERSION = 1;
export const USER_SETTINGS_STORAGE_KEY = 'user-settings';

export const DEFAULT_USER_SETTINGS = Object.freeze({
  schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
  autoPopupEnabled: true,
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
    };
  }

  if (typeof rawValue !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const normalizedAutoPopupEnabled =
    toBooleanOrNull(rawValue.autoPopupEnabled) ?? DEFAULT_USER_SETTINGS.autoPopupEnabled;

  return {
    schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
    autoPopupEnabled: normalizedAutoPopupEnabled,
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
