import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import {
  INVALID_SELECTION_REASONS,
  LOOKUP_DECISION_STATUS,
  buildLookupDecision,
  createSelectionDetectionController,
  validateSelectionToken,
} from '../../src/content/selectionDetection.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      handlers.filter((item) => item !== handler),
    );
  }

  dispatch(type) {
    const handlers = this.listeners.get(type) ?? [];
    for (const handler of handlers) {
      handler({ type });
    }
  }
}

test('validateSelectionToken: từ chối selection rỗng/whitespace/nhiều token', () => {
  const empty = validateSelectionToken('');
  assert.equal(empty.status, LOOKUP_DECISION_STATUS.INVALID);
  assert.equal(empty.reason, INVALID_SELECTION_REASONS.EMPTY);
  assert.equal(empty.metadata.reasonCode, 'empty-token');

  const whitespace = validateSelectionToken('   \n\t  ');
  assert.equal(whitespace.status, LOOKUP_DECISION_STATUS.INVALID);
  assert.equal(whitespace.reason, INVALID_SELECTION_REASONS.EMPTY);

  const multi = validateSelectionToken('hello world');
  assert.equal(multi.status, LOOKUP_DECISION_STATUS.INVALID);
  assert.equal(multi.reason, INVALID_SELECTION_REASONS.MULTI_TOKEN);
  assert.equal(multi.metadata.reasonCode, 'multi-token');
});

test('validateSelectionToken: normalize lowercase và loại punctuation ở biên', () => {
  const valid = validateSelectionToken("  'HeLLo!' ");
  assert.equal(valid.status, LOOKUP_DECISION_STATUS.VALID);
  assert.equal(valid.token, 'hello');
});

test('buildLookupDecision: tagged union cho nhánh hợp lệ/không hợp lệ/trùng lặp', () => {
  const invalid = buildLookupDecision({
    snapshot: { text: 'hello world', rect: { x: 0, y: 0, width: 10, height: 10 } },
    eventType: 'mouseup',
    requestId: 'lookup-1',
  });
  assert.equal(invalid.status, LOOKUP_DECISION_STATUS.INVALID);

  const valid = buildLookupDecision({
    snapshot: { text: 'hello', rect: { x: 1, y: 2, width: 10, height: 8 } },
    eventType: 'mouseup',
    requestId: 'lookup-2',
    nowMs: 1000,
  });

  assert.equal(valid.status, LOOKUP_DECISION_STATUS.VALID);
  assert.equal(valid.request.type, 'LOOKUP_REQUEST');
  assert.equal(valid.request.payload.token, 'hello');

  const duplicate = buildLookupDecision({
    snapshot: { text: 'hello', rect: { x: 1, y: 2, width: 10, height: 8 } },
    eventType: 'touchend',
    requestId: 'lookup-3',
    nowMs: 1100,
    dedupeState: valid.nextDedupeState,
    dedupeWindowMs: 350,
  });

  assert.equal(duplicate.status, LOOKUP_DECISION_STATUS.DUPLICATE);
});

test('controller bắt sự kiện đa điểm với debounce 150ms (configurable khi test)', async () => {
  const eventTarget = new FakeEventTarget();
  const requests = [];
  let nowMs = 1000;

  const snapshots = [
    { text: 'Word', rect: { x: 4, y: 5, width: 20, height: 14 } },
    { text: 'Second', rect: { x: 10, y: 5, width: 40, height: 14 } },
  ];

  let callIndex = 0;
  const controller = createSelectionDetectionController({
    eventTarget,
    debounceMs: 20,
    now: () => nowMs,
    getSnapshot: () => snapshots[Math.min(callIndex++, snapshots.length - 1)],
    onLookupRequest: (request) => requests.push(request),
  });

  controller.start();

  eventTarget.dispatch('mouseup');
  eventTarget.dispatch('touchend');
  await delay(30);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].payload.sourceEvent, 'touchend');

  nowMs = 1500;
  eventTarget.dispatch('keyup');
  await delay(30);

  assert.equal(requests.length, 2);
  assert.equal(requests[1].payload.sourceEvent, 'keyup');

  controller.stop();
});

test('controller chặn trigger trùng lặp và trả lý do invalid khi selection không hợp lệ', async () => {
  const eventTarget = new FakeEventTarget();
  const requests = [];
  const invalidEvents = [];
  const duplicateEvents = [];
  let nowMs = 1000;

  const snapshots = [
    { text: 'Repeat', rect: { x: 1, y: 1, width: 10, height: 10 } },
    { text: 'Repeat', rect: { x: 1, y: 1, width: 10, height: 10 } },
    { text: '   ', rect: { x: 0, y: 0, width: 5, height: 5 } },
  ];

  let index = 0;
  const controller = createSelectionDetectionController({
    eventTarget,
    debounceMs: 15,
    now: () => nowMs,
    getSnapshot: () => snapshots[Math.min(index++, snapshots.length - 1)],
    onLookupRequest: (request) => requests.push(request),
    onInvalidSelection: (decision) => invalidEvents.push(decision),
    onIgnoredDuplicate: (decision) => duplicateEvents.push(decision),
  });

  controller.start();

  eventTarget.dispatch('mouseup');
  await delay(25);

  nowMs = 1200;
  eventTarget.dispatch('touchend');
  await delay(25);

  nowMs = 2000;
  eventTarget.dispatch('keyup');
  await delay(25);

  controller.stop();

  assert.equal(requests.length, 1);
  assert.equal(duplicateEvents.length, 1);
  assert.equal(invalidEvents.length, 1);
  assert.equal(invalidEvents[0].reason, INVALID_SELECTION_REASONS.EMPTY);
});
