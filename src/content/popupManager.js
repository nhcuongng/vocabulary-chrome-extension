import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

export function createPopupManager({ documentObj, windowObj }) {
  let popupElement = null;
  let popupCtrl = null;

  function removePopup() {
    if (popupElement && popupElement.parentNode) {
      popupElement.parentNode.removeChild(popupElement);
      popupElement = null;
      popupCtrl = null;
      console.log('[VOCAB] Popup removed from DOM');
    }
  }

  function createPopup() {
    if (popupElement) return popupElement;
    popupElement = documentObj.createElement('div');
    popupElement.style.position = 'absolute';
    popupElement.style.zIndex = 2147483647;
    // Shadow DOM root
    const shadow = popupElement.attachShadow({ mode: 'open' });
    // Popup container inside shadow
    const popupContainer = documentObj.createElement('div');
    popupContainer.className = 'vocab-popup vocab-popup-theme';
    popupContainer.tabIndex = -1;
    popupContainer.setAttribute('role', 'dialog');
    popupContainer.setAttribute('aria-live', 'polite');
    // Style for shadow root
    const style = documentObj.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .skeleton {
        background: #f6f7f8;
        background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
        background-repeat: no-repeat;
        background-size: 800px 100%;
        display: inline-block;
        position: relative;
        animation-duration: 1.5s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: shimmer;
        animation-timing-function: linear;
        border-radius: 4px;
      }

      .skeleton-headword {
        height: 28px;
        width: 60%;
        margin-bottom: 12px;
      }

      .skeleton-pron {
        height: 18px;
        width: 40%;
        margin-bottom: 16px;
      }

      .skeleton-def {
        height: 14px;
        width: 100%;
        margin-bottom: 8px;
      }

      .skeleton-def.short {
        width: 70%;
      }

      .custom-definition-list .definition {
          font-size: 14px;
          margin-right: 10px;
          margin-bottom: 10px;
      }

       .custom-definition-list .pos-icon {
            color: #007BC4;
            border-color: #007BC4;
            display: inline-block;
            font-size: 14px;
            height: 24px;
            border-radius: 12px;
            border-style: solid;
            border-width: 1px;
            padding: 0 8px;
        }

      .vocab-popup {
        max-height: 300px;
        min-height: 120px;
        min-width: 300px;
        overflow-y: auto;
      }

      .vocab-popup-theme {
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        border-radius: 10px;
        padding: 12px;
        max-width: 380px;
        min-width: 200px;
        font-family: inherit;
        font-size: 16px;
        color: #222;
        transition: opacity 0.15s;
      }
      .vocab-popup-theme .head-word:hover {
        text-decoration: underline;
      }
      .vocab-popup-theme .head-word {
        text-decoration: none;
      }
      .vocab-popup-headword {
        font-size: 30px;
        font-weight: 700;
        margin: 0 0 8px;
        color: #1677C9;
      }
      .vocab-popup-pronunciation {
        color: #4B5563;
        font-size: 14px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vocab-popup-audio-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0 4px;
        color: #4B5563;
        display: flex;
      }
      .vocab-popup-definition {
        font-size: 15px;
        line-height: 1.5;
        margin: 10px 0;
      }
      .vocab-popup-title {
        font-weight: bold;
      }
      .vocab-popup-message {
      }
      .vocab-popup-search-suggestions {
        margin-top: 10px;
        font-size: 14px;
        color: #4B5563;
      }
      .vocab-popup-guidance-list {
        margin: 8px 0;
      }
      .vocab-popup-cta {
        margin-top: 8px;
      }
      .vocab-popup-attribution {
        margin-top: 12px;
      }
      .vocab-popup-permission-disclosure {
        font-size: 12px;
        margin-top: 4px;
      }
      .vocab-popup-close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s, color 0.2s;
        z-index: 10;
      }
      .vocab-popup-close-btn:hover {
        background-color: #f3f4f6;
        color: #4b5563;
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(popupContainer);
    // Stop propagation for all relevant events
    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'pointerdown'].forEach((evt) => {
      popupElement.addEventListener(evt, (e) => e.stopPropagation());
    });
    documentObj.body.appendChild(popupElement);
    // Attach shadow and container for later use
    popupElement._vocabShadow = shadow;
    popupElement._vocabContainer = popupContainer;
    console.log('[VOCAB] Popup inserted into DOM (shadow)');
    return popupElement;
  }

  function updatePopupPosition(selectionRect) {
    if (!popupElement || !selectionRect) return;

    // Force reflow to ensure offsetWidth/offsetHeight are correct
    const popupWidth = popupElement.offsetWidth;
    const popupHeight = popupElement.offsetHeight;
    const viewport = {
      width: windowObj.innerWidth,
      height: windowObj.innerHeight,
      scrollX: windowObj.scrollX,
      scrollY: windowObj.scrollY,
    };

    // Compute position: always prefer below selection, fallback above if not enough space
    let left = selectionRect.left + viewport.scrollX;
    let top = selectionRect.bottom + viewport.scrollY + 8; // 8px margin below selection

    // If popup would overflow bottom, try above selection
    if (top + popupHeight > viewport.scrollY + viewport.height) {
      const aboveTop = selectionRect.top + viewport.scrollY - popupHeight - 8;
      if (aboveTop >= viewport.scrollY) {
        top = aboveTop;
      } else {
        // Clamp to bottom if still overflow
        top = viewport.scrollY + viewport.height - popupHeight - 8;
      }
    }

    // Clamp left to viewport
    if (left + popupWidth > viewport.scrollX + viewport.width) {
      left = viewport.scrollX + viewport.width - popupWidth - 8;
    }
    if (left < viewport.scrollX) left = viewport.scrollX + 8;

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
    popupElement.style.maxWidth = `${Math.min(380, viewport.width - 16)}px`;
  }

  function renderPopupContent(state, selectionRect) {
    if (!popupElement) return;
    const shadow = popupElement._vocabShadow;
    const popupContainer = popupElement._vocabContainer;
    let viewModel = null;
    let content = [];
    if (state.status === 'success' || state.status === 'not-found' || state.status === 'error') {
      viewModel = mapLookupResultToPopupViewModel(state);
      if (state.status === 'success') {
        content = renderSuccessContent(viewModel);
      } else if (state.status === 'not-found') {
        content = renderNotFoundContent(viewModel);
      } else {
        content = renderErrorContent(state.error);
      }
    } else if (state.status === 'loading') {
      content = [
        { type: 'skeleton', value: 'headword' },
        { type: 'skeleton', value: 'pron' },
        { type: 'skeleton', value: 'def' },
        { type: 'skeleton', value: 'def-short' }
      ];
    } else {
      content = [];
    }
    // D2 - Compact Utility style rendering using programmatic DOM creation
    popupContainer.replaceChildren();

    function h(tag, props, ...children) {
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
          } else {
            el.setAttribute(key, value);
          }
        }
      }
      for (const child of children) {
        if (child == null) continue;
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(documentObj.createTextNode(String(child)));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      }
      return el;
    }

    // Always append close button
    popupContainer.appendChild(
      h('button', {
        className: 'vocab-popup-close-btn',
        title: 'Close popup',
        ariaLabel: 'Close popup',
        innerHTML: closeSVG,
        onClick: (e) => {
          e.stopPropagation();
          if (popupCtrl) {
            popupCtrl.close('close-button');
          } else {
            removePopup();
          }
        }
      })
    );

    content.forEach((item, idx) => {
      if (item.type === 'skeleton') {
        if (item.value === 'headword') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-headword' }));
        } else if (item.value === 'pron') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-pron' }));
        } else if (item.value === 'def') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-def' }));
        } else if (item.value === 'def-short') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-def short' }));
        }
      } else if (item.type === 'headword') {
        const cap = typeof item.value === 'string' && item.value.length > 0
          ? item.value.charAt(0).toUpperCase() + item.value.slice(1)
          : item.value;
        const vocabUrl = `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || '')}`;
        popupContainer.appendChild(
          h('p', { className: 'vocab-popup-headword' },
            h('a', { href: vocabUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
        // Render US pronunciation + audio
        if (item.audio && item.audio.us && item.value.includes('US')) {
          const usMatch = item.value.match(/US\s*([^·]+)/);
          if (usMatch) {
            pronContainer.appendChild(h('span', {}, `US ${usMatch[1].trim()}`));
            pronContainer.appendChild(
              h('button', {
                title: 'US pronunciation',
                className: 'vocab-popup-audio-btn',
                innerHTML: speakerSVG,
                onClick: (e) => {
                  e.stopPropagation();
                  new Audio(item.audio.us).play().catch(err => console.warn('Audio play failed', err));
                }
              })
            );
          }
        }
        // Render UK pronunciation + audio
        if (item.audio && item.audio.uk && item.value.includes('UK')) {
          const ukMatch = item.value.match(/UK\s*([^·]+)/);
          if (ukMatch) {
            pronContainer.appendChild(h('span', {}, `UK ${ukMatch[1].trim()}`));
            pronContainer.appendChild(
              h('button', {
                title: 'UK pronunciation',
                className: 'vocab-popup-audio-btn',
                innerHTML: speakerSVG,
                onClick: (e) => {
                  e.stopPropagation();
                  new Audio(item.audio.uk).play().catch(err => console.warn('Audio play failed', err));
                }
              })
            );
          }
        }
        // Fallback: if no US/UK, just show value
        if (!(item.audio && (item.audio.us || item.audio.uk))) {
          pronContainer.appendChild(h('span', {}, item.value));
        }
        popupContainer.appendChild(pronContainer);
      } else if (item.type === 'definition') {
        const defs = item.value;
        if (Array.isArray(defs) && defs.length > 0) {
          const firstDef = defs[0];
          const moreDefs = defs.slice(1);

          if (moreDefs.length === 0) {
            popupContainer.appendChild(h('p', { className: 'vocab-popup-definition', innerHTML: firstDef }));
          } else {
            const moreContainer = h('div', {
              className: 'more-definitions-container',
              style: { display: 'none', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }
            });

            moreDefs.forEach(def => {
              moreContainer.appendChild(h('div', { style: { marginBottom: '8px' }, innerHTML: def }));
            });

            const trigger = h('p', {
              className: 'more-trigger',
              style: { fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', color: '#1677C9', textAlign: 'right', padding: '0 8px', marginTop: '4px' },
              onClick: (e) => {
                e.stopPropagation();
                const isExpanded = moreContainer.style.display === 'block';
                moreContainer.style.display = isExpanded ? 'none' : 'block';
                trigger.textContent = isExpanded ? 'See more' : 'See less';
                // Smart repositioning after height change
                updatePopupPosition(selectionRect);
              }
            }, 'See more');

            const defContainer = h('div', { className: 'vocab-popup-definition' },
              h('span', { innerHTML: firstDef }),
              moreContainer,
              trigger
            );

            popupContainer.appendChild(defContainer);
          }
        } else if (typeof defs === 'string') {
          popupContainer.appendChild(h('p', { className: 'vocab-popup-definition', innerHTML: defs }));
        }
      } else if (item.type === 'title') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-title' }, item.value));
      } else if (item.type === 'message') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-message' }, item.value));
      } else if (item.type === 'searchSuggestions') {
        if (item.value) {
          popupContainer.appendChild(h('div', { className: 'vocab-popup-search-suggestions', innerHTML: item.value }));
        }
      } else if (item.type === 'guidance-list') {
        const ul = h('ul', { className: 'vocab-popup-guidance-list' });
        item.value.forEach(g => ul.appendChild(h('li', {}, g)));
        popupContainer.appendChild(ul);
      } else if (item.type === 'cta') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-cta' }, h('button', {}, item.value)));
      } else if (item.type === 'attribution') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-attribution', innerHTML: item.value }));
      } else if (item.type === 'permission-disclosure') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-permission-disclosure', innerHTML: item.value }));
      }
    });

    // Position the popup
    updatePopupPosition(selectionRect);
  }

  function showPopup(state, selectionRect) {
    createPopup();
    renderPopupContent(state, selectionRect);
    if (!popupCtrl) {
      popupCtrl = createPopupController({
        eventTarget: documentObj,
        popupElement,
        onClose: ({ reason }) => {
          removePopup();
          console.log('[VOCAB] Popup closed', reason);
        },
        onOpen: () => {
          popupElement.focus();
        },
      });
    }
    popupCtrl.open();
  }

  return {
    showPopup,
    removePopup
  };
}
