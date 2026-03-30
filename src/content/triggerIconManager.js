export function createTriggerIconManager({ documentObj, windowObj, onClick }) {
  let hostElement = null;
  let keydownHandler = null;
  let pointerdownHandler = null;

  function removeIcon() {
    if (keydownHandler) {
      documentObj.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    if (pointerdownHandler) {
      documentObj.removeEventListener('pointerdown', pointerdownHandler);
      pointerdownHandler = null;
    }
    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
    }
    hostElement = null;
  }

  function showIcon(selectionRect) {
    if (!selectionRect) return;
    removeIcon();

    hostElement = documentObj.createElement('div');
    hostElement.style.position = 'absolute';
    hostElement.style.zIndex = '2147483647';

    const shadow = hostElement.attachShadow({ mode: 'open' });

    const style = documentObj.createElement('style');
    style.textContent = `
      .trigger-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        cursor: pointer;
        user-select: none;
        transition: background 0.1s, box-shadow 0.1s;
      }
      .trigger-icon:hover {
        background: #f3f4f6;
        box-shadow: 0 2px 6px rgba(0,0,0,0.18);
      }
      .trigger-icon svg {
        width: 16px;
        height: 16px;
        color: #4B5563;
      }
    `;
    shadow.appendChild(style);

    const button = documentObj.createElement('button');
    button.className = 'trigger-icon';
    button.setAttribute('aria-label', 'Look up definition');
    button.setAttribute('type', 'button');
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onClick?.();
    });

    shadow.appendChild(button);

    ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown'].forEach((evt) => {
      hostElement.addEventListener(evt, (e) => e.stopPropagation());
    });

    documentObj.body.appendChild(hostElement);

    // Position near the end of the selection
    const scrollX = windowObj.scrollX;
    const scrollY = windowObj.scrollY;
    const iconSize = 28;
    const gap = 4;

    let left = selectionRect.right + scrollX + gap;
    let top = selectionRect.top + scrollY + (selectionRect.height / 2) - (iconSize / 2);

    // If icon overflows right edge, place it to the left of selection
    if (left + iconSize > scrollX + windowObj.innerWidth) {
      left = selectionRect.left + scrollX - iconSize - gap;
    }

    // Clamp to viewport
    if (left < scrollX) left = scrollX + gap;
    if (top < scrollY) top = scrollY + gap;
    if (top + iconSize > scrollY + windowObj.innerHeight) {
      top = scrollY + windowObj.innerHeight - iconSize - gap;
    }

    hostElement.style.left = `${left}px`;
    hostElement.style.top = `${top}px`;

    // Dismiss on Escape
    keydownHandler = (event) => {
      if (event?.key === 'Escape') {
        removeIcon();
      }
    };
    documentObj.addEventListener('keydown', keydownHandler);

    // Dismiss on click outside
    pointerdownHandler = (event) => {
      if (hostElement && !hostElement.contains(event?.target)) {
        removeIcon();
      }
    };
    // Use setTimeout to avoid the same mouseup that triggered the icon from immediately dismissing it
    setTimeout(() => {
      if (hostElement) {
        documentObj.addEventListener('pointerdown', pointerdownHandler);
      }
    }, 0);
  }

  function isVisible() {
    return hostElement !== null;
  }

  return {
    showIcon,
    removeIcon,
    isVisible,
  };
}
