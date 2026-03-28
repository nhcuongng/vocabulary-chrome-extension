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

  const definition =
    extractByRegex(safeHtml, /<h3[^>]*class=["'][^"']*definition[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i) ||
    extractByRegex(safeHtml, /<div[^>]*class=["'][^"']*(?:short|definition)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  return {
    headword,
    pronunciation,
    definitions: definition ? [definition] : [],
    hasCoreData: Boolean(headword && definition),
  };
}
