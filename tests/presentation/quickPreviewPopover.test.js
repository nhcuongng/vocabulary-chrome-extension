import assert from 'node:assert/strict';
import test from 'node:test';

import {
  showQuickPreviewPopover,
  extractUnwrappedDefinition,
  expandSVG,
  closeSVG,
  speakerSVG,
} from '../../src/presentation/quickPreviewPopover.js';

function createMockElement(tagName = 'DIV', props = {}) {
  const listeners = new Map();
  const children = [];
  const el = {
    tagName: tagName.toUpperCase(),
    style: {},
    className: props.className || '',
    parentNode: null,
    childNodes: children,
    attributes: new Map(),
    innerHTML: props.innerHTML || '',
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
      this.attributes.set(key, val);
    },
    getAttribute(key) {
      return this.attributes.get(key);
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
      children.length = 0;
      for (const c of newChildren) {
        if (c) this.appendChild(c);
      }
    },
    contains(target) {
      if (target === el) return true;
      for (const c of children) {
        if (c.contains && c.contains(target)) return true;
      }
      return false;
    },
    getBoundingClientRect() {
      return { top: 100, bottom: 120, left: 50, right: 100, width: 50, height: 20 };
    },
    offsetWidth: 250,
    offsetHeight: 80,
  };
  return el;
}

function createMockDocument() {
  return {
    createElement: (tag) => createMockElement(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
  };
}

function createMockWindow() {
  const windowListeners = new Map();
  return {
    addEventListener: (type, handler) => {
      const list = windowListeners.get(type) || [];
      list.push(handler);
      windowListeners.set(type, list);
    },
    removeEventListener: (type, handler) => {
      const list = windowListeners.get(type) || [];
      windowListeners.set(type, list.filter((h) => h !== handler));
    },
    dispatchEvent: (type, event = {}) => {
      const list = windowListeners.get(type) || [];
      for (const h of list) h(event);
    },
  };
}

function collectDescendants(node, out = []) {
  if (!node) return out;
  out.push(node);
  for (const c of node.childNodes || []) {
    collectDescendants(c, out);
  }
  return out;
}

test('quickPreviewPopover: opens popover with loading state and action buttons', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON', { className: 'vocab-synonym-chip' });
  container.appendChild(targetChip);

  const mockLookupExecutor = async (word) => {
    return {
      status: 'success',
      data: {
        parsedPayload: {
          headword: word,
          pronunciation: '/əˈbændən/',
          definitions: ['To leave completely and never return'],
          audio: { us: 'https://example.com/audio.mp3' },
        },
      },
    };
  };

  const expandedWords = [];
  const preview = showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'abandon',
    container,
    documentObj,
    windowObj,
    lookupExecutor: mockLookupExecutor,
    onExpand: (w) => expandedWords.push(w),
  });

  assert.ok(preview);
  assert.ok(container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));

  const nodes = collectDescendants(container);
  const titleEl = nodes.find((n) => n.className === 'vocab-quick-preview-title');
  assert.equal(titleEl?.textContent, 'abandon');

  const expandBtn = nodes.find((n) => n.className?.includes('expand-btn'));
  assert.ok(expandBtn);
  assert.equal(expandBtn.getAttribute('title'), 'Expand to full view');

  const closeBtn = nodes.find((n) => n.className?.includes('close-btn'));
  assert.ok(closeBtn);
  assert.equal(closeBtn.getAttribute('title'), 'Close preview');

  // Wait for async lookup resolution
  await new Promise((r) => setTimeout(r, 10));

  const afterFetchNodes = collectDescendants(container);
  const ipaEl = afterFetchNodes.find((n) => n.className === 'vocab-quick-preview-ipa');
  assert.equal(ipaEl?.textContent, '/əˈbændən/');

  const defEl = afterFetchNodes.find((n) => n.className?.includes('vocab-popup-definition') || n.className?.includes('vocab-quick-def'));
  assert.ok((defEl?.innerHTML || defEl?.textContent || '').includes('To leave completely'));

  const audioBtn = afterFetchNodes.find((n) => n.className?.includes('vocab-quick-preview-audio-btn'));
  assert.ok(audioBtn);
  assert.equal(audioBtn.getAttribute('title'), 'Play pronunciation');

  // Clicking expand triggers onExpand and closes preview
  expandBtn.dispatchEvent('click');
  assert.deepEqual(expandedWords, ['abandon']);
  assert.ok(!container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));
});

test('quickPreviewPopover: close button closes popover without expanding', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  const expandedWords = [];
  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'peace',
    container,
    documentObj,
    windowObj,
    lookupExecutor: async () => ({ status: 'success', data: { parsedPayload: { headword: 'peace', definitions: ['calmness'] } } }),
    onExpand: (w) => expandedWords.push(w),
  });

  const nodes = collectDescendants(container);
  const closeBtn = nodes.find((n) => n.className?.includes('close-btn'));
  assert.ok(closeBtn);

  closeBtn.dispatchEvent('click');
  assert.equal(expandedWords.length, 0);
  assert.ok(!container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));
});

test('quickPreviewPopover: clicking the same target chip toggles the preview off', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'hello',
    container,
    documentObj,
    windowObj,
  });

  assert.ok(container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));

  // Toggle off by calling with same target element and word
  const secondCall = showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'hello',
    container,
    documentObj,
    windowObj,
  });

  assert.equal(secondCall, null);
  assert.ok(!container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));
});

test('quickPreviewPopover: pressing Escape key closes active popover', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'test',
    container,
    documentObj,
    windowObj,
  });

  assert.ok(container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));

  windowObj.dispatchEvent('keydown', { key: 'Escape', stopPropagation: () => {}, preventDefault: () => {} });
  assert.ok(!container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));
});

test('quickPreviewPopover: handles not-found and error states cleanly', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'nonexistent',
    container,
    documentObj,
    windowObj,
    lookupExecutor: async () => ({ status: 'not-found' }),
  });

  await new Promise((r) => setTimeout(r, 10));

  const nodes = collectDescendants(container);
  const emptyEl = nodes.find((n) => n.className === 'vocab-quick-preview-empty');
  assert.equal(emptyEl?.textContent, 'No definition found.');
});

test('quickPreviewPopover: pointerdown inside popover with shadow DOM retargeted target does not dismiss popover', () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'shadow',
    container,
    documentObj,
    windowObj,
  });

  const nodes = collectDescendants(container);
  const expandBtn = nodes.find((n) => n.className?.includes('expand-btn'));
  assert.ok(expandBtn);

  // In Shadow DOM, e.target is retargeted to shadow host, but composedPath() contains expandBtn
  const shadowHost = createMockElement('DIV');
  windowObj.dispatchEvent('pointerdown', {
    target: shadowHost,
    composedPath: () => [expandBtn, nodes.find((n) => n.className?.includes('vocab-quick-preview-popover')), shadowHost],
  });

  // Popover should still be open!
  assert.ok(container.childNodes.some((c) => c.className?.includes('vocab-quick-preview-popover')));
});

test('extractUnwrappedDefinition: unwraps details and summary elements cleanly', () => {
  const htmlWithDetails = `<details class="vocab-details">
    <summary><span class="vocab-details-label"><span>✭</span> Definition of productivity (1)</span><span class="collapse-icon">▶</span></summary>
    <div class="details-content">
      <div class="definition">the quality, state, or fact of being able to produce</div>
    </div>
  </details>`;

  const unwrapped = extractUnwrappedDefinition(htmlWithDetails);
  assert.ok(!unwrapped.includes('<details'));
  assert.ok(!unwrapped.includes('<summary'));
  assert.ok(unwrapped.includes('the quality, state, or fact of being able to produce'));

  const plainHtml = `<div class="vocab-quick-def">Quick explanation</div>`;
  assert.equal(extractUnwrappedDefinition(plainHtml), plainHtml);
});

test('quickPreviewPopover: fallback definitions with details/summary are unwrapped and displayed open', async () => {
  const documentObj = createMockDocument();
  const windowObj = createMockWindow();
  const container = createMockElement('DIV');
  const targetChip = createMockElement('BUTTON');
  container.appendChild(targetChip);

  const fallbackHtml = `<details class="vocab-details"><summary><span class="vocab-details-label"><span>✭</span> Definitions of yield (3)</span><span class="collapse-icon">▶</span></summary><div class="details-content"><div class="definition">give or supply</div></div></details>`;

  showQuickPreviewPopover({
    targetElement: targetChip,
    word: 'yield',
    container,
    documentObj,
    windowObj,
    lookupExecutor: async () => ({
      status: 'success',
      data: {
        parsedPayload: {
          headword: 'yield',
          definitions: [fallbackHtml],
        },
      },
    }),
  });

  await new Promise((r) => setTimeout(r, 10));

  const nodes = collectDescendants(container);
  const defEl = nodes.find((n) => n.className?.includes('vocab-popup-definition') || n.className?.includes('vocab-quick-def'));
  assert.ok(defEl);
  assert.ok(!defEl.innerHTML.includes('<summary'));
  assert.ok(!defEl.innerHTML.includes('<details'));
  assert.ok(defEl.innerHTML.includes('give or supply'));
});
