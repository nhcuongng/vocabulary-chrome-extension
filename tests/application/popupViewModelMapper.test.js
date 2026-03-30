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
    token: 'hello',
  });

  assert.equal(model.state, 'not-found');
  assert.deepEqual(model.orderedFields, ['title', 'message', 'searchSuggestions', 'guidance']);
  assert.ok(Array.isArray(model.guidance));
  assert.ok(model.guidance.length >= 1);
  assert.match(model.searchSuggestions, /google\.com.*define\+hello/i);
  assert.match(model.searchSuggestions, /target="_blank"/i);
  assert.match(model.searchSuggestions, /rel="noopener noreferrer"/i);
});

test('mapper: sinh URL tìm kiếm ngoại đúng cách và encode ký tự đặc biệt', () => {
  const model = mapParsedPayloadToPopupViewModel({
    headword: '',
    token: 'apple tree',
  });

  assert.equal(model.state, 'not-found');
  // apple tree -> apple%20tree
  assert.match(model.searchSuggestions, /q=define\+apple%20tree/i);
  assert.match(model.searchSuggestions, /english\/apple%20tree/i);
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
