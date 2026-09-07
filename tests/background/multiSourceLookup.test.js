import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupRequest } from '../../src/shared/lookupContract.js';
import { createServiceWorkerLookupHandler } from '../../src/background/serviceWorkerLookupHandler.js';
import { buildDictionaryLookupUrl, buildVocabularyLookupUrl } from '../../src/background/lookupRequestBuilder.js';

test('lookupRequestBuilder: xây dựng URL chính xác theo từng nguồn', () => {
  assert.equal(buildVocabularyLookupUrl('test'), 'https://www.vocabulary.com/dictionary/test');
  assert.equal(buildDictionaryLookupUrl('test', 'vocabulary'), 'https://www.vocabulary.com/dictionary/test');
});

test('service worker handler: default mode (simpleLearn = false) tra cứu Vocabulary.com', async () => {
  const lookups = [];
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword, source }) => {
      lookups.push({ headword, source });
      return {
        status: 'success',
        data: {
          headword,
          source,
          parsedPayload: {
            headword,
            definitions: ['Definition from vocabulary.com'],
            source: 'vocabulary',
          },
        },
      };
    },
  });

  const message = createLookupRequest({
    token: 'test',
    rawText: 'test',
    selectionRect: { x: 0, y: 0, width: 10, height: 10 },
    sourceEvent: 'mouseup',
    requestId: 'req-1',
  });

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'vocabulary');
  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].source, 'vocabulary');
});

test('service worker handler: Simple Learn mode (simpleLearn = true) tra cứu Free Dictionary API', async () => {
  const lookups = [];
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async () => null,
    freeDictionaryApiExecutor: async ({ headword, requestedSource }) => {
      lookups.push({ headword, source: requestedSource });
      return {
        status: 'success',
        data: {
          headword,
          source: 'freedictionary',
          parsedPayload: {
            headword,
            definitions: ['Definition from Free Dictionary API'],
            source: 'freedictionary',
          },
        },
      };
    },
  });

  const message = createLookupRequest({
    token: 'test',
    rawText: 'test',
    selectionRect: { x: 0, y: 0, width: 10, height: 10 },
    sourceEvent: 'mouseup',
    requestId: 'req-2',
    source: 'freedictionary',
    simpleLearn: true,
  });

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'freedictionary');
  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].source, 'freedictionary');
});

test('service worker handler: fallback sang Free Dictionary API khi Vocabulary.com trả not-found', async () => {
  const lookups = [];
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword, source }) => {
      lookups.push({ headword, source });
      return {
        status: 'not-found',
        data: { token: headword, reason: 'empty-core-data' },
      };
    },
    freeDictionaryApiExecutor: async ({ headword, requestedSource }) => {
      lookups.push({ headword, source: requestedSource });
      return {
        status: 'success',
        data: {
          headword,
          source: 'freedictionary',
          parsedPayload: {
            headword,
            definitions: ['Fallback definition from Free Dictionary API'],
            source: 'freedictionary',
          },
        },
      };
    },
  });

  const message = createLookupRequest({
    token: 'test',
    rawText: 'test',
    selectionRect: { x: 0, y: 0, width: 10, height: 10 },
    sourceEvent: 'mouseup',
    requestId: 'req-3',
  });

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'freedictionary');
  assert.equal(lookups.length, 2);
  assert.equal(lookups[0].source, 'vocabulary');
  assert.equal(lookups[1].source, 'freedictionary');
});

