import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupRequest } from '../../src/shared/lookupContract.js';
import { createServiceWorkerLookupHandler } from '../../src/background/serviceWorkerLookupHandler.js';

test('service worker handler: xử lý LOOKUP_REQUEST trong ngữ cảnh extension', async () => {
  const handled = [];

  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword }) => {
      handled.push(headword);
      return { status: 'success', data: { headword } };
    },
  });

  const message = createLookupRequest({
    token: 'hello',
    rawText: 'Hello',
    selectionRect: { x: 1, y: 1, width: 10, height: 10 },
    sourceEvent: 'mouseup',
    requestId: 'lookup-1',
  });

  const result = await handleMessage(message);

  assert.deepEqual(handled, ['hello']);
  assert.equal(result.status, 'success');
  assert.equal(result.data.headword, 'hello');
});

test('service worker handler: parse html rỗng trả not-found an toàn', async () => {
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword }) => ({
      status: 'success',
      data: {
        headword,
        lookupUrl: `https://www.vocabulary.com/dictionary/${headword}`,
        html: '<article><h1 class="dynamictext">hello</h1></article>',
      },
    }),
  });

  const result = await handleMessage(
    createLookupRequest({
      token: 'hello',
      rawText: 'hello',
      selectionRect: { x: 0, y: 0, width: 1, height: 1 },
      sourceEvent: 'mouseup',
      requestId: 'lookup-2',
    }),
  );

  assert.equal(result.status, 'not-found');
  assert.equal(result.data.reason, 'empty-core-data');
});

test('service worker handler: parser failure trả parse error thay vì throw', async () => {
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async () => ({
      status: 'success',
      data: {
        headword: 'hello',
        lookupUrl: 'https://www.vocabulary.com/dictionary/hello',
        html: '<html></html>',
      },
    }),
    htmlParser: () => ({
      status: 'error',
      error: {
        type: 'parse',
        message: 'parse failed',
      },
    }),
  });

  const result = await handleMessage(
    createLookupRequest({
      token: 'hello',
      rawText: 'hello',
      selectionRect: { x: 0, y: 0, width: 1, height: 1 },
      sourceEvent: 'mouseup',
      requestId: 'lookup-3',
    }),
  );

  assert.equal(result.status, 'error');
  assert.equal(result.error.type, 'parse');
  assert.equal(result.error.message, 'parse failed');
});

test('service worker handler: làm giàu (enrich) phát âm và audio từ FreeDictionary API khi tra cứu thành công', async () => {
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword }) => ({
      status: 'success',
      data: {
        headword,
        lookupUrl: `https://www.vocabulary.com/dictionary/${headword}`,
        html: '<article><h1 class="dynamictext">photograph</h1><div class="short">A picture</div></article>',
      },
    }),
    htmlParser: ({ html }) => ({
      status: 'success',
      data: {
        parsedPayload: {
          headword: 'photograph',
          pronunciation: 'US /ˈfoʊtəɡræf/',
          audio: { us: 'https://vocab.com/audio-us.mp3', uk: '' },
          definitions: ['<div class="vocab-quick-def">A picture</div>'],
          wordFamily: [],
          hasCoreData: true,
          source: 'vocabulary',
        },
      },
    }),
    freeDictionaryPronunciationFetcher: async ({ headword }) => ({
      headword,
      pronunciation: 'US /ˈfoʊtəɡræf/ · UK /ˈfəʊtəɡrɑːf/',
      audio: {
        us: 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-us.mp3',
        uk: 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-uk.mp3',
      },
      hasPronunciation: true,
    }),
  });

  const result = await handleMessage(
    createLookupRequest({
      token: 'photograph',
      rawText: 'photograph',
      selectionRect: { x: 0, y: 0, width: 1, height: 1 },
      sourceEvent: 'mouseup',
      requestId: 'lookup-4',
    }),
  );

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.pronunciation, 'US /ˈfoʊtəɡræf/ · UK /ˈfəʊtəɡrɑːf/');
  assert.equal(result.data.parsedPayload.audio.us, 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-us.mp3');
  assert.equal(result.data.parsedPayload.audio.uk, 'https://api.dictionaryapi.dev/media/pronunciations/en/photograph-uk.mp3');
});

test('service worker handler: giữ nguyên phát âm gốc khi FreeDictionary API fetcher lỗi hoặc rỗng', async () => {
  const handleMessage = createServiceWorkerLookupHandler({
    lookupExecutor: async ({ headword }) => ({
      status: 'success',
      data: {
        headword,
        lookupUrl: `https://www.vocabulary.com/dictionary/${headword}`,
        html: '<article><h1 class="dynamictext">fallback</h1><div class="short">A fallback</div></article>',
      },
    }),
    htmlParser: ({ html }) => ({
      status: 'success',
      data: {
        parsedPayload: {
          headword: 'fallback',
          pronunciation: 'US /ˈfɔːl.bæk/',
          audio: { us: 'https://vocab.com/audio-us.mp3', uk: '' },
          definitions: ['<div class="vocab-quick-def">A fallback</div>'],
          wordFamily: [],
          hasCoreData: true,
          source: 'vocabulary',
        },
      },
    }),
    freeDictionaryPronunciationFetcher: async () => null,
  });

  const result = await handleMessage(
    createLookupRequest({
      token: 'fallback',
      rawText: 'fallback',
      selectionRect: { x: 0, y: 0, width: 1, height: 1 },
      sourceEvent: 'mouseup',
      requestId: 'lookup-5',
    }),
  );

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.pronunciation, 'US /ˈfɔːl.bæk/');
  assert.equal(result.data.parsedPayload.audio.us, 'https://vocab.com/audio-us.mp3');
});
