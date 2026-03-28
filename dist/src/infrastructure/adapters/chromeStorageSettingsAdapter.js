import {
  DEFAULT_USER_SETTINGS,
  USER_SETTINGS_STORAGE_KEY,
  mergeUserSettings,
  normalizeUserSettings,
} from '../../shared/userSettings.js';

function isPromiseLike(value) {
  return !!value && typeof value.then === 'function';
}

function isSameSettings(left, right) {
  return (
    left?.schemaVersion === right?.schemaVersion &&
    left?.autoPopupEnabled === right?.autoPopupEnabled
  );
}

async function readFromStorageArea(storageArea, storageKey) {
  const maybePromise = storageArea.get(storageKey);
  if (isPromiseLike(maybePromise)) {
    const raw = await maybePromise;
    return raw?.[storageKey];
  }

  return new Promise((resolve, reject) => {
    storageArea.get(storageKey, (raw) => {
      const lastError = globalThis.chrome?.runtime?.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }

      resolve(raw?.[storageKey]);
    });
  });
}

async function writeToStorageArea(storageArea, storageKey, value) {
  const payload = {
    [storageKey]: value,
  };

  const maybePromise = storageArea.set(payload);
  if (isPromiseLike(maybePromise)) {
    await maybePromise;
    return;
  }

  await new Promise((resolve, reject) => {
    storageArea.set(payload, () => {
      const lastError = globalThis.chrome?.runtime?.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }

      resolve();
    });
  });
}

export function createChromeStorageSettingsAdapter({
  storageArea = globalThis.chrome?.storage?.local,
  storageChangeEvent = globalThis.chrome?.storage?.onChanged,
  storageKey = USER_SETTINGS_STORAGE_KEY,
  storageAreaName = 'local',
  defaultSettings = DEFAULT_USER_SETTINGS,
} = {}) {
  if (
    !storageArea ||
    typeof storageArea.get !== 'function' ||
    typeof storageArea.set !== 'function'
  ) {
    throw new Error('storageArea with get/set is required');
  }

  let currentSettings = normalizeUserSettings(defaultSettings);
  let initialized = false;
  let writeQueue = Promise.resolve();
  let pendingLocalWriteSettings = null;
  const listeners = new Set();

  const emit = (settings, meta) => {
    for (const listener of listeners) {
      listener(settings, meta);
    }
  };

  const handleStorageChanged = (changes, areaName) => {
    if (areaName !== storageAreaName) {
      return;
    }

    const changed = changes?.[storageKey];
    if (!changed) {
      return;
    }

    const nextSettings = normalizeUserSettings(changed.newValue);

    if (pendingLocalWriteSettings && isSameSettings(nextSettings, pendingLocalWriteSettings)) {
      pendingLocalWriteSettings = null;
      return;
    }

    if (isSameSettings(nextSettings, currentSettings)) {
      return;
    }

    currentSettings = nextSettings;
    initialized = true;
    emit(nextSettings, { source: 'external-change' });
  };

  storageChangeEvent?.addListener?.(handleStorageChanged);

  const load = async () => {
    try {
      const rawSettings = await readFromStorageArea(storageArea, storageKey);
      currentSettings = normalizeUserSettings(rawSettings);
    } catch {
      currentSettings = normalizeUserSettings(defaultSettings);
    }

    initialized = true;
    emit(currentSettings, { source: 'load' });
    return currentSettings;
  };

  const save = async (nextSettings) => {
    const normalizedNextSettings = normalizeUserSettings(nextSettings);

    writeQueue = writeQueue.then(async () => {
      pendingLocalWriteSettings = normalizedNextSettings;
      await writeToStorageArea(storageArea, storageKey, normalizedNextSettings);
      currentSettings = normalizedNextSettings;
      initialized = true;
      emit(currentSettings, { source: 'save' });
      return currentSettings;
    });

    return writeQueue;
  };

  const update = async (patch) => {
    const base = initialized ? currentSettings : await load();
    const merged = mergeUserSettings(base, patch);
    return save(merged);
  };

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
      throw new Error('listener must be a function');
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => {
    storageChangeEvent?.removeListener?.(handleStorageChanged);
  };

  return {
    load,
    save,
    update,
    subscribe,
    destroy,
    getSnapshot: () => normalizeUserSettings(currentSettings),
  };
}
