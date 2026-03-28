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

  const pronunciation =
    extractByRegex(safeHtml, /<span[^>]*class=["'][^"']*pronunciation[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
    extractByRegex(safeHtml, /<span[^>]*data-audio[^>]*>([\s\S]*?)<\/span>/i);

  // Lấy tất cả các đoạn định nghĩa phù hợp
  const definitions = [];
  // h3.definition
  // const def1 = extractByRegex(safeHtml, /<h3[^>]*class=["'][^"']*definition[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i);
  // if (def1) definitions.push(def1);
  // div.short hoặc div.definition
  const def2 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*(?:short)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (def2) definitions.push(def2);
  // p.short trong word-area
  const def3 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*short[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (def3) definitions.push(def3);
  // p.long trong word-area
  const def4 = extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*word-area[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*long[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (def4) definitions.push(def4);

  return {
    headword,
    pronunciation,
    definitions,
    hasCoreData: Boolean(headword && definitions.length > 0),
  };
}
