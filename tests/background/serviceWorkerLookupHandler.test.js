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
