import assert from 'node:assert/strict';
import test from 'node:test';

import { renderDictionaryContentView } from '../../src/presentation/dictionaryContentView.js';
import { defaultVisualImageSearchAdapter } from '../../src/infrastructure/adapters/visualImageSearchAdapter.js';

function createMockElement(tagName = 'DIV', props = {}) {
  const listeners = new Map();
  const children = [];
  const attributes = new Map();

  const el = {
    tagName: tagName.toUpperCase(),
    style: {},
    className: props.className || '',
    parentNode: null,
    childNodes: children,
    attributes,
    innerHTML: props.innerHTML || '',
    _textContent: undefined,
    get textContent() {
      if (this._textContent !== undefined) return this._textContent;
      if (children.length === 0) return '';
      return children.map((c) => (c.textContent != null ? c.textContent : '')).join('');
    },
    set textContent(val) {
      this._textContent = String(val);
    },
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((h) => h !== handler));
    },
    dispatchEvent(type, event = {}) {
      const list = listeners.get(type) || [];
      for (const h of list) h(event);
    },
    setAttribute(key, val) {
      attributes.set(key, val);
    },
    getAttribute(key) {
      return attributes.get(key);
    },
    appendChild(child) {
      children.push(child);
      child.parentNode = el;
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },
    replaceChildren(...newChildren) {
      children.forEach((c) => {
        c.parentNode = null;
      });
      children.length = 0;
      newChildren.forEach((nc) => {
        if (nc != null) {
          children.push(nc);
          nc.parentNode = el;
        }
      });
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const matched = [];
      const match = (node) => {
        if (!node || !node.tagName) return;
        const sel = selector.trim();
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          if (node.className && node.className.split(/\s+/).includes(cls)) {
            matched.push(node);
          }
        } else if (sel.startsWith('#')) {
          if (node.id === sel.slice(1)) matched.push(node);
        } else if (node.tagName.toLowerCase() === sel.toLowerCase()) {
          matched.push(node);
        }
        for (const c of node.childNodes || []) {
          match(c);
        }
      };
      for (const c of children) {
        match(c);
      }
      return matched;
    },
  };

  return el;
}

function createMockDocument() {
  return {
    createElement: (tag, props) => createMockElement(tag, props),
    createTextNode: (text) => ({ textContent: text }),
  };
}

test('visualContextImages: renders Illustrations tab in dictionary view when status is success', async () => {
  const doc = createMockDocument();
  const container = createMockElement('DIV');

  const mockPayload = {
    status: 'success',
    data: {
      source: 'vocabulary',
      parsedPayload: {
        headword: 'blossom',
        pronunciation: 'US /ˈblɑː.səm/',
        definitions: [
          '<div class="vocab-quick-def"><p>A flower or a mass of flowers.</p></div>',
        ],
      },
    },
  };

  renderDictionaryContentView({
    state: mockPayload,
    container,
    documentObj: doc,
  });

  const tabBtns = container.querySelectorAll('.vocab-tab-btn');
  const labels = tabBtns.map((b) => b.textContent);
  assert.ok(labels.some((l) => l.includes('Illustrations')), 'Should contain Illustrations tab');
});

test('visualContextImages: activating Illustrations tab sends message to service worker and renders grid with source tag', async () => {
  const doc = createMockDocument();
  const container = createMockElement('DIV');

  const mockChrome = {
    runtime: {
      sendMessage: (message, callback) => {
        assert.equal(message.type, 'LOOKUP_VISUAL_IMAGES');
        assert.equal(message.payload.keyword, 'blossom');
        callback({
          status: 'success',
          data: {
            source: 'duckduckgo',
            images: [
              {
                id: 'ddg-1',
                title: 'Apple Blossom in Spring',
                thumbUrl: 'https://example.com/blossom_thumb.jpg',
                fullUrl: 'https://example.com/blossom_full.jpg',
                sourceUrl: 'https://example.com/source',
              },
            ],
          },
        });
      },
    },
  };

  const mockPayload = {
    status: 'success',
    data: {
      source: 'vocabulary',
      parsedPayload: {
        headword: 'blossom',
        definitions: [
          '<div class="vocab-quick-def"><p>A flower.</p></div>',
        ],
      },
    },
  };

  renderDictionaryContentView({
    state: mockPayload,
    container,
    documentObj: doc,
    chromeApi: mockChrome,
  });

  const tabBtns = container.querySelectorAll('.vocab-tab-btn');
  const illustrationsTabBtn = tabBtns.find((b) => b.textContent.includes('Illustrations'));
  assert.ok(illustrationsTabBtn, 'Illustrations tab button should exist');

  // Trigger click on Illustrations tab
  illustrationsTabBtn.dispatchEvent('click', { stopPropagation: () => {} });

  // Allow microtasks to resolve
  await new Promise((r) => setTimeout(r, 10));

  const imageCards = container.querySelectorAll('.vocab-image-card');
  assert.equal(imageCards.length, 1);
  const caption = container.querySelector('.vocab-image-caption');
  assert.equal(caption?.textContent, 'Apple Blossom in Spring');
  const sourceTag = container.querySelector('.vocab-image-source-tag');
  assert.equal(sourceTag?.textContent, 'via DuckDuckGo');
});

test('visualContextImages: renders empty state when no images are found from service worker', async () => {
  const doc = createMockDocument();
  const container = createMockElement('DIV');

  const mockChrome = {
    runtime: {
      sendMessage: (message, callback) => {
        callback({
          status: 'success',
          data: {
            source: 'duckduckgo',
            images: [],
          },
        });
      },
    },
  };

  const mockPayload = {
    status: 'success',
    data: {
      source: 'vocabulary',
      parsedPayload: {
        headword: 'abstractconcept',
        definitions: [
          '<div class="vocab-quick-def"><p>An abstract idea.</p></div>',
        ],
      },
    },
  };

  renderDictionaryContentView({
    state: mockPayload,
    container,
    documentObj: doc,
    chromeApi: mockChrome,
  });

  const tabBtns = container.querySelectorAll('.vocab-tab-btn');
  const illustrationsTabBtn = tabBtns.find((b) => b.textContent.includes('Illustrations'));
  illustrationsTabBtn.dispatchEvent('click', { stopPropagation: () => {} });

  await new Promise((r) => setTimeout(r, 10));

  const emptyState = container.querySelector('.vocab-image-empty-state');
  assert.ok(emptyState, 'Should render empty state');
  assert.ok(emptyState.textContent.includes('No visual images found'));
});
