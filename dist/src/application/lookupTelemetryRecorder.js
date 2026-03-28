import {
  createLookupTelemetryEvent,
  isTelemetryPayloadPIISafe,
  LOOKUP_TELEMETRY_RESULT,
} from '../shared/lookupTelemetryContract.js';
import { createInMemoryTelemetryStore } from '../infrastructure/adapters/inMemoryTelemetryStore.js';

export function createLookupTelemetryRecorder({
  store = createInMemoryTelemetryStore(),
  extensionVersion = 'unknown',
  now = () => Date.now(),
  createEventId,
} = {}) {
  if (!store || typeof store.append !== 'function' || typeof store.list !== 'function') {
    throw new Error('store with append/list is required');
  }

  const recordLookupCompleted = ({
    lookupResult,
    loadingLatencyMs,
    requestStartedAtMs,
    finishedAtMs,
  } = {}) => {
    const event = createLookupTelemetryEvent({
      lookupResult,
      extensionVersion,
      loadingLatencyMs,
      requestStartedAtMs,
      finishedAtMs,
      now,
      createEventId,
    });

    if (!isTelemetryPayloadPIISafe(event)) {
      return null;
    }

    store.append(event);
    return event;
  };

  const getEvents = ({ extensionVersion: versionFilter, resultType, limit } = {}) => {
    const normalizedResultType =
      resultType === LOOKUP_TELEMETRY_RESULT.SUCCESS ||
      resultType === LOOKUP_TELEMETRY_RESULT.NOT_FOUND ||
      resultType === LOOKUP_TELEMETRY_RESULT.ERROR
        ? resultType
        : null;

    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : null;

    const filtered = store.list().filter((event) => {
      if (typeof versionFilter === 'string' && versionFilter.trim().length > 0) {
        if (event.extensionVersion !== versionFilter.trim()) {
          return false;
        }
      }

      if (normalizedResultType && event.resultType !== normalizedResultType) {
        return false;
      }

      return true;
    });

    return normalizedLimit ? filtered.slice(-normalizedLimit) : filtered;
  };

  return {
    recordLookupCompleted,
    getEvents,
  };
}
