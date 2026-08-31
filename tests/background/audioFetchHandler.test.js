import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFetchAudioMessage, arrayBufferToBase64 } from '../../src/background/audioFetchHandler.js';

test('audioFetchHandler: arrayBufferToBase64 encodes binary buffer accurately', () => {
  const text = 'Hello Audio Test';
  const buffer = new TextEncoder().encode(text).buffer;
  const base64 = arrayBufferToBase64(buffer);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  assert.equal(decoded, text);
});

test('audioFetchHandler: handleFetchAudioMessage returns error when url is missing', async () => {
  const res = await handleFetchAudioMessage({ payload: {} });
  assert.equal(res.status, 'error');
  assert.match(res.error.message, /url is required/i);
});

test('audioFetchHandler: handleFetchAudioMessage returns success dataUrl on 200 response', async () => {
  const fakeAudioContent = 'FAKE_MP3_DATA';
  const mockFetch = async (url, options) => {
    assert.equal(options?.headers?.Referer, 'https://translate.google.com/');
    return {
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'audio/mpeg' : null),
      },
      arrayBuffer: async () => new TextEncoder().encode(fakeAudioContent).buffer,
    };
  };

  const res = await handleFetchAudioMessage(
    { payload: { url: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=several' } },
    { fetchImpl: mockFetch }
  );

  assert.equal(res.status, 'success');
  assert.ok(res.data?.dataUrl.startsWith('data:audio/mpeg;base64,'));
});

test('audioFetchHandler: handleFetchAudioMessage returns error on HTTP failure', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
  });

  const res = await handleFetchAudioMessage(
    { payload: { url: 'https://translate.google.com/translate_tts?test' } },
    { fetchImpl: mockFetch }
  );

  assert.equal(res.status, 'error');
  assert.match(res.error.message, /HTTP 404/i);
});
