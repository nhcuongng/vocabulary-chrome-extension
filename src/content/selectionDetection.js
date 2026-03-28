import {
  LOOKUP_DECISION_STATUS,
  createDuplicateLookupDecision,
  createInvalidLookupDecision,
  createLookupRequest,
  createValidLookupDecision,
} from '../shared/lookupContract.js';
import { TOKEN_VALIDATION_REASON, validateMvpOneWordToken } from '../shared/wordNormalization.js';

export const SELECTION_EVENT_TYPES = ['mouseup', 'touchend', 'keyup'];
export const DEFAULT_SELECTION_DEBOUNCE_MS = 150;
export const DEFAULT_DEDUPE_WINDOW_MS = 350;
export { LOOKUP_DECISION_STATUS };

export const INVALID_SELECTION_REASONS = {
  EMPTY: 'empty-selection',
  MULTI_TOKEN: 'multi-token-selection',
  INVALID_TOKEN: 'invalid-token-selection',
  MISSING_RECT: 'missing-selection-rect',
};

export function normalizeSelectionText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

export function validateSelectionToken(text) {
  const result = validateMvpOneWordToken(text);

  if (!result.isValid) {
    if (result.reasonCode === TOKEN_VALIDATION_REASON.EMPTY) {
      return createInvalidLookupDecision(INVALID_SELECTION_REASONS.EMPTY, {
        normalizedText: result.normalizedSelection,
        reasonCode: result.reasonCode,
      });
    }

    if (result.reasonCode === TOKEN_VALIDATION_REASON.MULTI_TOKEN) {
      return createInvalidLookupDecision(INVALID_SELECTION_REASONS.MULTI_TOKEN, {
        normalizedText: result.normalizedSelection,
        tokenCount: result.tokenCount,
        reasonCode: result.reasonCode,
      });
    }

    return createInvalidLookupDecision(INVALID_SELECTION_REASONS.INVALID_TOKEN, {
      normalizedText: result.normalizedSelection,
      token: result.rawToken,
      normalizedToken: result.normalizedToken,
      reasonCode: result.reasonCode,
    });
  }

  return {
    status: LOOKUP_DECISION_STATUS.VALID,
    normalizedText: result.normalizedSelection,
    token: result.normalizedToken,
    rawToken: result.rawToken,
  };
}

export function toSerializableRect(rect) {
  if (!rect) {
    return null;
  }

  return {
    x: Number(rect.x ?? rect.left ?? 0),
    y: Number(rect.y ?? rect.top ?? 0),
    width: Number(rect.width ?? 0),
    height: Number(rect.height ?? 0),
    top: Number(rect.top ?? rect.y ?? 0),
    left: Number(rect.left ?? rect.x ?? 0),
    right: Number(rect.right ?? (Number(rect.left ?? rect.x ?? 0) + Number(rect.width ?? 0))),
    bottom: Number(rect.bottom ?? (Number(rect.top ?? rect.y ?? 0) + Number(rect.height ?? 0))),
  };
}

export function readSelectionSnapshot(windowObj = globalThis.window) {
  const selection = windowObj?.getSelection?.();
  if (!selection || selection.rangeCount === 0) {
    return { text: '', rect: null };
  }

  const text = selection.toString();
  let rect = null;

  try {
    if (!selection.isCollapsed) {
      rect = selection.getRangeAt(0).getBoundingClientRect?.() ?? null;
    }
  } catch {
    rect = null;
  }

  return {
    text,
    rect: toSerializableRect(rect),
  };
}

function createSelectionFingerprint(token, rect) {
  if (!rect) {
    return `${token}|no-rect`;
  }

  const rounded = [rect.x, rect.y, rect.width, rect.height]
    .map((value) => Math.round(Number(value ?? 0)))
    .join(':');

  return `${token}|${rounded}`;
}

export function buildLookupDecision({
  snapshot,
  eventType,
  dedupeState = { lastFingerprint: null, lastTriggeredAtMs: 0 },
  nowMs = Date.now(),
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
  requestId,
}) {
  const validation = validateSelectionToken(snapshot?.text);

  if (validation.status !== LOOKUP_DECISION_STATUS.VALID) {
    return {
      ...validation,
      metadata: {
        ...validation.metadata,
        eventType,
      },
    };
  }

  const selectionRect = toSerializableRect(snapshot?.rect);
  if (!selectionRect) {
    return createInvalidLookupDecision(INVALID_SELECTION_REASONS.MISSING_RECT, {
      eventType,
      token: validation.token,
    });
  }

  const fingerprint = createSelectionFingerprint(validation.token, selectionRect);
  const isDuplicate =
    dedupeState.lastFingerprint === fingerprint &&
    nowMs - dedupeState.lastTriggeredAtMs < dedupeWindowMs;

  if (isDuplicate) {
    return createDuplicateLookupDecision({
      eventType,
      token: validation.token,
      fingerprint,
      lastTriggeredAtMs: dedupeState.lastTriggeredAtMs,
      dedupeWindowMs,
    });
  }

  const nextDedupeState = {
    lastFingerprint: fingerprint,
    lastTriggeredAtMs: nowMs,
  };

  const request = createLookupRequest({
    token: validation.token,
    rawText: validation.normalizedText,
    selectionRect,
    sourceEvent: eventType,
    requestId,
  });

  return createValidLookupDecision(request, nextDedupeState);
}

export function createSelectionDetectionController({
  eventTarget,
  getSnapshot = () => readSelectionSnapshot(globalThis.window),
  onLookupRequest,
  onInvalidSelection,
  onIgnoredDuplicate,
  debounceMs = DEFAULT_SELECTION_DEBOUNCE_MS,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
  now = () => Date.now(),
  setTimer = (callback, timeout) => setTimeout(callback, timeout),
  clearTimer = (timerId) => clearTimeout(timerId),
} = {}) {
  if (
    !eventTarget ||
    typeof eventTarget.addEventListener !== 'function' ||
    typeof eventTarget.removeEventListener !== 'function'
  ) {
    throw new Error('eventTarget with addEventListener/removeEventListener is required');
  }

  if (typeof onLookupRequest !== 'function') {
    throw new Error('onLookupRequest callback is required');
  }

  let timerId = null;
  let started = false;
  let pendingEventType = null;
  let dedupeState = {
    lastFingerprint: null,
    lastTriggeredAtMs: 0,
  };
  let nextRequestNumber = 1;

  const flush = () => {
    timerId = null;

    let snapshot;
    try {
      snapshot = getSnapshot();
    } catch {
      onInvalidSelection?.(
        createInvalidLookupDecision(INVALID_SELECTION_REASONS.INVALID_TOKEN, {
          eventType: pendingEventType,
          reasonCode: 'snapshot-read-failed',
        }),
      );
      return null;
    }

    const decision = buildLookupDecision({
      snapshot,
      eventType: pendingEventType,
      dedupeState,
      nowMs: now(),
      dedupeWindowMs,
      requestId: `lookup-${nextRequestNumber++}`,
    });

    if (decision.status === LOOKUP_DECISION_STATUS.VALID) {
      dedupeState = decision.nextDedupeState;
      onLookupRequest(decision.request);
      return decision;
    }

    if (decision.status === LOOKUP_DECISION_STATUS.DUPLICATE) {
      onIgnoredDuplicate?.(decision);
      return decision;
    }

    onInvalidSelection?.(decision);
    return decision;
  };

  const isRelevantKeyup = (event) => {
    const key = event?.key;
    if (typeof key !== 'string' || key.length === 0) {
      return true;
    }

    return [
      'Shift',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].includes(key);
  };

  const handleInteraction = (event) => {
    pendingEventType = event?.type ?? 'unknown';

    if (pendingEventType === 'keyup' && !isRelevantKeyup(event)) {
      return;
    }

    if (timerId !== null) {
      clearTimer(timerId);
    }

    timerId = setTimer(flush, debounceMs);
  };

  const start = () => {
    if (started) {
      return;
    }

    for (const eventType of SELECTION_EVENT_TYPES) {
      eventTarget.addEventListener(eventType, handleInteraction);
    }

    started = true;
  };

  const stop = () => {
    if (!started) {
      return;
    }

    for (const eventType of SELECTION_EVENT_TYPES) {
      eventTarget.removeEventListener(eventType, handleInteraction);
    }

    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }

    started = false;
  };

  return {
    start,
    stop,
    flush,
    handleInteraction,
    getState: () => ({
      started,
      pendingEventType,
      dedupeState,
    }),
  };
}
