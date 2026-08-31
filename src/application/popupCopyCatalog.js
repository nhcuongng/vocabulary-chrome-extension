import { LOOKUP_ERROR_TYPE, normalizeLookupErrorType } from '../shared/lookupContract.js';

export const NOT_FOUND_COPY = {
  title: 'No results found',
  message: 'The selected word has no matching definition in the current source.',
  searchSuggestionsPrefix: 'Try searching on:',
  guidance: [
    'Remove punctuation at the start/end of the word.',
    'Select only a single word.',
    'Try the base/root form (e.g. run instead of running).',
  ],
};

const ERROR_COPY_BY_TYPE = {
  [LOOKUP_ERROR_TYPE.RATE_LIMIT]: {
    title: 'Too many requests',
    message: 'The system is temporarily rate-limiting requests. Please try again in a few seconds.',
    cta: 'Wait and retry',
  },
  [LOOKUP_ERROR_TYPE.NETWORK]: {
    title: 'Network connection lost',
    message: 'Unable to connect to the dictionary source at this time.',
    cta: 'Retry',
  },
  [LOOKUP_ERROR_TYPE.TIMEOUT]: {
    title: 'Request timed out',
    message: 'The connection is taking longer than expected. Please try again.',
    cta: 'Retry',
  },
  [LOOKUP_ERROR_TYPE.PARSE]: {
    title: 'Unable to read dictionary data',
    message: 'The source data format may have changed.',
    cta: 'Close',
  },
  [LOOKUP_ERROR_TYPE.UNKNOWN]: {
    title: 'An unexpected error occurred',
    message: 'Please try again in a moment.',
    cta: 'Retry',
  },
  [LOOKUP_ERROR_TYPE.INVALID_TOKEN]: {
    title: 'Invalid word selected',
    message: 'Please select a valid English word and try again.',
    cta: 'Close',
  },
};

export function getErrorCopyByType(errorType) {
  const normalizedType = normalizeLookupErrorType(errorType);
  return ERROR_COPY_BY_TYPE[normalizedType] ?? ERROR_COPY_BY_TYPE[LOOKUP_ERROR_TYPE.UNKNOWN];
}
