import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
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
    `;
    shadow.appendChild(style);
    shadow.appendChild(popupContainer);
    // Stop propagation for all relevant events
    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach((evt) => {
      popupElement.addEventListener(evt, (e) => e.stopPropagation());
    });
    documentObj.body.appendChild(popupElement);
    // Attach shadow and container for later use
    popupElement._vocabShadow = shadow;
    popupElement._vocabContainer = popupContainer;
    console.log('[VOCAB] Popup inserted into DOM (shadow)');
    return popupElement;
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
      content = [{ type: 'message', value: 'Đang tra cứu...' }];
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

    content.forEach((item, idx) => {
      if (item.type === 'headword') {
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
            const popupWrapper = h('div', {
              className: 'more-definitions-popup vocab-popup-theme',
              style: {
                display: 'none', position: 'absolute', zIndex: '2147483647',
                background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                borderRadius: '10px', padding: '12px', width: '300px', height: '300px',
                fontFamily: 'inherit', fontSize: '16px', color: '#222', border: 'none'
              }
            });

            const contentDiv = h('div', { style: { height: 'calc(100% - 30px)', overflowY: 'auto' } });
            moreDefs.forEach(def => {
              contentDiv.appendChild(h('div', { style: { marginBottom: '8px' }, innerHTML: def }));
            });

            const closeBtn = h('button', {
              className: 'close-more-definitions-popup',
              style: { cursor: 'pointer', fontSize: '15px', background: 'red', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px' },
              onClick: (e) => { e.stopPropagation(); popupWrapper.style.display = 'none'; }
            }, 'Close');

            const bottomBar = h('div', {
              style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', bottom: '12px', left: '0', padding: '4px 12px', boxSizing: 'border-box' }
            }, closeBtn);

            popupWrapper.appendChild(contentDiv);
            popupWrapper.appendChild(bottomBar);

            const trigger = h('p', {
              className: 'more-trigger',
              style: { fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', color: '#1677C9', textAlign: 'right', padding: '0 8px' },
              onClick: (e) => {
                e.stopPropagation();
                popupWrapper.style.display = 'block';
                const triggerRect = trigger.getBoundingClientRect();
                let realLeft = triggerRect.left + triggerRect.width;
                let leftRelative = '100%';
                if (realLeft + 300 > windowObj.innerWidth) {
                  leftRelative = '-100%';
                }
                popupWrapper.style.top = '0px';
                popupWrapper.style.left = leftRelative;
              }
            }, 'See more');

            // Hide popup on click outside
            documentObj.addEventListener('click', function onClickOutside(e) {
              if (popupWrapper && !popupWrapper.contains(e.target) && e.target !== trigger) {
                popupWrapper.style.display = 'none';
              }
            });

            const defContainer = h('div', { className: 'vocab-popup-definition' },
              h('span', { innerHTML: firstDef }),
              trigger,
              popupWrapper
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
      } else if (item.type === 'guidance-list') {
        const ul = h('ul', { className: 'vocab-popup-guidance-list' });
        item.value.forEach(g => ul.appendChild(h('li', {}, g)));
        popupContainer.appendChild(ul);
      } else if (item.type === 'cta') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-cta' }, h('button', {}, item.value)));
      } else if (item.type === 'attribution') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-attribution' }, item.value));
      } else if (item.type === 'permission-disclosure') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-permission-disclosure' }, item.value));
      }
    });

    // --- Fix: Ensure popup is measured after DOM update ---
    if (selectionRect) {
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
