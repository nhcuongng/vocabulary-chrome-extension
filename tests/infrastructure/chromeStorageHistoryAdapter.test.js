import assert from 'node:assert/strict';
import test from 'node:test';

import { createChromeStorageHistoryAdapter } from '../../src/infrastructure/adapters/chromeStorageHistoryAdapter.js';

function createMockStorageArea(initialState = {}) {
  const store = { ...initialState };

  return {
    store,
    get: async (key) => {
      return { [key]: store[key] };
    },
    set: async (payload) => {
      Object.assign(store, payload);
    },
  };
}

test('history adapter: load empty defaults when nothing in storage', async () => {
  const storageArea = createMockStorageArea();
  const adapter = createChromeStorageHistoryAdapter({ storageArea });

  const history = await adapter.load();
  assert.deepEqual(history, []);
  assert.deepEqual(adapter.getSnapshot(), []);
});

test('history adapter: addSearchWord adds word to head and dedupes', async () => {
  const storageArea = createMockStorageArea();
  const adapter = createChromeStorageHistoryAdapter({ storageArea });
  await adapter.load();

  await adapter.addSearchWord('create');
  assert.deepEqual(adapter.getSnapshot(), ['create']);

  await adapter.addSearchWord('creative');
  assert.deepEqual(adapter.getSnapshot(), ['creative', 'create']);

  // Re-adding 'create' moves it to front
  await adapter.addSearchWord('create');
  assert.deepEqual(adapter.getSnapshot(), ['create', 'creative']);
});

test('history adapter: getRecentSearchWords limits count', async () => {
  const storageArea = createMockStorageArea();
  const adapter = createChromeStorageHistoryAdapter({ storageArea });
  await adapter.load();

  for (const word of ['word1', 'word2', 'word3', 'word4', 'word5', 'word6']) {
    await adapter.addSearchWord(word);
  }

  const recent5 = adapter.getRecentSearchWords(5);
  assert.equal(recent5.length, 5);
  assert.deepEqual(recent5, ['word6', 'word5', 'word4', 'word3', 'word2']);

  const recent3 = adapter.getRecentSearchWords(3);
  assert.deepEqual(recent3, ['word6', 'word5', 'word4']);
});

test('history adapter: getSearchSuggestions returns prefix then contains matches', async () => {
  const storageArea = createMockStorageArea();
  const adapter = createChromeStorageHistoryAdapter({ storageArea });
  await adapter.load();

  await adapter.addSearchWord('creation');
  await adapter.addSearchWord('creative');
  await adapter.addSearchWord('procreate');
  await adapter.addSearchWord('unrelated');

  const suggestions = adapter.getSearchSuggestions('creat', 5);
  assert.deepEqual(suggestions, ['creative', 'creation', 'procreate']);
});

test('history adapter: clearSearchHistory empties the history', async () => {
  const storageArea = createMockStorageArea();
  const adapter = createChromeStorageHistoryAdapter({ storageArea });
  await adapter.load();

  await adapter.addSearchWord('hello');
  await adapter.addSearchWord('world');
  assert.equal(adapter.getSnapshot().length, 2);

  await adapter.clearSearchHistory();
  assert.deepEqual(adapter.getSnapshot(), []);
});
