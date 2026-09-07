export const VOCABULARY_BASE_URL = 'https://www.vocabulary.com/dictionary/';
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

export function buildFreeDictionaryLookupUrl(normalizedHeadword) {
  validateHeadword(normalizedHeadword);
  return `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(normalizedHeadword)}`;
}

export function buildDictionaryLookupUrl(normalizedHeadword, source = 'vocabulary') {
  if (source === 'freedictionary') {
    return buildFreeDictionaryLookupUrl(normalizedHeadword);
  }
  return buildVocabularyLookupUrl(normalizedHeadword);
}

export function buildDictionaryFetchUrl(normalizedHeadword, source = 'vocabulary') {
  if (source === 'freedictionary') {
    return buildFreeDictionaryLookupUrl(normalizedHeadword);
  }
  return buildVocabularyLookupUrl(normalizedHeadword);
}
