let activeAudio = null;
let activeUtterance = null;

export function stopCurrentAudio(windowObj = null, chromeApi = globalThis.chrome) {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore audio pause errors
    }
    activeAudio = null;
  }

  if (chromeApi?.tts?.stop && typeof chromeApi.tts.stop === 'function') {
    try {
      chromeApi.tts.stop();
    } catch {
      // Ignore chrome.tts stop errors
    }
  }

  const win = windowObj || (typeof window !== 'undefined' ? window : null);
  if (win && 'speechSynthesis' in win) {
    try {
      win.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis errors
    }
  }
  activeUtterance = null;
}

export function speakWord(word, lang = 'en-US', windowObj = null, chromeApi = globalThis.chrome) {
  if (!word || typeof word !== 'string') {
    return false;
  }

  const targetLang = (lang === 'uk' || lang === 'en-GB' || lang === 'gb') ? 'en-GB' : 'en-US';

  // 1. Try native chrome.tts API first if available in extension context
  if (chromeApi?.tts?.speak && typeof chromeApi.tts.speak === 'function') {
    try {
      chromeApi.tts.speak(word, {
        lang: targetLang,
        rate: 0.9,
        enqueue: false,
      });
      return true;
    } catch (e) {
      console.warn('chrome.tts error:', e);
    }
  }

  // 2. Fall back to window.speechSynthesis with GC protection
  const win = windowObj || (typeof window !== 'undefined' ? window : null);
  if (!win || !('speechSynthesis' in win)) {
    return false;
  }

  try {
    const synth = win.speechSynthesis;
    if (synth.paused) {
      synth.resume();
    }
    synth.cancel();

    const SpeechSynthesisUtteranceConstructor =
      win.SpeechSynthesisUtterance || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    if (!SpeechSynthesisUtteranceConstructor) {
      return false;
    }

    const utterance = new SpeechSynthesisUtteranceConstructor(word);
    activeUtterance = utterance;
    utterance.lang = targetLang;
    utterance.rate = 0.9;

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    const voices = (typeof synth.getVoices === 'function' && synth.getVoices()) || [];
    const matchedVoice = voices.find((v) => v.lang === targetLang || v.lang.startsWith(targetLang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    synth.speak(utterance);
    return true;
  } catch (e) {
    console.warn('SpeechSynthesis error:', e);
    return false;
  }
}

export function fetchAudioDataViaBackground(url, chromeApi = globalThis.chrome) {
  if (!chromeApi?.runtime?.sendMessage || typeof chromeApi.runtime.sendMessage !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      chromeApi.runtime.sendMessage(
        {
          type: 'FETCH_AUDIO_DATA',
          payload: { url },
        },
        (response) => {
          if (response?.status === 'success' && response?.data?.dataUrl) {
            resolve(response.data.dataUrl);
          } else {
            resolve(null);
          }
        },
      );
    } catch {
      resolve(null);
    }
  });
}

export function playAudioWithFallback(audioInput, fallbackWordParam = '', langParam = 'en-US') {
  let url = '';
  let fallbackWord = '';
  let lang = 'en-US';
  let windowObj = null;
  let chromeApi = globalThis.chrome;

  if (audioInput && typeof audioInput === 'object') {
    url = audioInput.audioUrl || audioInput.url || '';
    fallbackWord = audioInput.word || audioInput.fallbackWord || '';
    lang = audioInput.lang || audioInput.accent || 'en-US';
    windowObj = audioInput.windowObj || null;
    if (audioInput.chromeApi) {
      chromeApi = audioInput.chromeApi;
    }
  } else {
    url = typeof audioInput === 'string' ? audioInput : '';
    fallbackWord = typeof fallbackWordParam === 'string' ? fallbackWordParam : '';
    lang = typeof langParam === 'string' ? langParam : 'en-US';
  }

  stopCurrentAudio(windowObj, chromeApi);

  const isUk = lang === 'uk' || lang === 'en-GB' || lang === 'gb';
  const targetLang = isUk ? 'en-GB' : 'en-US';
  const encodedWord = encodeURIComponent(fallbackWord || '');

  const candidateUrls = [];
  if (url && typeof url === 'string') {
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('//')) cleanUrl = `https:${cleanUrl}`;
    if (cleanUrl) candidateUrls.push(cleanUrl);
  }

  if (fallbackWord) {
    candidateUrls.push(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodedWord}`);
  }

  let index = 0;
  async function tryPlayNext() {
    if (index >= candidateUrls.length) {
      if (fallbackWord) {
        speakWord(fallbackWord, targetLang, windowObj, chromeApi);
      }
      return;
    }

    const currentUrl = candidateUrls[index++];
    try {
      const AudioConstructor = (windowObj && windowObj.Audio) || (typeof Audio !== 'undefined' ? Audio : null);
      if (!AudioConstructor) {
        tryPlayNext();
        return;
      }

      let effectiveSrc = currentUrl;
      if (currentUrl.includes('translate.google.com/translate_tts')) {
        const dataUrl = await fetchAudioDataViaBackground(currentUrl, chromeApi);
        if (dataUrl) {
          effectiveSrc = dataUrl;
        }
      }

      const audio = new AudioConstructor(effectiveSrc);
      activeAudio = audio;

      let hasHandledError = false;
      const handleError = async () => {
        if (hasHandledError) return;
        hasHandledError = true;
        if (activeAudio === audio) {
          activeAudio = null;
        }

        // If direct playback failed (e.g. CSP blocked in content script) and it wasn't already a data URL,
        // retry once using background fetch to convert it to base64 data URL
        if (
          !effectiveSrc.startsWith('data:') &&
          chromeApi?.runtime?.sendMessage &&
          typeof chromeApi.runtime.sendMessage === 'function'
        ) {
          try {
            const backgroundDataUrl = await fetchAudioDataViaBackground(currentUrl, chromeApi);
            if (backgroundDataUrl) {
              const retryAudio = new AudioConstructor(backgroundDataUrl);
              activeAudio = retryAudio;
              retryAudio.onerror = () => {
                if (activeAudio === retryAudio) activeAudio = null;
                tryPlayNext();
              };
              retryAudio.onended = () => {
                if (activeAudio === retryAudio) activeAudio = null;
              };
              const retryPromise = retryAudio.play();
              if (retryPromise !== undefined && typeof retryPromise?.catch === 'function') {
                retryPromise.catch(() => {
                  if (activeAudio === retryAudio) activeAudio = null;
                  tryPlayNext();
                });
              }
              return;
            }
          } catch {
            // Ignore and fall through to try next candidate
          }
        }

        tryPlayNext();
      };

      audio.onerror = () => {
        handleError();
      };

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
      };

      const promise = audio.play();
      if (promise !== undefined && typeof promise?.catch === 'function') {
        promise.catch(() => {
          handleError();
        });
      }
    } catch {
      tryPlayNext();
    }
  }

  tryPlayNext();
}

