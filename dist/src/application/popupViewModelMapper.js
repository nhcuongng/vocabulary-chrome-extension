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

export function mapParsedPayloadToPopupViewModel(parsedPayload) {
  const headword = (parsedPayload?.headword ?? '').trim();
  const pronunciation = parsedPayload?.pronunciation ?? '';
  const definitions = normalizeDefinitions(parsedPayload?.definitions);
  const mainDefinition = definitions[0] ?? '';

  if (!headword || !mainDefinition) {
    return {
      state: 'not-found',
      orderedFields: ['title', 'message', 'guidance'],
      title: NOT_FOUND_COPY.title,
      message: NOT_FOUND_COPY.message,
      guidance: [...NOT_FOUND_COPY.guidance],
    };
  }

  return {
    state: 'success',
    orderedFields: ['headword', 'pronunciation', 'definition'],
    headword,
    pronunciation,
    definition: mainDefinition,
    mainDefinition,
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
    return {
      state: 'not-found',
      orderedFields: ['title', 'message', 'guidance'],
      title: NOT_FOUND_COPY.title,
      message: NOT_FOUND_COPY.message,
      guidance: [...NOT_FOUND_COPY.guidance],
    };
  }

  return mapLookupErrorToPopupViewModel(lookupResult?.error ?? {});
}
