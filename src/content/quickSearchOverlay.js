import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';
import { isInflectedForm } from '../domain/wordInflectionUtils.js';
import {
  playAudioWithFallback,
  speakWord,
  stopCurrentAudio,
} from '../domain/audioPlaybackUtils.js';
import { UI_COPY } from './historySliderRenderer.js';

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

export function createQuickSearchOverlay({ documentObj, windowObj, lookupExecutor, historyAdapter }) {
  let overlayElement = null;
  let isVisible = false;
  let currentHeadword = '';
  let darkMode = false;

  function createOverlay() {
    if (overlayElement) return overlayElement;

    overlayElement = documentObj.createElement('div');
    overlayElement.id = 'vocab-quick-search-overlay';
    overlayElement.tabIndex = -1;
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
        flex-direction: column;
        padding: 14px 16px;
        border-bottom: 1px solid #eee;
        position: relative;
      }

      .search-row {
        display: flex;
        align-items: center;
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

      .suggestions-area {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }

      .suggestions-area:empty {
        display: none;
      }

      .history-chip {
        background: #f3f4f6;
        color: #374151;
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.15s, color 0.15s;
        border: 1px solid transparent;
      }

      .history-chip:hover {
        background: #e0e7ff;
        color: #3730a3;
        border-color: #c7d2fe;
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

      .head-word { text-decoration: none; color: #1677C9; font-size: 28px; font-weight: 700; }
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

      .vocab-word-family-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .vocab-family-chip { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 12px; padding: 2px 8px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background 0.15s, color 0.15s; }
      .vocab-family-chip:hover { background: #dcfce7; color: #14532d; border-color: #86efac; }
      .vocab-family-chip.disabled-inflection { cursor: not-allowed; opacity: 0.65; background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
      .vocab-source-pills-bar {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 8px;
        margin-top: 2px;
      }
      .vocab-source-pill-label {
        font-size: 11px;
        color: #9ca3af;
        margin-right: 2px;
        user-select: none;
      }
      .vocab-source-pill {
        background: #f3f4f6;
        color: #6b7280;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        transition: all 0.15s ease;
        line-height: 1.3;
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .vocab-source-pill:hover {
        background-color: #e5e7eb;
        color: #374151;
      }
      .vocab-source-pill.active {
        background-color: #e0e7ff;
        color: #3730a3;
        border-color: #c7d2fe;
        font-weight: 600;
      }

      .vocab-popup-search-suggestions {
        margin-top: 10px;
        font-size: 13px;
        color: #4B5563;
      }
      .vocab-popup-search-suggestions a,
      .search-suggestion-link {
        color: #1677C9;
        text-decoration: underline;
        font-weight: 500;
        transition: color 0.15s ease;
      }
      .vocab-popup-search-suggestions a:hover,
      .search-suggestion-link:hover {
        color: #0d5ca0;
      }

      /* Dark mode */
      .container.dark-mode { background: #1f2937; color: #f3f4f6; border: 1px solid #374151; }
      .container.dark-mode .search-input { color: #f3f4f6; }
      .container.dark-mode .search-box { border-bottom-color: #374151; }
      .container.dark-mode .head-word { color: #60a5fa; }
      .container.dark-mode .vocab-popup-pronunciation { color: #9ca3af; }
      .container.dark-mode .vocab-popup-compliance-footer { border-top-color: #374151; }
      .container.dark-mode details.vocab-details { background: #111827; border-color: #374151; }
      .container.dark-mode details.vocab-details summary { color: #e5e7eb; }
      .container.dark-mode .history-chip { background: #374151; color: #d1d5db; }
      .container.dark-mode .history-chip:hover { background: #1e3a8a; color: #bfdbfe; }
      .container.dark-mode .vocab-family-chip { background: #064e3b; color: #a7f3d0; border-color: #047857; }
      .container.dark-mode .vocab-family-chip.disabled-inflection { background: #374151; color: #9ca3af; border-color: #4b5563; }
      .container.dark-mode .vocab-family-chip.disabled-inflection:hover { background: #374151; color: #9ca3af; border-color: #4b5563; }
      .container.dark-mode .vocab-source-pill { background: #374151; color: #9ca3af; border-color: #4b5563; }
      .container.dark-mode .vocab-source-pill:hover { background: #4b5563; color: #f3f4f6; }
      .container.dark-mode .vocab-source-pill.active { background: #1e3a8a; color: #bfdbfe; border-color: #3b82f6; }
      .container.dark-mode .vocab-source-pill-label { color: #6b7280; }
      .container.dark-mode .vocab-popup-search-suggestions a,
      .container.dark-mode .search-suggestion-link { color: #60a5fa; }
      .container.dark-mode .vocab-popup-search-suggestions a:hover,
      .container.dark-mode .search-suggestion-link:hover { color: #93c5fd; }
      .container.dark-mode .skeleton { background: #374151; background-image: linear-gradient(to right, #374151 0%, #4b5563 20%, #374151 40%, #374151 100%); }
    `;

    const container = documentObj.createElement('div');
    container.className = 'container';

    const searchBox = documentObj.createElement('div');
    searchBox.className = 'search-box';

    const searchRow = documentObj.createElement('div');
    searchRow.className = 'search-row';

    const input = documentObj.createElement('input');
    input.className = 'search-input';
    input.placeholder = 'Search vocabulary (Esc to close)...';
    input.type = 'text';

    const hint = documentObj.createElement('span');
    hint.className = 'shortcut-hint';
    hint.textContent = 'Auto searching...';

    searchRow.appendChild(input);
    searchRow.appendChild(hint);

    const suggestionsArea = documentObj.createElement('div');
    suggestionsArea.className = 'suggestions-area';

    searchBox.appendChild(searchRow);
    searchBox.appendChild(suggestionsArea);

    const resultsArea = documentObj.createElement('div');
    resultsArea.className = 'results-area';

    container.appendChild(searchBox);
    container.appendChild(resultsArea);

    shadow.appendChild(style);
    shadow.appendChild(container);

    overlayElement.addEventListener('click', (e) => {
      const path = e.composedPath();
      if (path[0] === overlayElement) {
        hide();
      }
    });

    const updateSuggestions = (query = '') => {
      suggestionsArea.replaceChildren();
      const suggestions = historyAdapter?.getSearchSuggestions?.(query, 5) ?? [];
      suggestions.forEach((word) => {
        const chip = documentObj.createElement('button');
        chip.className = 'history-chip';
        chip.textContent = word;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          input.value = word;
          performSearch(word, resultsArea);
          suggestionsArea.replaceChildren();
        });
        suggestionsArea.appendChild(chip);
      });
    };

    let debounceTimer = null;
    input.addEventListener('input', () => {
      const value = input.value.trim();
      clearTimeout(debounceTimer);
      updateSuggestions(value);

      if (!value) {
        resultsArea.replaceChildren();
        return;
      }

      debounceTimer = setTimeout(() => {
        performSearch(value, resultsArea);
      }, 400);
    });

    input.addEventListener('focus', () => {
      updateSuggestions(input.value.trim());
    });

    const stopProp = (e) => e.stopPropagation();
    input.addEventListener('keydown', stopProp);
    input.addEventListener('keyup', stopProp);
    input.addEventListener('keypress', stopProp);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        if (value) {
          clearTimeout(debounceTimer);
          performSearch(value, resultsArea);
          suggestionsArea.replaceChildren();
        }
      }
    });

    documentObj.body.appendChild(overlayElement);

    overlayElement._input = input;
    overlayElement._resultsArea = resultsArea;
    overlayElement._suggestionsArea = suggestionsArea;
    overlayElement._container = container;
    overlayElement._updateSuggestions = updateSuggestions;
  }

  async function performSearch(word, resultsArea, source) {
    currentHeadword = word;
    renderState({ status: 'loading' }, resultsArea);

    try {
      const response = await lookupExecutor({ headword: word, source });
      if (response && response.status === 'success') {
        const canonicalWord = response.data?.parsedPayload?.headword || word;
        if (historyAdapter?.addSearchWord) {
          await historyAdapter.addSearchWord(canonicalWord).catch(() => {});
        }
      }
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
        } else if (typeof child === 'object') {
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
        { type: 'skeleton', value: 'def-short' },
      ];
    }

    content.forEach((item) => {
      if (item.type === 'skeleton') {
        const cls = item.value === 'def-short' ? 'skeleton skeleton-def short' : `skeleton skeleton-${item.value}`;
        container.appendChild(h('div', { className: cls }));
      } else if (item.type === 'headword') {
        const activeSource = viewModel?.source || item.source || 'auto';
        const pillsBar = h('div', { className: 'vocab-source-pills-bar' });
        const label = h('span', { className: 'vocab-source-pill-label' }, UI_COPY.SOURCE_LABEL);
        pillsBar.appendChild(label);

        [
          { id: 'auto', label: '⚡ Auto' },
          { id: 'vocabulary', label: 'Vocabulary.com' },
          { id: 'freedictionary', label: 'Free Dictionary' },
          { id: 'cambridge', label: 'Cambridge 🧪' },
        ].forEach((opt) => {
          const isActive = activeSource === opt.id;
          const pill = h(
            'button',
            {
              type: 'button',
              className: `vocab-source-pill ${isActive ? 'active' : ''}`,
              title: `Switch dictionary source to ${opt.label}`,
              'data-source': opt.id,
              onClick: (e) => {
                e?.stopPropagation?.();
                if (isActive) return;
                performSearch(currentHeadword, container, opt.id);
              },
            },
            opt.label
          );
          pillsBar.appendChild(pill);
        });
        container.appendChild(pillsBar);

        const cap = item.value.charAt(0).toUpperCase() + item.value.slice(1);
        const source = viewModel?.source || item.source || 'vocabulary';
        const defaultUrl = source === 'cambridge'
          ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(viewModel?.headword || item.value || '')}`
          : `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || item.value || '')}`;
        const lookupUrl = viewModel?.lookupUrl || item.lookupUrl || defaultUrl;
        container.appendChild(
          h(
            'p',
            { className: 'vocab-popup-headword' },
            h('a', { href: lookupUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
        const textValue = typeof item.value === 'string' ? item.value.trim() : '';
        const audioObj = item.audio || {};
        const word = (viewModel?.headword || currentHeadword || '').trim();

        let hasRendered = false;

        if (audioObj.us || textValue.includes('US')) {
          let usText = 'US';
          const usMatch = textValue.match(/US\s*([^·]+)/);
          if (usMatch && usMatch[1].trim()) {
            usText = `US ${usMatch[1].trim()}`;
          } else if (textValue && !textValue.includes('UK')) {
            usText = textValue.startsWith('US') ? textValue : `US ${textValue}`;
          }

          pronContainer.appendChild(h('span', {}, usText));
          pronContainer.appendChild(
            h('button', {
              title: 'US pronunciation',
              ariaLabel: 'US pronunciation',
              className: 'vocab-popup-audio-btn',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                playAudioWithFallback(audioObj.us, word, 'en-US');
              },
            })
          );
          hasRendered = true;
        }

        if (audioObj.uk || textValue.includes('UK')) {
          let ukText = 'UK';
          const ukMatch = textValue.match(/UK\s*([^·]+)/);
          if (ukMatch && ukMatch[1].trim()) {
            ukText = `UK ${ukMatch[1].trim()}`;
          } else if (textValue && !textValue.includes('US')) {
            ukText = textValue.startsWith('UK') ? textValue : `UK ${textValue}`;
          }

          pronContainer.appendChild(h('span', {}, ukText));
          pronContainer.appendChild(
            h('button', {
              title: 'UK pronunciation',
              ariaLabel: 'UK pronunciation',
              className: 'vocab-popup-audio-btn',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                playAudioWithFallback(audioObj.uk, word, 'en-GB');
              },
            })
          );
          hasRendered = true;
        }

        if (!hasRendered) {
          if (textValue) {
            pronContainer.appendChild(h('span', {}, textValue));
          }
          pronContainer.appendChild(
            h('button', {
              title: 'Listen pronunciation',
              ariaLabel: 'Listen pronunciation',
              className: 'vocab-popup-audio-btn',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                playAudioWithFallback(audioObj.us || audioObj.uk, word, 'en-US');
              },
            })
          );
        }

        container.appendChild(pronContainer);
      } else if (item.type === 'word-family') {
        const familyList = Array.isArray(item.value) ? item.value : [];
        if (familyList.length > 0) {
          const currentHw = (currentHeadword || '').toLowerCase();
          const details = h('details', { className: 'vocab-details' });
          const summary = h(
            'summary',
            {},
            h('span', { className: 'vocab-details-label' }, `✭ Word Family (${familyList.length})`),
            h('span', { className: 'collapse-icon' }, '▶')
          );
          const contentDiv = h('div', { className: 'details-content' });
          const group = h('div', { className: 'vocab-word-family-group' });

          familyList.forEach((fam) => {
            const famWord = typeof fam === 'string' ? fam : fam.word;
            const isInflected = isInflectedForm(famWord, currentHw);
            const chip = h(
              'button',
              {
                className: isInflected ? 'vocab-family-chip disabled-inflection' : 'vocab-family-chip',
                title: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
                ariaLabel: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
                disabled: isInflected,
                onClick: (e) => {
                  e.stopPropagation();
                  if (isInflected) return;
                  if (overlayElement?._input) {
                    overlayElement._input.value = famWord;
                  }
                  performSearch(famWord, container);
                },
              },
              famWord
            );
            group.appendChild(chip);
          });

          contentDiv.appendChild(group);
          details.appendChild(summary);
          details.appendChild(contentDiv);
          container.appendChild(details);
        }
      } else if (item.type === 'definition') {
        const defs = Array.isArray(item.value) ? item.value : [item.value];
        defs.forEach((defHtml) => {
          if (defHtml) container.appendChild(h('div', { className: 'vocab-popup-definition', innerHTML: defHtml }));
        });
      } else if (item.type === 'title') {
        container.appendChild(h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, item.value));
      } else if (item.type === 'message') {
        container.appendChild(h('div', {}, item.value));
      } else if (item.type === 'compliance-footer') {
        container.appendChild(
          h(
            'div',
            { className: 'vocab-popup-compliance-footer' },
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
    overlayElement._updateSuggestions?.('');

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
