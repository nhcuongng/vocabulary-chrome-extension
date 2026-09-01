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

test('audioPlaybackUtils: playAudioWithFallback accepts and plays FreeDictionary audio URLs', () => {
  let playedUrl = '';

  const mockWindow = {
    Audio: class {
      constructor(src) {
        this.src = src;
      }
      play() {
        playedUrl = this.src;
        return Promise.resolve();
      }
    },
  };

  playAudioWithFallback({
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3',
    word: 'hello',
    accent: 'us',
    windowObj: mockWindow,
  });

  assert.equal(playedUrl, 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3');
});

test('audioPlaybackUtils: fetchAudioDataViaBackground safely handles missing chromeApi', async () => {
  const { fetchAudioDataViaBackground } = await import('../../src/domain/audioPlaybackUtils.js');
  const result = await fetchAudioDataViaBackground('https://example.com/audio.mp3', null);
  assert.equal(result, null);
});

test('audioPlaybackUtils: fetchAudioDataViaBackground resolves dataUrl when chrome runtime responds', async () => {
  const { fetchAudioDataViaBackground } = await import('../../src/domain/audioPlaybackUtils.js');
  const mockChrome = {
    runtime: {
      sendMessage(msg, callback) {
        assert.equal(msg.type, 'FETCH_AUDIO_DATA');
        callback({ status: 'success', data: { dataUrl: 'data:audio/mp3;base64,AAAA' } });
      },
    },
  };
  const result = await fetchAudioDataViaBackground('https://translate.google.com/translate_tts?q=test', mockChrome);
  assert.equal(result, 'data:audio/mp3;base64,AAAA');
});

test('audioPlaybackUtils: speakWord uses chrome.tts when available', () => {
  let spokenText = '';
  let spokenOptions = null;

  const mockChrome = {
    tts: {
      speak(word, options) {
        spokenText = word;
        spokenOptions = options;
      },
    },
  };

  const result = speakWord('hello', 'en-US', null, mockChrome);
  assert.equal(result, true);
  assert.equal(spokenText, 'hello');
  assert.equal(spokenOptions.lang, 'en-US');
  assert.equal(spokenOptions.rate, 0.9);
});

test('audioPlaybackUtils: speakWord uses window.speechSynthesis when chrome.tts is unavailable', () => {
  let spokenUtterance = null;
  const mockWindow = {
    speechSynthesis: {
      paused: false,
      resume() {},
      cancel() {},
      getVoices() {
        return [{ lang: 'en-GB' }];
      },
      speak(utt) {
        spokenUtterance = utt;
      },
    },
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  };

  const result = speakWord('world', 'en-GB', mockWindow, null);
  assert.equal(result, true);
  assert.equal(spokenUtterance?.text, 'world');
  assert.equal(spokenUtterance?.lang, 'en-GB');
});

test('audioPlaybackUtils: stopCurrentAudio stops both chrome.tts and speechSynthesis', () => {
  let ttsStopped = false;
  let synthCancelled = false;

  const mockChrome = {
    tts: {
      stop() {
        ttsStopped = true;
      },
    },
  };

  const mockWindow = {
    speechSynthesis: {
      cancel() {
        synthCancelled = true;
      },
    },
  };

  stopCurrentAudio(mockWindow, mockChrome);
  assert.equal(ttsStopped, true);
  assert.equal(synthCancelled, true);
});


