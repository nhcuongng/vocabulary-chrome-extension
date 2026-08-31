import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createZeroStateElement,
  DEFAULT_MICRO_TIPS,
} from '../../src/popup/popupZeroStateRenderer.js';

function createMockDocument() {
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
      innerHTML: '',
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
          children.push(c);
          c.parentNode = el;
        }
      },
      setAttribute: (k, v) => attrs.set(k, v),
      getAttribute: (k) => attrs.get(k),
      classList: {
        add: (cls) => classListSet.add(cls),
        remove: (cls) => classListSet.delete(cls),
        contains: (cls) => classListSet.has(cls),
        toggle: (cls, force) => {
          if (force !== undefined) {
            if (force) classListSet.add(cls);
            else classListSet.delete(cls);
          } else {
            if (classListSet.has(cls)) classListSet.delete(cls);
            else classListSet.add(cls);
          }
        },
      },
    };
    return el;
  }

  return {
    createElement,
    createTextNode: (text) => ({ textContent: String(text) }),
  };
}

test('popupZeroStateRenderer: renders Quick Review card when historyWords are available', () => {
  const documentObj = createMockDocument();
  let selectedWord = null;
  let shuffleCalled = false;

  const container = createZeroStateElement({
    documentObj,
    historyWords: ['serendipity', 'ephemeral', 'ubiquitous'],
    currentWordIndex: 0,
    onSelectWord: (w) => {
      selectedWord = w;
    },
    onShuffleWord: () => {
      shuffleCalled = true;
    },
  });

  assert.equal(container.className, 'vocab-zero-state');
  const [card, tip] = container.childNodes;
  assert.ok(card.className.includes('vocab-quick-review-card'));
  assert.ok(card.getAttribute('aria-label').includes('serendipity'));

  // Header has badge and shuffle button
  const [headerRow, wordEl, hintEl] = card.childNodes;
  assert.equal(headerRow.className, 'vocab-zero-state-header-row');
  const [badge, shuffleBtn] = headerRow.childNodes;
  assert.equal(badge.textContent, '✨ From Your History');
  assert.equal(shuffleBtn.textContent, '🔀');

  // Trigger shuffle
  shuffleBtn.dispatchEvent('click', { stopPropagation: () => {} });
  assert.equal(shuffleCalled, true);

  // Trigger select word on card click
  assert.equal(wordEl.textContent, 'serendipity');
  card.dispatchEvent('click');
  assert.equal(selectedWord, 'serendipity');

  // Micro-tip is present
  assert.ok(tip.className.includes('vocab-micro-tips-banner'));
  assert.ok(DEFAULT_MICRO_TIPS.includes(tip.textContent));
});

test('popupZeroStateRenderer: renders single history word without shuffle button', () => {
  const documentObj = createMockDocument();

  const container = createZeroStateElement({
    documentObj,
    historyWords: ['unique'],
    currentWordIndex: 0,
  });

  const [card] = container.childNodes;
  const [headerRow] = card.childNodes;
  // When only 1 word, headerRow only has badge, no shuffle button
  assert.equal(headerRow.childNodes.length, 1);
  assert.equal(headerRow.childNodes[0].textContent, '✨ From Your History');
});

test('popupZeroStateRenderer: renders Onboarding card when history is empty', () => {
  const documentObj = createMockDocument();

  const container = createZeroStateElement({
    documentObj,
    historyWords: [],
  });

  const [card, tip] = container.childNodes;
  assert.ok(card.className.includes('vocab-onboarding-card'));

  const [titleEl, descEl, stepsList] = card.childNodes;
  assert.equal(titleEl.textContent, '👋 Your personal vocabulary assistant');
  assert.equal(descEl.textContent, 'Get started in 3 easy steps:');
  assert.equal(stepsList.childNodes.length, 3);

  // Check step items
  assert.ok(stepsList.childNodes[0].textContent.includes('Select any English word'));
  assert.ok(stepsList.childNodes[1].textContent.includes('Search any word in the box above'));
  assert.ok(stepsList.childNodes[2].textContent.includes('Listen to native pronunciation'));

  // Micro-tip is present
  assert.ok(tip.className.includes('vocab-micro-tips-banner'));
});

test('popupZeroStateRenderer: keyboard Enter/Space triggers selection on Quick Review card', () => {
  const documentObj = createMockDocument();
  let selectedWord = null;

  const container = createZeroStateElement({
    documentObj,
    historyWords: ['eloquent'],
    currentWordIndex: 0,
    onSelectWord: (w) => {
      selectedWord = w;
    },
  });

  const [card] = container.childNodes;
  let prevented = false;
  card.dispatchEvent('keydown', {
    key: 'Enter',
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(selectedWord, 'eloquent');
});
