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

const defaultLookupCache = createInMemoryLookupCache();
const defaultRateLimiter = createSlidingWindowRateLimiter();

export function createServiceWorkerLookupHandler({
  lookupExecutor = performDictionaryLookup,
  htmlParser = safeParseVocabularyHtml,
  rateLimiter = defaultRateLimiter,
  cacheStore = defaultLookupCache,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  rateLimitPolicy,
  onGuardrailEvent,
} = {}) {
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

    const lookupResult = await lookupExecutor({
      headword,
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

    const parsedResult = htmlParser({ html });

    if (parsedResult?.status === 'success') {
      return createLookupSuccessResponse({
        ...lookupResult.data,
        ...parsedResult.data,
      });
    }

    if (parsedResult?.status === 'not-found') {
      return createLookupNotFoundResponse({
        ...parsedResult.data,
        token: headword,
        headword,
        lookupUrl: lookupResult?.data?.lookupUrl,
      });
    }

    return createLookupErrorResponse(parsedResult?.error?.type ?? 'parse', {
      ...parsedResult?.error,
      headword,
      lookupUrl: lookupResult?.data?.lookupUrl,
    });
  };
}
