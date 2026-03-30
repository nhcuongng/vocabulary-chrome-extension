import assert from 'node:assert/strict';
import test from 'node:test';

import { createTriggerIconManager } from '../../src/content/triggerIconManager.js';

function createFakeDocument() {
  const elements = [];
  const listeners = new Map();

  const doc = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        className: '',
        innerHTML: '',
        children: [],
        parentNode: null,
        _shadow: null,
        _listeners: new Map(),
        _attrs: {},
        setAttribute(key, value) {
          el._attrs[key] = value;
        },
        getAttribute(key) {
          return el._attrs[key] ?? null;
        },
        attachShadow({ mode }) {
          el._shadow = {
            mode,
            children: [],
            appendChild(child) {
              this.children.push(child);
            },
          };
          return el._shadow;
        },
        appendChild(child) {
          el.children.push(child);
          child.parentNode = el;
        },
        removeChild(child) {
          const idx = el.children.indexOf(child);
          if (idx >= 0) el.children.splice(idx, 1);
          child.parentNode = null;
        },
        addEventListener(type, handler) {
          const handlers = el._listeners.get(type) ?? [];
          handlers.push(handler);
          el._listeners.set(type, handlers);
        },
        removeEventListener(type, handler) {
          const handlers = el._listeners.get(type) ?? [];
          el._listeners.set(type, handlers.filter((h) => h !== handler));
        },
        contains(target) {
          return el === target || el.children.includes(target);
        },
      };
      elements.push(el);
      return el;
    },
    body: {
      children: [],
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        child.parentNode = null;
      },
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      listeners.set(type, handlers.filter((h) => h !== handler));
    },
    dispatch(type, event = {}) {
      const handlers = listeners.get(type) ?? [];
      for (const handler of handlers) {
        handler({ type, ...event });
      }
    },
    _getListeners: () => listeners,
    _getElements: () => elements,
  };
  return doc;
}

function createFakeWindow() {
  return {
    scrollX: 0,
    scrollY: 0,
    innerWidth: 1024,
    innerHeight: 768,
  };
}

const SAMPLE_RECT = { x: 100, y: 200, width: 50, height: 14, top: 200, left: 100, right: 150, bottom: 214 };

test('triggerIconManager: showIcon inserts host element into DOM with Shadow DOM', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  const clicks = [];

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => clicks.push('click'),
  });

  manager.showIcon(SAMPLE_RECT);

  assert.equal(doc.body.children.length, 1, 'should insert one host element');
  const host = doc.body.children[0];
  assert.ok(host._shadow, 'host should have shadow root');
  assert.equal(host._shadow.mode, 'open');
  assert.equal(host.style.position, 'absolute');
  assert.equal(host.style.zIndex, '2147483647');
  assert.ok(manager.isVisible());
});

test('triggerIconManager: showIcon positions icon near selection end', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);

  const host = doc.body.children[0];
  // Icon should be positioned near the right edge of selection
  const left = parseFloat(host.style.left);
  const top = parseFloat(host.style.top);
  assert.ok(left > 0, 'left should be positive');
  assert.ok(top > 0, 'top should be positive');
});

test('triggerIconManager: shadow DOM button has aria-label for accessibility', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);

  const host = doc.body.children[0];
  const shadow = host._shadow;
  // Find button in shadow children
  const button = shadow.children.find((c) => c.tagName === 'BUTTON');
  assert.ok(button, 'shadow should contain a button');
  assert.equal(button._attrs['aria-label'], 'Look up definition');
});

test('triggerIconManager: removeIcon removes element from DOM and cleans up listeners', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);
  assert.equal(doc.body.children.length, 1);
  assert.ok(manager.isVisible());

  manager.removeIcon();
  assert.equal(doc.body.children.length, 0);
  assert.ok(!manager.isVisible());

  // Keydown listener should be cleaned up
  const keydownListeners = doc._getListeners().get('keydown') ?? [];
  assert.equal(keydownListeners.length, 0, 'keydown listener should be removed');
});

test('triggerIconManager: Escape key dismisses icon', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);
  assert.ok(manager.isVisible());

  // Simulate Escape key
  doc.dispatch('keydown', { key: 'Escape' });
  assert.ok(!manager.isVisible());
});

test('triggerIconManager: showIcon replaces previous icon (no duplicates)', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);
  assert.equal(doc.body.children.length, 1);

  // Show again with different rect
  manager.showIcon({ ...SAMPLE_RECT, x: 300, left: 300, right: 350 });
  assert.equal(doc.body.children.length, 1, 'should replace, not add');
  assert.ok(manager.isVisible());
});

test('triggerIconManager: showIcon with null rect does nothing', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(null);
  assert.equal(doc.body.children.length, 0);
  assert.ok(!manager.isVisible());
});

test('triggerIconManager: stopPropagation on pointer events', () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const manager = createTriggerIconManager({
    documentObj: doc,
    windowObj: win,
    onClick: () => {},
  });

  manager.showIcon(SAMPLE_RECT);

  const host = doc.body.children[0];
  const stoppedEvents = ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown'];

  for (const evtType of stoppedEvents) {
    const handlers = host._listeners.get(evtType) ?? [];
    assert.ok(handlers.length > 0, `should have ${evtType} handler for stopPropagation`);
  }
});
