import assert from 'node:assert/strict';
import test from 'node:test';

import {
  speakWord,
  playAudioWithFallback,
  stopCurrentAudio,
} from '../../src/domain/audioPlaybackUtils.js';

test('audioPlaybackUtils: speakWord safely returns false when speechSynthesis is not available in Node.js', () => {
  const result = speakWord('test', 'en-US');
  assert.equal(result, false);
});

test('audioPlaybackUtils: playAudioWithFallback runs safely without throwing in headless/Node.js environment', () => {
  assert.doesNotThrow(() => {
    playAudioWithFallback('https://example.com/test.mp3', 'test', 'en-US');
  });
});

test('audioPlaybackUtils: stopCurrentAudio runs safely without active audio', () => {
  assert.doesNotThrow(() => {
    stopCurrentAudio();
  });
});
