import assert from 'node:assert/strict';
import test from 'node:test';

import { VisualImageSearchAdapter } from '../../src/infrastructure/adapters/visualImageSearchAdapter.js';
import { ContextImageSearch } from '../../src/domain/contextImageSearch.js';

test('VisualImageSearchAdapter: extractVqdToken correctly extracts token from diverse HTML formats', () => {
  const adapter = new VisualImageSearchAdapter();
  assert.equal(adapter.extractVqdToken('<script>vqd="4-123456789";</script>'), '4-123456789');
  assert.equal(adapter.extractVqdToken("<script>vqd='4-987654321';</script>"), '4-987654321');
  assert.equal(adapter.extractVqdToken('{"vqd": "4-11223344"}'), '4-11223344');
  assert.equal(adapter.extractVqdToken('no token here'), null);
  assert.equal(adapter.extractVqdToken(null), null);
  assert.equal(adapter.extractVqdToken(''), null);
});

test('VisualImageSearchAdapter: fetchDuckDuckGoImages requests token and searches images', async () => {
  const adapter = new VisualImageSearchAdapter();

  const mockTokenHtml = '<html><head><script>vqd="4-12345";</script></head></html>';
  const mockSearchJson = {
    results: [
      {
        title: 'Spring blossom flowers in bloom',
        thumbnail: 'https://tse1.mm.bing.net/th?id=123',
        image: 'https://example.com/blossom_large.jpg',
        url: 'https://example.com/article/spring-blossom',
      },
      {
        title: 'Diagram vector.svg',
        thumbnail: 'https://example.com/diagram.svg',
        image: 'https://example.com/diagram.svg',
        url: 'https://example.com/diagram',
      },
    ],
  };

  const urlsCalled = [];
  const mockFetch = async (url) => {
    urlsCalled.push(url);
    if (url.includes('duckduckgo.com/?q=')) {
      return {
        ok: true,
        status: 200,
        text: async () => mockTokenHtml,
      };
    }
    if (url.includes('duckduckgo.com/i.js')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockSearchJson,
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const results = await adapter.fetchDuckDuckGoImages('blossom', 6, mockFetch);
  assert.equal(results.length, 1, 'Should filter out svg');
  assert.equal(results[0].title, 'Spring blossom flowers in bloom');
  assert.equal(results[0].thumbUrl, 'https://tse1.mm.bing.net/th?id=123');
  assert.equal(results[0].fullUrl, 'https://example.com/blossom_large.jpg');
  assert.equal(results[0].sourceUrl, 'https://example.com/article/spring-blossom');
  assert.ok(urlsCalled[1].includes('vqd=4-12345'));
});

test('VisualImageSearchAdapter: fetchImagesWithFallback uses DuckDuckGo when available and caches result', async () => {
  const adapter = new VisualImageSearchAdapter();
  let calls = 0;

  const mockFetch = async (url) => {
    calls++;
    if (url.includes('duckduckgo.com/?q=')) {
      return {
        ok: true,
        status: 200,
        text: async () => 'vqd="4-55555"',
      };
    }
    if (url.includes('duckduckgo.com/i.js')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              title: 'Apple Tree',
              thumbnail: 'https://example.com/apple_thumb.jpg',
              image: 'https://example.com/apple.jpg',
              url: 'https://example.com/apple-info',
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const res1 = await adapter.fetchImagesWithFallback('apple', 6, mockFetch);
  assert.equal(res1.source, 'duckduckgo');
  assert.equal(res1.images.length, 1);
  assert.equal(calls, 2);

  // Cached call
  const res2 = await adapter.fetchImagesWithFallback('  Apple  ', 6, mockFetch);
  assert.equal(calls, 2, 'Should not make new network requests on cache hit');
  assert.deepEqual(res1, res2);
});

test('VisualImageSearchAdapter: fetchImagesWithFallback falls back to Wikimedia Commons when DuckDuckGo fails', async () => {
  const wikiService = new ContextImageSearch();
  const adapter = new VisualImageSearchAdapter({ imageSearchService: wikiService });

  const mockWikiPayload = {
    query: {
      pages: {
        201: {
          pageid: 201,
          title: 'File:Fallback Flower.jpg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/wikipedia/commons/flower.jpg',
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/flower.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Fallback_Flower.jpg',
            },
          ],
        },
      },
    },
  };

  const mockFetch = async (url) => {
    // DDG calls fail
    if (url.includes('duckduckgo.com')) {
      return {
        ok: false,
        status: 403,
      };
    }
    // Wikimedia call succeeds
    if (url.includes('commons.wikimedia.org')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockWikiPayload,
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await adapter.fetchImagesWithFallback('flower', 6, mockFetch);
  assert.equal(result.source, 'wikimedia');
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].title, 'Fallback Flower');
});

test('VisualImageSearchAdapter: handles empty queries safely', async () => {
  const adapter = new VisualImageSearchAdapter();
  const emptyRes = await adapter.fetchImagesWithFallback('');
  assert.equal(emptyRes.images.length, 0);
});
