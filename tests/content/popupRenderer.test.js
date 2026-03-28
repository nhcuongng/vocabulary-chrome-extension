import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSuccessContent } from '../../src/content/popupRenderer.js';

test('popup renderer: success state hiển thị đúng thứ bậc headword -> pronunciation -> definition', () => {
  const content = renderSuccessContent({
    headword: 'hello',
    pronunciation: '/həˈloʊ/',
    definition: 'A greeting',
  });

  assert.deepEqual(content.map((item) => item.type), [
    'headword',
    'pronunciation',
    'definition',
  ]);
  assert.equal(content[0].value, 'hello');
  assert.equal(content[1].value, '/həˈloʊ/');
  assert.equal(content[2].value, 'A greeting');
});
