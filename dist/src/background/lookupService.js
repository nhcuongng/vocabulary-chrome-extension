import {
  createLookupErrorResponse,
  createLookupSuccessResponse,
  LOOKUP_ERROR_TYPE,
} from '../shared/lookupContract.js';
import { buildDictionaryLookupUrl } from './lookupRequestBuilder.js';

export const DEFAULT_LOOKUP_TIMEOUT_MS = 3000;
export const DEFAULT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_RATE_LIMIT_POLICY = {
  windowMs: 10_000,
  maxRequests: 6,
};

const DEFAULT_RETRY_POLICY = {
  maxAttempts: 2,
  baseDelayMs: 120,
  backoffMultiplier: 2,
  maxDelayMs: 800,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
};

function normalizeRateLimitPolicy(rateLimitPolicy = {}) {
  const policy = {
    ...DEFAULT_RATE_LIMIT_POLICY,
    ...(rateLimitPolicy ?? {}),
  };

  return {
    windowMs: Math.max(1000, Math.floor(Number(policy.windowMs) || DEFAULT_RATE_LIMIT_POLICY.windowMs)),
    maxRequests: Math.max(1, Math.floor(Number(policy.maxRequests) || DEFAULT_RATE_LIMIT_POLICY.maxRequests)),
  };
}

function normalizeCacheTtlMs(cacheTtlMs) {
  const ttlMs = Number(cacheTtlMs);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return DEFAULT_CACHE_TTL_MS;
  }

  return Math.floor(ttlMs);
}

export function createSlidingWindowRateLimiter() {
  const requestTimestampsByKey = new Map();

  function consume({ key = 'global', nowMs = Date.now(), policy } = {}) {
    const safePolicy = normalizeRateLimitPolicy(policy);
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    const normalizedKey = typeof key === 'string' && key.length > 0 ? key : 'global';
    const existing = requestTimestampsByKey.get(normalizedKey) ?? [];
    const boundary = safeNowMs - safePolicy.windowMs;
    const active = existing.filter((timestamp) => timestamp > boundary);

    if (active.length >= safePolicy.maxRequests) {
      const oldestActive = active[0] ?? safeNowMs;
      const retryAfterMs = Math.max(0, safePolicy.windowMs - (safeNowMs - oldestActive));

      requestTimestampsByKey.set(normalizedKey, active);

      return {
        allowed: false,
        key: normalizedKey,
        windowMs: safePolicy.windowMs,
        maxRequests: safePolicy.maxRequests,
        remaining: 0,
        retryAfterMs,
      };
    }

    active.push(safeNowMs);
    requestTimestampsByKey.set(normalizedKey, active);

    return {
      allowed: true,
      key: normalizedKey,
      windowMs: safePolicy.windowMs,
      maxRequests: safePolicy.maxRequests,
      remaining: Math.max(0, safePolicy.maxRequests - active.length),
      retryAfterMs: 0,
    };
  }

  return {
    consume,
    clear: () => requestTimestampsByKey.clear(),
  };
}

export function createInMemoryLookupCache() {
  const entries = new Map();

  function get(word, { nowMs = Date.now() } = {}) {
    const key = typeof word === 'string' ? word : '';
    if (!key) {
      return null;
    }

    const entry = entries.get(key);
    if (!entry) {
      return null;
    }

    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= safeNowMs) {
      entries.delete(key);
      return null;
    }

    return {
      ...entry,
    };
  }

  function set(word, data, { ttlMs = DEFAULT_CACHE_TTL_MS, nowMs = Date.now() } = {}) {
    const key = typeof word === 'string' ? word : '';
    if (!key) {
      return null;
    }

    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    const safeTtlMs = normalizeCacheTtlMs(ttlMs);
    const entry = {
      word: key,
      data,
      cachedAt: safeNowMs,
      expiresAt: safeNowMs + safeTtlMs,
    };

    entries.set(key, entry);
    return {
      ...entry,
    };
  }

  return {
    get,
    set,
    clear: () => entries.clear(),
  };
}

function normalizeTimeoutMs(timeoutMs) {
  const numericTimeout = Number(timeoutMs);

  if (!Number.isFinite(numericTimeout) || numericTimeout <= 0) {
    return DEFAULT_LOOKUP_TIMEOUT_MS;
  }

  return Math.floor(numericTimeout);
}

function normalizeRetryableStatusCodes(statusCodes) {
  if (!Array.isArray(statusCodes)) {
    return DEFAULT_RETRY_POLICY.retryableStatusCodes;
  }

  const normalized = statusCodes
    .map((code) => Number(code))
    .filter((code) => Number.isInteger(code) && code > 0);

  return normalized.length > 0
    ? normalized
    : DEFAULT_RETRY_POLICY.retryableStatusCodes;
}

function resolveRetryPolicy(retryPolicy = {}) {
  const policy = {
    ...DEFAULT_RETRY_POLICY,
    ...(retryPolicy ?? {}),
  };

  return {
    ...policy,
    maxAttempts: Math.max(1, Number(policy.maxAttempts) || DEFAULT_RETRY_POLICY.maxAttempts),
    baseDelayMs: Math.max(0, Number(policy.baseDelayMs) || 0),
    backoffMultiplier: Math.max(1, Number(policy.backoffMultiplier) || 1),
    maxDelayMs: Math.max(0, Number(policy.maxDelayMs) || 0),
    retryableStatusCodes: normalizeRetryableStatusCodes(policy.retryableStatusCodes),
  };
}

function computeBackoffDelayMs(policy, attempt) {
  const exponentialFactor = Math.pow(policy.backoffMultiplier, Math.max(0, attempt - 1));
  const rawDelay = policy.baseDelayMs * exponentialFactor;
  return Math.min(policy.maxDelayMs, rawDelay);
}

function isRetryableStatusCode(statusCode, policy) {
  return policy.retryableStatusCodes.includes(statusCode);
}

function isRetryableErrorType(errorType) {
  return (
    errorType === LOOKUP_ERROR_TYPE.NETWORK ||
    errorType === LOOKUP_ERROR_TYPE.TIMEOUT
  );
}

function createTimeoutError(timeoutMs) {
  const timeoutError = new Error(`lookup timed out after ${timeoutMs}ms`);
  timeoutError.name = 'TimeoutError';
  return timeoutError;
}

function classifyLookupError(error, { timeoutTriggered = false } = {}) {
  if (error?.name === 'TimeoutError') {
    return LOOKUP_ERROR_TYPE.TIMEOUT;
  }

  if (error?.name === 'AbortError' && timeoutTriggered) {
    return LOOKUP_ERROR_TYPE.TIMEOUT;
  }

  return LOOKUP_ERROR_TYPE.NETWORK;
}

async function delayForRetry(ms, delayImpl) {
  if (ms <= 0) {
    return;
  }

  await delayImpl(ms);
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  let timerId;
  let timeoutTriggered = false;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      timeoutTriggered = true;
      if (controller) {
        controller.abort();
      }

      reject(createTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
        credentials: 'omit',
        signal: controller?.signal,
      }),
      timeoutPromise,
    ]);

    return {
      response,
      timeoutTriggered,
    };
  } catch (error) {
    if (error?.name === 'AbortError' && timeoutTriggered) {
      throw createTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timerId);
  }
}

export async function performDictionaryLookup({
  headword,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = DEFAULT_LOOKUP_TIMEOUT_MS,
  retryPolicy,
  rateLimitPolicy,
  rateLimiter = null,
  cacheStore = null,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  onGuardrailEvent,
  delayImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const resolvedRetryPolicy = resolveRetryPolicy(retryPolicy);
  const resolvedRateLimitPolicy = normalizeRateLimitPolicy(rateLimitPolicy);
  const resolvedCacheTtlMs = normalizeCacheTtlMs(cacheTtlMs);
  const safeTimeoutMs = normalizeTimeoutMs(timeoutMs);
  const startedAtMs = now();
  let lookupUrl = '';

  if (typeof fetchImpl !== 'function') {
    return createLookupErrorResponse(LOOKUP_ERROR_TYPE.NETWORK, {
      message: 'fetch implementation is not available',
      headword,
      lookupUrl,
      attempts: 0,
      startedAtMs,
      finishedAtMs: now(),
    });
  }

  try {
    lookupUrl = buildDictionaryLookupUrl(headword);
  } catch (error) {
    return createLookupErrorResponse(LOOKUP_ERROR_TYPE.INVALID_TOKEN, {
      message: error instanceof Error ? error.message : String(error),
      headword,
      lookupUrl,
      attempts: 0,
      startedAtMs,
      finishedAtMs: now(),
    });
  }

  const cacheKey = headword;

  if (cacheStore && typeof cacheStore.get === 'function') {
    try {
      const cacheEntry = cacheStore.get(cacheKey, { nowMs: startedAtMs });
      if (cacheEntry?.data) {
        const finishedAtMs = now();
        const successPayload = {
          ...cacheEntry.data,
          attempts: 0,
          startedAtMs,
          finishedAtMs,
          durationMs: finishedAtMs - startedAtMs,
          cache: {
            hit: true,
            word: cacheEntry.word ?? cacheKey,
            cachedAt: cacheEntry.cachedAt,
            expiresAt: cacheEntry.expiresAt,
          },
        };

        if (typeof onGuardrailEvent === 'function') {
          onGuardrailEvent({
            type: 'cache-hit',
            headword,
            cache: {
              word: cacheEntry.word ?? cacheKey,
              cachedAt: cacheEntry.cachedAt,
              expiresAt: cacheEntry.expiresAt,
            },
          });
        }

        return createLookupSuccessResponse(successPayload);
      }

      if (typeof onGuardrailEvent === 'function') {
        onGuardrailEvent({
          type: 'cache-miss',
          headword,
        });
      }
    } catch {
      // Cache is best-effort and must never break lookup flow.
    }
  }

  if (rateLimiter && typeof rateLimiter.consume === 'function') {
    const rateLimitDecision = rateLimiter.consume({
      key: 'lookup:global',
      nowMs: startedAtMs,
      policy: resolvedRateLimitPolicy,
    });

    if (rateLimitDecision?.allowed === false) {
      const finishedAtMs = now();
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimitDecision.retryAfterMs ?? 0) / 1000));
      const friendlyMessage = `Bạn đang tra cứu quá nhanh. Vui lòng thử lại sau khoảng ${retryAfterSeconds} giây.`;

      if (typeof onGuardrailEvent === 'function') {
        onGuardrailEvent({
          type: 'rate-limit-blocked',
          headword,
          rateLimit: rateLimitDecision,
        });
      }

      return createLookupErrorResponse(LOOKUP_ERROR_TYPE.RATE_LIMIT, {
        message: friendlyMessage,
        userMessage: friendlyMessage,
        headword,
        lookupUrl,
        attempts: 0,
        startedAtMs,
        finishedAtMs,
        retryAfterMs: rateLimitDecision.retryAfterMs ?? 0,
        rateLimit: {
          key: rateLimitDecision.key,
          remaining: rateLimitDecision.remaining,
          windowMs: rateLimitDecision.windowMs,
          maxRequests: rateLimitDecision.maxRequests,
        },
      });
    }
  }

  for (let attempt = 1; attempt <= resolvedRetryPolicy.maxAttempts; attempt += 1) {
    try {
      const { response } = await fetchWithTimeout(fetchImpl, lookupUrl, safeTimeoutMs);

      if (!response?.ok) {
        const statusCode = response?.status ?? 0;
        const isRetryable = isRetryableStatusCode(statusCode, resolvedRetryPolicy);

        if (attempt < resolvedRetryPolicy.maxAttempts && isRetryable) {
          const retryDelayMs = computeBackoffDelayMs(resolvedRetryPolicy, attempt);
          await delayForRetry(retryDelayMs, delayImpl);
          continue;
        }

        return createLookupErrorResponse(LOOKUP_ERROR_TYPE.NETWORK, {
          statusCode,
          statusText: response?.statusText ?? 'unknown',
          headword,
          lookupUrl,
          attempts: attempt,
          retryExhausted: attempt >= resolvedRetryPolicy.maxAttempts,
          startedAtMs,
          finishedAtMs: now(),
        });
      }

      const html = await response.text();
      const finishedAtMs = now();
      const successPayload = {
        headword,
        lookupUrl,
        html,
        attempts: attempt,
        startedAtMs,
        finishedAtMs,
        durationMs: finishedAtMs - startedAtMs,
        cache: {
          hit: false,
          word: cacheKey,
        },
      };

      if (cacheStore && typeof cacheStore.set === 'function') {
        try {
          const cacheEntry = cacheStore.set(cacheKey, successPayload, {
            ttlMs: resolvedCacheTtlMs,
            nowMs: finishedAtMs,
          });

          if (cacheEntry) {
            successPayload.cache.cachedAt = cacheEntry.cachedAt;
            successPayload.cache.expiresAt = cacheEntry.expiresAt;
          }

          if (typeof onGuardrailEvent === 'function') {
            onGuardrailEvent({
              type: 'cache-store',
              headword,
              cache: {
                word: cacheEntry?.word ?? cacheKey,
                cachedAt: cacheEntry?.cachedAt,
                expiresAt: cacheEntry?.expiresAt,
                ttlMs: resolvedCacheTtlMs,
              },
            });
          }
        } catch {
          // Cache is best-effort and must never break lookup flow.
        }
      }

      return createLookupSuccessResponse(successPayload);
    } catch (error) {
      const errorType = classifyLookupError(error, {
        timeoutTriggered: error?.name === 'TimeoutError',
      });
      const canRetry =
        attempt < resolvedRetryPolicy.maxAttempts &&
        isRetryableErrorType(errorType);

      if (canRetry) {
        const retryDelayMs = computeBackoffDelayMs(resolvedRetryPolicy, attempt);
        await delayForRetry(retryDelayMs, delayImpl);
        continue;
      }

      return createLookupErrorResponse(errorType, {
        message: error instanceof Error ? error.message : String(error),
        headword,
        lookupUrl,
        attempts: attempt,
        retryExhausted: attempt >= resolvedRetryPolicy.maxAttempts,
        startedAtMs,
        finishedAtMs: now(),
      });
    }
  }

  return createLookupErrorResponse(LOOKUP_ERROR_TYPE.UNKNOWN, {
    message: 'lookup failed unexpectedly',
    headword,
    lookupUrl,
    attempts: resolvedRetryPolicy.maxAttempts,
    retryExhausted: true,
    startedAtMs,
    finishedAtMs: now(),
  });
}
