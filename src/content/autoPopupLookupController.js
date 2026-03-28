import { createSelectionDetectionController } from './selectionDetection.js';

export function createAutoPopupLookupController({
  eventTarget,
  onLookupRequest,
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

  const selectionController = createSelectionDetectionController({
    eventTarget,
    onLookupRequest,
    getSnapshot,
    onInvalidSelection,
    onIgnoredDuplicate,
    debounceMs,
    dedupeWindowMs,
    now,
    setTimer,
    clearTimer,
  });

  let runtimeStarted = false;
  let autoPopupEnabled = true;
  let unsubscribeSettingsStore = null;
  const listeners = new Set();

  const emit = () => {
    const payload = {
      autoPopupEnabled,
    };

    for (const listener of listeners) {
      listener(payload);
    }
  };

  const applyAutoPopupEnabled = (enabled) => {
    autoPopupEnabled = Boolean(enabled);

    if (runtimeStarted) {
      if (autoPopupEnabled) {
        selectionController.start();
      } else {
        selectionController.stop();
      }
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
          applyAutoPopupEnabled(nextSettings?.autoPopupEnabled);
        });
      }

      applyAutoPopupEnabled(loadedSettings?.autoPopupEnabled);
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
