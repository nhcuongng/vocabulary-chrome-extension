let activeAudio = null;

export function stopCurrentAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore audio pause errors
    }
    activeAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis errors
    }
  }
}

export function speakWord(word, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
    }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
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

export function playAudioWithFallback(audioUrl, fallbackWord = '', lang = 'en-US') {
  stopCurrentAudio();

  const targetLang = (lang === 'uk' || lang === 'en-GB' || lang === 'gb') ? 'en-GB' : 'en-US';
  const encodedWord = encodeURIComponent(fallbackWord || '');

  const candidateUrls = [];
  if (audioUrl && !audioUrl.includes('api.dictionaryapi.dev/media/')) {
    let cleanUrl = String(audioUrl).trim();
    if (cleanUrl.startsWith('//')) cleanUrl = `https:${cleanUrl}`;
    candidateUrls.push(cleanUrl);
  }

  if (fallbackWord) {
    candidateUrls.push(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodedWord}`);
  }

  let index = 0;
  function tryPlayNext() {
    if (index >= candidateUrls.length) {
      if (fallbackWord) {
        speakWord(fallbackWord, targetLang);
      }
      return;
    }

    const currentUrl = candidateUrls[index++];
    try {
      if (typeof Audio === 'undefined') {
        tryPlayNext();
        return;
      }
      const audio = new Audio(currentUrl);
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
      if (promise !== undefined) {
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
