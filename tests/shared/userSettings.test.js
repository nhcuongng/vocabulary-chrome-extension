import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_USER_SETTINGS,
  USER_SETTINGS_SCHEMA_VERSION,
  mergeUserSettings,
  normalizeUserSettings,
} from '../../src/shared/userSettings.js';

test('normalizeUserSettings: fallback default khi dữ liệu rỗng hoặc sai định dạng', () => {
  assert.deepEqual(normalizeUserSettings(null), DEFAULT_USER_SETTINGS);
  assert.deepEqual(normalizeUserSettings(undefined), DEFAULT_USER_SETTINGS);
  assert.deepEqual(normalizeUserSettings('invalid'), DEFAULT_USER_SETTINGS);
});

test('normalizeUserSettings: tương thích ngược với dữ liệu legacy không có schemaVersion', () => {
  const normalized = normalizeUserSettings({ autoPopupEnabled: false });

  assert.equal(normalized.schemaVersion, USER_SETTINGS_SCHEMA_VERSION);
  assert.equal(normalized.autoPopupEnabled, false);
});

test('normalizeUserSettings: chuẩn hóa dictionarySource chính xác hoặc fallback về auto', () => {
  assert.equal(normalizeUserSettings({ dictionarySource: 'cambridge' }).dictionarySource, 'cambridge');
  assert.equal(normalizeUserSettings({ dictionarySource: 'vocabulary' }).dictionarySource, 'vocabulary');
  assert.equal(normalizeUserSettings({ dictionarySource: 'auto' }).dictionarySource, 'auto');
  assert.equal(normalizeUserSettings({ dictionarySource: 'unknown-source' }).dictionarySource, 'auto');
});

test('mergeUserSettings: merge patch nhưng vẫn chuẩn hóa theo schema hiện tại', () => {
  const merged = mergeUserSettings(
    {
      schemaVersion: 999,
      autoPopupEnabled: true,
      dictionarySource: 'auto',
    },
    {
      autoPopupEnabled: false,
      dictionarySource: 'cambridge',
    },
  );

  assert.equal(merged.schemaVersion, USER_SETTINGS_SCHEMA_VERSION);
  assert.equal(merged.autoPopupEnabled, false);
  assert.equal(merged.dictionarySource, 'cambridge');
});

