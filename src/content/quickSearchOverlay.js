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

export function createQuickSearchOverlay({ documentObj, windowObj, lookupExecutor }) {
  let overlayElement = null;
  let isVisible = false;
  let currentHeadword = '';
  let darkMode = false;

  function createOverlay() {
    if (overlayElement) return overlayElement;

    overlayElement = documentObj.createElement('div');
    overlayElement.id = 'vocab-quick-search-overlay';
    overlayElement.tabIndex = -1; // Make it focusable to receive keyboard events
    overlayElement.style.position = 'fixed';
    overlayElement.style.top = '0';
    overlayElement.style.left = '0';
    overlayElement.style.width = '100vw';
    overlayElement.style.height = '100vh';
    overlayElement.style.zIndex = '2147483647';
    overlayElement.style.display = 'none';
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    overlayElement.style.backdropFilter = 'blur(4px)';
    overlayElement.style.alignItems = 'flex-start';
    overlayElement.style.justifyContent = 'center';
    overlayElement.style.paddingTop = '15vh';

    const shadow = overlayElement.attachShadow({ mode: 'open' });

    const style = documentObj.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      
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

      .skeleton-headword { height: 28px; width: 60%; margin-bottom: 12px; }
      .skeleton-pron { height: 18px; width: 40%; margin-bottom: 16px; }
      .skeleton-def { height: 14px; width: 100%; margin-bottom: 8px; }
      .skeleton-def.short { width: 70%; }

      .container {
        width: 100%;
        max-width: 600px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: Inter, system-ui, -apple-system, sans-serif;
      }

      .search-box {
        display: flex;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #eee;
      }

      .search-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 18px;
        color: #222;
        background: transparent;
      }

      .shortcut-hint {
        font-size: 12px;
        color: #999;
        margin-left: 8px;
      }

      .results-area {
        max-height: 60vh;
        overflow-y: auto;
        padding: 16px;
        min-height: 0;
      }

      .results-area:empty {
        display: none;
      }

      /* Reused styles from popupManager */
      .vocab-popup-theme {
        font-size: 16px;
        color: #222;
      }
      .head-word { text-decoration: none; color: #1677C9; font-size: 30px; font-weight: 700; }
      .head-word:hover { text-decoration: underline; }
      .vocab-popup-headword { margin: 0 0 8px; }
      .vocab-popup-pronunciation { color: #4B5563; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
      .vocab-popup-audio-btn { background: none; border: none; cursor: pointer; padding: 0 4px; color: #4B5563; display: flex; }
      .vocab-popup-definition { font-size: 15px; line-height: 1.5; margin: 10px 0; }
      .vocab-popup-compliance-footer { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #f3f4f6; padding-top: 8px; }
      .vocab-popup-attribution { font-size: 11px; color: #9ca3af; }
      .vocab-popup-permission-disclosure { font-size: 11px; color: #9ca3af; }
      
      details.vocab-details { margin-bottom: 8px; border: 1px solid #f3f4f6; border-radius: 8px; padding: 8px; background: #fff; }
      details.vocab-details summary { cursor: pointer; list-style: none; outline: none; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; color: #374151; }
      details.vocab-details .vocab-details-label { display: inline-flex; gap: 4px; align-items: center; background: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 8px; margin-right: 8px; }
      details.vocab-details .details-content { margin-top: 8px; color: #4b5563; font-size: 14px; line-height: 1.5; }

      /* Dark mode */
      .container.dark-mode { background: #1f2937; color: #f3f4f6; border: 1px solid #374151; }
      .container.dark-mode .search-input { color: #f3f4f6; }
      .container.dark-mode .search-box { border-bottom-color: #374151; }
      .container.dark-mode .head-word { color: #60a5fa; }
      .container.dark-mode .vocab-popup-pronunciation { color: #9ca3af; }
      .container.dark-mode .vocab-popup-compliance-footer { border-top-color: #374151; }
      .container.dark-mode details.vocab-details { background: #111827; border-color: #374151; }
      .container.dark-mode details.vocab-details summary { color: #e5e7eb; }
      .container.dark-mode .skeleton { background: #374151; background-image: linear-gradient(to right, #374151 0%, #4b5563 20%, #374151 40%, #374151 100%); }
    `;

    const container = documentObj.createElement('div');
    container.className = 'container';

    const searchBox = documentObj.createElement('div');
    searchBox.className = 'search-box';

    const input = documentObj.createElement('input');
    input.className = 'search-input';
    input.placeholder = 'Search vocabulary (Esc to close)...';
    input.type = 'text';

    const hint = documentObj.createElement('span');
    hint.className = 'shortcut-hint';
    hint.textContent = 'Auto searching...';

    searchBox.appendChild(input);
    searchBox.appendChild(hint);

    const resultsArea = documentObj.createElement('div');
    resultsArea.className = 'results-area';

    container.appendChild(searchBox);
    container.appendChild(resultsArea);

    shadow.appendChild(style);
    shadow.appendChild(container);

    overlayElement.addEventListener('click', (e) => {
      // Use composedPath to check if click is truly on the overlay background
      const path = e.composedPath();
      if (path[0] === overlayElement) {
        hide();
      }
    });

    // Debounce for instant search
    let debounceTimer = null;
    input.addEventListener('input', () => {
      const value = input.value.trim();
      clearTimeout(debounceTimer);
      
      if (!value) {
        resultsArea.replaceChildren();
        return;
      }

      debounceTimer = setTimeout(() => {
        performSearch(value, resultsArea);
      }, 400); // 400ms debounce
    });

    // Prevent keyboard events from leaking to the host page
    const stopProp = (e) => e.stopPropagation();
    input.addEventListener('keydown', stopProp);
    input.addEventListener('keyup', stopProp);
    input.addEventListener('keypress', stopProp);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // Immediate search on Enter
        const value = input.value.trim();
        if (value) {
          clearTimeout(debounceTimer);
          performSearch(value, resultsArea);
        }
      }
    });

    documentObj.body.appendChild(overlayElement);
    
    overlayElement._input = input;
    overlayElement._resultsArea = resultsArea;
    overlayElement._container = container;
  }

  async function performSearch(word, resultsArea) {
    currentHeadword = word;
    renderState({ status: 'loading' }, resultsArea);
    
    try {
      const response = await lookupExecutor({ headword: word });
      renderState(response, resultsArea);
    } catch (error) {
      renderState({ status: 'error', error: { type: 'unknown', message: error.message } }, resultsArea);
    }
  }

  function renderState(state, container) {
    container.replaceChildren();

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

    let content = [];
    let viewModel = null;

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
    }

    content.forEach((item) => {
      if (item.type === 'skeleton') {
        const cls = item.value === 'def-short' ? 'skeleton skeleton-def short' : `skeleton skeleton-${item.value}`;
        container.appendChild(h('div', { className: cls }));
      } else if (item.type === 'headword') {
        const cap = item.value.charAt(0).toUpperCase() + item.value.slice(1);
        const vocabUrl = `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || '')}`;
        container.appendChild(
          h('p', { className: 'vocab-popup-headword' },
            h('a', { href: vocabUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
        if (item.audio?.us && item.value.includes('US')) {
          const usMatch = item.value.match(/US\s*([^·]+)/);
          if (usMatch) {
            pronContainer.appendChild(h('span', {}, `US ${usMatch[1].trim()}`));
            pronContainer.appendChild(h('button', { className: 'vocab-popup-audio-btn', innerHTML: speakerSVG, onClick: (e) => { e.stopPropagation(); new Audio(item.audio.us).play().catch(() => {}); } }));
          }
        }
        if (item.audio?.uk && item.value.includes('UK')) {
          const ukMatch = item.value.match(/UK\s*([^·]+)/);
          if (ukMatch) {
            pronContainer.appendChild(h('span', {}, `UK ${ukMatch[1].trim()}`));
            pronContainer.appendChild(h('button', { className: 'vocab-popup-audio-btn', innerHTML: speakerSVG, onClick: (e) => { e.stopPropagation(); new Audio(item.audio.uk).play().catch(() => {}); } }));
          }
        }
        if (!item.audio?.us && !item.audio?.uk) {
          pronContainer.appendChild(h('span', {}, item.value));
        }
        container.appendChild(pronContainer);
      } else if (item.type === 'definition') {
        const defs = Array.isArray(item.value) ? item.value : [item.value];
        defs.forEach(defHtml => {
          if (defHtml) container.appendChild(h('div', { className: 'vocab-popup-definition', innerHTML: defHtml }));
        });
      } else if (item.type === 'title') {
        container.appendChild(h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, item.value));
      } else if (item.type === 'message') {
        container.appendChild(h('div', {}, item.value));
      } else if (item.type === 'compliance-footer') {
        container.appendChild(
          h('div', { className: 'vocab-popup-compliance-footer' },
            h('div', { className: 'vocab-popup-attribution', innerHTML: item.value.attribution }),
            h('div', { className: 'vocab-popup-permission-disclosure', innerHTML: item.value.disclosure })
          )
        );
      }
    });
  }

    const handleGlobalKeyDown = (e) => {
      if (isVisible && (e.key === 'Escape' || e.key === 'Esc')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        hide();
      }
    };

    const handleGlobalFocusIn = (e) => {
      if (isVisible && !overlayElement.contains(e.target)) {
        // If focusing an input or something outside the overlay, close it
        hide();
      }
    };

    function show(options = {}) {
      createOverlay();
      isVisible = true;
      overlayElement.style.display = 'flex';
      overlayElement._input.focus();
      overlayElement._input.value = '';
      overlayElement._resultsArea.replaceChildren();
      
      if (options.darkMode) {
        overlayElement._container.classList.add('dark-mode');
      } else {
        overlayElement._container.classList.remove('dark-mode');
      }

      documentObj.addEventListener('keydown', handleGlobalKeyDown, true);
      documentObj.addEventListener('focusin', handleGlobalFocusIn, true);
    }

    function hide() {
      if (!isVisible) return;
      isVisible = false;
      if (overlayElement) {
        overlayElement.style.display = 'none';
      }
      documentObj.removeEventListener('keydown', handleGlobalKeyDown, true);
      documentObj.removeEventListener('focusin', handleGlobalFocusIn, true);
    }

  function toggle(options = {}) {
    if (isVisible) hide();
    else show(options);
  }

  return { show, hide, toggle };
}
