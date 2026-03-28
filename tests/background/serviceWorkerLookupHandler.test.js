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
