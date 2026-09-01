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

test('popupManager: popover hiển thị danh sách auto priority draggable và hỗ trợ kéo thả reorder', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const lookedUpCalls = [];
  const savedSettings = [];

  const settingsAdapter = {
    getSnapshot: () => ({ dictionarySource: 'auto', autoSourceOrder: ['vocabulary', 'freedictionary', 'cambridge'] }),
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

  // 1. Verify auto-order section is hidden by default and config button exists
  const autoOrderSection = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-auto-order-section'));
  const autoConfigBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('vocab-auto-config-btn'));
  assert.ok(autoOrderSection);
  assert.ok(autoConfigBtn);
  assert.equal(autoOrderSection.style.display, 'none');

  // Toggle open auto order section via gear button
  autoConfigBtn.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(autoOrderSection.style.display, 'flex');

  // 2. Verify auto-order-item elements exist (3 sources)
  const orderItems = all.filter((el) => typeof el.className === 'string' && el.className.split(' ').includes('vocab-auto-order-item'));
  assert.equal(orderItems.length, 3);
  assert.equal(orderItems[0].getAttribute('data-source-id'), 'vocabulary');
  assert.equal(orderItems[1].getAttribute('data-source-id'), 'freedictionary');
  assert.equal(orderItems[2].getAttribute('data-source-id'), 'cambridge');

  // 3. Simulate dragstart on Cambridge (item 2)
  const dragStartEvent = {
    stopPropagation: () => {},
    dataTransfer: {
      setData: () => {},
      effectAllowed: '',
    },
  };
  orderItems[2].dispatchEvent('dragstart', dragStartEvent);

  // 4. Simulate drop on Vocabulary (item 0)
  const dropEvent = {
    preventDefault: () => {},
    stopPropagation: () => {},
    dataTransfer: {
      getData: () => 'cambridge',
    },
  };
  await orderItems[0].dispatchEvent('drop', dropEvent);

  // 5. Verify settings update called with reordered autoSourceOrder
  assert.equal(savedSettings.length, 1);
  assert.deepEqual(savedSettings[0].autoSourceOrder, ['cambridge', 'vocabulary', 'freedictionary']);
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

test('popupManager: replaces history slide bar and stepper when customWords are provided', () => {
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

  // 2. Slide 0 contains first 5 custom words
  let all = getAll();
  let chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 5);
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'word1');
  assert.equal(chips[4].childNodes[0]?.textContent || chips[4].textContent, 'word5');

  // 3. Next slide navigation
  const slideNavBtns = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-slide-nav-btn'));
  assert.equal(slideNavBtns.length, 2);
  const nextSlideBtn = slideNavBtns[1];
  nextSlideBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // 4. Slide 1 contains remaining 2 custom words ('word6', 'word7')
  all = getAll();
  chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 2);
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'word6');
  assert.equal(chips[1].childNodes[0]?.textContent || chips[1].textContent, 'word7');

  // 5. Click chip 'word6'
  chips[0].dispatchEvent('click', { stopPropagation: () => {} });
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

  const defaultChips = newAll.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(defaultChips.length, 3);
  assert.equal(defaultChips[0].childNodes[0]?.textContent || defaultChips[0].textContent, 'hist1');

  popupManager.removePopup();
});

test('popupManager: stepper next/prev across slide boundary automatically updates currentSlideIndex', async () => {
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

  // Start with word5 (index 4 -> Slide 0)
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

  // Verify slide 0 is displayed (words 1 to 5)
  let all = getAll();
  let chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 5);
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'word1');
  assert.equal(chips[4].childNodes[0]?.textContent || chips[4].textContent, 'word5');

  // Find Stepper Next Button (›)
  const nextBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('next-btn'));
  assert.ok(nextBtn);

  // Click Next Button: moves from word5 (index 4) to word6 (index 5 -> Slide 1)
  nextBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Verify slide automatically switched to Slide 1 (words 6 to 8)
  all = getAll();
  chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 3);
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'word6');
  assert.equal(chips[2].childNodes[0]?.textContent || chips[2].textContent, 'word8');

  // Find Stepper Prev Button (‹)
  const prevBtn = all.find((el) => typeof el.className === 'string' && el.className.includes('prev-btn'));
  assert.ok(prevBtn);

  // Click Prev Button: moves back from word6 (index 5) to word5 (index 4 -> Slide 0)
  prevBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Verify slide automatically switched back to Slide 0 (words 1 to 5)
  all = getAll();
  chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 5);
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'word1');

  popupManagerInstance.removePopup();
});

test('popupManager: selecting chip on another slide or with mixed casing correctly syncs slide', () => {
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

  // Start with 'Alpha' (Slide 0)
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

  // Navigate directly to 'zeta' (which is on slide 1, index 5)
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

  let all = getAll();
  let chips = all.filter((el) => typeof el.className === 'string' && el.className.includes('vocab-history-chip'));
  assert.equal(chips.length, 2); // Slide 1 contains 'Zeta', 'Eta'
  assert.equal(chips[0].childNodes[0]?.textContent || chips[0].textContent, 'Zeta');

  popupManagerInstance.removePopup();
});
