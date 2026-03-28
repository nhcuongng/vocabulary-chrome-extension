import assert from 'node:assert/strict';
import test from 'node:test';

import { mapParsedPayloadToPopupViewModel } from '../../src/application/popupViewModelMapper.js';

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
  assert.equal(model.mainDefinition, 'A greeting');
});
