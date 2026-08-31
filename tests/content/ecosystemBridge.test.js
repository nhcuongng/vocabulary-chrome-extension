import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureEcosystemBridgeElement, bootstrapContentRuntime } from '../../src/content/runtimeContentScript.js';

test('ensureEcosystemBridgeElement: creates hidden bridge element with id="vocabulary-lookup" and appends to body', () => {
  const elements = [];
  const mockBody = {
    appendChild(child) {
      elements.push(child);
    },
  };

  const mockDoc = {
    body: mockBody,
    getElementById(id) {
      return elements.find((el) => el.id === id) || null;
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        id: '',
        style: {},
        attributes: {},
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
      };
    },
  };

  const bridge = ensureEcosystemBridgeElement(mockDoc);

  assert.ok(bridge);
  assert.equal(bridge.id, 'vocabulary-lookup');
  assert.equal(bridge.style.display, 'none');
  assert.equal(bridge.attributes['data-extension'], 'vocabulary-lookup');
  assert.equal(elements.length, 1);
  assert.equal(elements[0], bridge);

  // Calling again should return the existing element without duplicate append
  const bridge2 = ensureEcosystemBridgeElement(mockDoc);
  assert.equal(bridge2, bridge);
  assert.equal(elements.length, 1);
});

test('ensureEcosystemBridgeElement: handles null or undefined document safely', () => {
  assert.equal(ensureEcosystemBridgeElement(null), null);
  assert.equal(ensureEcosystemBridgeElement(undefined), null);
});

test('bootstrapContentRuntime: listens to vocabulary-lookup CustomEvent on bridge element', async () => {
  const sentMessages = [];
  const chromeApi = {
    runtime: {
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        callback?.({ status: 'success', data: { headword: 'hello', definitions: ['hi'] } });
      },
      getURL: (p) => `chrome-extension://mock/${p}`,
    },
    storage: {
      local: {
        get: (keys, cb) => cb?.({}),
        set: (items, cb) => cb?.(),
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
  };

  function createElement(tag) {
    const listeners = new Map();
    const children = [];
    const classListSet = new Set();
    const attrs = new Map();

    const el = {
      tagName: tag.toUpperCase(),
      listeners,
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
      querySelector: () => null,
      classList: {
        add: (cls) => classListSet.add(cls),
        remove: (cls) => classListSet.delete(cls),
        contains: (cls) => classListSet.has(cls),
      },
      attachShadow: () => createElement('shadow-root'),
      focus: () => {},
      remove: () => {
        if (el.parentNode) el.parentNode.removeChild(el);
      },
    };
    return el;
  }

  const mockBody = createElement('body');
  const docElements = [mockBody];

  const mockDoc = {
    body: mockBody,
    getElementById(id) {
      if (id === 'vocabulary-lookup') {
        return docElements.find((e) => e.id === 'vocabulary-lookup') || null;
      }
      return null;
    },
    createElement(tag) {
      const el = createElement(tag);
      docElements.push(el);
      return el;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const windowObj = {
    innerWidth: 1000,
    innerHeight: 800,
    getSelection: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  globalThis.__vocabularyExtensionContentRuntimeStarted = false;

  const runtime = await bootstrapContentRuntime({
    chromeApi,
    windowObj,
    documentObj: mockDoc,
  });

  const bridgeEl = mockDoc.getElementById('vocabulary-lookup');
  assert.ok(bridgeEl);
  assert.ok(bridgeEl.listeners.get('vocabulary-lookup')?.length > 0);

  // Simulate Extension B dispatching the CustomEvent
  bridgeEl.dispatchEvent('vocabulary-lookup', {
    detail: {
      word: 'serendipity',
      source: 'cambridge',
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].type, 'LOOKUP_REQUEST');
  assert.equal(sentMessages[0].payload.token, 'serendipity');
  assert.equal(sentMessages[0].payload.source, 'cambridge');

  runtime.dispose();
});
