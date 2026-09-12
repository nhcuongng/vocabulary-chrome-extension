import assert from 'node:assert/strict';
import test from 'node:test';
import { ContextImageSearch, defaultContextImageSearch } from '../../src/domain/contextImageSearch.js';

test('ContextImageSearch: cleanQuery sanitizes input properly', () => {
  const service = new ContextImageSearch();
  assert.equal(service.cleanQuery(''), '');
  assert.equal(service.cleanQuery(null), '');
  assert.equal(service.cleanQuery(undefined), '');
  assert.equal(service.cleanQuery(123), '');
  assert.equal(service.cleanQuery('hello world!'), 'hello world');
  assert.equal(service.cleanQuery('  spring--blossom...  '), 'spring blossom');
  assert.equal(service.cleanQuery('apple-pie & cinnamon?'), 'apple pie cinnamon');
});

test('ContextImageSearch: fetchImages returns valid formatted images on success', async () => {
  const service = new ContextImageSearch();
  const mockPayload = {
    query: {
      pages: {
        101: {
          pageid: 101,
          title: 'File:Apple blossom flower.jpg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Apple_blossom.jpg',
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Apple_blossom.jpg/320px-Apple_blossom.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Apple_blossom_flower.jpg',
            },
          ],
        },
        102: {
          pageid: 102,
          title: 'File:Spring in park.png',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Spring_park.png',
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Spring_park.png/320px-Spring_park.png',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Spring_in_park.png',
            },
          ],
        },
      },
    },
  };

  let calledUrl = '';
  const mockFetch = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => mockPayload,
    };
  };

  const results = await service.fetchImages('blossom', 6, mockFetch);
  assert.equal(results.length, 2);
  assert.ok(calledUrl.includes('gsrsearch=blossom'));
  assert.equal(results[0].id, 101);
  assert.equal(results[0].title, 'Apple blossom flower');
  assert.equal(results[0].thumbUrl, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Apple_blossom.jpg/320px-Apple_blossom.jpg');
  assert.equal(results[0].fullUrl, 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Apple_blossom.jpg');
  assert.equal(results[0].sourceUrl, 'https://commons.wikimedia.org/wiki/File:Apple_blossom_flower.jpg');
});

test('ContextImageSearch: fetchImages filters out audio, video, svg, and pdf formats', async () => {
  const service = new ContextImageSearch();
  const mockPayload = {
    query: {
      pages: {
        1: {
          pageid: 1,
          title: 'File:Audio_sample.ogg',
          imageinfo: [{ thumburl: 'https://example.com/audio.ogg', url: 'https://example.com/audio.ogg' }],
        },
        2: {
          pageid: 2,
          title: 'File:Diagram.svg',
          imageinfo: [{ thumburl: 'https://example.com/diagram.svg', url: 'https://example.com/diagram.svg' }],
        },
        3: {
          pageid: 3,
          title: 'File:Video.webm',
          imageinfo: [{ thumburl: 'https://example.com/video.webm', url: 'https://example.com/video.webm' }],
        },
        4: {
          pageid: 4,
          title: 'File:Document.pdf',
          imageinfo: [{ thumburl: 'https://example.com/doc.pdf', url: 'https://example.com/doc.pdf' }],
        },
        5: {
          pageid: 5,
          title: 'File:Valid photo.jpeg',
          imageinfo: [{ thumburl: 'https://example.com/valid.jpeg', url: 'https://example.com/valid.jpeg' }],
        },
      },
    },
  };

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => mockPayload,
  });

  const results = await service.fetchImages('diagram', 6, mockFetch);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Valid photo');
});

test('ContextImageSearch: fetchImages caches query results and avoids duplicate network calls', async () => {
  const service = new ContextImageSearch();
  let fetchCallCount = 0;

  const mockFetch = async () => {
    fetchCallCount += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        query: {
          pages: {
            1: {
              pageid: 1,
              title: 'File:Flower.jpg',
              imageinfo: [{ thumburl: 'https://example.com/flower.jpg', url: 'https://example.com/flower.jpg' }],
            },
          },
        },
      }),
    };
  };

  const firstCall = await service.fetchImages('flower', 6, mockFetch);
  assert.equal(fetchCallCount, 1);
  assert.equal(firstCall.length, 1);

  // Second call with same keyword (case / punctuation variations sanitized)
  const secondCall = await service.fetchImages('  Flower!  ', 6, mockFetch);
  assert.equal(fetchCallCount, 1, 'Should return cached result without calling fetch again');
  assert.deepEqual(firstCall, secondCall);
});

test('ContextImageSearch: fetchImages handles empty API responses or invalid queries gracefully', async () => {
  const service = new ContextImageSearch();
  assert.deepEqual(await service.fetchImages(''), []);
  assert.deepEqual(await service.fetchImages('   '), []);

  const emptyFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ query: {} }),
  });

  const emptyResults = await service.fetchImages('nonexistent_word_xyz', 6, emptyFetch);
  assert.deepEqual(emptyResults, []);
});

test('ContextImageSearch: fetchImages throws on HTTP error status', async () => {
  const service = new ContextImageSearch();
  const errorFetch = async () => ({
    ok: false,
    status: 500,
  });

  await assert.rejects(
    async () => {
      await service.fetchImages('error', 6, errorFetch);
    },
    { message: 'HTTP Error 500' }
  );
});

test('ContextImageSearch: defaultContextImageSearch singleton is exported', () => {
  assert.ok(defaultContextImageSearch instanceof ContextImageSearch);
});
