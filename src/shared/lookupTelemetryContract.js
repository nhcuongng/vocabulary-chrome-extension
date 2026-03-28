import {
  LOOKUP_ERROR_TYPE,
  LOOKUP_RESPONSE_STATUS,
  normalizeLookupErrorType,
} from './lookupContract.js';

export const LOOKUP_TELEMETRY_EVENT_NAME = 'lookup.completed';

export const LOOKUP_TELEMETRY_RESULT = {
  SUCCESS: LOOKUP_RESPONSE_STATUS.SUCCESS,
  NOT_FOUND: LOOKUP_RESPONSE_STATUS.NOT_FOUND,
  ERROR: LOOKUP_RESPONSE_STATUS.ERROR,
};

const PII_FIELD_DENYLIST = new Set([
  'headword',
  'token',
  'rawText',
  'lookupUrl',
  'url',
  'html',
  'text',
  'selectionRect',
  'requestId',
]);

function normalizeResultType(status) {
  if (status === LOOKUP_TELEMETRY_RESULT.SUCCESS) {
    return LOOKUP_TELEMETRY_RESULT.SUCCESS;
  }

  if (status === LOOKUP_TELEMETRY_RESULT.NOT_FOUND) {
    return LOOKUP_TELEMETRY_RESULT.NOT_FOUND;
  }

  return LOOKUP_TELEMETRY_RESULT.ERROR;
}

function normalizeExtensionVersion(version) {
  if (typeof version !== 'string') {
    return 'unknown';
  }

  const trimmed = version.trim();
  return trimmed.length > 0 ? trimmed : 'unknown';
}

function normalizeTelemetryErrorType(resultType, lookupResult) {
  if (resultType !== LOOKUP_TELEMETRY_RESULT.ERROR) {
    return null;
  }

  const normalizedType = normalizeLookupErrorType(lookupResult?.error?.type);
  return normalizedType === LOOKUP_ERROR_TYPE.UNKNOWN ? LOOKUP_ERROR_TYPE.UNKNOWN : normalizedType;
}

export function isTelemetryPayloadPIISafe(payload) {
  if (!payload || typeof payload !== 'object') {
    return true;
  }

  const queue = [payload];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (PII_FIELD_DENYLIST.has(key)) {
        return false;
      }

      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return true;
}

export function createLookupTelemetryEvent({
  lookupResult,
  extensionVersion,
  loadingLatencyMs,
  requestStartedAtMs,
  finishedAtMs,
  now = () => Date.now(),
  createEventId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
} = {}) {
  const resultType = normalizeResultType(lookupResult?.status);
  const sanitizedEvent = {
    eventId: createEventId(),
    eventName: LOOKUP_TELEMETRY_EVENT_NAME,
    recordedAtMs: now(),
    extensionVersion: normalizeExtensionVersion(extensionVersion),
    resultType,
    errorType: normalizeTelemetryErrorType(resultType, lookupResult),
    metrics: {
      loadingLatencyMs: Number.isFinite(loadingLatencyMs) ? loadingLatencyMs : null,
      requestStartedAtMs: Number.isFinite(requestStartedAtMs) ? requestStartedAtMs : null,
      finishedAtMs: Number.isFinite(finishedAtMs) ? finishedAtMs : null,
      lookupDurationMs: Number.isFinite(lookupResult?.data?.durationMs)
        ? lookupResult.data.durationMs
        : null,
      attempts: Number.isFinite(lookupResult?.data?.attempts) ? lookupResult.data.attempts : null,
    },
  };

  return sanitizedEvent;
}
