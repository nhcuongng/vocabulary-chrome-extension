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
import { parseFreeDictionaryApiResponse } from '../infrastructure/adapters/freeDictionaryApiAdapter.js';
import { DICTIONARY_SOURCE, normalizeAutoSourceOrder, DEFAULT_AUTO_SOURCE_ORDER } from '../shared/userSettings.js';

const defaultLookupCache = createInMemoryLookupCache();
const defaultRateLimiter = createSlidingWindowRateLimiter();

export async function defaultFreeDictionaryApiExecutor({ 
  headword, 
  fetchImpl = globalThis.fetch,
  requestedSource = DICTIONARY_SOURCE.FREEDICTIONARY 
} = {}) {
  if (typeof fetchImpl !== 'function' || !headword) {
    return null;
  }

  try {
    const url = `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(headword)}`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    
    // For fallback cases we might pretend to be CAMBRIDGE, otherwise use requested source
    const effectiveSource = requestedSource;
    const lookupUrl = effectiveSource === DICTIONARY_SOURCE.CAMBRIDGE
      ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(headword)}`
      : url;

    if (res.status === 404) {
      return createLookupNotFoundResponse({
        token: headword,
        headword,
        source: effectiveSource,
        lookupUrl,
      });
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const parsedPayload = parseFreeDictionaryApiResponse(data, headword);
    if (!parsedPayload.hasCoreData) {
      return null;
    }

    return createLookupSuccessResponse({
      headword,
      source: effectiveSource,
      lookupUrl,
      parsedPayload: {
        ...parsedPayload,
        lookupUrl,
        source: effectiveSource,
      },
    });
  } catch {
    return null;
  }
}

export function createServiceWorkerLookupHandler({
  lookupExecutor = performDictionaryLookup,
  htmlParser = safeParseVocabularyHtml,
  cambridgeHtmlParser = safeParseCambridgeHtml,
  freeDictionaryApiExecutor = defaultFreeDictionaryApiExecutor,
  rateLimiter = defaultRateLimiter,
  cacheStore = defaultLookupCache,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  settingsStore = null,
  rateLimitPolicy,
  onGuardrailEvent,
} = {}) {
  async function lookupFromSingleSource(source, headword) {
    if (
      source === DICTIONARY_SOURCE.FREEDICTIONARY &&
      freeDictionaryApiExecutor !== defaultFreeDictionaryApiExecutor &&
      typeof freeDictionaryApiExecutor === 'function'
    ) {
      const customRes = await freeDictionaryApiExecutor({
        headword,
        requestedSource: DICTIONARY_SOURCE.FREEDICTIONARY,
      });
      if (customRes) return customRes;
    }

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

    if (lookupResult?.status === 'success') {
      if (lookupResult?.data?.parsedPayload) {
        return lookupResult;
      }

      const html = lookupResult?.data?.html;
      if (typeof html === 'string') {
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
      return lookupResult;
    }

    // Fallback: If Cambridge source cannot be fetched (Cloudflare 403 or network error),
    // fetch from Free Dictionary API for reliable standard definitions & audio:
    if (source === DICTIONARY_SOURCE.CAMBRIDGE && typeof freeDictionaryApiExecutor === 'function') {
      const fallbackResult = await freeDictionaryApiExecutor({
        headword,
        requestedSource: DICTIONARY_SOURCE.CAMBRIDGE,
      });
      if (fallbackResult) {
        return fallbackResult;
      }
    }

    return lookupResult;
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

    // 2. Direct source: freedictionary only
    if (sourcePreference === DICTIONARY_SOURCE.FREEDICTIONARY) {
      return lookupFromSingleSource(DICTIONARY_SOURCE.FREEDICTIONARY, headword);
    }

    // 3. Direct source: cambridge only
    if (sourcePreference === DICTIONARY_SOURCE.CAMBRIDGE) {
      return lookupFromSingleSource(DICTIONARY_SOURCE.CAMBRIDGE, headword);
    }

    // 4. Auto source: Duyệt theo danh sách autoSourceOrder (mặc định hoặc người dùng tùy biến)
    let customOrder = message?.payload?.autoSourceOrder;
    if (!customOrder && settingsStore && typeof settingsStore.load === 'function') {
      try {
        const loadedSettings = await settingsStore.load();
        customOrder = loadedSettings?.autoSourceOrder;
      } catch {}
    }

    const effectiveOrder = normalizeAutoSourceOrder(customOrder);
    let firstFailResult = null;

    for (const source of effectiveOrder) {
      const result = await lookupFromSingleSource(source, headword);
      if (result?.status === 'success') {
        return result;
      }
      if (!firstFailResult && (result?.status === 'not-found' || result?.status === 'error')) {
        firstFailResult = result;
      }
    }

    return firstFailResult || createLookupNotFoundResponse({
      token: headword,
      headword,
      source: DICTIONARY_SOURCE.AUTO,
    });
  };
}
