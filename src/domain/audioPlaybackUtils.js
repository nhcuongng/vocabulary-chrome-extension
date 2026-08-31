let activeAudio = null;

export function stopCurrentAudio(windowObj = null) {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore audio pause errors
    }
    activeAudio = null;
  }

  const win = windowObj || (typeof window !== 'undefined' ? window : null);
  if (win && 'speechSynthesis' in win) {
    try {
      win.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis errors
    }
  }
}

export function speakWord(word, lang = 'en-US', windowObj = null) {
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
    const targetLang = (lang === 'uk' || lang === 'en-GB' || lang === 'gb') ? 'en-GB' : 'en-US';
    utterance.lang = targetLang;
    utterance.rate = 0.9;

    const voices = synth.getVoices() || [];
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

export function playAudioWithFallback(audioInput, fallbackWordParam = '', langParam = 'en-US') {
  let url = '';
  let fallbackWord = '';
  let lang = 'en-US';
  let windowObj = null;

  if (audioInput && typeof audioInput === 'object') {
    url = audioInput.audioUrl || audioInput.url || '';
    fallbackWord = audioInput.word || audioInput.fallbackWord || '';
    lang = audioInput.lang || audioInput.accent || 'en-US';
    windowObj = audioInput.windowObj || null;
  } else {
    url = typeof audioInput === 'string' ? audioInput : '';
    fallbackWord = typeof fallbackWordParam === 'string' ? fallbackWordParam : '';
    lang = typeof langParam === 'string' ? langParam : 'en-US';
  }

  stopCurrentAudio(windowObj);

  const isUk = lang === 'uk' || lang === 'en-GB' || lang === 'gb';
  const targetLang = isUk ? 'en-GB' : 'en-US';
  const encodedWord = encodeURIComponent(fallbackWord || '');

  const candidateUrls = [];
  if (url && typeof url === 'string') {
    let cleanUrl = url.trim();
    if (!cleanUrl.includes('api.dictionaryapi.dev/media/')) {
      if (cleanUrl.startsWith('//')) cleanUrl = `https:${cleanUrl}`;
      if (cleanUrl) candidateUrls.push(cleanUrl);
    }
  }

  if (fallbackWord) {
    candidateUrls.push(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodedWord}`);
  }

  let index = 0;
  function tryPlayNext() {
    if (index >= candidateUrls.length) {
      if (fallbackWord) {
        speakWord(fallbackWord, targetLang, windowObj);
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
      const audio = new AudioConstructor(currentUrl);
      activeAudio = audio;

      audio.onerror = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        tryPlayNext();
      };

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
      };

      const promise = audio.play();
      if (promise !== undefined && typeof promise?.catch === 'function') {
        promise.catch(() => {
          if (activeAudio === audio) {
            activeAudio = null;
          }
          tryPlayNext();
        });
      }
    } catch {
      tryPlayNext();
    }
  }

  tryPlayNext();
}
