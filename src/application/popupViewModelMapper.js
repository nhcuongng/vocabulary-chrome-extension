import { getErrorCopyByType, NOT_FOUND_COPY } from './popupCopyCatalog.js';
import { normalizeLookupErrorType } from '../shared/lookupContract.js';
import { parseStressDiagramFromIpa } from '../domain/stressDiagramUtils.js';

function normalizeDefinitions(definitions) {
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSearchSuggestionsHtml(token) {
  if (!token) return '';

  const encodedToken = encodeURIComponent(token);
  const links = [
    { label: 'Google', url: `https://www.google.com/search?q=define+${encodedToken}` },
    { label: 'Cambridge', url: `https://dictionary.cambridge.org/dictionary/english/${encodedToken}` },
    { label: 'Oxford', url: `https://www.oxfordlearnersdictionaries.com/definition/english/${encodedToken}` },
  ];

  const linksHtml = links
    .map(
      (link) =>
        `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="search-suggestion-link">${link.label}</a>`
    )
    .join(' | ');

  return `${NOT_FOUND_COPY.searchSuggestionsPrefix} ${linksHtml}`;
}

export function mapParsedPayloadToPopupViewModel(parsedPayload) {
  const headword = (parsedPayload?.headword ?? '').trim();
  const pronunciation = parsedPayload?.pronunciation ?? '';
  const audio = parsedPayload?.audio || {};
  const definitions = normalizeDefinitions(parsedPayload?.definitions);
  const wordFamily = Array.isArray(parsedPayload?.wordFamily)
    ? parsedPayload.wordFamily
    : [];

  if (!headword || !definitions || definitions.length === 0) {
    const token = headword || parsedPayload?.token || '';
    return {
      state: 'not-found',
      orderedFields: ['title', 'message', 'searchSuggestions', 'guidance'],
      title: NOT_FOUND_COPY.title,
      message: NOT_FOUND_COPY.message,
      searchSuggestions: buildSearchSuggestionsHtml(token),
      guidance: [...NOT_FOUND_COPY.guidance],
    };
  }

  const source = parsedPayload?.source || 'vocabulary';
  const lookupUrl = parsedPayload?.lookupUrl || '';
  const stressDiagram = parseStressDiagramFromIpa(pronunciation);

  return {
    state: 'success',
    orderedFields: ['headword', 'pronunciation', 'definition'],
    headword,
    source,
    lookupUrl,
    pronunciation,
    stressDiagram,
    audio,
    wordFamily,
    definitions,
  };
}

export function mapLookupErrorToPopupViewModel(error = {}) {
  const normalizedErrorType = normalizeLookupErrorType(error?.type ?? error?.errorType);
  const copy = getErrorCopyByType(normalizedErrorType);
  const headword = (error?.headword ?? '').trim();
  const source = error?.source || 'auto';

  return {
    state: 'error',
    headword,
    source,
    orderedFields: ['title', 'message', 'cta'],
    type: normalizedErrorType,
    errorType: normalizedErrorType,
    title: copy.title,
    message: copy.message,
    cta: copy.cta,
  };
}

export function mapLookupResultToPopupViewModel(lookupResult) {
  if (lookupResult?.status === 'success') {
    const payload = lookupResult?.data?.parsedPayload ?? lookupResult?.data ?? {};
    const effectiveSource = lookupResult?.data?.source || lookupResult?.source || payload?.source || 'auto';
    const vm = mapParsedPayloadToPopupViewModel({
      ...payload,
      source: effectiveSource,
      headword: lookupResult?.data?.headword || lookupResult?.headword || payload?.headword,
    });
    return vm;
  }

  if (lookupResult?.status === 'not-found') {
    const token = lookupResult?.data?.token || lookupResult?.data?.headword || lookupResult?.headword || '';
    const source = lookupResult?.data?.source || lookupResult?.source || 'auto';
    return {
      state: 'not-found',
      headword: token,
      source,
      orderedFields: ['title', 'message', 'searchSuggestions', 'guidance'],
      title: NOT_FOUND_COPY.title,
      message: NOT_FOUND_COPY.message,
      searchSuggestions: buildSearchSuggestionsHtml(token),
      guidance: [...NOT_FOUND_COPY.guidance],
    };
  }

  const errObj = lookupResult?.error ?? {};
  const headword = errObj.headword || lookupResult?.headword || '';
  const source = errObj.source || lookupResult?.source || 'auto';
  return mapLookupErrorToPopupViewModel({
    ...errObj,
    headword,
    source,
  });
}
