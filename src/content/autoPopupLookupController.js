import { createSelectionDetectionController } from './selectionDetection.js';

export function createAutoPopupLookupController({
  eventTarget,
  onLookupRequest,
  onTriggerIconRequest,
  settingsStore,
  getSnapshot,
  onInvalidSelection,
  onIgnoredDuplicate,
  debounceMs,
  dedupeWindowMs,
  now,
  setTimer,
  clearTimer,
} = {}) {
  if (!settingsStore || typeof settingsStore.load !== 'function') {
    throw new Error('settingsStore with load() is required');
  }

  let runtimeStarted = false;
  let autoPopupEnabled = true;
  let darkMode = false;
  let unsubscribeSettingsStore = null;
  const listeners = new Set();

  const selectionController = createSelectionDetectionController({
    eventTarget,
    onLookupRequest: (request) => {
      if (autoPopupEnabled) {
        onLookupRequest(request);
      } else {
        onTriggerIconRequest?.(request);
      }
    },
    getSnapshot,
    onInvalidSelection,
    onIgnoredDuplicate,
    debounceMs,
    dedupeWindowMs,
    now,
    setTimer,
    clearTimer,
  });

  const emit = () => {
    const payload = {
      autoPopupEnabled,
      darkMode,
    };

    for (const listener of listeners) {
      listener(payload);
    }
  };

  const applySettings = (settings) => {
    autoPopupEnabled = Boolean(settings?.autoPopupEnabled ?? true);
    darkMode = Boolean(settings?.darkMode ?? false);

    if (runtimeStarted) {
      selectionController.start();
    }

    emit();
  };

  const start = async () => {
    if (runtimeStarted) {
      return;
    }

    runtimeStarted = true;

    try {
      const loadedSettings = await settingsStore.load();

      if (typeof settingsStore.subscribe === 'function') {
        unsubscribeSettingsStore = settingsStore.subscribe((nextSettings) => {
          applySettings(nextSettings);
        });
      }

      applySettings(loadedSettings);
    } catch (error) {
      runtimeStarted = false;
      unsubscribeSettingsStore?.();
      unsubscribeSettingsStore = null;
      throw error;
    }
  };

  const stop = () => {
    if (!runtimeStarted) {
      return;
    }

    runtimeStarted = false;
    unsubscribeSettingsStore?.();
    unsubscribeSettingsStore = null;
    selectionController.stop();
  };

  const setAutoPopupEnabled = async (enabled) => {
    const nextValue = Boolean(enabled);

    if (typeof settingsStore.update === 'function') {
      await settingsStore.update({ autoPopupEnabled: nextValue });
      return;
    }

    if (typeof settingsStore.save !== 'function') {
      throw new Error('settingsStore must provide update() or save()');
    }

    const currentSettings =
      settingsStore.getSnapshot?.() ??
      (typeof settingsStore.load === 'function' ? await settingsStore.load() : {});

    await settingsStore.save({
      ...currentSettings,
      autoPopupEnabled: nextValue,
    });
  };

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
      throw new Error('listener must be a function');
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    start,
    stop,
    setAutoPopupEnabled,
    subscribe,
    isAutoPopupEnabled: () => autoPopupEnabled,
    getState: () => ({
      runtimeStarted,
      autoPopupEnabled,
      selectionState: selectionController.getState(),
    }),
  };
}
