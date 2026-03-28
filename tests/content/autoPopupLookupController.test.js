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
