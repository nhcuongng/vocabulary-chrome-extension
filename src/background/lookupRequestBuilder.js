const DICTIONARY_BASE_URL = 'https://www.vocabulary.com/dictionary/';

export function buildDictionaryLookupUrl(normalizedHeadword) {
  if (!/^[a-z]+(?:[\-'][a-z]+)*$/.test(normalizedHeadword ?? '')) {
    throw new Error('normalizedHeadword is invalid');
  }

  return new URL(encodeURIComponent(normalizedHeadword), DICTIONARY_BASE_URL).toString();
}
