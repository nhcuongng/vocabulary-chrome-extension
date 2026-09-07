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

test('normalizeUserSettings: chuẩn hóa simpleLearn chính xác hoặc fallback về false', () => {
  assert.equal(normalizeUserSettings({ simpleLearn: true }).simpleLearn, true);
  assert.equal(normalizeUserSettings({ simpleLearn: 'true' }).simpleLearn, true);
  assert.equal(normalizeUserSettings({ simpleLearn: false }).simpleLearn, false);
  assert.equal(normalizeUserSettings({ simpleLearn: 'false' }).simpleLearn, false);
  assert.equal(normalizeUserSettings({ simpleLearn: 'unknown' }).simpleLearn, false);
  // Migration from legacy dictionarySource
  assert.equal(normalizeUserSettings({ dictionarySource: 'freedictionary' }).simpleLearn, true);
  assert.equal(normalizeUserSettings({ dictionarySource: 'vocabulary' }).simpleLearn, false);
});

test('mergeUserSettings: merge patch nhưng vẫn chuẩn hóa theo schema hiện tại', () => {
  const merged = mergeUserSettings(
    {
      schemaVersion: 999,
      autoPopupEnabled: true,
      simpleLearn: false,
    },
    {
      autoPopupEnabled: false,
      simpleLearn: true,
    },
  );

  assert.equal(merged.schemaVersion, USER_SETTINGS_SCHEMA_VERSION);
  assert.equal(merged.autoPopupEnabled, false);
  assert.equal(merged.simpleLearn, true);
});

test('normalizeUserSettings & mergeUserSettings: chuẩn hóa và merge rememberLastLookup', () => {
  assert.equal(normalizeUserSettings({}).rememberLastLookup, true);
  assert.equal(normalizeUserSettings({ rememberLastLookup: false }).rememberLastLookup, false);
  assert.equal(normalizeUserSettings({ rememberLastLookup: 'false' }).rememberLastLookup, false);
  assert.equal(normalizeUserSettings({ rememberLastLookup: true }).rememberLastLookup, true);
  assert.equal(normalizeUserSettings({ rememberLastLookup: 'true' }).rememberLastLookup, true);

  const merged = mergeUserSettings(
    { rememberLastLookup: true },
    { rememberLastLookup: false }
  );
  assert.equal(merged.rememberLastLookup, false);
});

