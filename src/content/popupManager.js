import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

const backSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 12H5M12 19l-7-7 7-7"/>
</svg>`;

const forwardSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 12h14M12 5l7 7-7 7"/>
</svg>`;

export function createPopupManager({ documentObj, windowObj, onLookupWord, historyAdapter } = {}) {
  let popupElement = null;
  let popupCtrl = null;
  let absoluteSelectionRect = null;
  let isListening = false;

  let navigationStack = [];
  let currentIndex = -1;

  const handleScrollResize = () => {
    if (popupElement && absoluteSelectionRect) {
      updatePopupPosition();
    }
  };

  let throttleTimeout = null;
  const throttledHandleScrollResize = () => {
    if (throttleTimeout) return;
    throttleTimeout = setTimeout(() => {
      handleScrollResize();
      throttleTimeout = null;
    }, 50);
  };

  function removePopup() {
    if (popupElement && popupElement.parentNode) {
      windowObj.removeEventListener('scroll', throttledHandleScrollResize, true);
      windowObj.removeEventListener('resize', throttledHandleScrollResize, true);
      isListening = false;
      popupElement.parentNode.removeChild(popupElement);
      popupElement = null;
      popupCtrl = null;
      navigationStack = [];
      currentIndex = -1;
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

      .vocab-popup {
        max-height: 340px;
        min-height: 120px;
        overflow-y: auto;
      }

      .vocab-popup-theme {
        background: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        border-radius: 12px;
        padding: 12px 14px;
        max-width: 390px;
        min-width: 260px;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        font-size: 15px;
        color: #222;
        transition: opacity 0.15s;
      }

      /* Header Bar & Navigation */
      .vocab-popup-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f3f4f6;
      }

      .vocab-nav-group {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .vocab-nav-btn {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        cursor: pointer;
        padding: 3px 6px;
        color: #4b5563;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.15s, color 0.15s;
      }
      .vocab-nav-btn:hover:not(:disabled) {
        background-color: #f3f4f6;
        color: #111827;
      }
      .vocab-nav-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        border-color: #f3f4f6;
      }

      .vocab-history-slide {
        display: flex;
        align-items: center;
        gap: 5px;
        overflow-x: auto;
        scrollbar-width: none;
        flex: 1;
        min-width: 0;
      }
      .vocab-history-slide::-webkit-scrollbar {
        display: none;
      }

      .vocab-history-chip {
        background: #f3f4f6;
        color: #374151;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 12px;
        white-space: nowrap;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background-color 0.15s, color 0.15s;
        flex-shrink: 0;
      }
      .vocab-history-chip:hover {
        background: #e0e7ff;
        color: #3730a3;
      }
      .vocab-history-chip.active {
        background: #dbeafe;
        color: #1d4ed8;
        border-color: #93c5fd;
        font-weight: 600;
      }

      .vocab-popup-close-btn {
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
        flex-shrink: 0;
      }
      .vocab-popup-close-btn:hover {
        background-color: #f3f4f6;
        color: #4b5563;
      }

      /* Content Elements */
      .vocab-popup-theme .head-word:hover {
        text-decoration: underline;
      }
      .vocab-popup-theme .head-word {
        text-decoration: none;
      }
      .vocab-popup-headword {
        font-size: 26px;
        font-weight: 700;
        margin: 0 0 6px;
        color: #1677C9;
      }
      .vocab-popup-pronunciation {
        color: #4B5563;
        font-size: 13px;
        margin-bottom: 8px;
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
        font-size: 14px;
        line-height: 1.5;
        margin: 8px 0;
      }
      .vocab-popup-title {
        font-weight: bold;
      }
      .vocab-popup-search-suggestions {
        margin-top: 10px;
        font-size: 13px;
        color: #4B5563;
      }
      .vocab-popup-guidance-list {
        margin: 8px 0;
      }
      .vocab-popup-cta {
        margin-top: 8px;
      }
      .vocab-popup-compliance-footer {
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-top: 1px solid #f3f4f6;
        padding-top: 6px;
      }
      .vocab-popup-attribution {
        margin-top: 0;
        font-size: 11px;
      }
      .vocab-popup-permission-disclosure {
        font-size: 11px;
        margin-top: 0;
      }

      /* Details & Summary custom styles */
      details.vocab-details {
        margin-bottom: 8px;
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        padding: 6px 8px;
        background: #fff;
      }
      details.vocab-details summary {
        cursor: pointer;
        list-style: none;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }
      details.vocab-details summary::-webkit-details-marker {
        display: none;
      }
      details.vocab-details .vocab-details-label {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        background: #e0e7ff;
        color: #3730a3;
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 8px;
        margin-right: 8px;
        vertical-align: middle;
      }
      details.vocab-details .collapse-icon {
        display: inline-block;
        transition: transform 0.2s ease;
        color: #9ca3af;
        font-size: 10px;
      }
      details.vocab-details[open] .collapse-icon {
        transform: rotate(90deg);
      }
      details.vocab-details .details-content {
        margin-top: 6px;
        color: #4b5563;
        font-size: 13px;
        line-height: 1.5;
      }
      details.vocab-details .details-content p {
        margin: 0;
      }

      /* Word Family Section */
      .vocab-word-family-group {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .vocab-family-chip {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
      }
      .vocab-family-chip:hover {
        background: #dcfce7;
        color: #14532d;
        border-color: #86efac;
      }

      /* Dark mode styles */
      .vocab-popup.dark-mode {
        background: #1f2937;
        color: #f3f4f6;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
      .vocab-popup.dark-mode .vocab-popup-headword {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-popup-header-bar {
        border-bottom-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-nav-btn {
        border-color: #4b5563;
        color: #d1d5db;
      }
      .vocab-popup.dark-mode .vocab-nav-btn:hover:not(:disabled) {
        background-color: #374151;
        color: #fff;
      }
      .vocab-popup.dark-mode .vocab-nav-btn:disabled {
        border-color: #374151;
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-history-chip {
        background: #374151;
        color: #d1d5db;
      }
      .vocab-popup.dark-mode .vocab-history-chip:hover {
        background: #1e3a8a;
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .vocab-history-chip.active {
        background: #1e3a8a;
        color: #93c5fd;
        border-color: #3b82f6;
      }
      .vocab-popup.dark-mode .vocab-family-chip {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #047857;
      }
      .vocab-popup.dark-mode .vocab-family-chip:hover {
        background: #065f46;
        color: #d1fae5;
      }
      .vocab-popup.dark-mode .vocab-popup-pronunciation,
      .vocab-popup.dark-mode .vocab-popup-audio-btn,
      .vocab-popup.dark-mode .vocab-popup-search-suggestions,
      .vocab-popup.dark-mode .details-content {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-popup-compliance-footer {
        border-top-color: #374151;
      }
      .vocab-popup.dark-mode details.vocab-details {
        background: #111827;
        border-color: #374151;
      }
      .vocab-popup.dark-mode details.vocab-details summary {
        color: #e5e7eb;
      }
      .vocab-popup.dark-mode details.vocab-details .vocab-details-label {
        background: #1e3a8a;
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .skeleton {
        background: #374151;
        background-image: linear-gradient(to right, #374151 0%, #4b5563 20%, #374151 40%, #374151 100%);
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(popupContainer);

    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'pointerdown'].forEach((evt) => {
      popupElement.addEventListener(evt, (e) => e.stopPropagation());
    });
    documentObj.body.appendChild(popupElement);
    popupElement._vocabShadow = shadow;
    popupElement._vocabContainer = popupContainer;
    return popupElement;
  }

  function updatePopupPosition() {
    if (!popupElement || !absoluteSelectionRect) return;

    const popupWidth = popupElement.offsetWidth;
    const popupHeight = popupElement.offsetHeight;
    const viewport = {
      width: windowObj.innerWidth,
      height: windowObj.innerHeight,
      scrollX: windowObj.scrollX,
      scrollY: windowObj.scrollY,
    };

    let left = absoluteSelectionRect.left;
    let top = absoluteSelectionRect.bottom + 8;

    if (top + popupHeight > viewport.scrollY + viewport.height) {
      const aboveTop = absoluteSelectionRect.top - popupHeight - 8;
      if (aboveTop >= viewport.scrollY) {
        top = aboveTop;
      } else {
        top = viewport.scrollY + viewport.height - popupHeight - 8;
      }
    }

    if (top < viewport.scrollY) top = viewport.scrollY + 8;

    if (left + popupWidth > viewport.scrollX + viewport.width) {
      left = viewport.scrollX + viewport.width - popupWidth - 8;
    }
    if (left < viewport.scrollX) left = viewport.scrollX + 8;

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
    popupElement.style.maxWidth = `${Math.min(390, viewport.width - 16)}px`;
  }

  function navigateToWord(word) {
    if (!word || typeof word !== 'string') return;
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    if (navigationStack[currentIndex] !== normalized) {
      navigationStack = [...navigationStack.slice(0, currentIndex + 1), normalized];
      currentIndex = navigationStack.length - 1;
    }

    if (typeof onLookupWord === 'function') {
      onLookupWord(normalized);
    }
  }

  function renderPopupContent(state) {
    if (!popupElement) return;
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
        { type: 'skeleton', value: 'def-short' },
      ];
    }

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
    }

    // 1. Render Header Bar: Back, Forward, Slide history, Close
    const currentWord = (viewModel?.headword || state.headword || navigationStack[currentIndex] || '').toLowerCase();
    const recentWords = historyAdapter?.getRecentSearchWords?.(5) ?? navigationStack.slice(-5);

    const headerBar = h('div', { className: 'vocab-popup-header-bar' });

    // Nav buttons
    const navGroup = h('div', { className: 'vocab-nav-group' });
    const backBtn = h('button', {
      className: 'vocab-nav-btn',
      title: 'Quay lại từ trước',
      disabled: currentIndex <= 0,
      innerHTML: backSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        if (currentIndex > 0) {
          currentIndex--;
          const prevWord = navigationStack[currentIndex];
          if (typeof onLookupWord === 'function') {
            onLookupWord(prevWord);
          }
        }
      },
    });

    const forwardBtn = h('button', {
      className: 'vocab-nav-btn',
      title: 'Đi tới từ tiếp theo',
      disabled: currentIndex >= navigationStack.length - 1,
      innerHTML: forwardSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        if (currentIndex < navigationStack.length - 1) {
          currentIndex++;
          const nextWord = navigationStack[currentIndex];
          if (typeof onLookupWord === 'function') {
            onLookupWord(nextWord);
          }
        }
      },
    });

    navGroup.appendChild(backBtn);
    navGroup.appendChild(forwardBtn);
    headerBar.appendChild(navGroup);

    // Slide history chips
    const slideContainer = h('div', { className: 'vocab-history-slide' });
    recentWords.forEach((word) => {
      const chip = h(
        'span',
        {
          className: `vocab-history-chip ${word.toLowerCase() === currentWord ? 'active' : ''}`,
          onClick: (e) => {
            e?.stopPropagation?.();
            navigateToWord(word);
          },
        },
        word
      );
      slideContainer.appendChild(chip);
    });
    headerBar.appendChild(slideContainer);

    // Close button
    const closeBtn = h('button', {
      className: 'vocab-popup-close-btn',
      title: 'Đóng popup',
      ariaLabel: 'Close popup',
      innerHTML: closeSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        if (popupCtrl) {
          popupCtrl.close('close-button');
        } else {
          removePopup();
        }
      },
    });
    headerBar.appendChild(closeBtn);

    popupContainer.appendChild(headerBar);

    // 2. Render Main Body Content
    content.forEach((item) => {
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
        const cap =
          typeof item.value === 'string' && item.value.length > 0
            ? item.value.charAt(0).toUpperCase() + item.value.slice(1)
            : item.value;
        const vocabUrl = `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || '')}`;
        popupContainer.appendChild(
          h(
            'p',
            { className: 'vocab-popup-headword' },
            h('a', { href: vocabUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
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
                  new Audio(item.audio.us).play().catch((err) => console.warn('Audio play failed', err));
                },
              })
            );
          }
        }
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
                  new Audio(item.audio.uk).play().catch((err) => console.warn('Audio play failed', err));
                },
              })
            );
          }
        }
        if (!(item.audio && (item.audio.us || item.audio.uk))) {
          pronContainer.appendChild(h('span', {}, item.value));
        }
        popupContainer.appendChild(pronContainer);
      } else if (item.type === 'word-family') {
        const familyList = Array.isArray(item.value) ? item.value : [];
        if (familyList.length > 0) {
          const details = h('details', { className: 'vocab-details', open: '' });
          const summary = h(
            'summary',
            {},
            h('span', { className: 'vocab-details-label' }, '✭ Word Family'),
            h('span', { className: 'collapse-icon' }, '▶')
          );
          const contentDiv = h('div', { className: 'details-content' });
          const group = h('div', { className: 'vocab-word-family-group' });

          familyList.forEach((fam) => {
            const famWord = typeof fam === 'string' ? fam : fam.word;
            const chip = h(
              'button',
              {
                className: 'vocab-family-chip',
                title: `Tra cứu từ ${famWord}`,
                onClick: (e) => {
                  e?.stopPropagation?.();
                  navigateToWord(famWord);
                },
              },
              famWord
            );
            group.appendChild(chip);
          });

          contentDiv.appendChild(group);
          details.appendChild(summary);
          details.appendChild(contentDiv);
          details.addEventListener('toggle', () => updatePopupPosition());
          popupContainer.appendChild(details);
        }
      } else if (item.type === 'definition') {
        const defs = Array.isArray(item.value) ? item.value : [item.value];
        defs.forEach((defHtml) => {
          if (defHtml) {
            const defContainer = h('div', { className: 'vocab-popup-definition', innerHTML: defHtml });
            const detailsElements = defContainer.querySelectorAll('details.vocab-details');
            detailsElements.forEach((details) => {
              details.addEventListener('toggle', () => {
                updatePopupPosition();
              });
            });
            popupContainer.appendChild(defContainer);
          }
        });
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
        item.value.forEach((g) => ul.appendChild(h('li', {}, g)));
        popupContainer.appendChild(ul);
      } else if (item.type === 'cta') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-cta' }, h('button', {}, item.value)));
      } else if (item.type === 'compliance-footer') {
        popupContainer.appendChild(
          h(
            'div',
            { className: 'vocab-popup-compliance-footer' },
            h('div', { className: 'vocab-popup-attribution', innerHTML: item.value.attribution }),
            h('div', { className: 'vocab-popup-permission-disclosure', innerHTML: item.value.disclosure })
          )
        );
      }
    });

    updatePopupPosition();
  }

  function showPopup(state, selectionRect, { darkMode = false } = {}) {
    if (selectionRect) {
      absoluteSelectionRect = {
        left: selectionRect.left + windowObj.scrollX,
        top: selectionRect.top + windowObj.scrollY,
        bottom: selectionRect.bottom + windowObj.scrollY,
        right: selectionRect.right + windowObj.scrollX,
        width: selectionRect.width,
        height: selectionRect.height,
      };
    }

    const word = (
      state.headword ||
      state.data?.parsedPayload?.headword ||
      state.data?.headword ||
      ''
    )
      .trim()
      .toLowerCase();

    if (word) {
      if (navigationStack.length === 0) {
        navigationStack = [word];
        currentIndex = 0;
      } else if (navigationStack[currentIndex] !== word) {
        navigationStack = [...navigationStack.slice(0, currentIndex + 1), word];
        currentIndex = navigationStack.length - 1;
      }
    }

    createPopup();

    const popupContainer = popupElement._vocabContainer;
    if (darkMode) {
      popupContainer.classList.add('dark-mode');
    } else {
      popupContainer.classList.remove('dark-mode');
    }

    renderPopupContent(state);

    if (!isListening) {
      windowObj.addEventListener('scroll', throttledHandleScrollResize, true);
      windowObj.addEventListener('resize', throttledHandleScrollResize, true);
      isListening = true;
    }

    if (!popupCtrl) {
      popupCtrl = createPopupController({
        eventTarget: documentObj,
        popupElement,
        onClose: ({ reason }) => {
          removePopup();
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
    removePopup,
  };
}
