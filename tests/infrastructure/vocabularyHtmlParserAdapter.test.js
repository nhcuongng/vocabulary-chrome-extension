import assert from 'node:assert/strict';
import test from 'node:test';

import { parseVocabularyHtml } from '../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js';

test('parser adapter: trích xuất headword, pronunciation, định nghĩa chính', () => {
  const html = `
    <article>
      <h1 class="dynamictext">Hello</h1>
      <span class="pronunciation">/həˈloʊ/</span>
      <h3 class="definition">A greeting used when meeting someone.</h3>
    </article>
  `;

  const parsed = parseVocabularyHtml(html);

  assert.equal(parsed.headword, 'Hello');
  assert.equal(parsed.pronunciation, '/həˈloʊ/');
  assert.deepEqual(parsed.definitions, ['A greeting used when meeting someone.']);
  assert.equal(parsed.hasCoreData, true);
});
