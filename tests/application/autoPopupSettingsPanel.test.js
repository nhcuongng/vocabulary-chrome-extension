import assert from 'node:assert/strict';
import test from 'node:test';

import { createAutoPopupSettingsPanel } from '../../src/application/autoPopupSettingsPanel.js';

class FakeToggleElement {
  constructor() {
    this.checked = false;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((item) => item !== listener),
    );
  }

  async dispatchChange() {
    const listeners = this.listeners.get('change') ?? [];
    for (const listener of listeners) {
      await listener({ type: 'change' });
    }
  }
}

function createFakeAutoPopupController(initialEnabled = true) {
  let enabled = initialEnabled;
  const listeners = new Set();

  const emit = () => {
    for (const listener of listeners) {
      listener({ autoPopupEnabled: enabled });
    }
  };

  return {
    async start() {},
    stop() {},
    isAutoPopupEnabled: () => enabled,
    async setAutoPopupEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

test('settings panel: init đồng bộ trạng thái toggle từ runtime settings', async () => {
  const toggle = new FakeToggleElement();
  const autoPopupController = createFakeAutoPopupController(false);

  const panel = createAutoPopupSettingsPanel({
    toggleElement: toggle,
    autoPopupController,
  });

  await panel.init();

  assert.equal(toggle.checked, false);

  panel.destroy();
});

test('settings panel: change toggle sẽ cập nhật runtime setting', async () => {
  const toggle = new FakeToggleElement();
  const autoPopupController = createFakeAutoPopupController(true);

  const panel = createAutoPopupSettingsPanel({
    toggleElement: toggle,
    autoPopupController,
  });

  await panel.init();

  toggle.checked = false;
  await toggle.dispatchChange();

  assert.equal(autoPopupController.isAutoPopupEnabled(), false);

  panel.destroy();
});
