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
    onLookupWord: (word) => lookedUpWords.push(word),
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

  // Find family chip in popup elements
  const popupEl = documentObj.body.childNodes[0];
  const shadow = popupEl._vocabShadow;
  const container = popupEl._vocabContainer;

  // Find created chip in elements
  const allCreated = [];
  function collect(node) {
    if (!node) return;
    allCreated.push(node);
    for (const c of node.childNodes || []) collect(c);
  }
  collect(container);

  const familyChips = allCreated.filter((el) => el.className === 'vocab-family-chip');
  assert.equal(familyChips.length, 2);

  // Click on 'created'
  familyChips[0].dispatchEvent('click');
  assert.deepEqual(lookedUpWords, ['created']);

  // Click on 'creative'
  familyChips[1].dispatchEvent('click');
  assert.deepEqual(lookedUpWords, ['created', 'creative']);
});

