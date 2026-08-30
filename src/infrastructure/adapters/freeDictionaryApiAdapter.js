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

export function parseFreeDictionaryApiResponse(json, targetWord = '', source = 'cambridge') {
  let headword = targetWord;
  let entries = [];

  if (Array.isArray(json) && json.length > 0) {
    const first = json[0];
    headword = first.word || targetWord;
    const phonetics = [];
    (first.phonetics || []).forEach((p) => {
      if (p.text) {
        const audioUrl = p.audio || '';
        const isUS = audioUrl.includes('-us') || audioUrl.includes('en-us') || false;
        const isUK = audioUrl.includes('-uk') || audioUrl.includes('en-gb') || false;
        const tags = isUS ? ['us'] : isUK ? ['uk'] : [];
        phonetics.push({ type: 'ipa', text: p.text, tags, audio: audioUrl });
      }
    });

    (first.meanings || []).forEach((m) => {
      const senses = (m.definitions || []).map((d) => ({
        definition: d.definition,
        examples: d.example ? [d.example] : [],
        synonyms: d.synonyms || [],
      }));
      entries.push({
        partOfSpeech: m.partOfSpeech,
        pronunciations: phonetics,
        senses,
        synonyms: m.synonyms || [],
      });
    });
  } else if (json && typeof json === 'object' && Array.isArray(json.entries)) {
    headword = json.word || targetWord;
    entries = json.entries;
  }

  if (entries.length === 0) {
    return {
      headword: targetWord,
      pronunciation: '',
      audio: { us: '', uk: '' },
      definitions: [],
      wordFamily: [],
      hasCoreData: false,
      source,
    };
  }

  // 1. Audio & Pronunciation
  let ipaUs = '';
  let ipaUk = '';
  let directAudioUs = '';
  let directAudioUk = '';

  entries.forEach((entry) => {
    const pronunciations = Array.isArray(entry.pronunciations) ? entry.pronunciations : [];
    pronunciations.forEach((p) => {
      if (p.type !== 'ipa' && !p.text) return;
      const text = typeof p.text === 'string' ? p.text.replace(/^\/|\/$/g, '').trim() : '';
      if (!text) return;
      
      const tags = Array.isArray(p.tags) ? p.tags.map((t) => t.toLowerCase()) : [];
      const isUS = tags.includes('general american') || tags.includes('us');
      const isUK = tags.includes('received pronunciation') || tags.includes('uk');

      if (isUS && !ipaUs) {
        ipaUs = text;
        if (p.audio) directAudioUs = p.audio;
      }
      if (isUK && !ipaUk) {
        ipaUk = text;
        if (p.audio) directAudioUk = p.audio;
      }
      
      // Fallback
      if (!ipaUs && !ipaUk) {
        ipaUs = text;
        if (p.audio) directAudioUs = p.audio;
      }
    });
  });

  if (!ipaUk && ipaUs) ipaUk = ipaUs;
  if (!ipaUs && ipaUk) ipaUs = ipaUk;

  const encodedHw = encodeURIComponent(headword || targetWord);
  const audioUs = directAudioUs || `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodedHw}`;
  const audioUk = directAudioUk || `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=${encodedHw}`;

  const pronParts = [];
  if (ipaUs) pronParts.push(`US /${ipaUs}/`);
  if (ipaUk && (ipaUk !== ipaUs || !ipaUs)) {
    pronParts.push(`UK /${ipaUk}/`);
  }
  const pronunciation = pronParts.length > 0 ? pronParts.join(' · ') : (ipaUs ? `/${ipaUs}/` : '');

  // 2. Extract meanings, definitions, synonyms/antonyms
  const definitions = [];
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
  entries.forEach((entry) => {
    const pos = entry.partOfSpeech ? `(${entry.partOfSpeech}) ` : '';
    const firstDef = entry.senses?.[0]?.definition;
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
  entries.forEach((entry) => {
    const pos = entry.partOfSpeech || 'General';
    const posCap = pos.charAt(0).toUpperCase() + pos.slice(1);
    const senses = Array.isArray(entry.senses) ? entry.senses : [];

    senses.slice(0, 3).forEach((sense) => {
      if (!sense.definition) return;
      let text = `<b>${posCap}:</b> ${sense.definition}`;
      const example = sense.examples?.[0] || sense.quotes?.[0]?.text;
      if (example) {
        text += ` <span style="font-style: italic; color: var(--hint-color);">"${example}"</span>`;
      }
      detailedParagraphs.push(`<p style="margin: 0 0 6px 0; line-height: 1.5;">${text}</p>`);
    });
  });

  if (detailedParagraphs.length > 0) {
    addSection('Long Definition', detailedParagraphs.join(''), false);
  }

  // 5. Part of Speech Sections (Noun, Verb, Adjective, etc.)
  entries.forEach((entry) => {
    const pos = entry.partOfSpeech || 'Definitions';
    const posCap = pos.charAt(0).toUpperCase() + pos.slice(1);
    const senses = Array.isArray(entry.senses) ? entry.senses : [];

    const lis = [];
    senses.forEach((sense) => {
      const defText = sense.definition;
      if (!defText) return;

      let liHtml = `<li style="margin-bottom: 10px;"><b>${defText}</b>`;
      const example = sense.examples?.[0] || sense.quotes?.[0]?.text;
      if (example) {
        liHtml += `<div style="font-style: italic; color: var(--hint-color); margin-top: 3px; font-size: 13px;">• ${example}</div>`;
      }
      liHtml += `</li>`;
      lis.push(liHtml);

      // Synonyms from definition
      if (Array.isArray(sense.synonyms)) {
        sense.synonyms.forEach((syn) => {
          const s = String(syn).toLowerCase().trim();
          if (s && s !== currentLower && !seenFamily.has(s)) {
            seenFamily.add(s);
            wordFamily.push({ word: s, type: 'synonym' });
          }
        });
      }
    });

    // Synonyms from entry
    if (Array.isArray(entry.synonyms)) {
      entry.synonyms.forEach((syn) => {
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
    source,
  };
}
