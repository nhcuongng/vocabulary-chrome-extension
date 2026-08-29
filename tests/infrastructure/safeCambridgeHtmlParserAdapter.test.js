import assert from 'node:assert/strict';
import test from 'node:test';

import { safeParseCambridgeHtml } from '../../src/infrastructure/adapters/safeCambridgeHtmlParserAdapter.js';

test('safe cambridge parser: trả not-found khi payload không có core data', () => {
  const result = safeParseCambridgeHtml({
    html: '<div>invalid content</div>',
    parser: () => ({ headword: '', definitions: [] }),
  });

  assert.equal(result.status, 'not-found');
  assert.equal(result.data.reason, 'empty-core-data');
});

test('safe cambridge parser: trả typed parse error và không throw ra ngoài', () => {
  const result = safeParseCambridgeHtml({
    html: '<div>broken</div>',
    parser: () => {
      throw new Error('boom');
    },
  });

  assert.equal(result.status, 'error');
  assert.equal(result.error.type, 'parse');
  assert.equal(result.error.message, 'boom');
});

test('safe cambridge parser: trả success khi có headword và definitions', () => {
  const result = safeParseCambridgeHtml({
    html: '<div>valid</div>',
    parser: () => ({
      headword: 'test',
      definitions: ['a procedure for evaluation'],
      pronunciation: 'US /test/',
    }),
  });

  assert.equal(result.status, 'success');
  assert.equal(result.data.parsedPayload.headword, 'test');
});
