import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseFreeDictionaryApiResponse,
  extractFreeDictionaryPronunciation,
} from '../../src/infrastructure/adapters/freeDictionaryApiAdapter.js';

test('freeDictionaryApiAdapter: trích xuất headword, UK & US audio, IPA, định nghĩa theo POS và word family', () => {
  const sampleJson = {
    word: 'beautiful',
    entries: [
      {
        language: { code: 'en', name: 'English' },
        partOfSpeech: 'adjective',
        pronunciations: [
          { type: 'ipa', text: '/ˈbjuːtɪfəl/', tags: ['Received Pronunciation'] },
          { type: 'ipa', text: '/ˈbjuːtɪfəl/', tags: ['General American'] },
        ],
        senses: [
          {
            definition: 'Pleasing to the senses or to the mind.',
            examples: ['A beautiful sunset.'],
            synonyms: ['lovely', 'gorgeous'],
          }
        ],
        synonyms: ['pretty'],
      },
      {
        language: { code: 'en', name: 'English' },
        partOfSpeech: 'noun',
        pronunciations: [],
        senses: [
          {
            definition: 'Someone who is beautiful.',
          }
        ],
      }
    ]
  };

  const result = parseFreeDictionaryApiResponse(sampleJson, 'beautiful');

  assert.equal(result.headword, 'beautiful');
  assert.ok(result.pronunciation.includes('US /ˈbjuːtɪfəl/'));
  // if identical, it omits UK
  assert.ok(!result.pronunciation.includes('UK'));
  assert.ok(result.audio.uk.includes('translate.google.com'));
  assert.ok(result.audio.us.includes('translate.google.com'));
  assert.equal(result.definitions.length, 4);
  assert.ok(result.definitions.some((d) => d.includes('vocab-quick-def') && d.includes('Pleasing to the senses')));
  assert.ok(result.definitions.some((d) => d.includes('Long Definition')));
  assert.ok(result.definitions.some((d) => d.includes('Adjective')));
  assert.ok(result.definitions.some((d) => d.includes('Noun')));
  assert.ok(result.hasCoreData);
  assert.equal(result.source, 'cambridge');
  assert.ok(result.wordFamily.some((f) => f.word === 'lovely' || f.word === 'pretty'));
});

test('extractFreeDictionaryPronunciation: trích xuất US & UK IPA và audio direct URLs từ standard dictionary API response', () => {
  const standardApiJson = [
    {
      word: 'photograph',
      phonetic: '/ˈfəʊtəɡrɑːf/',
      phonetics: [
        {
          text: '/ˈfəʊtəɡrɑːf/',
          audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-uk.mp3',
        },
        {
          text: '/ˈfoʊtəɡræf/',
          audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-us.mp3',
        },
      ],
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [{ definition: 'A picture made using a camera.' }],
        },
      ],
    },
  ];

  const pron = extractFreeDictionaryPronunciation(standardApiJson, 'photograph');

  assert.equal(pron.headword, 'photograph');
  assert.equal(pron.hasPronunciation, true);
  assert.equal(pron.audio.us, 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-us.mp3');
  assert.equal(pron.audio.uk, 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-uk.mp3');
  assert.ok(pron.pronunciation.includes('US /ˈfoʊtəɡræf/'));
  assert.ok(pron.pronunciation.includes('UK /ˈfəʊtəɡrɑːf/'));
});

test('freeDictionaryApiAdapter: xử lý an toàn khi json rỗng hoặc không hợp lệ', () => {
  const emptyResult = parseFreeDictionaryApiResponse([], 'unknown');
  assert.equal(emptyResult.hasCoreData, false);
  assert.equal(emptyResult.headword, 'unknown');
  assert.deepEqual(emptyResult.definitions, []);

  const nullResult = parseFreeDictionaryApiResponse(null, 'test');
  assert.equal(nullResult.hasCoreData, false);
});
