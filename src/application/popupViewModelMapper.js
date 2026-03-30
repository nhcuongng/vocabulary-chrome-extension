import { getErrorCopyByType, NOT_FOUND_COPY } from './popupCopyCatalog.js';
import { normalizeLookupErrorType } from '../shared/lookupContract.js';

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
        `<a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: #0B5EA8; text-decoration: underline;">${link.label}</a>`
    )
    .join(' | ');

  return `${NOT_FOUND_COPY.searchSuggestionsPrefix} ${linksHtml}`;
}

export function mapParsedPayloadToPopupViewModel(parsedPayload) {
  const headword = (parsedPayload?.headword ?? '').trim();
  const pronunciation = parsedPayload?.pronunciation ?? '';
  const audio = parsedPayload?.audio || {};
  const definitions = normalizeDefinitions(parsedPayload?.definitions);
  console.log("🚀 ~ mapParsedPayloadToPopupViewModel ~ definitions:", definitions, headword)

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

  return {
    state: 'success',
    orderedFields: ['headword', 'pronunciation', 'definition'],
    headword,
    pronunciation,
    audio,
    definitions,
  };
}

export function mapLookupErrorToPopupViewModel(error = {}) {
  const normalizedErrorType = normalizeLookupErrorType(error?.type ?? error?.errorType);
  const copy = getErrorCopyByType(normalizedErrorType);

  return {
    state: 'error',
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
    return mapParsedPayloadToPopupViewModel(lookupResult?.data?.parsedPayload ?? lookupResult?.data ?? {});
  }

  if (lookupResult?.status === 'not-found') {
    const token = lookupResult?.data?.token || '';
    return {
      state: 'not-found',
      orderedFields: ['title', 'message', 'searchSuggestions', 'guidance'],
      title: NOT_FOUND_COPY.title,
      message: NOT_FOUND_COPY.message,
      searchSuggestions: buildSearchSuggestionsHtml(token),
      guidance: [...NOT_FOUND_COPY.guidance],
    };
  }

  return mapLookupErrorToPopupViewModel(lookupResult?.error ?? {});
}
