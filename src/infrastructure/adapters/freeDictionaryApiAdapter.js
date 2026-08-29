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
    const audioUrl = typeof p.audio === 'string' ? p.audio.trim() : '';
    const text = typeof p.text === 'string' ? p.text.replace(/^\/|\/$/g, '').trim() : '';

    if (audioUrl.includes('-us.') || audioUrl.includes('/us/') || audioUrl.endsWith('-us.mp3')) {
      if (!audioUs) audioUs = audioUrl;
      if (text && !ipaUs) ipaUs = text;
    } else if (audioUrl.includes('-uk.') || audioUrl.includes('/uk/') || audioUrl.endsWith('-uk.mp3')) {
      if (!audioUk) audioUk = audioUrl;
      if (text && !ipaUk) ipaUk = text;
    } else if (audioUrl) {
      if (!audioUs) audioUs = audioUrl;
      else if (!audioUk) audioUk = audioUrl;
      if (text && !ipaUs) ipaUs = text;
    } else if (text && !ipaUs) {
      ipaUs = text;
    }
  });

  if (!ipaUs && typeof entry.phonetic === 'string') {
    ipaUs = entry.phonetic.replace(/^\/|\/$/g, '').trim();
  }

  const pronParts = [];
  if (ipaUs) pronParts.push(`US /${ipaUs}/`);
  if (ipaUk) pronParts.push(`UK /${ipaUk}/`);
  const pronunciation = pronParts.length > 0 ? pronParts.join(' · ') : (ipaUs ? `/${ipaUs}/` : '');

  // 2. Definitions grouped by POS
  const definitions = [];
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const wordFamily = [];
  const seenFamily = new Set();
  const currentLower = (headword || targetWord).toLowerCase();

  meanings.forEach((m, idx) => {
    const pos = m.partOfSpeech || 'definition';
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
      const label = `${pos.charAt(0).toUpperCase() + pos.slice(1)}`;
      const listContent = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${lis.join('')}</ol>`;
      definitions.push(wrapInCollapse(label, listContent, idx === 0));
    }
  });

  return {
    headword,
    pronunciation,
    audio: { us: audioUs, uk: audioUk },
    definitions,
    wordFamily: wordFamily.slice(0, 15),
    hasCoreData: Boolean(headword && definitions.length > 0),
    source: 'cambridge',
  };
}
