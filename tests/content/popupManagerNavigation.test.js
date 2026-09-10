import assert from 'node:assert/strict';
import test from 'node:test';

import { createPopupManager, calculateResponsivePopupDimensions } from '../../src/content/popupManager.js';
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
      get textContent() {
        if (this._textContent !== undefined) return this._textContent;
        if (children.length === 0) return '';
        return children.map((c) => (c.textContent != null ? c.textContent : '')).join('');
      },
      set textContent(val) {
        this._textContent = String(val);
      },
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
      insertBefore: (newChild, refChild) => {
        const idx = children.indexOf(refChild);
        if (idx !== -1) {
          children.splice(idx, 0, newChild);
        } else {
          children.push(newChild);
        }
        newChild.parentNode = el;
        return newChild;
      },
      replaceChild: (newChild, oldChild) => {
        const idx = children.indexOf(oldChild);
        if (idx !== -1) {
          children.splice(idx, 1, newChild);
          oldChild.parentNode = null;
          newChild.parentNode = el;
          return oldChild;
        }
        return null;
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
      querySelector: (selector) => {
        const cls = selector.replace(/^\./, '');
        function find(node) {
          if (typeof node.className === 'string' && node.className.split(/\s+/).includes(cls)) return node;
          for (const c of node.childNodes || []) {
            const res = find(c);
            if (res) return res;
          }
          return null;
        }
        return find(el);
      },
      querySelectorAll: (selector) => {
        const results = [];
        const cls = selector.replace(/^\./, '');
        function collect(node) {
          if (typeof node.className === 'string' && node.className.split(/\s+/).includes(cls)) results.push(node);
          for (const c of node.childNodes || []) collect(c);
        }
        for (const c of children) collect(c);
        return results;
      },
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
    listeners,
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

  // 'creative' is a derivative -> normal chip, clicking opens quick preview popover
  assert.equal(familyChips[1].className, 'vocab-family-chip');
  familyChips[1].dispatchEvent('click');
  assert.deepEqual(lookedUpWords, []);

  const afterClickElements = [];
  function collectAll(node) {
    if (!node) return;
    afterClickElements.push(node);
    for (const c of node.childNodes || []) collectAll(c);
  }
  collectAll(container);

  const previewPopover = afterClickElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-quick-preview-popover'));
  assert.ok(previewPopover, 'Quick preview popover should be opened');

  const expandBtn = afterClickElements.find((el) => typeof el.className === 'string' && el.className.includes('expand-btn'));
  assert.ok(expandBtn, 'Expand button should be present in preview popover');

  expandBtn.dispatchEvent('click');
  assert.deepEqual(lookedUpWords, ['creative']);
});

test('popupManager: history menu button toggles popover with recent words and navigates on select', async () => {
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
  // Find history menu button
  const historyBtn = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  assert.ok(historyBtn, 'History menu button should exist');

  // Badge should show 8
  const badge = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-badge'));
  assert.ok(badge);
  assert.equal(badge.childNodes[0]?.textContent || badge.textContent, '8');

  // Click history button to open popover
  historyBtn.dispatchEvent('click');

  elements = getAllElements();
  let popoverItems = elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item'));
  assert.equal(popoverItems.length, 8); // All 8 words in popover list

  // Test closing via header close button [✕]
  const popoverCloseBtn = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-close-btn'));
  assert.ok(popoverCloseBtn, 'Popover close button should exist');

  popoverCloseBtn.dispatchEvent('click', { stopPropagation: () => {} });
  elements = getAllElements();
  assert.equal(elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item')).length, 0);

  // Re-open popover
  historyBtn.dispatchEvent('click');
  elements = getAllElements();
  assert.equal(elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item')).length, 8);

  // Test click-outside: click on popup body
  const bodyEl = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-body'));
  assert.ok(bodyEl);
  container.dispatchEvent('pointerdown', { target: bodyEl });
  elements = getAllElements();
  assert.equal(elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item')).length, 0);

  // Re-open popover
  elements = getAllElements();
  const historyBtn2 = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  historyBtn2.dispatchEvent('click');
  elements = getAllElements();
  assert.equal(elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item')).length, 8);

  // Test Escape key closes popover first
  container.dispatchEvent('keydown', { key: 'Escape', preventDefault: () => {}, stopPropagation: () => {} });
  elements = getAllElements();
  assert.equal(elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item')).length, 0);
  assert.ok(documentObj.body.childNodes.length > 0, 'Popup should remain open after closing popover with Escape');

  // Re-open and select item 'w2' -> passes fromHistory: true
  elements = getAllElements();
  const historyBtn3 = elements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  historyBtn3.dispatchEvent('click');
  elements = getAllElements();
  popoverItems = elements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item'));
  popoverItems[1].dispatchEvent('click');
  assert.deepEqual(lookedUpCalls, [{ word: 'w2', opts: { fromHistory: true } }]);
});

test('popupManager: header bar contains Simple Learn toggle and clicking triggers re-lookup', () => {
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
        source: 'vocabulary',
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

  // 1. Verify Simple Learn toggle switch exists in header bar
  const simpleLearnToggle = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-simple-learn-toggle-wrapper'));
  const simpleLearnSwitch = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-simple-learn-switch'));
  assert.ok(simpleLearnToggle);
  assert.ok(simpleLearnSwitch);

  // 2. Click toggle wrapper to enable Simple Learn
  simpleLearnToggle.dispatchEvent('click', { stopPropagation: () => {} });

  assert.deepEqual(sourceChanges, ['freedictionary']);
  assert.deepEqual(lookedUpCalls, [{ word: 'test', opts: { fromHistory: false, source: 'freedictionary' } }]);
});

test('popupManager: toggling Simple Learn persists setting via settingsAdapter if provided', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpCalls = [];
  const sourceChanges = [];
  const savedSettings = [];

  const settingsAdapter = {
    getSnapshot: () => ({ simpleLearn: false }),
    update: async (patch) => {
      savedSettings.push(patch);
      return patch;
    },
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    settingsAdapter,
    onLookupWord: (word, opts) => lookedUpCalls.push({ word, opts }),
    onSourceChange: (source) => sourceChanges.push(source),
  });

  const state = {
    status: 'success',
    headword: 'resilience',
    data: {
      parsedPayload: {
        headword: 'resilience',
        definitions: ['The capacity to recover quickly from difficulties.'],
        source: 'vocabulary',
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

  const simpleLearnToggle = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-simple-learn-toggle-wrapper'));
  assert.ok(simpleLearnToggle);
  assert.equal(simpleLearnToggle.className.includes('active'), false);

  // Toggle on
  await simpleLearnToggle.dispatchEvent('click', { stopPropagation: () => {} });

  assert.equal(savedSettings.length, 1);
  assert.deepEqual(savedSettings[0], { simpleLearn: true });
  assert.deepEqual(sourceChanges, ['freedictionary']);
  assert.deepEqual(lookedUpCalls, [{ word: 'resilience', opts: { fromHistory: false, source: 'freedictionary' } }]);
});

test('popupManager: render Stress Diagram CTA và click toggle mở card sơ đồ', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
  });

  const state = {
    status: 'success',
    headword: 'photograph',
    data: {
      parsedPayload: {
        headword: 'photograph',
        pronunciation: '/ˈfoʊ.t̬ə.ɡræf/',
        definitions: ['A picture made by a camera.'],
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

  // 1. Verify Rhythm Pill and Card elements exist
  const rhythmPill = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stress-pill'));
  const card = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stress-card'));
  const eqBars = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-eq-bars-container'));

  assert.ok(rhythmPill);
  assert.ok(card);
  assert.ok(eqBars);
  assert.ok(rhythmPill.getAttribute('title')?.includes('Stress on 1st syllable'));
  assert.equal(card.style.display, 'none');

  // 2. Click Rhythm Pill to toggle open
  rhythmPill.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(card.style.display, 'flex');

  // 3. Click Rhythm Pill again to toggle close
  rhythmPill.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(card.style.display, 'none');
});

test('popupManager: header bar drag updates popup position within viewport constraints', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
  });

  const state = {
    status: 'success',
    headword: 'draggable',
    data: {
      parsedPayload: {
        headword: 'draggable',
        pronunciation: '/ˈdræɡ.ə.bəl/',
        definitions: ['Able to be dragged across a screen.'],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  popupEl.offsetLeft = 100;
  popupEl.offsetTop = 128;
  popupEl.offsetWidth = 380;
  popupEl.offsetHeight = 200;

  const container = popupEl._vocabContainer;
  const headerBar = container.childNodes.find((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-header-bar'));
  assert.ok(headerBar, 'Header bar should be rendered');

  // 1. Simulate pointerdown / mousedown on header bar
  headerBar.dispatchEvent('mousedown', {
    button: 0,
    clientX: 150,
    clientY: 130,
    target: headerBar,
    preventDefault: () => {},
    stopPropagation: () => {},
  });

  assert.ok(headerBar.classList.contains('dragging'));

  // 2. Simulate pointermove / mousemove on window (dragging delta +80px X, +50px Y)
  const windowMouseMoveListeners = windowObj.listeners?.get('mousemove') || [];
  for (const fn of windowMouseMoveListeners) {
    fn({
      clientX: 230,
      clientY: 180,
      preventDefault: () => {},
      stopPropagation: () => {},
    });
  }

  assert.equal(popupEl.style.left, '180px');
  assert.equal(popupEl.style.top, '178px');

  // 3. Simulate mouseup to finish drag
  const windowMouseUpListeners = windowObj.listeners?.get('mouseup') || [];
  for (const fn of windowMouseUpListeners) {
    fn({
      preventDefault: () => {},
      stopPropagation: () => {},
    });
  }

  assert.equal(headerBar.classList.contains('dragging'), false);

  // 4. Test that scroll/resize preserves the custom position
  const scrollListeners = windowObj.listeners?.get('scroll') || [];
  for (const fn of scrollListeners) fn({});

  assert.equal(popupEl.style.left, '180px');
  assert.equal(popupEl.style.top, '178px');

  // 5. Test removePopup resets custom position
  popupManager.removePopup();
  assert.equal(documentObj.body.childNodes.length, 0);
});

test('popupManager: clicking interactive header buttons does not trigger drag', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
  });

  const state = {
    status: 'success',
    headword: 'interactive',
    data: {
      parsedPayload: {
        headword: 'interactive',
        pronunciation: '/ˌɪn.təˈræk.tɪv/',
        definitions: ['Involving communication between people.'],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  popupEl.offsetLeft = 100;
  popupEl.offsetTop = 128;
  popupEl.offsetWidth = 380;
  popupEl.offsetHeight = 200;

  const container = popupEl._vocabContainer;
  const headerBar = container.childNodes.find((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-header-bar'));

  // Target is a button element inside header bar
  const fakeButton = {
    tagName: 'BUTTON',
    closest: (sel) => (sel.includes('button') ? fakeButton : null),
  };

  headerBar.dispatchEvent('mousedown', {
    button: 0,
    clientX: 150,
    clientY: 130,
    target: fakeButton,
    preventDefault: () => {},
    stopPropagation: () => {},
  });

  assert.equal(headerBar.classList.contains('dragging'), false);

  popupManager.removePopup();
});

test('popupManager: render Headword mini history stepper [ ‹ 2/3 › ] và navigate chính xác', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const lookedUpWords = [];
  const mockHistory = {
    getRecentSearchWords: () => ['paradox', 'empirical', 'hypothesis'],
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter: mockHistory,
    onLookupWord: (word, opts) => {
      lookedUpWords.push({ word, opts });
    },
  });

  const state = {
    status: 'success',
    headword: 'empirical',
    data: {
      parsedPayload: {
        headword: 'empirical',
        pronunciation: '/ɪmˈpɪr.ɪ.kəl/',
        definitions: ['Based on observation or experiment.'],
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

  // 1. Verify Stepper and Counter exist
  const stepper = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-stepper'));
  const counter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  const prevBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('prev-btn'));
  const nextBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('next-btn'));

  assert.ok(stepper);
  assert.ok(counter);
  assert.equal(counter.childNodes[0]?.textContent || counter.textContent, '2/3');
  assert.equal(prevBtn.getAttribute('disabled'), undefined);
  assert.equal(nextBtn.getAttribute('disabled'), undefined);
  assert.ok(prevBtn.getAttribute('title')?.includes('paradox'));
  assert.ok(nextBtn.getAttribute('title')?.includes('hypothesis'));

  // 2. Click Prev (previous in list: paradox)
  prevBtn.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(lookedUpWords.length, 1);
  assert.equal(lookedUpWords[0].word, 'paradox');
  assert.equal(lookedUpWords[0].opts?.fromHistory, true);

  // 3. Click Next (next in list: hypothesis)
  nextBtn.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(lookedUpWords.length, 2);
  assert.equal(lookedUpWords[1].word, 'hypothesis');
  assert.equal(lookedUpWords[1].opts?.fromHistory, true);

  popupManager.removePopup();
});

test('popupManager: replaces history menu items and stepper when customWords are provided', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpCalls = [];

  const defaultHistory = ['hist1', 'hist2', 'hist3'];
  const mockHistory = {
    getRecentSearchWords: () => defaultHistory,
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter: mockHistory,
    onLookupWord: (word, opts) => {
      lookedUpCalls.push({ word, opts });
    },
  });

  const customWords = ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7'];

  const state = {
    status: 'success',
    headword: 'word1',
    data: {
      parsedPayload: {
        headword: 'word1',
        definitions: ['Def 1'],
      },
    },
  };

  // 1. Show popup with customWords passed in options
  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 }, { customWords });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  function getAll() {
    const list = [];
    function collect(n) {
      if (!n) return;
      list.push(n);
      for (const c of n.childNodes || []) collect(c);
    }
    collect(container);
    return list;
  }

  // 2. History menu badge shows 7 custom words
  let all = getAll();
  const badge = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-badge'));
  assert.ok(badge);
  assert.equal(badge.childNodes[0]?.textContent || badge.textContent, '7');

  // 3. Open history popover
  const historyBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  assert.ok(historyBtn);
  historyBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // 4. Popover contains 7 custom words
  all = getAll();
  let popoverItems = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-popover-item'));
  assert.equal(popoverItems.length, 7);
  assert.equal(popoverItems[0].querySelector('.vocab-history-item-word')?.textContent || popoverItems[0].textContent, 'word1');
  assert.equal(popoverItems[6].querySelector('.vocab-history-item-word')?.textContent || popoverItems[6].textContent, 'word7');

  // 5. Click item 'word6'
  popoverItems[5].dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(lookedUpCalls.length, 1);
  assert.equal(lookedUpCalls[0].word, 'word6');
  assert.equal(lookedUpCalls[0].opts?.fromHistory, true);

  // 6. Stepper shows 1/7 for word1
  const stepperCounter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  assert.ok(stepperCounter);
  assert.equal(stepperCounter.childNodes[0]?.textContent || stepperCounter.textContent, '1/7');

  // 7. Closing popup resets customWords back to default history adapter
  popupManager.removePopup();
  assert.equal(documentObj.body.childNodes.length, 0);

  // Reopen without customWords -> uses defaultHistory
  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });
  const newPopupEl = documentObj.body.childNodes[0];
  const newContainer = newPopupEl._vocabContainer;
  const newAll = [];
  function collectNew(n) {
    if (!n) return;
    newAll.push(n);
    for (const c of n.childNodes || []) collectNew(c);
  }
  collectNew(newContainer);

  const defaultBadge = newAll.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-badge'));
  assert.ok(defaultBadge);
  assert.equal(defaultBadge.childNodes[0]?.textContent || defaultBadge.textContent, '3');

  popupManager.removePopup();
});

test('popupManager: stepper next/prev navigates sequentially through history words', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  let popupManagerInstance = null;

  const words = ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7', 'word8'];
  const mockHistory = {
    getRecentSearchWords: () => words,
  };

  popupManagerInstance = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter: mockHistory,
    onLookupWord: (word, opts) => {
      // Simulate orchestrator loading & updating popup with new word
      popupManagerInstance.showPopup({
        status: 'success',
        headword: word,
        data: {
          parsedPayload: {
            headword: word,
            definitions: [`Definition of ${word}`],
          },
        },
      }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });
    },
  });

  // Start with word5 (index 4)
  popupManagerInstance.showPopup({
    status: 'success',
    headword: 'word5',
    data: {
      parsedPayload: {
        headword: 'word5',
        definitions: ['Definition of word5'],
      },
    },
  }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  function getAll() {
    const list = [];
    function collect(n) {
      if (!n) return;
      list.push(n);
      for (const c of n.childNodes || []) collect(c);
    }
    collect(container);
    return list;
  }

  // Stepper shows 5/8 for word5
  let all = getAll();
  const stepperCounter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  assert.ok(stepperCounter);
  assert.equal(stepperCounter.childNodes[0]?.textContent || stepperCounter.textContent, '5/8');

  // Find Stepper Next Button (›)
  const nextBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('next-btn'));
  assert.ok(nextBtn);

  // Click Next Button: moves from word5 (index 4) to word6 (index 5)
  nextBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Verify stepper counter updated to 6/8
  all = getAll();
  const nextCounter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  assert.equal(nextCounter.childNodes[0]?.textContent || nextCounter.textContent, '6/8');

  // Find Stepper Prev Button (‹)
  const prevBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('prev-btn'));
  assert.ok(prevBtn);

  // Click Prev Button: moves back from word6 (index 5) to word5 (index 4)
  prevBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Verify stepper counter updated back to 5/8
  all = getAll();
  const prevCounter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  assert.equal(prevCounter.childNodes[0]?.textContent || prevCounter.textContent, '5/8');

  popupManagerInstance.removePopup();
});

test('popupManager: selecting item from history popover with mixed casing correctly updates active word and stepper', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  let popupManagerInstance = null;

  const words = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
  const mockHistory = {
    getRecentSearchWords: () => words,
  };

  popupManagerInstance = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter: mockHistory,
    onLookupWord: (word) => {
      popupManagerInstance.showPopup({
        status: 'success',
        headword: word,
        data: {
          parsedPayload: {
            headword: word,
            definitions: [`Definition of ${word}`],
          },
        },
      }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });
    },
  });

  // Start with 'Alpha'
  popupManagerInstance.showPopup({
    status: 'success',
    headword: 'Alpha',
    data: {
      parsedPayload: {
        headword: 'Alpha',
        definitions: ['First letter'],
      },
    },
  }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  function getAll() {
    const list = [];
    function collect(n) {
      if (!n) return;
      list.push(n);
      for (const c of n.childNodes || []) collect(c);
    }
    collect(container);
    return list;
  }

  // Open history popover
  let all = getAll();
  const historyBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  assert.ok(historyBtn);
  historyBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Navigate directly to 'zeta'
  popupManagerInstance.showPopup({
    status: 'success',
    headword: 'zeta',
    data: {
      parsedPayload: {
        headword: 'zeta',
        definitions: ['Sixth letter'],
      },
    },
  }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  all = getAll();
  const stepperCounter = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-stepper-counter'));
  assert.ok(stepperCounter);
  assert.equal(stepperCounter.childNodes[0]?.textContent || stepperCounter.textContent, '6/7');

  popupManagerInstance.removePopup();
});

test('popupManager: removePopup with clearSelection clears text selection ranges', () => {
  const documentObj = createMockDocument();
  let selectionCleared = false;
  const windowObj = {
    ...createMockWindow(),
    getSelection: () => ({
      isCollapsed: false,
      removeAllRanges: () => {
        selectionCleared = true;
      },
    }),
  };

  const store = { vocab_search_history: ['test'] };
  const historyAdapter = createChromeStorageHistoryAdapter({
    storageArea: {
      get: (keys, cb) => cb?.(store),
      set: (items, cb) => cb?.(),
    },
  });

  const popupManagerInstance = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter,
  });

  popupManagerInstance.showPopup({
    status: 'success',
    headword: 'test',
    data: { parsedPayload: { headword: 'test', definitions: ['a test'] } },
  }, { left: 50, top: 50, width: 50, height: 20 });

  popupManagerInstance.removePopup({ clearSelection: true });
  assert.equal(selectionCleared, true);
});

test('calculateResponsivePopupDimensions: tính toán width và height responsive theo các loại màn hình', () => {
  // Mobile 375x667
  const mobile = calculateResponsivePopupDimensions({ width: 375, height: 667 });
  assert.equal(mobile.width, 351); // 375 - 24
  assert.ok(mobile.maxHeight >= 260 && mobile.maxHeight <= 520);
  assert.ok(mobile.minHeight >= 160 && mobile.minHeight <= 220);

  // Very small 320x480
  const small = calculateResponsivePopupDimensions({ width: 320, height: 480 });
  assert.equal(small.width, 296); // 320 - 24
  assert.equal(small.maxHeight, 264); // 480 * 0.55 = 264

  // Tablet 768x1024
  const tablet = calculateResponsivePopupDimensions({ width: 768, height: 1024 });
  assert.ok(tablet.width >= 240 && tablet.width <= 420);
  assert.ok(tablet.maxHeight <= 520);

  // Laptop 1366x768
  const laptop = calculateResponsivePopupDimensions({ width: 1366, height: 768 });
  assert.equal(laptop.width, 420); // clamped to 420
  assert.equal(laptop.maxHeight, 422); // 768 * 0.55

  // Large desktop 1920x1080
  const desktop = calculateResponsivePopupDimensions({ width: 1920, height: 1080 });
  assert.equal(desktop.width, 420); // capped at 420
  assert.equal(desktop.maxHeight, 520); // capped at 520
});

test('popupManager: toggling history menu popover updates in-place and preserves bodyContainer', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

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
    historyAdapter,
  });

  const state = {
    status: 'success',
    headword: 'w1',
    data: {
      parsedPayload: {
        headword: 'w1',
        definitions: ['Stable definition content'],
      },
    },
  };

  popupManager.showPopup(state, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  // Lấy node định nghĩa ban đầu
  const bodyContainer = container.childNodes.find((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-body'));
  assert.ok(bodyContainer, 'Body container should exist');

  // Tìm nút history menu
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

  const historyBtn = getAllElements().find((el) => typeof el.className === 'string' && el.className.includes('vocab-history-menu-btn'));
  assert.ok(historyBtn);

  // Click history button to open popover
  historyBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Kiểm tra bodyContainer vẫn là instance cũ (không bị replaceChildren phá hủy)
  const currentBodyContainer = container.childNodes.find((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-body'));
  assert.equal(currentBodyContainer, bodyContainer, 'Body container must remain stable without being recreated');

  popupManager.removePopup();
});

test('popupManager: loading state renders structured skeleton elements and maintains layout stability', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
  });

  popupManager.showPopup({ status: 'loading' }, { left: 100, top: 100, width: 50, height: 20, bottom: 120, right: 150 });

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;
  assert.ok(container, 'Popup container should exist');

  function getAllElements(root) {
    const all = [];
    function collect(node) {
      if (!node) return;
      all.push(node);
      for (const c of node.childNodes || []) collect(c);
    }
    collect(root);
    return all;
  }

  const allElements = getAllElements(container);
  const skeletonElements = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('skeleton'));
  assert.ok(skeletonElements.length >= 5, 'Should render structured skeleton elements');

  const skeletonDefCards = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('skeleton-def-card'));
  assert.equal(skeletonDefCards.length, 2, 'Should render two skeleton definition cards');

  const skeletonHeadwordRow = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('skeleton-headword-row'));
  assert.equal(skeletonHeadwordRow.length, 1, 'Should render skeleton headword row');

  popupManager.removePopup();
});

test('popupManager: popup container giữ cố định chiều cao height và hỗ trợ cuộn khi nội dung thay đổi', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  windowObj.innerHeight = 768;
  windowObj.innerWidth = 1024;

  const mockHistoryAdapter = {
    getRecentSearchWords: () => ['cat', 'extraordinary'],
    addSearchWord: () => Promise.resolve(),
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    historyAdapter: mockHistoryAdapter,
  });

  popupManager.showPopup(
    {
      status: 'success',
      data: {
        token: 'cat',
        headword: 'cat',
        shortDef: 'A small animal.',
        definitions: [{ partOfSpeech: 'noun', definition: 'A small domesticated carnivorous mammal.' }],
      },
    },
    { left: 100, top: 100, bottom: 120, right: 150 }
  );

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;
  assert.ok(container, 'Popup container should exist');

  // maxHeight for 768px height viewport is min(520, max(260, round(768 * 0.55))) = 422px
  assert.equal(container.style.height, '422px');
  assert.equal(container.style.maxHeight, '422px');

  // Verify footer is rendered
  const footer = container.childNodes.find((node) => typeof node.className === 'string' && node.className.includes('vocab-popup-compliance-footer'));
  assert.ok(footer, 'Footer element should exist in popup container');

  popupManager.removePopup();
});

test('popupManager: Hybrid Tabbed Interface renders Primary Meaning directly and secondary content in Tabs', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
  });

  popupManager.showPopup(
    {
      status: 'success',
      data: {
        token: 'resilient',
        headword: 'resilient',
        pronunciation: 'US /rɪˈzɪl.jənt/',
        definitions: [
          '<div class="vocab-quick-def">Able to recover quickly from difficult conditions.</div>',
          '<details class="vocab-details"><summary><span class="vocab-details-label">Long Definition</span></summary><div class="details-content"><p>Deep dive into resilient history.</p></div></details>',
          '<details class="vocab-details"><summary><span class="vocab-details-label">Adjective (2)</span></summary><div class="details-content"><ol class="custom-definition-list"><li>Springing back</li><li>Rebounding</li></ol></div></details>',
        ],
        wordFamily: [{ word: 'resilience' }, { word: 'resiliently' }],
      },
    },
    { left: 100, top: 100, bottom: 120, right: 150 }
  );

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;
  assert.ok(container, 'Popup container should exist');

  function getAllElements(root) {
    const all = [];
    function collect(node) {
      if (!node) return;
      all.push(node);
      for (const c of node.childNodes || []) collect(c);
    }
    collect(root);
    return all;
  }

  const allElements = getAllElements(container);

  // 1. Verify Primary Meaning is rendered directly
  const quickDefEls = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-popup-definition'));
  assert.ok(quickDefEls.length >= 1, 'Quick def container should be rendered directly');
  const quickDefHtml = quickDefEls.map((el) => el.innerHTML).join(' ');
  assert.ok(quickDefHtml.includes('Able to recover quickly'), 'Quick def text should be present in top stream');

  // 2. Verify Tab Bar and Tab Buttons exist
  const tabBars = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-tab-bar'));
  assert.equal(tabBars.length, 1, 'Should have exactly 1 tab bar');

  const tabBtns = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-tab-btn'));
  assert.ok(tabBtns.length >= 3, 'Should have at least 3 tabs: Explanation, Adjective, Word Family');

  const tabLabels = tabBtns.map((b) => b.childNodes.map((c) => c?.textContent || '').join(' '));
  assert.ok(tabLabels.some((l) => l.includes('Explanation')), 'Should contain Explanation tab');
  assert.ok(tabLabels.some((l) => l.includes('Adjective')), 'Should contain Adjective tab');
  assert.ok(tabLabels.some((l) => l.includes('Word Family')), 'Should contain Word Family tab');

  // Verify reorder button exists
  const reorderBtns = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-tab-reorder-btn'));
  assert.equal(reorderBtns.length, 1, 'Should have 1 tab reorder button');

  // 3. Verify Active Tab Panel switching
  const tabPanels = allElements.filter((el) => typeof el.className === 'string' && el.className.split(' ').includes('vocab-tab-panel'));
  assert.equal(tabPanels.length, tabBtns.length, 'Panel count must match button count');
  assert.ok(tabPanels[0].className.includes('active'), 'First tab panel should be active by default');

  popupManager.removePopup();
});

test('popupManager: clicking customize button opens modal with drag handles, eye toggles, save and reset buttons', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();

  let savedSettings = null;
  const mockSettingsAdapter = {
    getSnapshot: () => ({ tabOrderPreference: [], hiddenTabsPreference: [] }),
    update: async (patch) => {
      savedSettings = patch;
    },
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    settingsAdapter: mockSettingsAdapter,
  });

  popupManager.showPopup(
    {
      status: 'success',
      data: {
        token: 'resilient',
        headword: 'resilient',
        definitions: [
          '<details class="vocab-details"><summary><span class="vocab-details-label">Long Definition</span></summary><div class="details-content">Explanation text</div></details>',
          '<details class="vocab-details"><summary><span class="vocab-details-label">Adjective (2)</span></summary><div class="details-content">Adjective defs</div></details>',
        ],
        wordFamily: [{ word: 'resilience' }],
      },
    },
    { left: 100, top: 100, bottom: 120, right: 150 }
  );

  const popupEl = documentObj.body.childNodes[0];
  const container = popupEl._vocabContainer;

  function getAllElements(root) {
    const all = [];
    function collect(node) {
      if (!node) return;
      all.push(node);
      for (const c of node.childNodes || []) collect(c);
    }
    collect(root);
    return all;
  }

  let allElements = getAllElements(container);
  const reorderBtn = allElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tab-reorder-btn'));
  assert.ok(reorderBtn, 'Customize tab button should be present');

  // Trigger click on customize button to open modal
  reorderBtn.dispatchEvent('click');

  allElements = getAllElements(container);
  const modal = allElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal'));
  assert.ok(modal, 'Modal should be opened');

  const modalAllElements = getAllElements(modal);
  const modalItems = modalAllElements.filter((el) => typeof el.className === 'string' && el.className.split(/\s+/).includes('vocab-tabs-modal-item'));
  assert.ok(modalItems.length >= 3, 'Modal should list all tabs');

  const eyeBtns = modalAllElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-eye-btn'));
  assert.equal(eyeBtns.length, modalItems.length, 'Each modal item should have an eye button');

  const resetBtn = modalAllElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-reset-btn'));
  assert.ok(resetBtn, 'Reset to default button should be present');

  const saveBtn = modalAllElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-save-btn'));
  assert.ok(saveBtn, 'Save button should be present');

  // Click eye button on the second item to hide it
  allElements = getAllElements(container);
  const currentEyeBtns = allElements.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-eye-btn'));
  currentEyeBtns[1].dispatchEvent('click');

  // Save changes
  allElements = getAllElements(container);
  const currentSaveBtn = allElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-save-btn'));
  currentSaveBtn.dispatchEvent('click');

  assert.ok(savedSettings, 'Settings should be saved');
  assert.ok(savedSettings.hiddenTabsPreference.length > 0, 'Hidden tabs preference should be saved');

  // Modal should be closed
  allElements = getAllElements(container);
  const closedModal = allElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal'));
  assert.equal(closedModal, undefined, 'Modal should be closed after saving');

  // Open modal again and test reset to default
  reorderBtn.dispatchEvent('click');
  allElements = getAllElements(container);
  const resetBtn2 = allElements.find((el) => typeof el.className === 'string' && el.className.includes('vocab-tabs-modal-reset-btn'));
  resetBtn2.dispatchEvent('click');

  assert.deepEqual(savedSettings.hiddenTabsPreference, [], 'Reset button should clear hidden tabs');
  assert.deepEqual(savedSettings.tabOrderPreference, [], 'Reset button should clear custom tab order');

  popupManager.removePopup();
});
