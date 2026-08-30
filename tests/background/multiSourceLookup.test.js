import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupRequest } from '../../src/shared/lookupContract.js';
import { createServiceWorkerLookupHandler } from '../../src/background/serviceWorkerLookupHandler.js';
import { buildDictionaryLookupUrl, buildCambridgeLookupUrl, buildVocabularyLookupUrl } from '../../src/background/lookupRequestBuilder.js';

test('lookupRequestBuilder: xây dựng URL chính xác theo từng nguồn', () => {
  assert.equal(buildVocabularyLookupUrl('test'), 'https://www.vocabulary.com/dictionary/test');
  assert.equal(buildCambridgeLookupUrl('test'), 'https://dictionary.cambridge.org/dictionary/english/test');
  assert.equal(buildDictionaryLookupUrl('test', 'vocabulary'), 'https://www.vocabulary.com/dictionary/test');
  assert.equal(buildDictionaryLookupUrl('test', 'cambridge'), 'https://dictionary.cambridge.org/dictionary/english/test');
});

test('service worker handler: auto mode ưu tiên Vocabulary.com khi tìm thấy', async () => {
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

test('service worker handler: auto mode fallback sang Free Dictionary API khi Vocabulary.com trả not-found', async () => {
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
  });

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'freedictionary');
  assert.equal(lookups.length, 2);
  assert.equal(lookups[0].source, 'vocabulary');
  assert.equal(lookups[1].source, 'freedictionary');
});

test('service worker handler: auto mode fallback sang Cambridge Dictionary khi cả Vocabulary.com và Free Dictionary API đều thất bại', async () => {
  const lookups = [];
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword, source }) => {
      lookups.push({ headword, source });
      if (source === 'vocabulary' || source === 'freedictionary') {
        return {
          status: 'not-found',
          data: { token: headword, reason: 'empty-core-data' },
        };
      }
      return {
        status: 'success',
        data: {
          headword,
          source: 'cambridge',
          parsedPayload: {
            headword,
            definitions: ['Definition from Cambridge Dictionary'],
            source: 'cambridge',
          },
        },
      };
    },
    freeDictionaryApiExecutor: async () => null,
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
  assert.equal(result.data.parsedPayload.source, 'cambridge');
  assert.equal(lookups.length, 3);
  assert.equal(lookups[0].source, 'vocabulary');
  assert.equal(lookups[1].source, 'freedictionary');
  assert.equal(lookups[2].source, 'cambridge');
});

test('service worker handler: người dùng chọn trực tiếp Cambridge Dictionary', async () => {
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
            definitions: ['Direct Cambridge definition'],
            source: 'cambridge',
          },
        },
      };
    },
  });

  const message = {
    type: 'LOOKUP_REQUEST',
    payload: {
      token: 'test',
      source: 'cambridge',
    },
  };

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'cambridge');
  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].source, 'cambridge');
});

test('service worker handler: fallback sang Free Dictionary API khi Cambridge HTML gặp lỗi hoặc bị Cloudflare chặn', async () => {
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async () => ({
      status: 'error',
      error: { type: 'network', statusCode: 403 },
    }),
    freeDictionaryApiExecutor: async ({ headword }) => ({
      status: 'success',
      data: {
        headword,
        source: 'cambridge',
        parsedPayload: {
          headword,
          definitions: ['Fallback definition from Free Dictionary API'],
          source: 'cambridge',
        },
      },
    }),
  });

  const message = {
    type: 'LOOKUP_REQUEST',
    payload: {
      token: 'test',
      source: 'cambridge',
    },
  };

  const result = await handleMessage(message);

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.source, 'cambridge');
  assert.equal(result.data.parsedPayload.definitions[0], 'Fallback definition from Free Dictionary API');
});

