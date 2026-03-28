import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDictionaryLookupUrl } from '../../src/background/lookupRequestBuilder.js';
import { performDictionaryLookup } from '../../src/background/lookupService.js';
import { createLookupTelemetryRecorder } from '../../src/application/lookupTelemetryRecorder.js';
import { createLookupFlowOrchestrator } from '../../src/content/lookupFlowOrchestrator.js';
import { createInMemoryTelemetryStore } from '../../src/infrastructure/adapters/inMemoryTelemetryStore.js';

test('buildDictionaryLookupUrl: tạo URL dictionary đúng theo normalized headword', () => {
  const url = buildDictionaryLookupUrl('hello');
  assert.equal(url, 'https://www.vocabulary.com/dictionary/hello');
});

test('performDictionaryLookup: trả typed success response', async () => {
  const result = await performDictionaryLookup({
    headword: 'hello',
    fetchImpl: async () => ({
      ok: true,
      text: async () => '<h1 class="dynamictext">hello</h1>',
    }),
    now: (() => {
      const marks = [1000, 1300];
      return () => marks.shift() ?? 1300;
    })(),
  });

  assert.equal(result.status, 'success');
  assert.equal(result.data.headword, 'hello');
  assert.equal(result.data.durationMs, 300);
});

test('performDictionaryLookup: trả typed error response khi headword không hợp lệ', async () => {
  const result = await performDictionaryLookup({
    headword: 'Hello',
    fetchImpl: async () => ({ ok: true, text: async () => '' }),
  });

  assert.equal(result.status, 'error');
  assert.equal(result.error.type, 'invalid-token');
});

test('performDictionaryLookup: timeout sẽ retry theo ngưỡng và dừng tuyệt đối', async () => {
  let attempts = 0;

  const result = await performDictionaryLookup({
    headword: 'hello',
    fetchImpl: () => {
      attempts += 1;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            text: async () => '<h1 class="dynamictext">hello</h1>',
          });
        }, 30);
      });
    },
    timeoutMs: 5,
    retryPolicy: {
      maxAttempts: 2,
      baseDelayMs: 0,
      backoffMultiplier: 1,
      maxDelayMs: 0,
    },
    delayImpl: async () => {},
  });

  assert.equal(attempts, 2);
  assert.equal(result.status, 'error');
  assert.equal(result.error.type, 'timeout');
  assert.equal(result.error.retryExhausted, true);
});

test('performDictionaryLookup: retry thành công khi gặp lỗi network tạm thời', async () => {
  let attempt = 0;

  const result = await performDictionaryLookup({
    headword: 'hello',
    fetchImpl: async () => {
      attempt += 1;

      if (attempt === 1) {
        throw new Error('temporary network issue');
      }

      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    retryPolicy: {
      maxAttempts: 3,
      baseDelayMs: 0,
      backoffMultiplier: 1,
      maxDelayMs: 0,
    },
    delayImpl: async () => {},
  });

  assert.equal(attempt, 2);
  assert.equal(result.status, 'success');
  assert.equal(result.data.attempts, 2);
});

test('performDictionaryLookup: retryableStatusCodes dạng string vẫn được normalize', async () => {
  let attempt = 0;

  const result = await performDictionaryLookup({
    headword: 'hello',
    fetchImpl: async () => {
      attempt += 1;

      if (attempt === 1) {
        return {
          ok: false,
          status: 503,
          statusText: 'service unavailable',
          text: async () => '',
        };
      }

      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    retryPolicy: {
      maxAttempts: 2,
      retryableStatusCodes: ['503'],
      baseDelayMs: 0,
      backoffMultiplier: 1,
      maxDelayMs: 0,
    },
    delayImpl: async () => {},
  });

  assert.equal(attempt, 2);
  assert.equal(result.status, 'success');
});

test('performDictionaryLookup: vượt ngưỡng rate-limit trả lỗi thân thiện và không gọi network', async () => {
  let fetchCalls = 0;

  const limiter = {
    consume: (() => {
      let calls = 0;
      return ({ policy }) => {
        calls += 1;
        if (calls === 1) {
          return {
            allowed: true,
            key: 'lookup:global',
            windowMs: policy.windowMs,
            maxRequests: policy.maxRequests,
            remaining: 0,
            retryAfterMs: 0,
          };
        }

        return {
          allowed: false,
          key: 'lookup:global',
          windowMs: policy.windowMs,
          maxRequests: policy.maxRequests,
          remaining: 0,
          retryAfterMs: 8_000,
        };
      };
    })(),
  };

  const first = await performDictionaryLookup({
    headword: 'hello',
    now: () => 5_000,
    fetchImpl: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    rateLimitPolicy: {
      maxRequests: 1,
      windowMs: 10_000,
    },
    cacheStore: null,
    rateLimiter: limiter,
  });

  const second = await performDictionaryLookup({
    headword: 'hello',
    now: () => 5_000,
    fetchImpl: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    rateLimitPolicy: {
      maxRequests: 1,
      windowMs: 10_000,
    },
    cacheStore: null,
    rateLimiter: limiter,
  });

  assert.equal(first.status, 'success');
  assert.equal(second.status, 'error');
  assert.equal(second.error.type, 'rate-limit');
  assert.equal(second.error.retryAfterMs, 8_000);
  assert.match(second.error.message, /tra cứu quá nhanh/i);
  assert.equal(fetchCalls, 1);
});

test('performDictionaryLookup: cache hit trong TTL sẽ ưu tiên trả từ cache trước network', async () => {
  let fetchCalls = 0;

  const memoryCache = {
    entry: null,
    get(word, { nowMs }) {
      if (!this.entry || this.entry.word !== word) {
        return null;
      }

      if (this.entry.expiresAt <= nowMs) {
        this.entry = null;
        return null;
      }

      return this.entry;
    },
    set(word, data, { nowMs, ttlMs }) {
      this.entry = {
        word,
        data,
        cachedAt: nowMs,
        expiresAt: nowMs + ttlMs,
      };

      return this.entry;
    },
  };

  const nowValues = [10_000, 10_220, 10_600, 10_601];
  const now = () => nowValues.shift() ?? 10_601;

  const first = await performDictionaryLookup({
    headword: 'hello',
    now,
    fetchImpl: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    cacheStore: memoryCache,
    cacheTtlMs: 60_000,
    rateLimiter: null,
  });

  const second = await performDictionaryLookup({
    headword: 'hello',
    now,
    fetchImpl: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        text: async () => '<h1 class="dynamictext">hello</h1>',
      };
    },
    cacheStore: memoryCache,
    cacheTtlMs: 60_000,
    rateLimiter: null,
  });

  assert.equal(first.status, 'success');
  assert.equal(first.data.cache.hit, false);
  assert.equal(second.status, 'success');
  assert.equal(second.data.cache.hit, true);
  assert.equal(second.data.attempts, 0);
  assert.equal(fetchCalls, 1);
});

test('request -> loading: hiển thị loading ngay tức thì (<200ms)', async () => {
  const states = [];
  let nowMs = 2000;

  const orchestrator = createLookupFlowOrchestrator({
    now: () => nowMs,
    onStateChange: (state) => states.push(state),
    lookupExecutor: async () => {
      nowMs += 120;
      return {
        status: 'success',
        data: { headword: 'hello' },
      };
    },
  });

  const result = await orchestrator.runLookup({ headword: 'hello' });

  assert.equal(states[0].status, 'loading');
  assert.ok(states[0].loadingLatencyMs < 200);
  assert.equal(result.finalState.status, 'success');
});

test('lookup orchestrator: fallback error state khi lookupExecutor throw', async () => {
  const states = [];
  const orchestrator = createLookupFlowOrchestrator({
    onStateChange: (state) => states.push(state),
    lookupExecutor: async () => {
      throw new Error('network unavailable');
    },
  });

  const result = await orchestrator.runLookup({ headword: 'hello' });

  assert.equal(result.finalState.status, 'error');
  assert.equal(result.finalState.error.message, 'network unavailable');
  assert.equal(states.at(-1).status, 'error');
});

test('lookup orchestrator: ghi telemetry ẩn danh theo kết quả lookup', async () => {
  const telemetryStore = createInMemoryTelemetryStore();
  const telemetryRecorder = createLookupTelemetryRecorder({
    store: telemetryStore,
    extensionVersion: '0.1.0',
    now: (() => {
      let nowMs = 10_000;
      return () => ++nowMs;
    })(),
    createEventId: (() => {
      let id = 0;
      return () => `evt-${++id}`;
    })(),
  });

  const orchestrator = createLookupFlowOrchestrator({
    onStateChange: () => {},
    telemetryRecorder,
    lookupExecutor: async () => ({
      status: 'error',
      error: {
        type: 'timeout',
        message: 'timeout reached',
      },
    }),
  });

  await orchestrator.runLookup({ headword: 'hello' });

  const events = telemetryRecorder.getEvents({ extensionVersion: '0.1.0' });
  assert.equal(events.length, 1);
  assert.equal(events[0].resultType, 'error');
  assert.equal(events[0].errorType, 'timeout');
  assert.equal(events[0].extensionVersion, '0.1.0');
});

test('lookup orchestrator: bỏ qua kết quả stale khi request cũ về muộn', async () => {
  const states = [];
  let firstResolver;
  let secondResolver;

  const orchestrator = createLookupFlowOrchestrator({
    onStateChange: (state) => states.push(state),
    lookupExecutor: ({ headword }) =>
      new Promise((resolve) => {
        if (headword === 'first') {
          firstResolver = resolve;
          return;
        }

        secondResolver = resolve;
      }),
  });

  const firstRun = orchestrator.runLookup({ headword: 'first' });
  const secondRun = orchestrator.runLookup({ headword: 'second' });

  secondResolver({ status: 'success', data: { headword: 'second' } });
  await secondRun;

  firstResolver({ status: 'success', data: { headword: 'first' } });
  await firstRun;

  assert.equal(orchestrator.getState().status, 'success');
  assert.equal(orchestrator.getState().data.headword, 'second');
  assert.notEqual(states.at(-1).data?.headword, 'first');
});
