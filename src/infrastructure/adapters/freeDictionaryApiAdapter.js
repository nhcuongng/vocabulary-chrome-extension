function wrapInCollapse(label, content, isOpen = false) {
  const labelHtml = `<span class="vocab-details-label"><span>✭</span> ${label}</span>`;
  return `
    <details ${isOpen ? 'open' : ''} class="vocab-details">
      <summary>
        ${labelHtml}
        <span class="collapse-icon">▶</span>
      </summary>
      <div class="details-content">
        ${content}
      </div>
    </details>
  `.trim();
}

export function parseFreeDictionaryApiResponse(json, targetWord = '') {
  if (!Array.isArray(json) || json.length === 0) {
    return {
      headword: targetWord,
      pronunciation: '',
      audio: { us: '', uk: '' },
      definitions: [],
      wordFamily: [],
      hasCoreData: false,
      source: 'cambridge',
    };
  }

  const entry = json[0];
  const headword = entry.word || targetWord;

  // 1. Audio & Pronunciation
  let ipaUs = '';
  let ipaUk = '';
  let audioUs = '';
  let audioUk = '';

  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  phonetics.forEach((p) => {
    let audioUrl = typeof p.audio === 'string' ? p.audio.trim() : '';
    if (audioUrl.startsWith('//')) {
      audioUrl = `https:${audioUrl}`;
    }
    const text = typeof p.text === 'string' ? p.text.replace(/^\/|\/$/g, '').trim() : '';

    const isUS = audioUrl.includes('-us.') || audioUrl.includes('/us/') || audioUrl.endsWith('-us.mp3') || audioUrl.endsWith('-us.ogg');
    const isUK = audioUrl.includes('-uk.') || audioUrl.includes('/uk/') || audioUrl.endsWith('-uk.mp3') || audioUrl.endsWith('-uk.ogg');
    const isAU = audioUrl.includes('-au.') || audioUrl.includes('/au/') || audioUrl.endsWith('-au.mp3') || audioUrl.endsWith('-au.ogg');
    const isCA = audioUrl.includes('-ca.') || audioUrl.includes('/ca/') || audioUrl.endsWith('-ca.mp3') || audioUrl.endsWith('-ca.ogg');

    if (isUS) {
      if (!audioUs) audioUs = audioUrl;
      if (text && !ipaUs) ipaUs = text;
    } else if (isUK) {
      if (!audioUk) audioUk = audioUrl;
      if (text && !ipaUk) ipaUk = text;
    } else if (isAU || isCA) {
      if (!audioUk) audioUk = audioUrl;
      else if (!audioUs) audioUs = audioUrl;
      if (text && !ipaUk) ipaUk = text;
    } else if (audioUrl) {
      if (!audioUs) audioUs = audioUrl;
      else if (!audioUk) audioUk = audioUrl;
      if (text && !ipaUs) ipaUs = text;
    } else if (text) {
      if (!ipaUs) ipaUs = text;
      else if (!ipaUk) ipaUk = text;
    }
  });

  if (!ipaUs && typeof entry.phonetic === 'string') {
    ipaUs = entry.phonetic.replace(/^\/|\/$/g, '').trim();
  }
  if (!ipaUk && ipaUs) {
    ipaUk = ipaUs;
  }
  if (!ipaUs && ipaUk) {
    ipaUs = ipaUk;
  }

  const encodedHw = encodeURIComponent(headword || targetWord);
  if (!audioUs || audioUs.includes('api.dictionaryapi.dev/media/')) {
    audioUs = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodedHw}`;
  }
  if (!audioUk || audioUk.includes('api.dictionaryapi.dev/media/')) {
    audioUk = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=${encodedHw}`;
  }

  const pronParts = [];
  if (ipaUs) pronParts.push(`US /${ipaUs}/`);
  if (ipaUk && (ipaUk !== ipaUs || audioUk || !ipaUs)) {
    pronParts.push(`UK /${ipaUk}/`);
  }
  const pronunciation = pronParts.length > 0 ? pronParts.join(' · ') : (ipaUs ? `/${ipaUs}/` : '');

  // 2. Extract meanings, definitions, synonyms/antonyms
  const definitions = [];
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const wordFamily = [];
  const seenFamily = new Set();
  const currentLower = (headword || targetWord).toLowerCase();

  const addedSections = new Set();
  function addSection(label, content, isOpen = false) {
    if (!content) return;
    const trimmed = content.trim();
    if (addedSections.has(trimmed)) return;
    addedSections.add(trimmed);
    definitions.push(wrapInCollapse(label, trimmed, isOpen));
  }

  // 3. Short Definition (Top concise meanings across parts of speech)
  const primaryDefs = [];
  meanings.forEach((m) => {
    const pos = m.partOfSpeech ? `(${m.partOfSpeech}) ` : '';
    const firstDef = m.definitions?.[0]?.definition;
    if (firstDef && primaryDefs.length < 2) {
      primaryDefs.push(`${pos}${firstDef}`);
    }
  });

  if (primaryDefs.length > 0) {
    const shortText = primaryDefs.map((d) => `<p style="margin: 0 0 4px 0; line-height: 1.5;">${d}</p>`).join('');
    addSection('Short Definition', shortText, true);
  }

  // 4. Long Definition / Detailed Explanations
  const detailedParagraphs = [];
  meanings.forEach((m) => {
    const pos = m.partOfSpeech || 'General';
    const posCap = pos.charAt(0).toUpperCase() + pos.slice(1);
    const defItems = Array.isArray(m.definitions) ? m.definitions : [];

    defItems.slice(0, 3).forEach((d) => {
      if (!d.definition) return;
      let text = `<b>${posCap}:</b> ${d.definition}`;
      if (d.example) {
        text += ` <span style="font-style: italic; color: var(--hint-color);">"${d.example}"</span>`;
      }
      detailedParagraphs.push(`<p style="margin: 0 0 6px 0; line-height: 1.5;">${text}</p>`);
    });
  });

  if (detailedParagraphs.length > 0) {
    addSection('Long Definition', detailedParagraphs.join(''), false);
  }

  // 5. Part of Speech Sections (Noun, Verb, Adjective, etc.)
  meanings.forEach((m) => {
    const pos = m.partOfSpeech || 'Definitions';
    const posCap = pos.charAt(0).toUpperCase() + pos.slice(1);
    const defItems = Array.isArray(m.definitions) ? m.definitions : [];

    const lis = [];
    defItems.forEach((d) => {
      const defText = d.definition;
      if (!defText) return;

      let liHtml = `<li style="margin-bottom: 10px;"><b>${defText}</b>`;
      if (d.example) {
        liHtml += `<div style="font-style: italic; color: var(--hint-color); margin-top: 3px; font-size: 13px;">• ${d.example}</div>`;
      }
      liHtml += `</li>`;
      lis.push(liHtml);

      // Synonyms from definition
      if (Array.isArray(d.synonyms)) {
        d.synonyms.forEach((syn) => {
          const s = String(syn).toLowerCase().trim();
          if (s && s !== currentLower && !seenFamily.has(s)) {
            seenFamily.add(s);
            wordFamily.push({ word: s, type: 'synonym' });
          }
        });
      }
    });

    // Synonyms from meaning
    if (Array.isArray(m.synonyms)) {
      m.synonyms.forEach((syn) => {
        const s = String(syn).toLowerCase().trim();
        if (s && s !== currentLower && !seenFamily.has(s)) {
          seenFamily.add(s);
          wordFamily.push({ word: s, type: 'synonym' });
        }
      });
    }

    if (lis.length > 0) {
      const label = `${posCap} (${lis.length})`;
      const listContent = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${lis.join('')}</ol>`;
      addSection(label, listContent, false);
    }
  });

  return {
    headword,
    pronunciation,
    audio: { us: audioUs, uk: audioUk },
    definitions,
    wordFamily: wordFamily.slice(0, 20),
    hasCoreData: Boolean(headword && definitions.length > 0),
    source: 'cambridge',
  };
}
