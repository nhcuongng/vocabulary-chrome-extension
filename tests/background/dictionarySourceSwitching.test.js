import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupRequest } from '../../src/shared/lookupContract.js';
import { createServiceWorkerLookupHandler } from '../../src/background/serviceWorkerLookupHandler.js';
import { performDictionaryLookup, createInMemoryLookupCache } from '../../src/background/lookupService.js';
import { DICTIONARY_SOURCE, normalizeUserSettings } from '../../src/shared/userSettings.js';

test('dictionary source: normalizeUserSettings validates simpleLearn', () => {
  assert.equal(normalizeUserSettings({ simpleLearn: true }).simpleLearn, true);
  assert.equal(normalizeUserSettings({ simpleLearn: false }).simpleLearn, false);
  assert.equal(normalizeUserSettings({ simpleLearn: 'true' }).simpleLearn, true);
  assert.equal(normalizeUserSettings({ simpleLearn: 'false' }).simpleLearn, false);
  assert.equal(normalizeUserSettings({ simpleLearn: null }).simpleLearn, false);
});

test('service worker lookup handler: direct lookup với nguồn FreeDictionary', async () => {
  const handler = createServiceWorkerLookupHandler({
    freeDictionaryApiExecutor: async ({ headword, requestedSource }) => {
      assert.equal(headword, 'test');
      assert.equal(requestedSource, DICTIONARY_SOURCE.FREEDICTIONARY);
      return {
        status: 'success',
        data: {
          headword,
          source: DICTIONARY_SOURCE.FREEDICTIONARY,
          parsedPayload: {
            headword,
            definitions: ['FreeDictionary definition for test'],
            source: DICTIONARY_SOURCE.FREEDICTIONARY,
          },
        },
      };
    },
  });

  const response = await handler({
    type: 'LOOKUP_REQUEST',
    payload: {
      token: 'test',
      source: DICTIONARY_SOURCE.FREEDICTIONARY,
    },
  });

  assert.equal(response.status, 'success');
  assert.equal(response.data.source, DICTIONARY_SOURCE.FREEDICTIONARY);
  assert.equal(response.data.parsedPayload.definitions[0], 'FreeDictionary definition for test');
});

test('service worker lookup handler: switching sources returns corresponding source data', async () => {
  const lookups = [];
  const handler = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword, source }) => {
      lookups.push({ headword, source });
      return {
        status: 'success',
        data: {
          headword,
          source,
          parsedPayload: {
            headword,
            definitions: [`Definition from ${source}`],
            source,
          },
        },
      };
    },
  });

  // 1. Lookup with Vocabulary
  const vocabRes = await handler({
    type: 'LOOKUP_REQUEST',
    payload: { token: 'apple', source: DICTIONARY_SOURCE.VOCABULARY },
  });
  assert.equal(vocabRes.status, 'success');
  assert.equal(vocabRes.data.source, DICTIONARY_SOURCE.VOCABULARY);

  // 2. Switch to FreeDictionary
  const freeDictRes = await handler({
    type: 'LOOKUP_REQUEST',
    payload: { token: 'apple', source: DICTIONARY_SOURCE.FREEDICTIONARY },
  });
  assert.equal(freeDictRes.status, 'success');
  assert.equal(freeDictRes.data.source, DICTIONARY_SOURCE.FREEDICTIONARY);

  assert.equal(lookups.length, 2);
  assert.equal(lookups[0].source, DICTIONARY_SOURCE.VOCABULARY);
  assert.equal(lookups[1].source, DICTIONARY_SOURCE.FREEDICTIONARY);
});

test('lookupService cache partitioning: cache key phân tách theo source (${source}:${headword})', async () => {
  const cacheStore = createInMemoryLookupCache();
  let fetchCount = 0;

  const mockFetch = async (url) => {
    fetchCount += 1;
    const isFreeDict = url.includes('freedictionaryapi.com') || url.includes('dictionaryapi.dev');
    if (isFreeDict) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          word: 'orange',
          entries: [{
            partOfSpeech: 'noun',
            pronunciations: [{ type: 'ipa', text: '/ˈɒr.ɪndʒ/', tags: ['us'] }],
            senses: [{ definition: 'A round citrus fruit' }]
          }]
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '<html><body><h1 class="dynamic-text">orange</h1><p class="short">A round citrus fruit</p></body></html>',
    };
  };

  // Tra cứu 'orange' với FreeDictionary
  const resultFreeDict1 = await performDictionaryLookup({
    headword: 'orange',
    source: DICTIONARY_SOURCE.FREEDICTIONARY,
    fetchImpl: mockFetch,
    cacheStore,
  });
  assert.equal(resultFreeDict1.status, 'success');
  assert.equal(resultFreeDict1.data.cache.hit, false);
  assert.equal(fetchCount, 1);

  // Tra cứu 'orange' lại với FreeDictionary -> Cache HIT
  const resultFreeDict2 = await performDictionaryLookup({
    headword: 'orange',
    source: DICTIONARY_SOURCE.FREEDICTIONARY,
    fetchImpl: mockFetch,
    cacheStore,
  });
  assert.equal(resultFreeDict2.status, 'success');
  assert.equal(resultFreeDict2.data.cache.hit, true);
  assert.equal(fetchCount, 1); // Không gọi fetch mới

  // Đổi nguồn sang Vocabulary -> Cache MISS do khác source key!
  const resultVocab1 = await performDictionaryLookup({
    headword: 'orange',
    source: DICTIONARY_SOURCE.VOCABULARY,
    fetchImpl: mockFetch,
    cacheStore,
  });
  assert.equal(resultVocab1.status, 'success');
  assert.equal(resultVocab1.data.cache.hit, false);
  assert.equal(fetchCount, 2); // Gọi fetch nguồn Vocabulary thành công
});

test('lookupFlowOrchestrator: passes requested source and preserves headword and source in state', async () => {
  const { createLookupFlowOrchestrator } = await import('../../src/content/lookupFlowOrchestrator.js');
  const states = [];

  const orchestrator = createLookupFlowOrchestrator({
    lookupExecutor: async ({ headword, source }) => {
      return {
        status: 'success',
        data: {
          headword,
          source,
          parsedPayload: {
            headword,
            source,
            definitions: [`Def for ${headword} from ${source}`],
          },
        },
      };
    },
    onStateChange: (st) => states.push(st),
  });

  await orchestrator.runLookup({
    payload: {
      token: 'galaxy',
      source: 'freedictionary',
    },
  });

  const finalState = orchestrator.getState();
  assert.equal(finalState.status, 'success');
  assert.equal(finalState.headword, 'galaxy');
  assert.equal(finalState.source, 'freedictionary');
  assert.equal(finalState.data.source, 'freedictionary');
});

test('popupViewModelMapper: preserves headword and source for not-found and error states', async () => {
  const { mapLookupResultToPopupViewModel } = await import('../../src/application/popupViewModelMapper.js');

  const notFoundVm = mapLookupResultToPopupViewModel({
    status: 'not-found',
    headword: 'nonexistent',
    source: 'freedictionary',
    data: { token: 'nonexistent', source: 'freedictionary' },
  });
  assert.equal(notFoundVm.state, 'not-found');
  assert.equal(notFoundVm.headword, 'nonexistent');
  assert.equal(notFoundVm.source, 'freedictionary');

  const errorVm = mapLookupResultToPopupViewModel({
    status: 'error',
    headword: 'errword',
    source: 'freedictionary',
    error: { type: 'network', headword: 'errword', source: 'freedictionary' },
  });
  assert.equal(errorVm.state, 'error');
  assert.equal(errorVm.headword, 'errword');
  assert.equal(errorVm.source, 'freedictionary');
});
