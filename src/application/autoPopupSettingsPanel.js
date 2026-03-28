export function createAutoPopupSettingsPanel({
  toggleElement,
  autoPopupController,
  onError,
} = {}) {
  if (
    !toggleElement ||
    typeof toggleElement.addEventListener !== 'function' ||
    typeof toggleElement.removeEventListener !== 'function'
  ) {
    throw new Error('toggleElement with addEventListener/removeEventListener is required');
  }

  if (!autoPopupController || typeof autoPopupController.start !== 'function') {
    throw new Error('autoPopupController with start() is required');
  }

  let started = false;
  let unsubscribe = null;

  const syncToggle = (enabled) => {
    toggleElement.checked = Boolean(enabled);
  };

  const handleChange = async () => {
    try {
      await autoPopupController.setAutoPopupEnabled(toggleElement.checked);
    } catch (error) {
      onError?.(error);
      syncToggle(autoPopupController.isAutoPopupEnabled?.());
    }
  };

  const init = async () => {
    if (started) {
      return;
    }

    started = true;

    await autoPopupController.start();
    syncToggle(autoPopupController.isAutoPopupEnabled?.());

    if (typeof autoPopupController.subscribe === 'function') {
      unsubscribe = autoPopupController.subscribe((nextSettings) => {
        syncToggle(nextSettings?.autoPopupEnabled);
      });
    }

    toggleElement.addEventListener('change', handleChange);
  };

  const destroy = () => {
    if (!started) {
      return;
    }

    started = false;
    toggleElement.removeEventListener('change', handleChange);
    unsubscribe?.();
    unsubscribe = null;
    autoPopupController.stop?.();
  };

  return {
    init,
    destroy,
    syncToggle,
  };
}
