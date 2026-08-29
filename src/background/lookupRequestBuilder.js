export const VOCABULARY_BASE_URL = 'https://www.vocabulary.com/dictionary/';
export const CAMBRIDGE_BASE_URL = 'https://dictionary.cambridge.org/dictionary/english/';
export const FREE_DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

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

export function buildDictionaryApiEndpointUrl(normalizedHeadword) {
  validateHeadword(normalizedHeadword);
  return new URL(encodeURIComponent(normalizedHeadword), FREE_DICTIONARY_API_BASE_URL).toString();
}

export function buildDictionaryLookupUrl(normalizedHeadword, source = 'vocabulary') {
  if (source === 'cambridge') {
    return buildCambridgeLookupUrl(normalizedHeadword);
  }
  return buildVocabularyLookupUrl(normalizedHeadword);
}

export function buildDictionaryFetchUrl(normalizedHeadword, source = 'vocabulary') {
  if (source === 'cambridge') {
    return buildDictionaryApiEndpointUrl(normalizedHeadword);
  }
  return buildVocabularyLookupUrl(normalizedHeadword);
}
