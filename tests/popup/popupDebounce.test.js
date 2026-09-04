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
    dispatchEvent: (type, event = {}) => {
      const list = listeners.get(type) || [];
      for (const h of list) h(event);
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

test('popup: clicking source item performs search for current word without changing default setting; clicking star button updates default setting', async () => {
  const doc = createMockDocument();
  const searchInput = doc.getElementById('vocab-search-input');
  searchInput.value = 'galaxy';

  const sourceMenuPopover = doc.getElementById('vocab-source-menu-popover');
  const starBtnAuto = createMockElement('button');
  starBtnAuto.className = 'vocab-source-star-btn is-default';
  starBtnAuto.setAttribute('data-source', 'auto');

  const starBtnCambridge = createMockElement('button');
  starBtnCambridge.className = 'vocab-source-star-btn';
  starBtnCambridge.setAttribute('data-source', 'cambridge');

  const itemAuto = createMockElement('div');
  itemAuto.className = 'vocab-source-menu-item active';
  itemAuto.setAttribute('data-source', 'auto');

  const itemCambridge = createMockElement('button');
  itemCambridge.className = 'vocab-source-menu-item';
  itemCambridge.setAttribute('data-source', 'cambridge');

  sourceMenuPopover.querySelectorAll = (selector) => {
    if (selector.includes('.vocab-source-star-btn')) {
      return [starBtnAuto, starBtnCambridge];
    }
    if (selector.includes('.vocab-source-menu-item')) {
      return [itemAuto, itemCambridge];
    }
    return [];
  };

  doc.querySelectorAll = (selector) => {
    if (selector.includes('.vocab-source-star-btn')) {
      return [starBtnAuto, starBtnCambridge];
    }
    if (selector.includes('.vocab-source-menu-item')) {
      return [itemAuto, itemCambridge];
    }
    return [];
  };

  const storedSettings = { dictionarySource: 'auto', rememberLastLookup: false };
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

  // 1. Click Cambridge source row -> runs search with source 'cambridge', but does NOT save to settings store
  await itemCambridge.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].payload.source, 'cambridge');
  assert.equal(sentMessages[0].payload.token, 'galaxy');
  assert.equal(savedSettings.length, 0); // Not saved to persistent settings!

  // 2. Click Cambridge star button -> saves { dictionarySource: 'cambridge' } to settings store
  await starBtnCambridge.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0]['user-settings']?.dictionarySource, 'cambridge');

  runtime.destroy();
});
