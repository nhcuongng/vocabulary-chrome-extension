export const SEARCH_HISTORY_STORAGE_KEY = 'vocab_search_history';
export const MAX_HISTORY_ITEMS = 50;

function isPromiseLike(value) {
  return !!value && typeof value.then === 'function';
}

function normalizeWordToken(word) {
  if (typeof word !== 'string') return '';
  return word.trim().toLowerCase();
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

  return new Promise((resolve, reject) => {
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

function normalizeHistoryArray(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    const word = typeof item === 'string' ? normalizeWordToken(item) : normalizeWordToken(item?.word);
    if (word && !seen.has(word)) {
      seen.add(word);
      result.push(word);
      if (result.length >= MAX_HISTORY_ITEMS) break;
    }
  }
  return result;
}

export function createChromeStorageHistoryAdapter({
  storageArea = globalThis.chrome?.storage?.local,
  storageChangeEvent = globalThis.chrome?.storage?.onChanged,
  storageKey = SEARCH_HISTORY_STORAGE_KEY,
  storageAreaName = 'local',
  maxItems = MAX_HISTORY_ITEMS,
} = {}) {
  if (
    !storageArea ||
    typeof storageArea.get !== 'function' ||
    typeof storageArea.set !== 'function'
  ) {
    throw new Error('storageArea with get/set is required');
  }

  let currentHistory = [];
  let initialized = false;
  let writeQueue = Promise.resolve();
  let pendingLocalWriteHistory = null;
  const listeners = new Set();

  const emit = (history, meta) => {
    for (const listener of listeners) {
      listener(history, meta);
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

    const nextHistory = normalizeHistoryArray(changed.newValue);

    if (
      pendingLocalWriteHistory &&
      JSON.stringify(nextHistory) === JSON.stringify(pendingLocalWriteHistory)
    ) {
      pendingLocalWriteHistory = null;
      return;
    }

    currentHistory = nextHistory;
    initialized = true;
    emit(nextHistory, { source: 'external-change' });
  };

  storageChangeEvent?.addListener?.(handleStorageChanged);

  const load = async () => {
    try {
      const raw = await readFromStorageArea(storageArea, storageKey);
      currentHistory = normalizeHistoryArray(raw);
    } catch {
      currentHistory = [];
    }

    initialized = true;
    emit(currentHistory, { source: 'load' });
    return currentHistory;
  };

  const save = async (nextHistory) => {
    const normalized = normalizeHistoryArray(nextHistory);

    writeQueue = writeQueue.then(async () => {
      pendingLocalWriteHistory = normalized;
      await writeToStorageArea(storageArea, storageKey, normalized);
      currentHistory = normalized;
      initialized = true;
      emit(currentHistory, { source: 'save' });
      return currentHistory;
    });

    return writeQueue;
  };

  const addSearchWord = async (word) => {
    const token = normalizeWordToken(word);
    if (!token) return getSnapshot();

    const base = initialized ? currentHistory : await load();
    const filtered = base.filter((w) => w !== token);
    const updated = [token, ...filtered].slice(0, maxItems);
    return save(updated);
  };

  const getRecentSearchWords = (limit = 5) => {
    return currentHistory.slice(0, Math.max(1, limit));
  };

  const getSearchSuggestions = (query, limit = 5) => {
    const q = normalizeWordToken(query);
    if (!q) return getRecentSearchWords(limit);

    // Prefix matches first, then contains matches
    const prefixMatches = [];
    const containsMatches = [];

    for (const word of currentHistory) {
      if (word === q) continue; // Skip exact match in suggestions
      if (word.startsWith(q)) {
        prefixMatches.push(word);
      } else if (word.includes(q)) {
        containsMatches.push(word);
      }
    }

    return [...prefixMatches, ...containsMatches].slice(0, Math.max(1, limit));
  };

  const clearSearchHistory = async () => {
    return save([]);
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

  const getSnapshot = () => [...currentHistory];

  return {
    load,
    save,
    addSearchWord,
    getRecentSearchWords,
    getSearchSuggestions,
    clearSearchHistory,
    subscribe,
    destroy,
    getSnapshot,
  };
}
