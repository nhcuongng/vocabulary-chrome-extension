export const prevSlideSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 18 9 12 15 6"></polyline>
</svg>`;

export const nextSlideSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>`;

export const SOURCE_SHORT_NAMES = Object.freeze({
  vocabulary: 'Vocab.com',
  freedictionary: 'FreeDict',
  cambridge: 'Cambridge',
});

export const SOURCE_META = Object.freeze({
  vocabulary: {
    id: 'vocabulary',
    name: '📘 Vocabulary.com',
    shortName: 'Vocab.com',
    hint: 'Explanations & word family',
  },
  freedictionary: {
    id: 'freedictionary',
    name: '🆓 Free Dictionary API',
    shortName: 'FreeDict',
    hint: 'Free dictionary with audio',
  },
  cambridge: {
    id: 'cambridge',
    name: '🏛 Cambridge Dictionary',
    shortName: 'Cambridge',
    hint: 'Native UK/US audio & IPA',
    badge: '🧪',
  },
});

export function buildAutoSourceHint(order = []) {
  const list = Array.isArray(order) && order.length > 0 ? order : ['vocabulary', 'freedictionary', 'cambridge'];
  return list.map((id) => SOURCE_SHORT_NAMES[id] || id).join(' → ');
}

export const UI_COPY = {
  PREV_SLIDE: 'Previous slide',
  NEXT_SLIDE: 'Next slide',
  LOOKUP_WORD: (word) => `Look up "${word}"`,
  SEARCH_WORD: (word) => `Search ${word}`,
  SOURCE_MENU_TITLE: 'Dictionary Source',
  AUTO_ORDER_TITLE: 'Auto Priority (Drag to reorder):',
  SELECT_SOURCE_TITLE: 'Select dictionary source',
  CLOSE_POPUP: 'Close popup',
  SOURCE_LABEL: 'Source:',
  INFLECTED_FORM_TOOLTIP: (word) => `${word} (inflected form)`,
  LOOKUP_FAMILY_TOOLTIP: (word) => `Look up ${word}`,
  DICTIONARY_SOURCE_OPTIONS: [
    { id: 'auto', name: '⚡ Auto', hint: 'Vocab.com → FreeDict → Cambridge' },
    { id: 'vocabulary', name: '📘 Vocabulary.com', hint: 'Explanations & word family' },
    { id: 'freedictionary', name: '🆓 Free Dictionary API', hint: 'Free dictionary with audio' },
    { id: 'cambridge', name: '🏛 Cambridge Dictionary', hint: 'Native UK/US audio & IPA', badge: '🧪' },
  ],
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
        el.textContent = String(child);
        if (typeof documentObj.createTextNode === 'function') {
          el.appendChild(documentObj.createTextNode(String(child)));
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
