import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMMON_100_WORDS,
  generateVocabularyHtml,
  generateCambridgeHtml,
} from '../fixtures/commonWordsDataset.js';
import { parseVocabularyHtml } from '../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js';
import { parseCambridgeHtml } from '../../src/infrastructure/adapters/cambridgeHtmlParserAdapter.js';
import { mapParsedPayloadToPopupViewModel } from '../../src/application/popupViewModelMapper.js';
import { renderSuccessContent } from '../../src/content/popupRenderer.js';

test('100 Common Words: Kiểm tra toàn diện Vocabulary.com parser, view model & DOM rendering', () => {
  assert.equal(COMMON_100_WORDS.length, 100);

  let successCount = 0;
  for (const item of COMMON_100_WORDS) {
    const html = generateVocabularyHtml(item);
    const parsed = parseVocabularyHtml(html);

    // 1. Kiểm tra parser adapter
    assert.equal(parsed.headword.toLowerCase(), item.word.toLowerCase());
    assert.ok(parsed.pronunciation.length > 0, `Word ${item.word} missing pronunciation in Vocabulary.com`);
    assert.ok(parsed.definitions.length > 0, `Word ${item.word} missing definitions in Vocabulary.com`);
    assert.equal(parsed.hasCoreData, true, `Word ${item.word} missing hasCoreData in Vocabulary.com`);
    assert.ok(Array.isArray(parsed.wordFamily), `Word ${item.word} wordFamily should be an array in Vocabulary.com`);

    // 2. Kiểm tra View Model Mapper
    const viewModel = mapParsedPayloadToPopupViewModel({
      ...parsed,
      source: 'vocabulary',
      lookupUrl: `https://www.vocabulary.com/dictionary/${item.word}`,
    });

    assert.equal(viewModel.state, 'success');
    assert.equal(viewModel.headword, item.word);
    assert.equal(viewModel.source, 'vocabulary');
    assert.ok(viewModel.definitions.length > 0);

    // 3. Kiểm tra Popup Content Renderer
    const renderItems = renderSuccessContent(viewModel);
    const itemTypes = renderItems.map((r) => r.type);

    assert.ok(itemTypes.includes('headword'), `Render missing headword for ${item.word}`);
    assert.ok(itemTypes.includes('pronunciation'), `Render missing pronunciation for ${item.word}`);
    assert.ok(itemTypes.includes('definition'), `Render missing definition for ${item.word}`);
    assert.ok(itemTypes.includes('compliance-footer'), `Render missing compliance-footer for ${item.word}`);

    if (parsed.wordFamily && parsed.wordFamily.length > 0) {
      assert.ok(itemTypes.includes('word-family'), `Render missing word-family for ${item.word}`);
    }

    successCount += 1;
  }

  assert.equal(successCount, 100);
});

test('100 Common Words: Kiểm tra toàn diện Cambridge Dictionary parser, view model & DOM rendering', () => {
  assert.equal(COMMON_100_WORDS.length, 100);

  let successCount = 0;
  for (const item of COMMON_100_WORDS) {
    const html = generateCambridgeHtml(item);
    const parsed = parseCambridgeHtml(html);

    // 1. Kiểm tra parser adapter
    assert.equal(parsed.headword.toLowerCase(), item.word.toLowerCase());
    assert.ok(parsed.pronunciation.length > 0, `Word ${item.word} missing pronunciation in Cambridge`);
    assert.ok(parsed.definitions.length > 0, `Word ${item.word} missing definitions in Cambridge`);
    assert.equal(parsed.hasCoreData, true, `Word ${item.word} missing hasCoreData in Cambridge`);
    assert.ok(parsed.audio.uk.startsWith('https://dictionary.cambridge.org'), `Word ${item.word} uk audio URL invalid`);
    assert.ok(parsed.audio.us.startsWith('https://dictionary.cambridge.org'), `Word ${item.word} us audio URL invalid`);
    assert.ok(Array.isArray(parsed.wordFamily), `Word ${item.word} wordFamily should be an array in Cambridge`);

    // 2. Kiểm tra View Model Mapper
    const viewModel = mapParsedPayloadToPopupViewModel({
      ...parsed,
      source: 'cambridge',
      lookupUrl: `https://dictionary.cambridge.org/dictionary/english/${item.word}`,
    });

    assert.equal(viewModel.state, 'success');
    assert.equal(viewModel.headword, item.word);
    assert.equal(viewModel.source, 'cambridge');
    assert.ok(viewModel.definitions.length > 0);

    // 3. Kiểm tra Popup Content Renderer
    const renderItems = renderSuccessContent(viewModel);
    const itemTypes = renderItems.map((r) => r.type);

    assert.ok(itemTypes.includes('headword'), `Render missing headword for ${item.word}`);
    assert.ok(itemTypes.includes('pronunciation'), `Render missing pronunciation for ${item.word}`);
    assert.ok(itemTypes.includes('definition'), `Render missing definition for ${item.word}`);
    assert.ok(itemTypes.includes('compliance-footer'), `Render missing compliance-footer for ${item.word}`);

    if (parsed.wordFamily && parsed.wordFamily.length > 0) {
      assert.ok(itemTypes.includes('word-family'), `Render missing word-family for ${item.word}`);
    }

    successCount += 1;
  }

  assert.equal(successCount, 100);
});
