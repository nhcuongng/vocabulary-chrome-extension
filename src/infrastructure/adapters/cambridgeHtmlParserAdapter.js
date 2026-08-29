const CAMBRIDGE_BASE_URL = 'https://dictionary.cambridge.org';

function stripTags(value) {
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
    .replace(/&apos;/g, "'")
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
  const decoded = decodeBasicEntities(match[1] ?? '');
  return stripTags(decoded);
}

function resolveAudioUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${CAMBRIDGE_BASE_URL}${trimmed}`;
  }
  return `${CAMBRIDGE_BASE_URL}/${trimmed}`;
}

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

export function parseCambridgeHtml(html) {
  const safeHtml = typeof html === 'string' ? html : '';

  // 1. Extract Headword
  let headword =
    extractByRegex(safeHtml, /<span[^>]*class=["'][^"']*\b(?:hw|dhw)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
    extractByRegex(safeHtml, /<h2[^>]*class=["'][^"']*\bheadword\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i) ||
    extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*\bdi-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    extractByRegex(safeHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  // 2. Extract Pronunciation & Audio (UK / US)
  let audio = { us: '', uk: '' };
  let ipaUs = '';
  let ipaUk = '';

  // Extract UK region block: up to US section or end of container
  const ukMatch = safeHtml.match(/<span[^>]*class=["'][^"']*\buk\b[^"']*["'][^>]*>([\s\S]*?)(?=<span[^>]*class=["'][^"']*\bus\b|<\/div>|$)/i);
  if (ukMatch) {
    const block = ukMatch[0];
    const ipaMatch = block.match(/<span[^>]*class=["'][^"']*\bipa\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (ipaMatch) {
      ipaUk = stripTags(decodeBasicEntities(ipaMatch[1]));
    }
    const audioMatch =
      block.match(/<source[^>]*src=["']([^"']+)["']/i) ||
      block.match(/<audio[^>]*src=["']([^"']+)["']/i) ||
      block.match(/data-src-mp3=["']([^"']+)["']/i);
    if (audioMatch) {
      audio.uk = resolveAudioUrl(audioMatch[1]);
    }
  }

  // Extract US region block: up to UK section or end of container
  const usMatch = safeHtml.match(/<span[^>]*class=["'][^"']*\bus\b[^"']*["'][^>]*>([\s\S]*?)(?=<span[^>]*class=["'][^"']*\buk\b|<\/div>|$)/i);
  if (usMatch) {
    const block = usMatch[0];
    const ipaMatch = block.match(/<span[^>]*class=["'][^"']*\bipa\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (ipaMatch) {
      ipaUs = stripTags(decodeBasicEntities(ipaMatch[1]));
    }
    const audioMatch =
      block.match(/<source[^>]*src=["']([^"']+)["']/i) ||
      block.match(/<audio[^>]*src=["']([^"']+)["']/i) ||
      block.match(/data-src-mp3=["']([^"']+)["']/i);
    if (audioMatch) {
      audio.us = resolveAudioUrl(audioMatch[1]);
    }
  }

  // Pronunciation string
  const pronParts = [];
  if (ipaUs) pronParts.push(`US /${ipaUs}/`);
  if (ipaUk) pronParts.push(`UK /${ipaUk}/`);
  const pronunciation = pronParts.join(' · ');

  // 3. Extract Definitions by POS / Entry blocks
  const definitions = [];
  const addedSections = new Set();

  // Match entry blocks (pr entry-body__el or pos-header + def-blocks)
  const posBlockRegex = /<div[^>]*class=["'][^"']*\b(?:pr\s+entry-body__el|pos-header)\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]*class=["'][^"']*\b(?:pr\s+entry-body__el|pos-header)\b[^"']*["']|$)/gi;
  const entryMatches = safeHtml.match(posBlockRegex) || [];

  if (entryMatches.length > 0) {
    entryMatches.forEach((entryHtml) => {
      // Find Part of Speech (noun, verb, adjective, etc.)
      const posMatch = entryHtml.match(/<span[^>]*class=["'][^"']*\b(?:pos|dpos)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const posText = posMatch ? stripTags(decodeBasicEntities(posMatch[1])) : '';

      // Find grammar / pos info e.g. [ C or U ]
      const gramMatch = entryHtml.match(/<span[^>]*class=["'][^"']*\b(?:gram|dgram)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const gramText = gramMatch ? stripTags(decodeBasicEntities(gramMatch[1])) : '';

      const sectionLabel = [posText, gramText].filter(Boolean).join(' ') || `Definition of "${headword || 'word'}"`;

      // Extract all def-blocks inside this entry
      const defBlockRegex = /<div[^>]*class=["'][^"']*\b(?:def-block|ddef_block)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      const defBlocks = entryHtml.match(defBlockRegex) || [];

      const lis = [];

      defBlocks.forEach((block) => {
        // Guideword e.g. EXAMINATION
        const gwMatch = block.match(/<span[^>]*class=["'][^"']*\b(?:guideword|dsense_gw)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
        const gwText = gwMatch ? stripTags(decodeBasicEntities(gwMatch[1])) : '';

        // Definition text
        const defMatch = block.match(/<div[^>]*class=["'][^"']*\b(?:def|ddef_d)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        if (!defMatch) return;

        let defContent = stripTags(decodeBasicEntities(defMatch[1]));
        defContent = defContent.replace(/:$/, '').trim();
        if (!defContent) return;

        // Examples
        const exMatches = block.match(/<span[^>]*class=["'][^"']*\b(?:eg|deg)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi) || [];
        const examples = exMatches
          .map((ex) => stripTags(decodeBasicEntities(ex)))
          .filter(Boolean)
          .slice(0, 2);

        let liHtml = `<li style="margin-bottom: 10px;"><b>${defContent}</b>`;
        if (gwText) {
          liHtml += ` <span style="font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 500;">${gwText}</span>`;
        }
        if (examples.length > 0) {
          const exHtml = examples.map((eg) => `<div style="font-style: italic; color: var(--hint-color, #6b7280); margin-top: 3px; font-size: 13px;">• ${eg}</div>`).join('');
          liHtml += exHtml;
        }
        liHtml += `</li>`;
        lis.push(liHtml);
      });

      if (lis.length > 0) {
        const key = `${sectionLabel}:${lis.join('')}`;
        if (!addedSections.has(key)) {
          addedSections.add(key);
          const listContent = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${lis.join('')}</ol>`;
          definitions.push(wrapInCollapse(sectionLabel, listContent, definitions.length === 0));
        }
      }
    });
  }

  // Fallback: If no structured entries found, try generic def extraction
  if (definitions.length === 0) {
    const genericDefs = safeHtml.match(/<div[^>]*class=["'][^"']*\b(?:def|ddef_d)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi) || [];
    const lis = genericDefs
      .map((defHtml) => {
        const clean = stripTags(decodeBasicEntities(defHtml)).replace(/:$/, '').trim();
        return clean ? `<li style="margin-bottom: 10px;">${clean}</li>` : '';
      })
      .filter(Boolean);

    if (lis.length > 0) {
      const label = `Definition of "${headword || 'word'}"`;
      const listContent = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${lis.join('')}</ol>`;
      definitions.push(wrapInCollapse(label, listContent, true));
    }
  }

  // 4. Extract Word Family / Inflections
  const wordFamily = [];
  const seenFamily = new Set();
  const currentHeadwordLower = (headword || '').trim().toLowerCase();

  const infMatches =
    safeHtml.match(/<(?:b|span|div)[^>]*class=["'][^"']*\b(?:inf-word|inf-group|irreg-infls|inf|dinf)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:b|span|div)>/gi) || [];
  infMatches.forEach((infHtml) => {
    const cleanText = stripTags(decodeBasicEntities(infHtml));
    const words = cleanText.split(/[\s,;/]+/);
    words.forEach((w) => {
      const cleanW = w.toLowerCase().replace(/[^a-z-]/g, '').trim();
      if (
        cleanW &&
        cleanW.length > 1 &&
        cleanW !== currentHeadwordLower &&
        !['plural', 'present', 'participle', 'past', 'simple', 'singular'].includes(cleanW) &&
        !seenFamily.has(cleanW)
      ) {
        seenFamily.add(cleanW);
        wordFamily.push({
          word: cleanW,
          type: 'inflection',
        });
      }
    });
  });

  return {
    headword: headword ? headword.trim() : '',
    pronunciation,
    audio,
    definitions,
    wordFamily,
    hasCoreData: Boolean(headword && (definitions.length > 0 || ipaUs || ipaUk)),
    source: 'cambridge',
  };
}
