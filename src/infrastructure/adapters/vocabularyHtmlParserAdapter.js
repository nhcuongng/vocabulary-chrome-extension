import { renderPosChipHtml } from '../../domain/partOfSpeechUtils.js';

function stripTags(value) {
  // Strip HTML comments first, then tags with quoted attributes
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(?:"[^"]*"|'[^']*'|[^"'>])*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeBasicEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractByRegex(html, regex) {
  const match = regex.exec(html);
  if (!match) {
    return '';
  }

  // CRITICAL: decode entities FIRST, then strip tags to avoid XSS bypass
  const decoded = decodeBasicEntities(match[1] ?? '');
  return stripTags(decoded);
}

export function parseVocabularyHtml(html) {
  const safeHtml = typeof html === 'string' ? html : '';

  const headword =
    extractByRegex(safeHtml, /<h1[^>]*class=["'][^"']*(?:dynamictext|word)[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
    extractByRegex(safeHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  let audio = { us: '', uk: '' };
  let ipaUs = '', ipaUk = '';

  // 1. Tách các khối ipa-with-audio bằng cách split hoặc match global
  // Cách này an toàn hơn Lookahead nếu HTML có cấu trúc lồng phức tạp
  const ipaBlocks = safeHtml.match(/<div class="ipa-with-audio">[\s\S]*?<\/span>\s*<\/div>/gi) || [];

  ipaBlocks.forEach((block) => {
    const isUS = /us-flag-icon/i.test(block);
    const isUK = /uk-flag-icon/i.test(block);

    // Lấy IPA: Tìm nội dung trong span-replace-h3, xóa bỏ tag HTML và xuống dòng
    let ipa = extractByRegex(block, /<span[^>]*class=["'][^"']*span-replace-h3[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (ipa) {
      ipa = ipa.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Lấy Audio URL
    let audioUrl = '';
    // Trường hợp 1: Có thẻ <audio src="..."> (Thường thấy ở UK trong mẫu của bạn)
    const srcMatch = block.match(/<audio[^>]*src=["']([^"']+)["']/i);
    
    // Trường hợp 2: Có data-audio="..." (Thường thấy ở US trong mẫu của bạn)
    const dataAudioMatch = block.match(/data-audio=["']([^"']+)["']/i);

    if (srcMatch) {
      audioUrl = srcMatch[1];
    } else if (dataAudioMatch) {
      const region = isUS ? 'us' : 'uk';
      audioUrl = `https://audio.vocabulary.com/1.0/${region}/${dataAudioMatch[1]}.mp3`;
    }

    if (isUS) {
      ipaUs = ipa;
      audio.us = audioUrl;
    } else if (isUK) {
      ipaUk = ipa;
      audio.uk = audioUrl;
    } else {
      if (!ipaUs) ipaUs = ipa;
      if (!audio.us) audio.us = audioUrl;
    }
  });

  // Fallback to extract data-audio from other elements (e.g. <a class="audio" data-audio="...">)
  if (!audio.us) {
    const generalAudioMatch =
      safeHtml.match(/<a[^>]*class=["'][^"']*audio[^"']*["'][^>]*data-audio=["']([^"']+)["']/i) ||
      safeHtml.match(/data-audio=["']([^"']+)["']/i);
    if (generalAudioMatch) {
      audio.us = `https://audio.vocabulary.com/1.0/us/${generalAudioMatch[1]}.mp3`;
    }
  }

  // 2. Ghép chuỗi Pronunciation
  let pronunciation = '';
  const parts = [];
  if (ipaUs) parts.push(`US ${ipaUs}`);
  if (ipaUk) parts.push(`UK ${ipaUk}`);
  pronunciation = parts.join(' · ');

  // Fallback nếu không tìm thấy trong ipa-section
  if (!pronunciation) {
    pronunciation = extractByRegex(safeHtml, /<span[^>]*class=["'][^"']*pronunciation[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || '';
  }

  // Lấy definitions như cũ
  const definitions = [];
  // Helper to wrap content in a collapsible details element
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

  // Use a Set to track added content to avoid duplicates
  const addedContents = new Set();

  // Extract short definition as quick-glance
  const shortDef =
    extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*(?:short)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*short[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);

  if (shortDef) {
    const trimmedShort = shortDef.trim();
    if (trimmedShort && !addedContents.has(trimmedShort)) {
      definitions.push(`<div class="vocab-quick-def">${trimmedShort}</div>`);
      addedContents.add(trimmedShort);
    }
  }

  // Extract long definition as collapsible
  const longDef = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*long[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (longDef) {
    const trimmedLong = longDef.trim();
    if (trimmedLong && !addedContents.has(trimmedLong)) {
      definitions.push(wrapInCollapse('Long Definition', trimmedLong, false));
      addedContents.add(trimmedLong);
    }
  }

  const synonymsList = [];
  const antonymsList = [];
  const seenSynonyms = new Set();
  const seenAntonyms = new Set();
  const currentHeadwordLower = (headword || '').trim().toLowerCase();

  const collectSynonym = (val) => {
    const s = String(val || '').toLowerCase().trim();
    if (s && s !== currentHeadwordLower && !seenSynonyms.has(s)) {
      seenSynonyms.add(s);
      synonymsList.push(s);
    }
  };

  const collectAntonym = (val) => {
    const a = String(val || '').toLowerCase().trim();
    if (a && a !== currentHeadwordLower && !seenAntonyms.has(a)) {
      seenAntonyms.add(a);
      antonymsList.push(a);
    }
  };

  const olMatch = safeHtml.match(/<div[^>]*class=["'][^"']*word-definitions[^"']*["'][^>]*>[\s\S]*?(<ol>[\s\S]*?<\/ol>)/i);

  if (olMatch) {
    let olContent = olMatch[1];

    const liMatches = olContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];

    const cleanedLis = liMatches.map((liHtml) => {
      const defMatch = liHtml.match(/<div[^>]*class=["']definition["'][^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div class="defContent"|<\/li>|$))/i);

      if (defMatch) {
        let defRaw = defMatch[1] ?? '';
        let pos = '';

        // Extract pos from <a class="pos"> or title="verb" etc.
        const posTagMatch =
          defRaw.match(/<a[^>]*class=["'][^"']*\bpos\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
          liHtml.match(/<a[^>]*class=["'][^"']*\bpos\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
          liHtml.match(/title=["'](noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|phrase|idiom)["']/i);

        if (posTagMatch) {
          pos = stripTags(decodeBasicEntities(posTagMatch[1]));
        }

        // Strip <a class="pos">...</a> from defRaw so it does not become text in plainTextDef
        defRaw = defRaw.replace(/<a[^>]*class=["'][^"']*\bpos\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, ' ');

        // Sanitize the content of the definition using the existing safe pipeline
        const sanitizedDef = decodeBasicEntities(defRaw);
        let plainTextDef = stripTags(sanitizedDef);

        // If pos was found, ensure plainTextDef doesn't start with the pos text
        if (pos) {
          const leadingPosRegex = new RegExp(`^${pos}\\b\\s*`, 'i');
          plainTextDef = plainTextDef.replace(leadingPosRegex, '');
        } else {
          // If pos was not found via tag, check if plainTextDef begins with a known pos word
          const leadingPosMatch = plainTextDef.match(/^(noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|phrase|idiom)\b\s*/i);
          if (leadingPosMatch) {
            pos = leadingPosMatch[1];
            plainTextDef = plainTextDef.slice(leadingPosMatch[0].length);
          }
        }

        // Extract instances (synonyms / antonyms / types)
        const itemSynonyms = [];
        const itemAntonyms = [];

        // Split by instances blocks: <div class="div-replace-dl instances"> or <dl class="instances">
        const instanceBlocks = liHtml.split(/(?:<div[^>]*class=["'][^"']*instances[^"']*["'][^>]*>|<dl[^>]*class=["'][^"']*instances[^"']*["'][^>]*>)/i);
        
        for (let i = 1; i < instanceBlocks.length; i++) {
          const block = instanceBlocks[i];
          const headerSection = block.slice(0, 150);
          const isSyn = /synonym/i.test(headerSection);
          const isAnt = /antonym/i.test(headerSection);

          if (isSyn || isAnt) {
            // Find all word links in this block (stop if another section begins)
            const blockContent = block.split(/<(?:div|dl)[^>]*class=["'][^"']*(?:instances|more-info-section)/i)[0];
            const wordMatches = blockContent.match(/<a[^>]*class=["'][^"']*word[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || [];
            
            wordMatches.forEach((wHtml) => {
              const raw = stripTags(decodeBasicEntities(wHtml));
              if (raw) {
                if (isAnt) {
                  itemAntonyms.push(raw);
                  collectAntonym(raw);
                } else {
                  itemSynonyms.push(raw);
                  collectSynonym(raw);
                }
              }
            });
          }
        }

        // Also check direct data or plain text synonyms/antonyms in defContent
        const directSynMatch = liHtml.match(/synonyms?:?\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
        if (directSynMatch) {
          const rawWords = stripTags(decodeBasicEntities(directSynMatch[1])).split(/,\s*/);
          rawWords.forEach((rw) => {
            const clean = rw.trim();
            if (clean) {
              itemSynonyms.push(clean);
              collectSynonym(clean);
            }
          });
        }

        const directAntMatch = liHtml.match(/antonyms?:?\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
        if (directAntMatch) {
          const rawWords = stripTags(decodeBasicEntities(directAntMatch[1])).split(/,\s*/);
          rawWords.forEach((rw) => {
            const clean = rw.trim();
            if (clean) {
              itemAntonyms.push(clean);
              collectAntonym(clean);
            }
          });
        }

        const posChip = pos ? `${renderPosChipHtml(pos)} ` : '';

        let liResult = `<li style="margin-bottom: 10px;">${posChip}<b>${plainTextDef}</b>`;
        if (itemSynonyms.length > 0) {
          const uniqueSyns = [...new Set(itemSynonyms)];
          liResult += `<div style="font-size: 12px; margin-top: 3px; color: #166534;"><span style="font-weight: 600;">Synonyms:</span> ${uniqueSyns.join(', ')}</div>`;
        }
        if (itemAntonyms.length > 0) {
          const uniqueAnts = [...new Set(itemAntonyms)];
          liResult += `<div style="font-size: 12px; margin-top: 2px; color: #9a3412;"><span style="font-weight: 600;">Antonyms:</span> ${uniqueAnts.join(', ')}</div>`;
        }
        liResult += `</li>`;
        return liResult;
      }
      return "";
    }).filter(li => li !== "").join("");

    if (cleanedLis) {
      const label = `Definition of "<i>${headword}</i>"`;
      const content = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${cleanedLis}</ol>`;
      const trimmedList = content.trim();
      if (!addedContents.has(trimmedList)) {
        definitions.push(wrapInCollapse(label, trimmedList, false));
        addedContents.add(trimmedList);
      }
    }
  }

  // Trích xuất Word Family từ <vcom:wordfamily>
  const wordFamily = [];
  const wordFamilyMatch = safeHtml.match(/<vcom:wordfamily[^>]*data=["']([\s\S]*?)["']/i);
  if (wordFamilyMatch) {
    try {
      const rawJson = wordFamilyMatch[1]
        .replace(/&#034;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const familyData = JSON.parse(rawJson);
      if (Array.isArray(familyData)) {
        const seenWords = new Set();

        // Ưu tiên sắp xếp theo tần suất freq giảm dần
        const sorted = [...familyData].sort((a, b) => (Number(b.freq) || 0) - (Number(a.freq) || 0));

        for (const item of sorted) {
          const itemWord = typeof item.word === 'string' ? item.word.trim().toLowerCase() : '';
          if (itemWord && itemWord !== currentHeadwordLower && !seenWords.has(itemWord)) {
            seenWords.add(itemWord);
            wordFamily.push({
              word: itemWord,
              freq: Number(item.freq) || 0,
              type: item.type,
              hw: Boolean(item.hw),
              parent: item.parent || '',
            });
          }
        }
      }
    } catch {
      // Safe fallback khi parse json thất bại
    }
  }

  return {
    headword: headword ? headword.trim() : '',
    pronunciation,
    audio,
    definitions,
    wordFamily,
    synonyms: synonymsList.slice(0, 30),
    antonyms: antonymsList.slice(0, 30),
    hasCoreData: Boolean(headword && (ipaUs || ipaUk)),
  };
}
