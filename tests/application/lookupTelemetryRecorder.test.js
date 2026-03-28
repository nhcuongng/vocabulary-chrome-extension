import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupTelemetryRecorder } from '../../src/application/lookupTelemetryRecorder.js';
import { createInMemoryTelemetryStore } from '../../src/infrastructure/adapters/inMemoryTelemetryStore.js';
import { isTelemetryPayloadPIISafe } from '../../src/shared/lookupTelemetryContract.js';

test('telemetry recorder: lưu event cục bộ và lọc theo extension version', () => {
  const recorder = createLookupTelemetryRecorder({
    store: createInMemoryTelemetryStore(),
    extensionVersion: '0.1.0',
    now: () => 1000,
    createEventId: () => 'evt-v1',
  });

  recorder.recordLookupCompleted({
    lookupResult: {
      status: 'not-found',
      data: { reason: 'empty-core-data' },
    },
    loadingLatencyMs: 22,
    requestStartedAtMs: 500,
    finishedAtMs: 900,
  });

  const events = recorder.getEvents({ extensionVersion: '0.1.0' });
  assert.equal(events.length, 1);
  assert.equal(events[0].resultType, 'not-found');
  assert.equal(events[0].extensionVersion, '0.1.0');
});

test('telemetry recorder: lọc theo result type và limit', () => {
  const recorder = createLookupTelemetryRecorder({
    store: createInMemoryTelemetryStore(),
    extensionVersion: '0.1.0',
    createEventId: (() => {
      let id = 0;
      return () => `evt-${++id}`;
    })(),
  });

  recorder.recordLookupCompleted({ lookupResult: { status: 'success', data: {} } });
  recorder.recordLookupCompleted({ lookupResult: { status: 'error', error: { type: 'network' } } });
  recorder.recordLookupCompleted({ lookupResult: { status: 'error', error: { type: 'timeout' } } });

  const onlyErrors = recorder.getEvents({ resultType: 'error' });
  const limited = recorder.getEvents({ resultType: 'error', limit: 1 });

  assert.equal(onlyErrors.length, 2);
  assert.equal(limited.length, 1);
  assert.equal(limited[0].errorType, 'timeout');
});

test('telemetry recorder: event lưu trữ không chứa key PII denylist', () => {
  const recorder = createLookupTelemetryRecorder({
    store: createInMemoryTelemetryStore(),
    extensionVersion: '0.1.0',
  });

  const event = recorder.recordLookupCompleted({
    lookupResult: {
      status: 'success',
      data: {
        headword: 'hello',
        lookupUrl: 'https://www.vocabulary.com/dictionary/hello',
        durationMs: 200,
      },
    },
  });

  assert.ok(event);
  assert.equal(isTelemetryPayloadPIISafe(event), true);
  assert.equal(Object.prototype.hasOwnProperty.call(event, 'headword'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(event, 'lookupUrl'), false);
});
