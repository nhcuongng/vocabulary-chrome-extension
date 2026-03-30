import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { createAutoPopupLookupController } from '../../src/content/autoPopupLookupController.js';

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

function createInMemorySettingsStore(initialSettings = { schemaVersion: 1, autoPopupEnabled: true }) {
  let settings = { ...initialSettings };
  const listeners = new Set();

  const emit = () => {
    for (const listener of listeners) {
      listener({ ...settings });
    }
  };

  return {
    async load() {
      return { ...settings };
    },
    async update(patch) {
      settings = {
        ...settings,
        ...patch,
      };

      emit();
      return { ...settings };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return { ...settings };
    },
  };
}

test('auto-popup runtime: toggle setting áp dụng hành vi trigger lookup ngay tức thì', async () => {
  const eventTarget = new FakeEventTarget();
  const settingsStore = createInMemorySettingsStore({ schemaVersion: 1, autoPopupEnabled: true });
  const requests = [];
  let nowMs = 1000;

  const controller = createAutoPopupLookupController({
    eventTarget,
    settingsStore,
    onLookupRequest: (request) => requests.push(request),
    debounceMs: 10,
    now: () => nowMs,
    getSnapshot: () => ({
      text: 'hello',
      rect: { x: 2, y: 2, width: 12, height: 10 },
    }),
  });

  await controller.start();

  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(requests.length, 1);

  await controller.setAutoPopupEnabled(false);
  nowMs += 500;

  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(requests.length, 1);

  await controller.setAutoPopupEnabled(true);
  nowMs += 500;

  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(requests.length, 2);

  controller.stop();
});

test('auto-popup runtime: nạp settings trước khi bắt selection events (startup disabled)', async () => {
  const eventTarget = new FakeEventTarget();
  const settingsStore = createInMemorySettingsStore({ schemaVersion: 1, autoPopupEnabled: false });
  const requests = [];

  const controller = createAutoPopupLookupController({
    eventTarget,
    settingsStore,
    onLookupRequest: (request) => requests.push(request),
    debounceMs: 10,
    getSnapshot: () => ({
      text: 'world',
      rect: { x: 2, y: 2, width: 12, height: 10 },
    }),
  });

  await controller.start();

  eventTarget.dispatch('mouseup');
  await delay(20);

  assert.equal(requests.length, 0);
  assert.equal(controller.isAutoPopupEnabled(), false);

  controller.stop();
});

test('auto-popup runtime: selection detection vẫn active khi auto-popup OFF, gọi onTriggerIconRequest', async () => {
  const eventTarget = new FakeEventTarget();
  const settingsStore = createInMemorySettingsStore({ schemaVersion: 1, autoPopupEnabled: false });
  const autoRequests = [];
  const triggerRequests = [];
  let nowMs = 1000;

  const controller = createAutoPopupLookupController({
    eventTarget,
    settingsStore,
    onLookupRequest: (request) => autoRequests.push(request),
    onTriggerIconRequest: (request) => triggerRequests.push(request),
    debounceMs: 10,
    now: () => nowMs,
    getSnapshot: () => ({
      text: 'test',
      rect: { x: 5, y: 5, width: 20, height: 12 },
    }),
  });

  await controller.start();

  // Selection detection should fire trigger icon callback when auto-popup OFF
  eventTarget.dispatch('mouseup');
  await delay(20);

  assert.equal(autoRequests.length, 0, 'should NOT call onLookupRequest when auto-popup OFF');
  assert.equal(triggerRequests.length, 1, 'should call onTriggerIconRequest when auto-popup OFF');
  assert.equal(triggerRequests[0].payload.token, 'test');

  controller.stop();
});

test('auto-popup runtime: chuyển mode ON→OFF→ON routes đúng callback', async () => {
  const eventTarget = new FakeEventTarget();
  const settingsStore = createInMemorySettingsStore({ schemaVersion: 1, autoPopupEnabled: true });
  const autoRequests = [];
  const triggerRequests = [];
  let nowMs = 1000;

  const controller = createAutoPopupLookupController({
    eventTarget,
    settingsStore,
    onLookupRequest: (request) => autoRequests.push(request),
    onTriggerIconRequest: (request) => triggerRequests.push(request),
    debounceMs: 10,
    now: () => nowMs,
    getSnapshot: () => ({
      text: 'word',
      rect: { x: 10, y: 10, width: 30, height: 14 },
    }),
  });

  await controller.start();

  // Auto-popup ON → should go to onLookupRequest
  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(autoRequests.length, 1);
  assert.equal(triggerRequests.length, 0);

  // Switch to OFF
  await controller.setAutoPopupEnabled(false);
  nowMs += 500;

  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(autoRequests.length, 1, 'no new auto requests');
  assert.equal(triggerRequests.length, 1, 'trigger icon request added');

  // Switch back to ON
  await controller.setAutoPopupEnabled(true);
  nowMs += 500;

  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(autoRequests.length, 2, 'auto request added after re-enable');
  assert.equal(triggerRequests.length, 1, 'no new trigger requests');

  controller.stop();
});

test('auto-popup runtime: selection detection stays active across mode changes (no stop/start)', async () => {
  const eventTarget = new FakeEventTarget();
  const settingsStore = createInMemorySettingsStore({ schemaVersion: 1, autoPopupEnabled: true });
  let nowMs = 1000;
  const triggerRequests = [];

  const controller = createAutoPopupLookupController({
    eventTarget,
    settingsStore,
    onLookupRequest: () => {},
    onTriggerIconRequest: (request) => triggerRequests.push(request),
    debounceMs: 10,
    now: () => nowMs,
    getSnapshot: () => ({
      text: 'active',
      rect: { x: 1, y: 1, width: 10, height: 10 },
    }),
  });

  await controller.start();

  // Verify selection detection is active
  const state = controller.getState();
  assert.equal(state.selectionState.started, true);

  // Toggle OFF - detection should remain active
  await controller.setAutoPopupEnabled(false);
  nowMs += 500;
  const stateAfterOff = controller.getState();
  assert.equal(stateAfterOff.selectionState.started, true, 'selection detection still active after OFF');

  // Verify it still fires
  eventTarget.dispatch('mouseup');
  await delay(20);
  assert.equal(triggerRequests.length, 1, 'still detects selections after OFF');

  controller.stop();
});
