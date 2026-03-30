import assert from 'node:assert/strict';
import test from 'node:test';

import { parseVocabularyHtml } from '../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js';

test('parser adapter: trích xuất headword, pronunciation, định nghĩa chính', () => {
  const html = `
    <article>
      <h1 class="dynamictext">Hello</h1>
      <div class="ipa-with-audio">
        <div class="us-flag-icon"></div>
        <div data-audio="H/HELLO"></div>
        <span class="span-replace-h3">/həˈloʊ/</span>
      </div>
      <div class="word-area">
        <p class="short">A greeting used when meeting someone.</p>
      </div>
    </article>
  `;

  const parsed = parseVocabularyHtml(html);

  assert.equal(parsed.headword, 'Hello');
  assert.equal(parsed.pronunciation, 'US /həˈloʊ/');
  // Kiểm tra có chứa định nghĩa với label tương ứng
  assert.ok(parsed.definitions.some(d => d.includes('Short Definition') && d.includes('A greeting used when meeting someone.')));
  assert.equal(parsed.hasCoreData, true);
});

test('parser adapter: trích xuất dữ liệu từ trang https://www.vocabulary.com/dictionary/test', () => {
  const html = `
    <h1 class="dynamictext">test</h1>
    <div class="ipa-with-audio">
        <div class="us-flag-icon"></div>
        <span class="span-replace-h3">/tɛst/</span>
    </div>
    <div class="word-area">
      <p class="short">any standardized procedure for measuring sensitivity or memory or intelligence</p>
      <p class="long">Định nghĩa dài hơn</p>
    </div>
  `;

  const parsed = parseVocabularyHtml(html);
  assert.equal(parsed.headword, 'test');
  assert.equal(parsed.pronunciation, 'US /tɛst/');
  assert.ok(parsed.definitions.some(d => d.includes('any standardized procedure for measuring sensitivity or memory or intelligence')));
  assert.ok(parsed.definitions.some(d => d.includes('Short Definition')));
  assert.ok(parsed.definitions.some(d => d.includes('Long Definition') && d.includes('Định nghĩa dài hơn')));
  assert.equal(parsed.hasCoreData, true);
});
