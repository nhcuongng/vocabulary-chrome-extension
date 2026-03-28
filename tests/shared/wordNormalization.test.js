import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOKEN_VALIDATION_REASON,
  normalizeWord,
  validateMvpOneWordToken,
} from '../../src/shared/wordNormalization.js';

test('normalizeWord: strip punctuation ở biên và lowercase', () => {
  assert.equal(normalizeWord('  "Hello!"  '), 'hello');
  assert.equal(normalizeWord('(WORLD)'), 'world');
  assert.equal(normalizeWord('co-op'), 'co-op');
});

test('validateMvpOneWordToken: từ chối multi-token và token không hợp lệ', () => {
  const multi = validateMvpOneWordToken('hello world');
  assert.equal(multi.isValid, false);
  assert.equal(multi.reasonCode, TOKEN_VALIDATION_REASON.MULTI_TOKEN);

  const invalid = validateMvpOneWordToken('12345');
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.reasonCode, TOKEN_VALIDATION_REASON.INVALID_CHARACTERS);

  const valid = validateMvpOneWordToken("'Hello!'");
  assert.equal(valid.isValid, true);
  assert.equal(valid.normalizedToken, 'hello');
});
