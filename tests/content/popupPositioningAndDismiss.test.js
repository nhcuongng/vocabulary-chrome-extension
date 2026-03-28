import assert from 'node:assert/strict';
import test from 'node:test';

import { createPopupController } from '../../src/content/popupController.js';
import { computePopupPosition } from '../../src/content/popupPositioning.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
    this.activeElement = null;
  }

  addEventListener(type, handler) {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  removeEventListener(type, handler) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((item) => item !== handler),
    );
  }

  dispatch(type, event) {
    const list = this.listeners.get(type) ?? [];
    for (const handler of list) {
      handler(event);
    }
  }
}

test('computePopupPosition: đặt popup gần selection và tôn trọng viewport constraints', () => {
  const position = computePopupPosition({
    selectionRect: { left: 120, top: 80, width: 40, height: 20, bottom: 100 },
    popupSize: { width: 460, height: 180 },
    viewport: { width: 360, height: 640, scrollX: 0, scrollY: 0 },
  });

  assert.ok(position.left >= 12);
  assert.ok(position.maxWidth <= 420);
  assert.ok(['top', 'bottom'].includes(position.placement));
});

test('popup controller: đóng bằng Esc và click-outside, restore focus khi đóng', () => {
  const eventTarget = new FakeEventTarget();
  const focusState = { focused: false };
  const previouslyFocusedElement = {
    focus: () => {
      focusState.focused = true;
    },
  };

  eventTarget.activeElement = previouslyFocusedElement;

  const popupElement = {
    contains: (target) => target?.owner === 'popup',
  };

  const closedReasons = [];
  const controller = createPopupController({
    eventTarget,
    popupElement,
    onClose: ({ reason }) => closedReasons.push(reason),
  });

  controller.open();
  eventTarget.dispatch('keydown', { key: 'Escape' });

  assert.equal(controller.isOpen(), false);
  assert.equal(closedReasons[0], 'escape');
  assert.equal(focusState.focused, true);

  focusState.focused = false;
  controller.open();
  eventTarget.dispatch('pointerdown', { target: { owner: 'outside' } });

  assert.equal(controller.isOpen(), false);
  assert.equal(closedReasons[1], 'click-outside');
  assert.equal(focusState.focused, true);
});
