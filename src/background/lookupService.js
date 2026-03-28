import {
  createLookupErrorResponse,
  createLookupSuccessResponse,
} from '../shared/lookupContract.js';
import { buildDictionaryLookupUrl } from './lookupRequestBuilder.js';

export async function performDictionaryLookup({
  headword,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const startedAtMs = now();
  let lookupUrl = '';

  if (typeof fetchImpl !== 'function') {
    return createLookupErrorResponse('network', {
      message: 'fetch implementation is not available',
      headword,
      lookupUrl,
      startedAtMs,
      finishedAtMs: now(),
    });
  }

  try {
    lookupUrl = buildDictionaryLookupUrl(headword);

    const response = await fetchImpl(lookupUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
      },
      credentials: 'omit',
    });

    if (!response?.ok) {
      return createLookupErrorResponse('network', {
        statusCode: response?.status ?? 0,
        statusText: response?.statusText ?? 'unknown',
        headword,
        lookupUrl,
        startedAtMs,
        finishedAtMs: now(),
      });
    }

    const html = await response.text();
    const finishedAtMs = now();

    return createLookupSuccessResponse({
      headword,
      lookupUrl,
      html,
      startedAtMs,
      finishedAtMs,
      durationMs: finishedAtMs - startedAtMs,
    });
  } catch (error) {
    return createLookupErrorResponse('network', {
      message: error instanceof Error ? error.message : String(error),
      headword,
      lookupUrl,
      startedAtMs,
      finishedAtMs: now(),
    });
  }
}
