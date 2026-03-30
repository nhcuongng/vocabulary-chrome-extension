function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

  return decodeBasicEntities(stripTags(match[1] ?? ''));
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
  // Helper để tạo label styled
  function makeLabel(label) {
    return `<p style="display: flex; gap: 4px; align-items: center; background:#e0e7ff;color:#3730a3;font-size:12px;font-weight:600;padding:2px 8px;border-radius:8px;margin-right:8px;vertical-align:middle;"><span>✭</span> ${label}</p>`;
  }

  // div.short hoặc div.definition (giữ lại logic cũ)
  const def2 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*(?:short)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (def2) definitions.push(`${makeLabel('Short Definition')}${def2}`);
  // p.short trong word-area
  const def3 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*short[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (def3) definitions.push(`${makeLabel('Short Definition')}${def3}`);
  // p.long trong word-area
  const def4 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*long[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (def4) definitions.push(`${makeLabel('Long Definition')}${def4}`);

  const olMatch = safeHtml.match(/<div[^>]*class=["'][^"']*word-definitions[^"']*["'][^>]*>[\s\S]*?(<ol>[\s\S]*?<\/ol>)/i);

  if (olMatch) {
    let olContent = olMatch[1];

    // BƯỚC 2: Bóc tách và giữ lại đúng ol > li > div.definition
    // Tìm tất cả các thẻ <li>
    const liMatches = olContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    
    const cleanedLis = liMatches.map((liHtml) => {
      // Trong mỗi <li>, ta chỉ lấy thẻ <div class="definition">
      // Dùng Regex đã tối ưu để không bị dừng ở thẻ đóng của pos-icon
      const defMatch = liHtml.match(/<div[^>]*class=["']definition["'][^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div class="defContent"|<\/li>|$))/i);
      
      if (defMatch) {
        // Trả về thẻ <li> bọc ngoài div.definition, thêm label
        return `<li style="margin-bottom: 10px;">${defMatch[0]}</li>`;
      }
      return "";
    }).filter(li => li !== "").join("");

    // Đóng gói lại thành một thẻ <ol> hoàn chỉnh
    definitions.push(`${makeLabel(`Definition of "<i>${headword}</i>"`)}<ol class="custom-definition-list">${cleanedLis}</ol>`)
  }
  

  return {
    headword: headword ? headword.trim() : '',
    pronunciation,
    audio,
    definitions,
    hasCoreData: Boolean(headword && (ipaUs || ipaUk)),
  };
}
