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
    }
  });

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
  function addDefinition(label, content) {
    if (!content) return;
    const trimmed = content.trim();
    if (addedContents.has(trimmed)) return;

    definitions.push(wrapInCollapse(label, trimmed, definitions.length === 0));
    addedContents.add(trimmed);
  }

  // div.short hoặc div.definition
  addDefinition('Short Definition', extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*(?:short)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i));

  // p.short trong word-area
  addDefinition('Short Definition', extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*short[^"']*["'][^>]*>([\s\S]*?)<\/p>/i));

  // p.long trong word-area
  addDefinition('Long Definition', extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*long[^"']*["'][^>]*>([\s\S]*?)<\/p>/i));

  const olMatch = safeHtml.match(/<div[^>]*class=["'][^"']*word-definitions[^"']*["'][^>]*>[\s\S]*?(<ol>[\s\S]*?<\/ol>)/i);

  if (olMatch) {
    let olContent = olMatch[1];

    const liMatches = olContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];

    const cleanedLis = liMatches.map((liHtml) => {
      const defMatch = liHtml.match(/<div[^>]*class=["']definition["'][^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div class="defContent"|<\/li>|$))/i);

      if (defMatch) {
        // Sanitize the content of the definition using the existing safe pipeline
        const sanitizedDef = decodeBasicEntities(defMatch[1] ?? '');
        const plainTextDef = stripTags(sanitizedDef);
        return `<li style="margin-bottom: 10px;">${plainTextDef}</li>`;
      }
      return "";
    }).filter(li => li !== "").join("");

    if (cleanedLis) {
      const label = `Definition of "<i>${headword}</i>"`;
      const content = `<ol class="custom-definition-list" style="margin: 0; padding-left: 20px;">${cleanedLis}</ol>`;
      addDefinition(label, content);
    }
  }
  

  return {
    headword: headword ? headword.trim() : '',
    pronunciation,
    audio,
    definitions,
    hasCoreData: Boolean(headword && (ipaUs || ipaUk)),
  };
}
