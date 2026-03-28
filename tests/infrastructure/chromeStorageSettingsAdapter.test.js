import assert from 'node:assert/strict';
import test from 'node:test';

import { createChromeStorageSettingsAdapter } from '../../src/infrastructure/adapters/chromeStorageSettingsAdapter.js';

class FakeStorageChangeEvent {
  constructor() {
    this.listeners = new Set();
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  emit(changes, areaName = 'local') {
    for (const listener of this.listeners) {
      listener(changes, areaName);
    }
  }
}

class FakeStorageArea {
  constructor({ storageChangeEvent, seed = {} } = {}) {
    this.data = { ...seed };
    this.storageChangeEvent = storageChangeEvent;
  }

  async get(key) {
    return {
      [key]: this.data[key],
    };
  }

  async set(payload) {
    const entries = Object.entries(payload);

    for (const [key, value] of entries) {
      const oldValue = this.data[key];
      this.data[key] = value;

      this.storageChangeEvent?.emit(
        {
          [key]: {
            oldValue,
            newValue: value,
          },
        },
        'local',
      );
    }
  }
}

test('settings adapter: load default nếu chưa có giá trị trong local storage', async () => {
  const storageChangeEvent = new FakeStorageChangeEvent();
  const storageArea = new FakeStorageArea({ storageChangeEvent });

  const adapter = createChromeStorageSettingsAdapter({
    storageArea,
    storageChangeEvent,
  });

  const settings = await adapter.load();

  assert.equal(settings.schemaVersion, 1);
  assert.equal(settings.autoPopupEnabled, true);

  adapter.destroy();
});

test('settings adapter: persistence qua các phiên (restart simulation)', async () => {
  const storageChangeEvent = new FakeStorageChangeEvent();
  const storageArea = new FakeStorageArea({ storageChangeEvent });

  const firstSessionAdapter = createChromeStorageSettingsAdapter({
    storageArea,
    storageChangeEvent,
  });

  await firstSessionAdapter.update({ autoPopupEnabled: false });
  firstSessionAdapter.destroy();

  const secondSessionAdapter = createChromeStorageSettingsAdapter({
    storageArea,
    storageChangeEvent,
  });

  const restoredSettings = await secondSessionAdapter.load();

  assert.equal(restoredSettings.autoPopupEnabled, false);
  assert.equal(restoredSettings.schemaVersion, 1);

  secondSessionAdapter.destroy();
});

test('settings adapter: hỗ trợ dữ liệu legacy chưa có schemaVersion', async () => {
  const storageChangeEvent = new FakeStorageChangeEvent();
  const storageArea = new FakeStorageArea({
    storageChangeEvent,
    seed: {
      'user-settings': {
        autoPopupEnabled: false,
      },
    },
  });

  const adapter = createChromeStorageSettingsAdapter({
    storageArea,
    storageChangeEvent,
  });

  const settings = await adapter.load();

  assert.equal(settings.schemaVersion, 1);
  assert.equal(settings.autoPopupEnabled, false);

  adapter.destroy();
});

test('settings adapter: runtime update khi storage thay đổi từ context khác', async () => {
  const storageChangeEvent = new FakeStorageChangeEvent();
  const storageArea = new FakeStorageArea({ storageChangeEvent });

  const adapter = createChromeStorageSettingsAdapter({
    storageArea,
    storageChangeEvent,
  });

  const observed = [];
  const unsubscribe = adapter.subscribe((nextSettings, meta) => {
    observed.push({ nextSettings, meta });
  });

  await adapter.load();

  storageChangeEvent.emit(
    {
      'user-settings': {
        oldValue: { schemaVersion: 1, autoPopupEnabled: true },
        newValue: { schemaVersion: 1, autoPopupEnabled: false },
      },
    },
    'local',
  );

  assert.equal(observed.at(-1).nextSettings.autoPopupEnabled, false);
  assert.equal(observed.at(-1).meta.source, 'external-change');

  unsubscribe();
  adapter.destroy();
});
