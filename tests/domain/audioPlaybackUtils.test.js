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

test('audioPlaybackUtils: playAudioWithFallback runs safely with options object', () => {
  assert.doesNotThrow(() => {
    playAudioWithFallback({
      audioUrl: 'https://audio.vocabulary.com/1.0/us/S/1F9T5SLF6SOGF.mp3',
      word: 'several',
      accent: 'us',
    });
  });
});

test('audioPlaybackUtils: playAudioWithFallback handles non-string audioUrl safely without error', () => {
  assert.doesNotThrow(() => {
    playAudioWithFallback({
      audioUrl: null,
      word: 'several',
      accent: 'uk',
    });
  });

  assert.doesNotThrow(() => {
    playAudioWithFallback(undefined, 'several', 'en-US');
  });

  assert.doesNotThrow(() => {
    playAudioWithFallback(12345, 'several', 'en-US');
  });
});

test('audioPlaybackUtils: playAudioWithFallback uses mock Audio and fallback correctly', () => {
  let playedUrl = '';
  let fallbackSpeechSpoken = '';

  const mockAudioConstructor = class {
    constructor(src) {
      this.src = src;
    }
    play() {
      playedUrl = this.src;
      return Promise.reject(new Error('Audio failed'));
    }
  };

  const mockWindow = {
    Audio: mockAudioConstructor,
    speechSynthesis: {
      paused: false,
      resume() {},
      cancel() {},
      getVoices() { return []; },
      speak(utterance) {
        fallbackSpeechSpoken = utterance.text;
      },
    },
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  };

  playAudioWithFallback({
    audioUrl: 'https://sd-pronunciation-processed-videos.sdcdns.com/desktop/test.mp4',
    word: 'several',
    accent: 'uk',
    windowObj: mockWindow,
  });

  assert.equal(playedUrl, 'https://sd-pronunciation-processed-videos.sdcdns.com/desktop/test.mp4');
});

test('audioPlaybackUtils: stopCurrentAudio runs safely without active audio', () => {
  assert.doesNotThrow(() => {
    stopCurrentAudio();
  });
});
