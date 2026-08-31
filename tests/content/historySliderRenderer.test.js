import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHistorySliderElement,
  UI_COPY,
} from '../../src/content/historySliderRenderer.js';

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
      },
    };
    return el;
  }

  return {
    createElement,
    createTextNode: (text) => ({ textContent: text }),
  };
}

test('historySliderRenderer: renders empty slide when allWords is empty', () => {
  const documentObj = createMockDocument();
  const slider = createHistorySliderElement({
    documentObj,
    allWords: [],
  });

  assert.equal(slider.childNodes.length, 1);
  assert.equal(slider.childNodes[0].className, 'vocab-history-slide');
  assert.equal(slider.childNodes[0].childNodes.length, 0);
});

test('historySliderRenderer: renders 5 chips per slide and enables/disables pagination buttons', () => {
  const documentObj = createMockDocument();
  const words = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];
  let selectedWord = null;
  let changedSlide = null;

  const slider = createHistorySliderElement({
    documentObj,
    allWords: words,
    currentWord: 'w2',
    currentSlideIndex: 0,
    itemsPerPage: 5,
    onSelectWord: (w) => { selectedWord = w; },
    onSlideChange: (idx) => { changedSlide = idx; },
  });

  // Slider has 3 children: prevBtn, slideContainer, nextBtn
  assert.equal(slider.childNodes.length, 3);
  const [prevBtn, slideContainer, nextBtn] = slider.childNodes;

  assert.equal(prevBtn.getAttribute('disabled'), '');
  assert.equal(prevBtn.getAttribute('title'), UI_COPY.PREV_SLIDE);

  assert.equal(slideContainer.childNodes.length, 5);
  assert.ok(slideContainer.childNodes[1].className.includes('active')); // w2 is active
  assert.equal(slideContainer.childNodes[0].textContent, 'w1');

  // Clicking chip triggers onSelectWord
  slideContainer.childNodes[0].dispatchEvent('click');
  assert.equal(selectedWord, 'w1');

  // Clicking next button triggers onSlideChange(1)
  nextBtn.dispatchEvent('click');
  assert.equal(changedSlide, 1);
});

test('historySliderRenderer: slideContainer handles wheel event for horizontal scrolling', () => {
  const documentObj = createMockDocument();
  const words = ['w1', 'w2', 'w3'];

  const slider = createHistorySliderElement({
    documentObj,
    allWords: words,
  });

  const [, slideContainer] = slider.childNodes;
  let prevented = false;
  let scrolledBy = null;

  slideContainer.scrollBy = (opts) => {
    scrolledBy = opts;
  };

  slideContainer.dispatchEvent('wheel', {
    deltaY: 50,
    deltaX: 0,
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.deepEqual(scrolledBy, { left: 50, behavior: 'auto' });
});

