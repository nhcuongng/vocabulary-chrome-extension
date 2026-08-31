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
  // Kiểm tra có chứa định nghĩa ngắn trực tiếp (vocab-quick-def)
  assert.ok(parsed.definitions.some(d => d.includes('vocab-quick-def') && d.includes('A greeting used when meeting someone.')));
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
  assert.ok(parsed.definitions.some(d => d.includes('vocab-quick-def') && d.includes('any standardized procedure for measuring sensitivity or memory or intelligence')));
  assert.ok(parsed.definitions.some(d => d.includes('Long Definition') && d.includes('Định nghĩa dài hơn')));
  assert.equal(parsed.hasCoreData, true);
});

test('parser adapter: trích xuất wordFamily từ thẻ <vcom:wordfamily>', () => {
  const html = `
    <h1 class="dynamictext">create</h1>
    <div class="ipa-with-audio">
      <div class="us-flag-icon"></div>
      <span class="span-replace-h3">/kriˈeɪt/</span>
    </div>
    <div class="word-area">
      <p class="short">bring into existence</p>
    </div>
    <vcom:wordfamily lang="en" word="create" data="[{&#034;word&#034;:&#034;created&#034;,&#034;hw&#034;:true,&#034;freq&#034;:89.9},{&#034;word&#034;:&#034;creative&#034;,&#034;hw&#034;:true,&#034;freq&#034;:8.4},{&#034;word&#034;:&#034;creation&#034;,&#034;hw&#034;:true,&#034;freq&#034;:10.9},{&#034;word&#034;:&#034;create&#034;,&#034;hw&#034;:true,&#034;freq&#034;:22.8}]">
  `;

  const parsed = parseVocabularyHtml(html);
  assert.equal(parsed.headword, 'create');
  assert.ok(Array.isArray(parsed.wordFamily));
  assert.equal(parsed.wordFamily.length, 3); // excludes 'create' itself
  // Sorted by freq: created (89.9), creation (10.9), creative (8.4)
  assert.equal(parsed.wordFamily[0].word, 'created');
  assert.equal(parsed.wordFamily[1].word, 'creation');
  assert.equal(parsed.wordFamily[2].word, 'creative');
});

test('parser adapter: trả wordFamily rỗng an toàn khi không có thẻ <vcom:wordfamily>', () => {
  const html = `
    <h1 class="dynamictext">simple</h1>
    <div class="ipa-with-audio">
      <div class="us-flag-icon"></div>
      <span class="span-replace-h3">/ˈsɪmpəl/</span>
    </div>
    <div class="word-area">
      <p class="short">easy</p>
    </div>
  `;

  const parsed = parseVocabularyHtml(html);
  assert.equal(parsed.headword, 'simple');
  assert.deepEqual(parsed.wordFamily, []);
});

test('parser adapter: trích xuất audio.us từ thẻ audio/data-audio độc lập của Vocabulary.com', () => {
  const html = `
    <h1 class="dynamictext">innovate</h1>
    <a class="audio" data-audio="I/INNOVATE" title="Listen"></a>
    <span class="pronunciation">/ˈɪn.ə.veɪt/</span>
    <div class="word-area">
      <p class="short">bring in new methods or ideas</p>
    </div>
  `;

  const parsed = parseVocabularyHtml(html);
  assert.equal(parsed.headword, 'innovate');
  assert.equal(parsed.audio.us, 'https://audio.vocabulary.com/1.0/us/I/INNOVATE.mp3');
  assert.equal(parsed.pronunciation, '/ˈɪn.ə.veɪt/');
});

