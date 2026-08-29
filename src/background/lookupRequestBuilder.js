export const VOCABULARY_BASE_URL = 'https://www.vocabulary.com/dictionary/';
export const CAMBRIDGE_BASE_URL = 'https://dictionary.cambridge.org/dictionary/english/';

function validateHeadword(normalizedHeadword) {
  if (!/^[a-z]+(?:[\-'][a-z]+)*$/.test(normalizedHeadword ?? '')) {
    throw new Error('normalizedHeadword is invalid');
  }
}

export function buildVocabularyLookupUrl(normalizedHeadword) {
  validateHeadword(normalizedHeadword);
  return new URL(encodeURIComponent(normalizedHeadword), VOCABULARY_BASE_URL).toString();
}

export function buildCambridgeLookupUrl(normalizedHeadword) {
  validateHeadword(normalizedHeadword);
  return new URL(encodeURIComponent(normalizedHeadword), CAMBRIDGE_BASE_URL).toString();
}

export function buildDictionaryLookupUrl(normalizedHeadword, source = 'vocabulary') {
  if (source === 'cambridge') {
    return buildCambridgeLookupUrl(normalizedHeadword);
  }
  return buildVocabularyLookupUrl(normalizedHeadword);
}

