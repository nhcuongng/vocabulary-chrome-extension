import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapLookupErrorToPopupViewModel,
  mapParsedPayloadToPopupViewModel,
} from '../../src/application/popupViewModelMapper.js';

test('mapper: ánh xạ parsed payload sang popup view model theo thứ tự bắt buộc', () => {
  const model = mapParsedPayloadToPopupViewModel({
    headword: 'hello',
    pronunciation: '/həˈloʊ/',
    definitions: ['A greeting'],
  });

  assert.equal(model.state, 'success');
  assert.deepEqual(model.orderedFields, ['headword', 'pronunciation', 'definition']);
  assert.equal(model.headword, 'hello');
  assert.equal(model.pronunciation, '/həˈloʊ/');
  assert.deepEqual(model.definitions, ['A greeting']);
});

test('mapper: trả not-found state khi payload rỗng/null', () => {
  const model = mapParsedPayloadToPopupViewModel({
    headword: '',
    pronunciation: '',
    definitions: [],
  });

  assert.equal(model.state, 'not-found');
  assert.deepEqual(model.orderedFields, ['title', 'message', 'guidance']);
  assert.ok(Array.isArray(model.guidance));
  assert.ok(model.guidance.length >= 1);
});

test('mapper: ánh xạ error type sang UI copy tương ứng', () => {
  const model = mapLookupErrorToPopupViewModel({ type: 'timeout' });

  assert.equal(model.state, 'error');
  assert.equal(model.errorType, 'timeout');
  assert.equal(model.cta, 'Thử lại');
  assert.ok(model.message.length > 0);
});

test('mapper: rate-limit trả thông điệp thân thiện cho người dùng', () => {
  const model = mapLookupErrorToPopupViewModel({ type: 'rate-limit' });

  assert.equal(model.state, 'error');
  assert.equal(model.errorType, 'rate-limit');
  assert.equal(model.cta, 'Đợi rồi thử lại');
  assert.match(model.message, /tạm giới hạn truy vấn/i);
});
