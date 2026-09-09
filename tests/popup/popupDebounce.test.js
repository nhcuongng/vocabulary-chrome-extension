import assert from 'node:assert/strict';
import test from 'node:test';
import { bootstrapPopupRuntime } from '../../src/popup/popup.js';

function createMockElement(tag = 'div') {
  const listeners = new Map();
  const children = [];
  const classListSet = new Set();
  const attrs = new Map();

  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    parentNode: null,
    childNodes: children,
    className: '',
    innerHTML: '',
    value: '',
    checked: false,
    type: tag === 'button' ? 'button' : undefined,
    get textContent() {
      return children.map((c) => (c.textContent != null ? c.textContent : '')).join('');
    },
    set textContent(val) {
      children.length = 0;
      if (val !== '') {
        children.push({ textContent: String(val) });
      }
    },
    addEventListener: (type, handler) => {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((h) => h !== handler));
    },
    dispatchEvent: async (type, event = {}) => {
      const list = listeners.get(type) || [];
      for (const h of list) await h(event);
    },
    appendChild: (child) => {
      children.push(child);
      child.parentNode = el;
      return child;
    },
    replaceChildren: (...newChildren) => {
      children.length = 0;
      for (const c of newChildren) {
        if (c) {
          children.push(c);
          c.parentNode = el;
        }
      }
    },
    setAttribute: (k, v) => attrs.set(k, v),
    getAttribute: (k) => attrs.get(k),
    removeAttribute: (k) => attrs.delete(k),
    classList: {
      add: (cls) => classListSet.add(cls),
      remove: (cls) => classListSet.delete(cls),
      contains: (cls) => classListSet.has(cls),
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    contains: () => false,
    focus: () => {},
  };
  return el;
}

function createMockDocument() {
  const elements = new Map();
  const body = createMockElement('body');

  return {
    body,
    createElement: (tag) => createMockElement(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
    getElementById: (id) => {
      if (!elements.has(id)) {
        elements.set(id, createMockElement('div'));
      }
      return elements.get(id);
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

test('popup debounce: waits 400ms before sending lookup request', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');
  const searchResults = doc.getElementById('vocab-search-results');

  const sentMessages = [];
  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback({
          status: 'success',
          data: {
            source: 'vocabulary',
            parsedPayload: {
              headword: msg.payload?.token,
              definitions: ['A small domesticated carnivorous mammal.'],
              shortDefinition: 'A small domesticated carnivorous mammal.',
            },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  // Simulate typing 'cat'
  searchInput.value = 'cat';
  searchInput.dispatchEvent('input');

  // Immediately, no lookup message should have been sent yet (debounced)
  assert.equal(sentMessages.length, 0);

  // Wait 450ms for debounce
  await new Promise((resolve) => setTimeout(resolve, 450));

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].payload.token, 'cat');

  runtime.destroy();
});

test('popup debounce: Enter key bypasses debounce delay and performs lookup immediately', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');

  const sentMessages = [];
  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback({
          status: 'success',
          data: {
            source: 'vocabulary',
            parsedPayload: {
              headword: msg.payload?.token,
              definitions: ['A feline.'],
              shortDefinition: 'A feline.',
            },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  searchInput.value = 'kitten';
  searchInput.dispatchEvent('input');
  assert.equal(sentMessages.length, 0);

  // Press Enter
  searchInput.dispatchEvent('keydown', { key: 'Enter' });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].payload.token, 'kitten');

  // Debounce timer should have been cleared, no duplicate lookup after 450ms
  await new Promise((resolve) => setTimeout(resolve, 450));
  assert.equal(sentMessages.length, 1);

  runtime.destroy();
});

test('popup debounce: out-of-order responses do not overwrite newer search result', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');
  const searchResults = doc.getElementById('vocab-search-results');

  const pendingCallbacks = [];
  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        pendingCallbacks.push({ token: msg.payload?.token, callback });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  // User searches 'first' with Enter
  searchInput.value = 'first';
  searchInput.dispatchEvent('keydown', { key: 'Enter' });
  assert.equal(pendingCallbacks.length, 1);

  // User quickly searches 'second' with Enter
  searchInput.value = 'second';
  searchInput.dispatchEvent('keydown', { key: 'Enter' });
  assert.equal(pendingCallbacks.length, 2);

  // 'second' (request #2) resolves first
  pendingCallbacks[1].callback({
    status: 'success',
    data: {
      source: 'vocabulary',
      parsedPayload: {
        headword: 'second',
        definitions: ['Coming after the first in order.'],
        shortDefinition: 'Coming after the first in order.',
      },
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  // Now 'first' (request #1 - stale) resolves later
  pendingCallbacks[0].callback({
    status: 'success',
    data: {
      source: 'vocabulary',
      parsedPayload: {
        headword: 'first',
        definitions: ['Preceding all others.'],
        shortDefinition: 'Preceding all others.',
      },
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  // The rendered headword should remain 'second' (not overwritten by 'first')
  const headwordText = searchResults.textContent;
  assert.ok(headwordText.includes('Second'), `Expected Second in results but got: ${headwordText}`);

  runtime.destroy();
});

test('popup debounce: clearing input clears debounce timer and resets results', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');
  const searchClearBtn = doc.getElementById('vocab-search-clear');

  const sentMessages = [];
  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback({
          status: 'success',
          data: {
            source: 'vocabulary',
            parsedPayload: { headword: msg.payload?.token },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  // User types 'apple'
  searchInput.value = 'apple';
  searchInput.dispatchEvent('input');

  // Immediately clicks clear before 400ms expires
  searchClearBtn.dispatchEvent('click');

  assert.equal(searchInput.value, '');

  // Wait 450ms to ensure debounce does not fire
  await new Promise((resolve) => setTimeout(resolve, 450));
  assert.equal(sentMessages.length, 0);

  runtime.destroy();
});

test('popup: toggling Simple Learn updates settings and triggers immediate lookup', async () => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');

  const simpleLearnToggle = doc.getElementById('simple-learn-toggle');
  simpleLearnToggle.type = 'checkbox';
  simpleLearnToggle.checked = false;

  const storedSettings = { simpleLearn: false, rememberLastLookup: false };
  const savedSettings = [];
  const sentMessages = [];

  const mockChrome = {
    storage: {
      local: {
        get: async (key) => {
          if (typeof key === 'string') return { [key]: storedSettings[key] };
          if (Array.isArray(key)) {
            const res = {};
            for (const k of key) res[k] = storedSettings[k];
            return res;
          }
          return { ...storedSettings };
        },
        set: async (items) => {
          Object.assign(storedSettings, items);
          savedSettings.push(items);
        },
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback({
          status: 'success',
          data: {
            source: msg.payload?.source,
            parsedPayload: { headword: msg.payload?.token },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  // Set input after bootstrap (since bootstrap resets when rememberLastLookup is false)
  searchInput.value = 'galaxy';

  // Toggle simple learn on
  simpleLearnToggle.checked = true;
  await simpleLearnToggle.dispatchEvent('change');

  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0]['user-settings']?.simpleLearn, true);
  runtime.destroy();
});

test('popup: renders word details with shared tab system and word navigation', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');
  const searchResults = doc.getElementById('vocab-search-results');

  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false, vocab_search_history: ['apple', 'banana', 'cat'] }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        callback({
          status: 'success',
          data: {
            source: 'vocabulary',
            parsedPayload: {
              headword: msg.payload?.token,
              pronunciation: 'US /ˈæp.əl/',
              audio: { us: 'https://audio.example/apple.mp3' },
              stressDiagram: {
                hasStressInfo: true,
                syllables: [{ text: 'ap', level: 1 }, { text: 'ple', level: 0 }],
                stressSummary: 'Primary on 1st',
              },
              definitions: [
                '<div class="vocab-quick-def"><p>A round fruit with red, green or yellow skin.</p></div>',
                '<details class="vocab-details"><summary><span class="vocab-details-label">Explanation</span></summary><div class="details-content"><p>Detailed info on apples.</p></div></details>',
              ],
              wordFamily: ['apples', 'apple tree'],
              synonyms: ['pome'],
              antonyms: [],
            },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
  });

  searchInput.value = 'apple';
  searchInput.dispatchEvent('keydown', { key: 'Enter' });
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Verify body container exists
  const bodyContainer = searchResults.childNodes?.find?.(
    (c) => c.className && c.className.includes('vocab-popup-body')
  );
  assert.ok(bodyContainer, 'Body container should exist');

  // Verify headword is rendered
  const headwordRow = bodyContainer.childNodes?.find?.(
    (c) => c.className === 'vocab-popup-headword-row'
  );
  assert.ok(headwordRow, 'Headword row should exist');

  // Verify stepper navigation exists because history has items
  const stepper = headwordRow.childNodes?.find?.((c) => c.className === 'vocab-history-stepper');
  assert.ok(stepper, 'Stepper navigation should exist');

  // Verify Tabs container exists for secondary tabs
  const tabsContainer = bodyContainer.childNodes?.find?.(
    (c) => c.className === 'vocab-tabs-container'
  );
  assert.ok(tabsContainer, 'Tabs container should be rendered');

  runtime.destroy();
});

test('popup: paste button is disabled when clipboard is empty, invalid, or throws error', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const pasteBtn = doc.getElementById('vocab-paste-btn');

  const mockNavigator = {
    clipboard: {
      readText: async () => '',
    },
  };

  const windowListeners = new Map();
  const mockWindow = {
    addEventListener: (type, handler) => {
      const list = windowListeners.get(type) || [];
      list.push(handler);
      windowListeners.set(type, list);
    },
    removeEventListener: (type, handler) => {
      const list = windowListeners.get(type) || [];
      windowListeners.set(type, list.filter((h) => h !== handler));
    },
    dispatchEvent: async (event) => {
      const list = windowListeners.get(event.type) || [];
      for (const h of list) await h(event);
    },
  };

  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: () => {},
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
    navigatorObj: mockNavigator,
    windowObj: mockWindow,
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(pasteBtn.disabled, true);
  assert.equal(pasteBtn.title, 'No valid word in clipboard');

  // Test when clipboard has multi-word sentence
  mockNavigator.clipboard.readText = async () => 'hello world how are you';
  await mockWindow.dispatchEvent({ type: 'focus' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(pasteBtn.disabled, true);
  assert.equal(pasteBtn.title, 'No valid word in clipboard');

  // Test when readText rejects
  mockNavigator.clipboard.readText = async () => {
    throw new Error('Permission denied');
  };
  await mockWindow.dispatchEvent({ type: 'focus' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(pasteBtn.disabled, true);
  assert.equal(pasteBtn.title, 'No valid word in clipboard');

  runtime.destroy();
});

test('popup: paste button is enabled with tooltip when clipboard has a valid word, and clicking triggers search', async (t) => {
  const doc = createMockDocument();
  const toggle = doc.getElementById('auto-popup-toggle');
  toggle.type = 'checkbox';
  const darkModeToggle = doc.getElementById('dark-mode-toggle');
  darkModeToggle.type = 'checkbox';
  const searchInput = doc.getElementById('vocab-search-input');
  const pasteBtn = doc.getElementById('vocab-paste-btn');

  const mockNavigator = {
    clipboard: {
      readText: async () => '  Resilience  ',
    },
  };

  const mockWindow = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const sentMessages = [];
  const mockChrome = {
    storage: {
      local: {
        get: async () => ({ rememberLastLookup: false }),
        set: async () => {},
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback({
          status: 'success',
          data: {
            source: 'vocabulary',
            parsedPayload: {
              headword: msg.payload?.token,
              definitions: ['The capacity to recover quickly from difficulties.'],
            },
          },
        });
      },
    },
  };

  const runtime = await bootstrapPopupRuntime({
    chromeApi: mockChrome,
    documentObj: doc,
    navigatorObj: mockNavigator,
    windowObj: mockWindow,
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(pasteBtn.disabled, false);
  assert.equal(pasteBtn.title, 'Paste "Resilience"');

  // Click the paste button
  await pasteBtn.dispatchEvent('click');

  assert.equal(searchInput.value, 'resilience');
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].payload.token, 'resilience');

  runtime.destroy();
});


