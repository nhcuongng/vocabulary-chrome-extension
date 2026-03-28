import assert from 'node:assert/strict';
import test from 'node:test';

import { safeParseVocabularyHtml } from '../../src/infrastructure/adapters/safeVocabularyHtmlParserAdapter.js';

test('safe parser: trả not-found khi payload không có core data', () => {
  const result = safeParseVocabularyHtml({
    html: '<article><h1 class="dynamictext">hello</h1></article>',
  });

  assert.equal(result.status, 'not-found');
  assert.equal(result.data.reason, 'empty-core-data');
});

test('safe parser: trả typed parse error và không throw ra ngoài', () => {
  const result = safeParseVocabularyHtml({
    html: '<html></html>',
    parser: () => {
      throw new Error('unexpected parser failure');
    },
  });

  assert.equal(result.status, 'error');
  assert.equal(result.error.type, 'parse');
  assert.equal(result.error.message, 'unexpected parser failure');
});
