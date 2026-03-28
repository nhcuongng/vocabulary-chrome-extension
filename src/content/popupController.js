export function createPopupController({
  eventTarget,
  popupElement,
  onClose,
  onOpen,
} = {}) {
  if (
    !eventTarget ||
    typeof eventTarget.addEventListener !== 'function' ||
    typeof eventTarget.removeEventListener !== 'function'
  ) {
    throw new Error('eventTarget with addEventListener/removeEventListener is required');
  }

  if (!popupElement || typeof popupElement.contains !== 'function') {
    throw new Error('popupElement with contains() is required');
  }

  let opened = false;
  let previousActiveElement = null;

  const handleKeydown = (event) => {
    if (event?.key === 'Escape') {
      close('escape');
    }
  };

  const handlePointerDown = (event) => {
    const target = event?.target;
    if (target && typeof target === 'object' && !popupElement.contains(target)) {
      close('click-outside');
    }
  };

  function attachListeners() {
    eventTarget.addEventListener('keydown', handleKeydown);
    eventTarget.addEventListener('pointerdown', handlePointerDown);
  }

  function detachListeners() {
    eventTarget.removeEventListener('keydown', handleKeydown);
    eventTarget.removeEventListener('pointerdown', handlePointerDown);
  }

  function open() {
    if (opened) {
      return;
    }

    opened = true;
    previousActiveElement = eventTarget.activeElement ?? null;
    attachListeners();
    onOpen?.();
  }

  function close(reason = 'manual') {
    if (!opened) {
      return;
    }

    opened = false;
    detachListeners();

    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }

    onClose?.({ reason });
  }

  return {
    open,
    close,
    isOpen: () => opened,
  };
}
