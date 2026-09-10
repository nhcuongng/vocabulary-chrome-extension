/**
 * Quick Preview Popover Component
 * Displays a lightweight preview popover showing pronunciation, audio,
 * and quick definition with an Expand button and Close button.
 */

import { playAudioWithFallback } from '../domain/audioPlaybackUtils.js';
import { interceptPosInHtml } from '../domain/partOfSpeechUtils.js';

export const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

export const expandSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
  <path d="M15 3h6v6"></path>
  <path d="M9 21H3v-6"></path>
  <path d="M21 3l-7 7"></path>
  <path d="M3 21l7-7"></path>
</svg>`;

export const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

export function extractUnwrappedDefinition(rawDefHtml) {
  if (!rawDefHtml || typeof rawDefHtml !== 'string') return '';
  let content = rawDefHtml.trim();

  // If wrapped in <details class="vocab-details">, extract inner content from details-content
  if (content.includes('vocab-details') || content.includes('<details')) {
    const detailsMatch = content.match(
      /<div[^>]*class=["'][^"']*details-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/details>/i
    );
    if (detailsMatch && detailsMatch[1]) {
      content = detailsMatch[1].trim();
    } else {
      content = content
        .replace(/<summary[\s\S]*?<\/summary>/gi, '')
        .replace(/<\/?details[^>]*>/gi, '')
        .trim();
    }
  }

  content = content.replace(/<summary[\s\S]*?<\/summary>/gi, '').trim();
  return content;
}

export function showQuickPreviewPopover({
  targetElement,
  word,
  container,
  documentObj = globalThis.document,
  windowObj = globalThis.window,
  lookupExecutor = null,
  source = 'vocabulary',
  onExpand = null,
  h = null,
}) {
  if (!container || !targetElement || !word) return null;

  // Toggle off if clicking the currently open preview chip
  if (container._activeQuickPreview) {
    const isSame =
      container._activeQuickPreview.word === word &&
      container._activeQuickPreview.targetElement === targetElement;
    container._activeQuickPreview.close();
    if (isSame) {
      return null;
    }
  }

  const domH =
    h ||
    function (tag, props, ...children) {
      const el = documentObj.createElement(tag);
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
          } else if (key === 'className') {
            el.className = value;
          } else if (key === 'innerHTML') {
            el.innerHTML = value;
          } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
          } else if (key === 'disabled') {
            if (value) el.setAttribute('disabled', '');
          } else {
            el.setAttribute(key, value);
          }
        }
      }
      for (const child of children) {
        if (child == null) continue;
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(documentObj.createTextNode(String(child)));
        } else if (typeof child === 'object') {
          el.appendChild(child);
        }
      }
      return el;
    };

  const popoverEl = domH('div', {
    className: 'vocab-quick-preview-popover',
    role: 'dialog',
    ariaLabel: `Quick preview for ${word}`,
  });

  popoverEl.addEventListener('pointerdown', (e) => e?.stopPropagation?.());
  popoverEl.addEventListener('mousedown', (e) => e?.stopPropagation?.());
  popoverEl.addEventListener('click', (e) => e?.stopPropagation?.());

  let isClosed = false;

  function closePreview() {
    if (isClosed) return;
    isClosed = true;
    if (container._activeQuickPreview?.popoverEl === popoverEl) {
      container._activeQuickPreview = null;
    }
    if (windowObj?.removeEventListener) {
      windowObj.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      windowObj.removeEventListener('keydown', handleKeyDown, true);
    }
    if (popoverEl.parentNode) {
      popoverEl.parentNode.removeChild(popoverEl);
    }
  }

  function handleOutsidePointerDown(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (path.length > 0) {
      if (path.includes(popoverEl) || path.includes(targetElement)) {
        return;
      }
    } else {
      const target = e.target;
      if (popoverEl.contains(target) || targetElement.contains(target)) {
        return;
      }
    }
    closePreview();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      closePreview();
    }
  }

  if (windowObj?.addEventListener) {
    windowObj.addEventListener('pointerdown', handleOutsidePointerDown, true);
    windowObj.addEventListener('keydown', handleKeyDown, true);
  }

  // 1. Header with title, Expand button, and Close button
  const headerEl = domH(
    'div',
    { className: 'vocab-quick-preview-header' },
    domH('span', { className: 'vocab-quick-preview-title' }, word),
    domH(
      'div',
      { className: 'vocab-quick-preview-actions' },
      domH('button', {
        type: 'button',
        className: 'vocab-quick-preview-btn expand-btn',
        title: 'Expand to full view',
        ariaLabel: 'Expand to full view',
        innerHTML: expandSVG,
        onPointerDown: (e) => e?.stopPropagation?.(),
        onMouseDown: (e) => e?.stopPropagation?.(),
        onClick: (e) => {
          e?.stopPropagation?.();
          closePreview();
          if (typeof onExpand === 'function') {
            onExpand(word);
          }
        },
      }),
      domH('button', {
        type: 'button',
        className: 'vocab-quick-preview-btn close-btn',
        title: 'Close preview',
        ariaLabel: 'Close preview',
        innerHTML: closeSVG,
        onPointerDown: (e) => e?.stopPropagation?.(),
        onMouseDown: (e) => e?.stopPropagation?.(),
        onClick: (e) => {
          e?.stopPropagation?.();
          closePreview();
        },
      })
    )
  );
  popoverEl.appendChild(headerEl);

  // 2. Body element (initially loading skeleton)
  const bodyEl = domH(
    'div',
    { className: 'vocab-quick-preview-body' },
    domH(
      'div',
      { className: 'vocab-quick-preview-loading' },
      domH('div', {
        className: 'skeleton',
        style: { width: '45%', height: '14px', marginBottom: '6px', borderRadius: '4px' },
      }),
      domH('div', {
        className: 'skeleton',
        style: { width: '90%', height: '12px', marginBottom: '4px', borderRadius: '4px' },
      }),
      domH('div', {
        className: 'skeleton',
        style: { width: '70%', height: '12px', borderRadius: '4px' },
      })
    )
  );
  popoverEl.appendChild(bodyEl);

  container.appendChild(popoverEl);

  function updatePosition() {
    if (!popoverEl.parentNode || !targetElement.parentNode) return;
    const targetRect =
      typeof targetElement.getBoundingClientRect === 'function'
        ? targetElement.getBoundingClientRect()
        : { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    const containerRect =
      typeof container.getBoundingClientRect === 'function'
        ? container.getBoundingClientRect()
        : { top: 0, bottom: 0, left: 0, right: 0, width: 380, height: 420 };

    const popoverWidth = popoverEl.offsetWidth || 290;
    const popoverHeight = popoverEl.offsetHeight || 100;

    let top = targetRect.bottom - containerRect.top + 4;
    let left = targetRect.left - containerRect.left;

    // Reposition above if overflowing bottom
    if (top + popoverHeight > containerRect.height - 8) {
      const topAbove = targetRect.top - containerRect.top - popoverHeight - 4;
      if (topAbove >= 4) {
        top = topAbove;
      }
    }

    // Clamp horizontal alignment
    if (left + popoverWidth > containerRect.width - 8) {
      left = Math.max(8, containerRect.width - popoverWidth - 8);
    }
    if (left < 8) left = 8;

    popoverEl.style.top = `${Math.round(top)}px`;
    popoverEl.style.left = `${Math.round(left)}px`;
  }

  updatePosition();

  container._activeQuickPreview = {
    word,
    targetElement,
    popoverEl,
    close: closePreview,
  };

  // Fetch quick lookup data
  (async () => {
    try {
      let result = null;
      if (typeof lookupExecutor === 'function') {
        result = await lookupExecutor(word, source);
      } else if (globalThis.chrome?.runtime?.sendMessage) {
        result = await new Promise((resolve) => {
          globalThis.chrome.runtime.sendMessage(
            {
              type: 'LOOKUP_REQUEST',
              payload: {
                token: word.trim().toLowerCase(),
                source: source || 'vocabulary',
              },
            },
            (response) => resolve(response)
          );
        });
      }

      if (isClosed || !popoverEl.parentNode) return;

      bodyEl.replaceChildren();

      if (!result || result.status !== 'success') {
        const notFoundMsg = domH(
          'div',
          { className: 'vocab-quick-preview-empty' },
          result?.status === 'not-found' ? 'No definition found.' : 'Unable to load preview.'
        );
        bodyEl.appendChild(notFoundMsg);
        updatePosition();
        return;
      }

      const payload = result.data?.parsedPayload || result.data || {};
      const pronunciation = (payload.pronunciation || '').trim();
      const audioObj = payload.audio || {};
      const definitions = Array.isArray(payload.definitions) ? payload.definitions : [];
      const quickDef = (payload.shortDefinition || definitions[0] || '').trim();

      // Pronunciation row
      const audioUrl = audioObj.us || audioObj.uk || null;
      if (pronunciation || audioUrl) {
        const pronRow = domH('div', { className: 'vocab-quick-preview-pron-row' });
        if (pronunciation) {
          pronRow.appendChild(domH('span', { className: 'vocab-quick-preview-ipa' }, pronunciation));
        }
        if (audioUrl) {
          const audioBtn = domH('button', {
            type: 'button',
            className: 'vocab-quick-preview-audio-btn',
            title: 'Play pronunciation',
            ariaLabel: 'Play pronunciation',
            innerHTML: speakerSVG,
            onClick: (e) => {
              e?.stopPropagation?.();
              playAudioWithFallback({
                audioUrl,
                fallbackWord: word,
                chromeApi: globalThis.chrome,
                audioConstructor: globalThis.Audio,
              });
            },
          });
          pronRow.appendChild(audioBtn);
        }
        bodyEl.appendChild(pronRow);
      }

      // Quick definition styled identically to main popup (with collapse unwrapped)
      if (quickDef) {
        const unwrapped = extractUnwrappedDefinition(quickDef);
        const interceptedHtml = interceptPosInHtml(unwrapped);
        const defContent = interceptedHtml.includes('vocab-quick-def')
          ? interceptedHtml
          : `<div class="vocab-quick-def">${interceptedHtml}</div>`;
        const defContainer = domH('div', {
          className: 'vocab-popup-definition',
          innerHTML: defContent,
        });
        bodyEl.appendChild(defContainer);
      } else {
        bodyEl.appendChild(
          domH('div', { className: 'vocab-quick-preview-empty' }, 'No definition available.')
        );
      }

      updatePosition();
    } catch {
      if (isClosed || !popoverEl.parentNode) return;
      bodyEl.replaceChildren();
      bodyEl.appendChild(
        domH('div', { className: 'vocab-quick-preview-empty' }, 'Unable to load preview.')
      );
      updatePosition();
    }
  })();

  return {
    popoverEl,
    close: closePreview,
  };
}
