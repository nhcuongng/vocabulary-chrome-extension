import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePartOfSpeech,
  renderPosChipHtml,
  interceptPosInHtml,
  POS_TYPES,
} from '../../src/domain/partOfSpeechUtils.js';

test('partOfSpeechUtils: normalizePartOfSpeech chuẩn hóa chính xác các loại từ phổ biến', () => {
  assert.deepEqual(normalizePartOfSpeech('noun'), POS_TYPES.NOUN);
  assert.deepEqual(normalizePartOfSpeech('Noun'), POS_TYPES.NOUN);
  assert.deepEqual(normalizePartOfSpeech('n.'), POS_TYPES.NOUN);
  assert.deepEqual(normalizePartOfSpeech('(n)'), POS_TYPES.NOUN);

  assert.deepEqual(normalizePartOfSpeech('verb'), POS_TYPES.VERB);
  assert.deepEqual(normalizePartOfSpeech('Verb:'), POS_TYPES.VERB);
  assert.deepEqual(normalizePartOfSpeech('v.'), POS_TYPES.VERB);
  assert.deepEqual(normalizePartOfSpeech('vi'), POS_TYPES.VERB);
  assert.deepEqual(normalizePartOfSpeech('vt'), POS_TYPES.VERB);

  assert.deepEqual(normalizePartOfSpeech('adjective'), POS_TYPES.ADJECTIVE);
  assert.deepEqual(normalizePartOfSpeech('adj.'), POS_TYPES.ADJECTIVE);

  assert.deepEqual(normalizePartOfSpeech('adverb'), POS_TYPES.ADVERB);
  assert.deepEqual(normalizePartOfSpeech('adv.'), POS_TYPES.ADVERB);

  assert.deepEqual(normalizePartOfSpeech('pronoun'), POS_TYPES.PRONOUN);
  assert.deepEqual(normalizePartOfSpeech('preposition'), POS_TYPES.PREPOSITION);
  assert.deepEqual(normalizePartOfSpeech('conjunction'), POS_TYPES.CONJUNCTION);
  assert.deepEqual(normalizePartOfSpeech('interjection'), POS_TYPES.INTERJECTION);
  assert.deepEqual(normalizePartOfSpeech('phrase'), POS_TYPES.PHRASE);
  assert.deepEqual(normalizePartOfSpeech('idiom'), POS_TYPES.IDIOM);
});

test('partOfSpeechUtils: normalizePartOfSpeech an toàn với chuỗi rỗng / không hợp lệ', () => {
  assert.equal(normalizePartOfSpeech(''), null);
  assert.equal(normalizePartOfSpeech(null), null);
  assert.equal(normalizePartOfSpeech(undefined), null);
  assert.equal(normalizePartOfSpeech(':::'), null);
});

test('partOfSpeechUtils: renderPosChipHtml sinh HTML chip với class tương ứng', () => {
  assert.equal(
    renderPosChipHtml('noun'),
    '<span class="vocab-pos-chip vocab-pos-noun">Noun</span>'
  );
  assert.equal(
    renderPosChipHtml('verb'),
    '<span class="vocab-pos-chip vocab-pos-verb">Verb</span>'
  );
  assert.equal(
    renderPosChipHtml('adjective'),
    '<span class="vocab-pos-chip vocab-pos-adjective">Adjective</span>'
  );
  assert.equal(
    renderPosChipHtml('adv.'),
    '<span class="vocab-pos-chip vocab-pos-adverb">Adverb</span>'
  );
});

test('partOfSpeechUtils: interceptPosInHtml thay thế <b>Noun:</b> thành chip', () => {
  const input = '<p><b>Noun:</b> A continuous physical force.</p>';
  const output = interceptPosInHtml(input);
  assert.ok(output.includes('<span class="vocab-pos-chip vocab-pos-noun">Noun</span>'));
  assert.ok(output.includes('A continuous physical force.'));
});

test('partOfSpeechUtils: interceptPosInHtml thay thế <a class="pos">verb</a> thành chip', () => {
  const input = '<div class="definition"><a class="pos">verb</a> to move fast</div>';
  const output = interceptPosInHtml(input);
  assert.ok(output.includes('<span class="vocab-pos-chip vocab-pos-verb">Verb</span>'));
  assert.ok(output.includes('to move fast'));
});

test('partOfSpeechUtils: interceptPosInHtml thay thế (adj.) hoặc (noun) ở đầu đoạn', () => {
  const input = '<p>(adj.) having a great extent</p>';
  const output = interceptPosInHtml(input);
  assert.ok(output.includes('<span class="vocab-pos-chip vocab-pos-adjective">Adjective</span>'));
  assert.ok(output.includes('having a great extent'));
});

test('partOfSpeechUtils: interceptPosInHtml thay thế <b>verb attain success...</b> thành chip và nội dung đậm', () => {
  const input = '<ol><li><b>verb attain success or reach a desired goal</b></li></ol>';
  const output = interceptPosInHtml(input);
  assert.ok(output.includes('<span class="vocab-pos-chip vocab-pos-verb">Verb</span> <b>attain success or reach a desired goal</b>'));
});

