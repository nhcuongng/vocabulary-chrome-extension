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

test('parser adapter: trích xuất dữ liệu từ trang https://www.vocabulary.com/dictionary/test', () => {
  const html = `
    <h1 class="dynamictext">test</h1>
    <span class="pronunciation">/tɛst/</span>
    <h3 class="definition">any standardized procedure for measuring sensitivity or memory or intelligence</h3>
    <div class="word-area">
      <p class="short">Định nghĩa ngắn</p>
      <p class="long">Định nghĩa dài hơn</p>
    </div>
  `;

  const parsed = parseVocabularyHtml(html);
  console.log('DEFINITIONS OUTPUT:', parsed.definitions);
  assert.equal(parsed.headword, 'test');
  assert.equal(parsed.pronunciation, '/tɛst/');
  assert.ok(parsed.definitions.includes('any standardized procedure for measuring sensitivity or memory or intelligence'));
  assert.ok(parsed.definitions.includes('Định nghĩa ngắn'));
  assert.ok(parsed.definitions.includes('Định nghĩa dài hơn'));
  assert.equal(parsed.hasCoreData, true);
});
