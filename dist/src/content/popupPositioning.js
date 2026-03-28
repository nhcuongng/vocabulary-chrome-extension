export const POPUP_LAYOUT = {
  MAX_WIDTH: 420,
  GAP: 8,
  VIEWPORT_PADDING: 12,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computePopupPosition({
  selectionRect,
  popupSize,
  viewport,
  maxWidth = POPUP_LAYOUT.MAX_WIDTH,
} = {}) {
  if (!selectionRect || !popupSize || !viewport) {
    throw new Error('selectionRect, popupSize and viewport are required');
  }

  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error('viewport dimensions must be positive');
  }

  if (popupSize.width <= 0 || popupSize.height <= 0) {
    throw new Error('popup dimensions must be positive');
  }

  const effectiveMaxWidth = Math.min(
    maxWidth,
    viewport.width - POPUP_LAYOUT.VIEWPORT_PADDING * 2,
  );

  if (effectiveMaxWidth <= 0) {
    throw new Error('viewport is too small to place popup');
  }

  const popupWidth = Math.min(popupSize.width, effectiveMaxWidth);
  const centeredLeft = selectionRect.left + selectionRect.width / 2 - popupWidth / 2;
  const minLeft = viewport.scrollX + POPUP_LAYOUT.VIEWPORT_PADDING;
  const maxLeft = viewport.scrollX + viewport.width - popupWidth - POPUP_LAYOUT.VIEWPORT_PADDING;
  const left = clamp(centeredLeft, minLeft, maxLeft);

  const belowTop = selectionRect.bottom + POPUP_LAYOUT.GAP;
  const aboveTop = selectionRect.top - popupSize.height - POPUP_LAYOUT.GAP;
  const minTop = viewport.scrollY + POPUP_LAYOUT.VIEWPORT_PADDING;
  const maxTop = viewport.scrollY + viewport.height - popupSize.height - POPUP_LAYOUT.VIEWPORT_PADDING;

  let placement = 'bottom';
  let top = belowTop;

  if (belowTop > maxTop && aboveTop >= minTop) {
    placement = 'top';
    top = aboveTop;
  }

  top = clamp(top, minTop, maxTop);

  return {
    top,
    left,
    maxWidth: effectiveMaxWidth,
    placement,
  };
}
