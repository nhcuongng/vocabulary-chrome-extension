import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLookupErrorResponse,
  LOOKUP_ERROR_TYPE,
  normalizeLookupErrorType,
} from '../../src/shared/lookupContract.js';

test('lookup contract: chuẩn hóa taxonomy lỗi theo danh sách cho phép', () => {
  assert.equal(normalizeLookupErrorType('timeout'), LOOKUP_ERROR_TYPE.TIMEOUT);
  assert.equal(normalizeLookupErrorType('rate-limit'), LOOKUP_ERROR_TYPE.RATE_LIMIT);
  assert.equal(normalizeLookupErrorType('unsupported-type'), LOOKUP_ERROR_TYPE.UNKNOWN);
});

test('lookup contract: createLookupErrorResponse fallback về unknown cho type không hợp lệ', () => {
  const response = createLookupErrorResponse('bad-type', { message: 'x' });

  assert.equal(response.status, 'error');
  assert.equal(response.error.type, 'unknown');
  assert.equal(response.error.message, 'x');
});

test('lookup contract: không cho details.type override taxonomy đã chuẩn hóa', () => {
  const response = createLookupErrorResponse('timeout', {
    message: 'x',
    type: 'parse',
  });

  assert.equal(response.status, 'error');
  assert.equal(response.error.type, 'timeout');
  assert.equal(response.error.message, 'x');
});
