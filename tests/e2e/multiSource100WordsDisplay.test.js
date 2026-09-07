import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMMON_100_WORDS,
  generateVocabularyHtml,
  generateFreeDictionaryJson,
} from '../fixtures/commonWordsDataset.js';
import { parseVocabularyHtml } from '../../src/infrastructure/adapters/vocabularyHtmlParserAdapter.js';
import { parseFreeDictionaryApiResponse } from '../../src/infrastructure/adapters/freeDictionaryApiAdapter.js';
import { mapParsedPayloadToPopupViewModel } from '../../src/application/popupViewModelMapper.js';
import { renderSuccessContent } from '../../src/content/popupRenderer.js';

test('100 Common Words: Kiểm tra toàn diện Vocabulary.com parser, view model & DOM rendering (bao gồm Synonyms & Antonyms)', () => {
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
    assert.ok(Array.isArray(parsed.synonyms), `Word ${item.word} synonyms should be an array in Vocabulary.com`);
    assert.ok(Array.isArray(parsed.antonyms), `Word ${item.word} antonyms should be an array in Vocabulary.com`);

    // Kiểm tra trong definitions có format Synonyms & Antonyms
    assert.ok(
      parsed.definitions.some((d) => d.includes('Synonyms:') && d.includes('Antonyms:')),
      `Word ${item.word} definition should include Synonyms and Antonyms formatting`
    );

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
    assert.ok(Array.isArray(viewModel.synonyms));
    assert.ok(Array.isArray(viewModel.antonyms));

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

    if (viewModel.synonyms.length > 0 || viewModel.antonyms.length > 0) {
      assert.ok(itemTypes.includes('synonyms-antonyms'), `Render missing synonyms-antonyms for ${item.word}`);
    }

    successCount += 1;
  }

  assert.equal(successCount, 100);
});

test('100 Common Words: Kiểm tra toàn diện FreeDictionary parser, view model & DOM rendering (bao gồm Synonyms & Antonyms)', () => {
  assert.equal(COMMON_100_WORDS.length, 100);

  let successCount = 0;
  for (const item of COMMON_100_WORDS) {
    const json = generateFreeDictionaryJson(item);
    const parsed = parseFreeDictionaryApiResponse(json, item.word, 'freedictionary');

    // 1. Kiểm tra parser adapter
    assert.equal(parsed.headword.toLowerCase(), item.word.toLowerCase());
    assert.ok(parsed.pronunciation.length > 0, `Word ${item.word} missing pronunciation in FreeDictionary`);
    assert.ok(parsed.definitions.length > 0, `Word ${item.word} missing definitions in FreeDictionary`);
    assert.equal(parsed.hasCoreData, true, `Word ${item.word} missing hasCoreData in FreeDictionary`);
    assert.ok(Array.isArray(parsed.synonyms), `Word ${item.word} synonyms should be an array in FreeDictionary`);
    assert.ok(Array.isArray(parsed.antonyms), `Word ${item.word} antonyms should be an array in FreeDictionary`);

    // Kiểm tra trong definitions có format Synonyms & Antonyms
    assert.ok(
      parsed.definitions.some((d) => d.includes('Synonyms:') && d.includes('Antonyms:')),
      `Word ${item.word} definition should include Synonyms and Antonyms formatting in FreeDictionary`
    );

    // 2. Kiểm tra View Model Mapper
    const viewModel = mapParsedPayloadToPopupViewModel({
      ...parsed,
      source: 'freedictionary',
      lookupUrl: `https://api.dictionaryapi.dev/api/v2/entries/en/${item.word}`,
    });

    assert.equal(viewModel.state, 'success');
    assert.equal(viewModel.headword, item.word);
    assert.equal(viewModel.source, 'freedictionary');
    assert.ok(viewModel.definitions.length > 0);
    assert.ok(Array.isArray(viewModel.synonyms));
    assert.ok(Array.isArray(viewModel.antonyms));

    // 3. Kiểm tra Popup Content Renderer
    const renderItems = renderSuccessContent(viewModel);
    const itemTypes = renderItems.map((r) => r.type);

    assert.ok(itemTypes.includes('headword'), `Render missing headword for ${item.word}`);
    assert.ok(itemTypes.includes('pronunciation'), `Render missing pronunciation for ${item.word}`);
    assert.ok(itemTypes.includes('definition'), `Render missing definition for ${item.word}`);
    assert.ok(itemTypes.includes('compliance-footer'), `Render missing compliance-footer for ${item.word}`);

    if (viewModel.synonyms.length > 0 || viewModel.antonyms.length > 0) {
      assert.ok(itemTypes.includes('synonyms-antonyms'), `Render missing synonyms-antonyms for ${item.word}`);
    }

    successCount += 1;
  }

  assert.equal(successCount, 100);
});
