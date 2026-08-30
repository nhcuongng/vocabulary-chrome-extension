import assert from 'node:assert/strict';
import test from 'node:test';

import { createPopupManager } from '../../src/content/popupManager.js';
import { createChromeStorageHistoryAdapter } from '../../src/infrastructure/adapters/chromeStorageHistoryAdapter.js';

function createMockDocument() {
  const elements = [];

  function createElement(tag) {
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
      tabIndex: -1,
      innerHTML: '',
      textContent: '',
      value: '',
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
      removeChild: (child) => {
        const idx = children.indexOf(child);
        if (idx !== -1) children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      replaceChildren: (...newChildren) => {
        children.length = 0;
        for (const c of newChildren) {
          children.push(c);
          c.parentNode = el;
        }
      },
      setAttribute: (k, v) => attrs.set(k, v),
      getAttribute: (k) => attrs.get(k),
      contains: (target) => target === el || children.some((c) => c.contains?.(target)),
      querySelectorAll: () => [],
      classList: {
        add: (cls) => classListSet.add(cls),
        remove: (cls) => classListSet.delete(cls),
        contains: (cls) => classListSet.has(cls),
      },
      attachShadow: () => {
        const shadowRoot = createElement('shadow-root');
        return shadowRoot;
      },
      focus: () => {},
    };
    elements.push(el);
    return el;
  }

  const body = createElement('body');
  const docListeners = new Map();

  return {
    createElement,
    createTextNode: (text) => ({ textContent: text }),
    body,
    addEventListener: (type, handler) => {
      const list = docListeners.get(type) || [];
      list.push(handler);
      docListeners.set(type, list);
    },
    removeEventListener: (type, handler) => {
      const list = docListeners.get(type) || [];
      docListeners.set(type, list.filter((h) => h !== handler));
    },
  };
}

function createMockWindow() {
  const listeners = new Map();
  return {
    scrollX: 0,
    scrollY: 0,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: (type, handler) => {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((h) => h !== handler));
    },
  };
}

test('popupManager: showPopup renders header bar and navigation without error', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpWords = [];

  const store = { vocab_search_history: ['hello', 'world'] };
  const historyAdapter = createChromeStorageHistoryAdapter({
    storageArea: {
      get: async (k) => ({ [k]: store[k] }),
      set: async (p) => Object.assign(store, p),
    },
  });

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: (word, opts) => lookedUpWords.push({ word, opts }),
    historyAdapter,
  });

  const state = {
    status: 'success',
    headword: 'create',
    data: {
      parsedPayload: {
        headword: 'create',
        pronunciation: '/kriˈeɪt/',
        definitions: ['To make something'],
        wordFamily: [{ word: 'created' }, { word: 'creative' }],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });
  assert.equal(documentObj.body.childNodes.length, 1);

  popupManager.removePopup();
  assert.equal(documentObj.body.childNodes.length, 0);
});

test('popupManager: clicking word family chip triggers onLookupWord', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpWords = [];

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: (word) => lookedUpWords.push(word),
  });

  const state = {
    status: 'success',
    headword: 'create',
    data: {
      parsedPayload: {
        headword: 'create',
        pronunciation: '/kriˈeɪt/',
        definitions: ['To make something'],
        wordFamily: [{ word: 'created' }, { word: 'creative' }],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  const allCreated = [];
  function collect(node) {
    if (!node) return;
    allCreated.push(node);
    for (const c of node.childNodes || []) collect(c);
  }
  collect(container);

  const familyChips = allCreated.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-family-chip'));
  assert.equal(familyChips.length, 2);

  // 'created' is an inflected form -> has disabled-inflection class, clicking does not trigger lookup
  assert.ok(familyChips[0].className.includes('disabled-inflection'));
  familyChips[0].dispatchEvent('click');
  assert.deepEqual(lookedUpWords, []);

  // 'creative' is a derivative -> normal chip, clicking triggers lookup
  assert.equal(familyChips[1].className, 'vocab-family-chip');
  familyChips[1].dispatchEvent('click');
  assert.deepEqual(lookedUpWords, ['creative']);
});

test('popupManager: history slide displays 5 words per page and paginates with prev/next buttons', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpCalls = [];

  const words = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'];
  const store = { vocab_search_history: words };
  const historyAdapter = createChromeStorageHistoryAdapter({
    storageArea: {
      get: async (k) => ({ [k]: store[k] }),
      set: async (p) => Object.assign(store, p),
    },
  });
  await historyAdapter.load();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: (word, opts) => lookedUpCalls.push({ word, opts }),
    historyAdapter,
  });

  const state = {
    status: 'success',
    headword: 'w1',
    data: {
      parsedPayload: {
        headword: 'w1',
        definitions: ['Def 1'],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  function getAllElements() {
    const all = [];
    function collect(node) {
      if (!node) return;
      all.push(node);
      for (const c of node.childNodes || []) collect(c);
    }
    collect(container);
    return all;
  }

  let elements = getAllElements();
  let chips = elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 5); // 5 words in first slide

  // Click on chip 'w2' -> passes fromHistory: true
  chips[1].dispatchEvent('click');
  assert.deepEqual(lookedUpCalls, [{ word: 'w2', opts: { fromHistory: true } }]);

  // Find next slide button
  const slideNavBtns = elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-slide-nav-btn'));
  assert.equal(slideNavBtns.length, 2);
  const nextBtn = slideNavBtns[1];

  // Click next slide button
  nextBtn.dispatchEvent('click');

  elements = getAllElements();
  chips = elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 3); // Remaining 3 words in second slide ('w6', 'w7', 'w8')
});

test('popupManager: header bar contains source menu icon button and clicking opens vertical popover to switch source', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpCalls = [];
  const sourceChanges = [];

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: (word, opts) => lookedUpCalls.push({ word, opts }),
    onSourceChange: (source) => sourceChanges.push(source),
  });

  const state = {
    status: 'success',
    headword: 'test',
    data: {
      parsedPayload: {
        headword: 'test',
        definitions: ['Def 1'],
        source: 'auto',
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  const all = [];
  function collect(node) {
    if (!node) return;
    all.push(node);
    for (const c of node.childNodes || []) collect(c);
  }
  collect(container);

  // 1. Verify source menu button exists next to close button
  const sourceBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-source-menu-btn'));
  assert.ok(sourceBtn);

  // 2. Verify vertical popover menu items exist
  const menuItems = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-source-menu-item'));
  assert.equal(menuItems.length, 4);

  // 3. Find Cambridge menu option and click it
  const cambridgeOption = menuItems.find((el) => el.getAttribute('data-source') === 'cambridge');
  assert.ok(cambridgeOption);

  cambridgeOption.dispatchEvent('click');

  assert.deepEqual(sourceChanges, ['cambridge']);
  assert.deepEqual(lookedUpCalls, [{ word: 'test', opts: { fromHistory: false, source: 'cambridge' } }]);
});
