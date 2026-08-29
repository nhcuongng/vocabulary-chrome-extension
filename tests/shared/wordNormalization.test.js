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

test('validateMvpOneWordToken: chấp nhận từ ghép có gạch nối và nháy đơn', () => {
  const hyphenated = validateMvpOneWordToken('well-known');
  assert.equal(hyphenated.isValid, true);
  assert.equal(hyphenated.normalizedToken, 'well-known');

  const multiHyphen = validateMvpOneWordToken('"state-of-the-art"');
  assert.equal(multiHyphen.isValid, true);
  assert.equal(multiHyphen.normalizedToken, 'state-of-the-art');

  const apostrophe = validateMvpOneWordToken("don't");
  assert.equal(apostrophe.isValid, true);
  assert.equal(apostrophe.normalizedToken, "don't");

  const underscore = validateMvpOneWordToken('word_123');
  assert.equal(underscore.isValid, false);
  assert.equal(underscore.reasonCode, TOKEN_VALIDATION_REASON.INVALID_CHARACTERS);
});

