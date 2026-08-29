import {
  LOOKUP_MESSAGE_TYPE,
  createLookupErrorResponse,
  createLookupNotFoundResponse,
  createLookupSuccessResponse,
} from '../shared/lookupContract.js';
import {
  DEFAULT_CACHE_TTL_MS,
  createInMemoryLookupCache,
  createSlidingWindowRateLimiter,
  performDictionaryLookup,
} from './lookupService.js';
import { safeParseVocabularyHtml } from '../infrastructure/adapters/safeVocabularyHtmlParserAdapter.js';
import { safeParseCambridgeHtml } from '../infrastructure/adapters/safeCambridgeHtmlParserAdapter.js';
import { DICTIONARY_SOURCE } from '../shared/userSettings.js';

const defaultLookupCache = createInMemoryLookupCache();
const defaultRateLimiter = createSlidingWindowRateLimiter();

export function createServiceWorkerLookupHandler({
  lookupExecutor = performDictionaryLookup,
  htmlParser = safeParseVocabularyHtml,
  cambridgeHtmlParser = safeParseCambridgeHtml,
  rateLimiter = defaultRateLimiter,
  cacheStore = defaultLookupCache,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  rateLimitPolicy,
  onGuardrailEvent,
} = {}) {
  async function lookupFromSingleSource(source, headword) {
    const parser = source === DICTIONARY_SOURCE.CAMBRIDGE ? cambridgeHtmlParser : htmlParser;

    const lookupResult = await lookupExecutor({
      headword,
      source,
      rateLimiter,
      cacheStore,
      cacheTtlMs,
      rateLimitPolicy,
      onGuardrailEvent,
    });

    if (lookupResult?.status !== 'success') {
      return lookupResult;
    }

    if (lookupResult?.data?.parsedPayload) {
      return lookupResult;
    }

    const html = lookupResult?.data?.html;
    if (typeof html !== 'string') {
      return lookupResult;
    }

    const parsedResult = parser({ html });

    if (parsedResult?.status === 'success') {
      return createLookupSuccessResponse({
        ...lookupResult.data,
        ...parsedResult.data,
        source: parsedResult?.data?.parsedPayload?.source || source,
      });
    }

    if (parsedResult?.status === 'not-found') {
      return createLookupNotFoundResponse({
        ...parsedResult.data,
        token: headword,
        headword,
        source,
        lookupUrl: lookupResult?.data?.lookupUrl,
      });
    }

    return createLookupErrorResponse(parsedResult?.error?.type ?? 'parse', {
      ...parsedResult?.error,
      headword,
      source,
      lookupUrl: lookupResult?.data?.lookupUrl,
    });
  }

  return async function handleLookupMessage(message) {
    if (message?.type !== LOOKUP_MESSAGE_TYPE) {
      return null;
    }

    const headword = message?.payload?.token;
    if (typeof headword !== 'string' || headword.length === 0) {
      return createLookupErrorResponse('invalid-token', {
        message: 'headword token is required',
      });
    }

    const sourcePreference = message?.payload?.source || DICTIONARY_SOURCE.AUTO;

    // 1. Direct source: vocabulary only
    if (sourcePreference === DICTIONARY_SOURCE.VOCABULARY) {
      return lookupFromSingleSource(DICTIONARY_SOURCE.VOCABULARY, headword);
    }

    // 2. Direct source: cambridge only
    if (sourcePreference === DICTIONARY_SOURCE.CAMBRIDGE) {
      return lookupFromSingleSource(DICTIONARY_SOURCE.CAMBRIDGE, headword);
    }

    // 3. Auto source: Priority Vocabulary.com -> Cambridge Dictionary
    const vocabResult = await lookupFromSingleSource(DICTIONARY_SOURCE.VOCABULARY, headword);
    if (vocabResult?.status === 'success') {
      return vocabResult;
    }

    const cambridgeResult = await lookupFromSingleSource(DICTIONARY_SOURCE.CAMBRIDGE, headword);
    if (cambridgeResult?.status === 'success') {
      return cambridgeResult;
    }

    // If both failed or not found, preserve the primary (vocabResult) details if available
    if (vocabResult?.status === 'not-found') {
      return vocabResult;
    }

    if (vocabResult?.status === 'error') {
      return vocabResult;
    }

    return cambridgeResult || vocabResult;
  };
}
