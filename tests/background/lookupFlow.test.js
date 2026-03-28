import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDictionaryLookupUrl } from '../../src/background/lookupRequestBuilder.js';
import { performDictionaryLookup } from '../../src/background/lookupService.js';
import { createLookupFlowOrchestrator } from '../../src/content/lookupFlowOrchestrator.js';

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
  assert.equal(result.error.type, 'network');
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
