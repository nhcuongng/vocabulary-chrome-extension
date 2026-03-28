import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLookupTelemetryEvent,
  isTelemetryPayloadPIISafe,
  LOOKUP_TELEMETRY_EVENT_NAME,
} from '../../src/shared/lookupTelemetryContract.js';

test('lookup telemetry: tạo schema event ẩn danh cho success', () => {
  const event = createLookupTelemetryEvent({
    extensionVersion: '0.1.0',
    lookupResult: {
      status: 'success',
      data: {
        headword: 'hello',
        durationMs: 321,
        attempts: 1,
      },
    },
    loadingLatencyMs: 15,
    requestStartedAtMs: 100,
    finishedAtMs: 421,
    now: () => 999,
    createEventId: () => 'evt-1',
  });

  assert.equal(event.eventName, LOOKUP_TELEMETRY_EVENT_NAME);
  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.extensionVersion, '0.1.0');
  assert.equal(event.resultType, 'success');
  assert.equal(event.errorType, null);
  assert.equal(event.metrics.lookupDurationMs, 321);
  assert.equal(event.metrics.loadingLatencyMs, 15);
  assert.equal(event.recordedAtMs, 999);
  assert.equal(isTelemetryPayloadPIISafe(event), true);
});

test('lookup telemetry: phân loại error type theo taxonomy chuẩn', () => {
  const timeoutEvent = createLookupTelemetryEvent({
    extensionVersion: '0.1.0',
    lookupResult: {
      status: 'error',
      error: {
        type: 'timeout',
        message: 'request timeout',
      },
    },
  });

  const unknownEvent = createLookupTelemetryEvent({
    extensionVersion: '0.1.0',
    lookupResult: {
      status: 'error',
      error: {
        type: 'unsupported-type',
      },
    },
  });

  assert.equal(timeoutEvent.errorType, 'timeout');
  assert.equal(unknownEvent.errorType, 'unknown');
});

test('lookup telemetry: detector PII chặn key nhạy cảm', () => {
  assert.equal(
    isTelemetryPayloadPIISafe({
      eventName: 'lookup.completed',
      metrics: { attempts: 2 },
    }),
    true,
  );

  assert.equal(
    isTelemetryPayloadPIISafe({
      eventName: 'lookup.completed',
      payload: {
        rawText: 'hello world',
      },
    }),
    false,
  );
});
