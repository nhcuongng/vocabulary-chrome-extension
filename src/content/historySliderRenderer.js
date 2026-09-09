export const prevSlideSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 18 9 12 15 6"></polyline>
</svg>`;

export const nextSlideSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>`;

export const SOURCE_SHORT_NAMES = Object.freeze({
  vocabulary: 'Vocab.com',
  freedictionary: 'FreeDict',
});

export const SOURCE_META = Object.freeze({
  vocabulary: {
    id: 'vocabulary',
    name: '📘 Vocabulary.com',
    shortName: 'Vocab.com',
    hint: 'Detailed explanations & word family',
  },
  freedictionary: {
    id: 'freedictionary',
    name: '⚡ Simple Learn (FreeDict)',
    shortName: 'FreeDict',
    hint: 'Quick, concise definitions with audio',
  },
});

export const miniCloseSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

export const clockSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <polyline points="12 6 12 12 16 14"></polyline>
</svg>`;

export const UI_COPY = {
  PREV_SLIDE: 'Previous slide',
  NEXT_SLIDE: 'Next slide',
  LOOKUP_WORD: (word) => `Look up "${word}"`,
  SEARCH_WORD: (word) => `Search ${word}`,
  HISTORY_TITLE: 'Recent searches',
  NO_RECENT_SEARCHES: 'No recent searches',
  SEARCH_HISTORY_PLACEHOLDER: 'Filter history...',
  CLOSE_HISTORY: 'Close history',
  SIMPLE_LEARN_TITLE: 'Simple Learn Mode: ON (FreeDictionary) / OFF (Vocabulary.com)',
  SIMPLE_LEARN_LABEL: 'Simple Learn',
  CLOSE_POPUP: 'Close popup',
  SOURCE_LABEL: 'Source:',
  INFLECTED_FORM_TOOLTIP: (word) => `${word} (inflected form)`,
  LOOKUP_FAMILY_TOOLTIP: (word) => `Look up ${word}`,
};

/**
 * Creates and returns an accessible History Slider DOM element with pagination buttons and chips.
 *
 * @param {Object} options
 * @param {Document} options.documentObj - Document object
 * @param {string[]} options.allWords - List of history words
 * @param {string} [options.currentWord] - Currently active/selected word
 * @param {number} [options.currentSlideIndex=0] - Current pagination index
 * @param {number} [options.itemsPerPage=5] - Number of chips per page
 * @param {Function} options.onSelectWord - Callback when a chip is clicked
 * @param {Function} options.onSlideChange - Callback when prev/next button is clicked
 * @param {Function} [options.h] - Optional custom DOM creator function
 * @returns {HTMLElement} The slider wrapper DOM element
 */
export function createHistorySliderElement({
  documentObj = globalThis.document,
  allWords = [],
  currentWord = '',
  currentSlideIndex = 0,
  itemsPerPage = 5,
  onSelectWord,
  onSlideChange,
  h,
}) {
  const normalizedCurrentWord = (currentWord || '').trim().toLowerCase();
  const validWords = Array.isArray(allWords) ? allWords : [];

  const defaultH = (tag, props, ...children) => {
    const el = documentObj.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'className') {
          el.className = value;
        } else if (key === 'innerHTML') {
          el.innerHTML = value;
        } else if (key === 'disabled') {
          if (value) el.setAttribute('disabled', '');
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
        if (typeof documentObj.createTextNode === 'function') {
          el.appendChild(documentObj.createTextNode(String(child)));
        } else {
          el.textContent = String(child);
        }
      } else if (typeof child === 'object') {
        el.appendChild(child);
      }
    }
    return el;
  };

  const createEl = typeof h === 'function' ? h : defaultH;

  const sliderWrapper = createEl('div', { className: 'vocab-history-slider-wrapper' });

  if (validWords.length === 0) {
    const emptySlide = createEl('div', { className: 'vocab-history-slide' });
    sliderWrapper.appendChild(emptySlide);
    return sliderWrapper;
  }

  const totalPages = Math.max(1, Math.ceil(validWords.length / itemsPerPage));
  let safeSlideIndex = currentSlideIndex;
  if (safeSlideIndex >= totalPages) {
    safeSlideIndex = Math.max(0, totalPages - 1);
  } else if (safeSlideIndex < 0) {
    safeSlideIndex = 0;
  }

  const startIndex = safeSlideIndex * itemsPerPage;
  const visibleWords = validWords.slice(startIndex, startIndex + itemsPerPage);

  const prevBtn = createEl('button', {
    type: 'button',
    className: 'vocab-slide-nav-btn',
    title: UI_COPY.PREV_SLIDE,
    ariaLabel: UI_COPY.PREV_SLIDE,
    disabled: safeSlideIndex <= 0,
    innerHTML: prevSlideSVG,
    onClick: (e) => {
      e?.stopPropagation?.();
      if (safeSlideIndex > 0) {
        onSlideChange?.(safeSlideIndex - 1);
      }
    },
  });

  const slideContainer = createEl('div', {
    className: 'vocab-history-slide',
    onWheel: (e) => {
      if (e && typeof e.deltaY === 'number' && Math.abs(e.deltaY) > Math.abs(e.deltaX || 0)) {
        if (typeof slideContainer.scrollBy === 'function') {
          slideContainer.scrollBy({ left: e.deltaY, behavior: 'auto' });
        } else if (typeof slideContainer.scrollLeft === 'number') {
          slideContainer.scrollLeft += e.deltaY;
        }
        e.preventDefault?.();
      }
    },
  });

  visibleWords.forEach((word) => {
    const isActive = word.toLowerCase() === normalizedCurrentWord;
    const chip = createEl(
      'button',
      {
        type: 'button',
        className: `vocab-history-chip ${isActive ? 'active' : ''}`,
        title: UI_COPY.LOOKUP_WORD(word),
        ariaLabel: UI_COPY.LOOKUP_WORD(word),
        onClick: (e) => {
          e?.stopPropagation?.();
          onSelectWord?.(word);
        },
      },
      word
    );
    slideContainer.appendChild(chip);
  });

  const nextBtn = createEl('button', {
    type: 'button',
    className: 'vocab-slide-nav-btn',
    title: UI_COPY.NEXT_SLIDE,
    ariaLabel: UI_COPY.NEXT_SLIDE,
    disabled: safeSlideIndex >= totalPages - 1,
    innerHTML: nextSlideSVG,
    onClick: (e) => {
      e?.stopPropagation?.();
      if (safeSlideIndex < totalPages - 1) {
        onSlideChange?.(safeSlideIndex + 1);
      }
    },
  });

  sliderWrapper.appendChild(prevBtn);
  sliderWrapper.appendChild(slideContainer);
  sliderWrapper.appendChild(nextBtn);

  return sliderWrapper;
}

/**
 * Creates and returns a History Dropdown/Popover DOM element.
 *
 * @param {Object} options
 * @param {Document} options.documentObj
 * @param {string[]} options.allWords
 * @param {string} [options.currentWord]
 * @param {boolean} [options.isOpen=false]
 * @param {Function} options.onToggleOpen
 * @param {Function} options.onSelectWord
 * @param {Function} [options.h]
 * @returns {HTMLElement}
 */
export function createHistoryMenuElement({
  documentObj = globalThis.document,
  allWords = [],
  currentWord = '',
  isOpen = false,
  onToggleOpen,
  onSelectWord,
  h,
}) {
  const normalizedCurrentWord = (currentWord || '').trim().toLowerCase();
  const validWords = Array.isArray(allWords) ? allWords : [];

  const defaultH = (tag, props, ...children) => {
    const el = documentObj.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'className') {
          el.className = value;
        } else if (key === 'innerHTML') {
          el.innerHTML = value;
        } else if (key === 'disabled') {
          if (value) el.setAttribute('disabled', '');
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
        if (typeof documentObj.createTextNode === 'function') {
          el.appendChild(documentObj.createTextNode(String(child)));
        } else {
          el.textContent = String(child);
        }
      } else if (typeof child === 'object') {
        el.appendChild(child);
      }
    }
    return el;
  };

  const createEl = typeof h === 'function' ? h : defaultH;

  const container = createEl('div', { className: 'vocab-history-menu-container' });

  const btn = createEl('button', {
    type: 'button',
    className: `vocab-history-menu-btn ${isOpen ? 'active' : ''}`,
    title: `${UI_COPY.HISTORY_TITLE} (${validWords.length})`,
    ariaLabel: `${UI_COPY.HISTORY_TITLE} (${validWords.length})`,
    innerHTML: clockSVG,
    onClick: (e) => {
      e?.stopPropagation?.();
      onToggleOpen?.(!isOpen);
    },
  });

  if (validWords.length > 0) {
    const countBadge = createEl('span', { className: 'vocab-history-menu-badge' }, String(validWords.length));
    btn.appendChild(countBadge);
  }

  container.appendChild(btn);

  if (isOpen) {
    const popover = createEl('div', {
      className: 'vocab-history-menu-popover vocab-content-fade-in',
      onClick: (e) => e?.stopPropagation?.(),
    });

    const popoverCloseBtn = createEl('button', {
      type: 'button',
      className: 'vocab-history-popover-close-btn',
      title: UI_COPY.CLOSE_HISTORY,
      ariaLabel: UI_COPY.CLOSE_HISTORY,
      innerHTML: miniCloseSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        onToggleOpen?.(false);
      },
    });

    const popoverHeader = createEl(
      'div',
      { className: 'vocab-history-popover-header' },
      createEl('span', { className: 'vocab-history-popover-title' }, UI_COPY.HISTORY_TITLE),
      popoverCloseBtn
    );
    popover.appendChild(popoverHeader);

    const listContainer = createEl('div', { className: 'vocab-history-popover-list' });

    let activeItemEl = null;
    if (validWords.length === 0) {
      const emptyItem = createEl('div', { className: 'vocab-history-popover-empty' }, UI_COPY.NO_RECENT_SEARCHES);
      listContainer.appendChild(emptyItem);
    } else {
      validWords.forEach((word, idx) => {
        const isActive = word.toLowerCase() === normalizedCurrentWord;
        const item = createEl(
          'button',
          {
            type: 'button',
            className: `vocab-history-popover-item ${isActive ? 'active' : ''}`,
            title: UI_COPY.LOOKUP_WORD(word),
            onClick: (e) => {
              e?.stopPropagation?.();
              onToggleOpen?.(false);
              onSelectWord?.(word);
            },
          },
          createEl('span', { className: 'vocab-history-item-index' }, `${idx + 1}.`),
          createEl('span', { className: 'vocab-history-item-word' }, word)
        );
        if (isActive) {
          activeItemEl = item;
        }
        listContainer.appendChild(item);
      });
    }

    popover.appendChild(listContainer);
    container.appendChild(popover);

    if (activeItemEl) {
      const scrollActive = () => {
        if (typeof activeItemEl.scrollIntoView === 'function') {
          activeItemEl.scrollIntoView({ block: 'nearest' });
        } else if (typeof listContainer.scrollTop === 'number' && typeof activeItemEl.offsetTop === 'number') {
          listContainer.scrollTop = activeItemEl.offsetTop;
        }
      };

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(scrollActive);
      } else if (typeof setTimeout === 'function') {
        setTimeout(scrollActive, 0);
      } else {
        scrollActive();
      }
    }
  }

  return container;
}

