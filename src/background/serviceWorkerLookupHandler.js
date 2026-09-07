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
import {
  parseFreeDictionaryApiResponse,
  extractFreeDictionaryPronunciation,
} from '../infrastructure/adapters/freeDictionaryApiAdapter.js';
import { DICTIONARY_SOURCE } from '../shared/userSettings.js';

const defaultLookupCache = createInMemoryLookupCache();
const defaultRateLimiter = createSlidingWindowRateLimiter();

export async function defaultFreeDictionaryPronunciationFetcher({
  headword,
  fetchImpl = globalThis.fetch,
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
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const pronData = extractFreeDictionaryPronunciation(data, headword);
    if (pronData && pronData.hasPronunciation) {
      return pronData;
    }
    return null;
  } catch {
    return null;
  }
}

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
    
    const effectiveSource = requestedSource;
    const lookupUrl = url;

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
  freeDictionaryApiExecutor = defaultFreeDictionaryApiExecutor,
  freeDictionaryPronunciationFetcher = defaultFreeDictionaryPronunciationFetcher,
  rateLimiter = defaultRateLimiter,
  cacheStore = defaultLookupCache,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  settingsStore = null,
  rateLimitPolicy,
  onGuardrailEvent,
} = {}) {
  async function enrichWithFreeDictionaryPronunciation(result, headword) {
    if (
      result?.status === 'success' &&
      result?.data?.parsedPayload &&
      typeof freeDictionaryPronunciationFetcher === 'function'
    ) {
      const payload = result.data.parsedPayload;
      const currentPron = payload.pronunciation;
      const currentAudioUs = payload.audio?.us;
      const currentAudioUk = payload.audio?.uk;

      const hasAudio = Boolean(currentAudioUs || currentAudioUk);
      if (currentPron && hasAudio) {
        return result;
      }

      try {
        const pronData = await freeDictionaryPronunciationFetcher({ headword });
        if (pronData && pronData.hasPronunciation) {
          if (!payload.pronunciation && pronData.pronunciation) {
            payload.pronunciation = pronData.pronunciation;
          }
          payload.audio = {
            us: currentAudioUs || pronData.audio?.us || '',
            uk: currentAudioUk || pronData.audio?.uk || '',
          };
        }
      } catch {
        // Fallback silently to existing pronunciation
      }
    }
    return result;
  }

  async function lookupFromSingleSource(source, headword, { allowFallback = false } = {}) {
    if (source === DICTIONARY_SOURCE.FREEDICTIONARY) {
      if (typeof freeDictionaryApiExecutor === 'function' && freeDictionaryApiExecutor !== defaultFreeDictionaryApiExecutor) {
        const customRes = await freeDictionaryApiExecutor({
          headword,
          requestedSource: DICTIONARY_SOURCE.FREEDICTIONARY,
        });
        if (customRes) return customRes;
      }
    }

    if (typeof lookupExecutor === 'function') {
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
          return enrichWithFreeDictionaryPronunciation(lookupResult, headword);
        }

        const html = lookupResult?.data?.html;
        if (typeof html === 'string') {
          const parsedResult = htmlParser({ html });
          if (parsedResult?.status === 'success') {
            const successRes = createLookupSuccessResponse({
              ...lookupResult.data,
              ...parsedResult.data,
              source: parsedResult?.data?.parsedPayload?.source || source,
            });
            return enrichWithFreeDictionaryPronunciation(successRes, headword);
          }
          if (parsedResult?.status === 'not-found') {
            if (allowFallback && typeof freeDictionaryApiExecutor === 'function' && freeDictionaryApiExecutor !== defaultFreeDictionaryApiExecutor) {
              const fallbackRes = await freeDictionaryApiExecutor({
                headword,
                requestedSource: DICTIONARY_SOURCE.FREEDICTIONARY,
              });
              if (fallbackRes) return fallbackRes;
            }
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
        return enrichWithFreeDictionaryPronunciation(lookupResult, headword);
      }

      if (lookupResult?.status === 'not-found' && allowFallback) {
        if (typeof freeDictionaryApiExecutor === 'function') {
          const fallbackRes = await freeDictionaryApiExecutor({
            headword,
            requestedSource: DICTIONARY_SOURCE.FREEDICTIONARY,
          });
          if (fallbackRes) return fallbackRes;
        }
      }

      if (lookupResult) {
        return lookupResult;
      }
    }

    if (source === DICTIONARY_SOURCE.FREEDICTIONARY && typeof freeDictionaryApiExecutor === 'function') {
      const apiRes = await freeDictionaryApiExecutor({
        headword,
        requestedSource: DICTIONARY_SOURCE.FREEDICTIONARY,
      });
      if (apiRes) return apiRes;
    }

    return null;
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

    let isSimpleLearn = message?.payload?.simpleLearn;
    let sourcePreference = message?.payload?.source;

    if (sourcePreference) {
      if (sourcePreference === DICTIONARY_SOURCE.FREEDICTIONARY) {
        return lookupFromSingleSource(DICTIONARY_SOURCE.FREEDICTIONARY, headword, { allowFallback: false });
      }
      if (sourcePreference === DICTIONARY_SOURCE.VOCABULARY) {
        return lookupFromSingleSource(DICTIONARY_SOURCE.VOCABULARY, headword, { allowFallback: false });
      }
    }

    if (typeof isSimpleLearn !== 'boolean' && settingsStore && typeof settingsStore.load === 'function') {
      try {
        const loadedSettings = await settingsStore.load();
        isSimpleLearn = Boolean(loadedSettings?.simpleLearn);
      } catch {}
    }

    const targetSource = isSimpleLearn
      ? DICTIONARY_SOURCE.FREEDICTIONARY
      : DICTIONARY_SOURCE.VOCABULARY;

    return lookupFromSingleSource(targetSource, headword, { allowFallback: !isSimpleLearn });
  };
}
