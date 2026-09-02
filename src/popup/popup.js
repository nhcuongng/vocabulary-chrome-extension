import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { createAutoPopupSettingsPanel } from '../application/autoPopupSettingsPanel.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';
import { createChromeStorageHistoryAdapter } from '../infrastructure/adapters/chromeStorageHistoryAdapter.js';
import {
  renderSuccessContent,
  renderNotFoundContent,
  renderErrorContent,
} from '../content/popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';
import { isInflectedForm } from '../domain/wordInflectionUtils.js';
import {
  playAudioWithFallback,
  speakWord,
  stopCurrentAudio,
} from '../domain/audioPlaybackUtils.js';
import {
  createHistorySliderElement,
  buildAutoSourceHint,
  SOURCE_META,
} from '../content/historySliderRenderer.js';
import { createZeroStateElement } from './popupZeroStateRenderer.js';
import { DEFAULT_AUTO_SOURCE_ORDER } from '../shared/userSettings.js';
import {
  generateStressSvg,
  generateEqualizerBarsSvg,
  PITCH_LEVELS,
} from '../domain/stressDiagramUtils.js';

function renderStatus(targetElement, enabled) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = enabled
    ? 'Auto-popup is enabled: select text on pages to look up immediately.'
    : 'Auto-popup is disabled: you can enable it anytime.';
}

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

const waveformSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 10v3"></path>
  <path d="M6 6v11"></path>
  <path d="M10 3v18"></path>
  <path d="M14 8v7"></path>
  <path d="M18 5v13"></path>
  <path d="M22 10v3"></path>
</svg>`;

async function bootstrapPopupRuntime({
  chromeApi = globalThis.chrome,
  documentObj = globalThis.document,
} = {}) {
  const toggleElement = documentObj.getElementById('auto-popup-toggle');
  const darkModeToggleElement = documentObj.getElementById('dark-mode-toggle');
  const dictionarySourceSelect = documentObj.getElementById('dictionary-source-select');
  const statusElement = documentObj.getElementById('auto-popup-status');
  const attributionElement = documentObj.getElementById('attribution');
  const disclosureElement = documentObj.getElementById('disclosure');
  const searchInput = documentObj.getElementById('vocab-search-input');
  const searchClearBtn = documentObj.getElementById('vocab-search-clear');
  const historySliderContainer = documentObj.getElementById('vocab-history-slider-wrapper');
  const searchResultsContainer = documentObj.getElementById('vocab-search-results');
  const zeroStateContainer = documentObj.getElementById('vocab-zero-state-container');
  const sourceMenuBtn = documentObj.getElementById('vocab-source-menu-btn');
  const sourceMenuPopover = documentObj.getElementById('vocab-source-menu-popover');
  const autoSourceHint = documentObj.getElementById('vocab-auto-source-hint');
  const autoOrderList = documentObj.getElementById('vocab-auto-order-list');
  const settingsMenuBtn = documentObj.getElementById('vocab-settings-menu-btn');
  const settingsMenuPopover = documentObj.getElementById('vocab-settings-menu-popover');

  if (!toggleElement) {
    throw new Error('missing #auto-popup-toggle');
  }

  if (!darkModeToggleElement) {
    throw new Error('missing #dark-mode-toggle');
  }

  if (attributionElement) {
    attributionElement.textContent = buildAttributionText();
  }
  if (disclosureElement) {
    disclosureElement.textContent = buildPermissionDisclosureSummary();
  }

  const settingsStore = createChromeStorageSettingsAdapter({
    storageArea: chromeApi?.storage?.local,
    storageChangeEvent: chromeApi?.storage?.onChanged,
  });

  const historyStore = createChromeStorageHistoryAdapter({
    storageArea: chromeApi?.storage?.local,
    storageChangeEvent: chromeApi?.storage?.onChanged,
  });
  await historyStore.load().catch(() => {});

  let autoPopupEnabled = true;
  let darkMode = false;
  let dictionarySource = 'auto';
  let autoSourceOrder = [...DEFAULT_AUTO_SOURCE_ORDER];
  let currentSlideIndex = 0;
  const ITEMS_PER_PAGE = 5;
  let isSourceMenuOpen = false;
  let isSettingsMenuOpen = false;
  let draggedSourceId = null;

  const updateBodyTheme = (isDark) => {
    if (isDark) {
      documentObj.body.classList.add('dark-mode');
    } else {
      documentObj.body.classList.remove('dark-mode');
    }
  };

  const updateSourceMenuUI = (source) => {
    if (dictionarySourceSelect) {
      dictionarySourceSelect.value = source;
    }
    const menuItems = documentObj.querySelectorAll('#vocab-source-menu-popover .vocab-source-menu-item');
    menuItems.forEach((item) => {
      if (item.getAttribute('data-source') === source) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  };

  const renderAutoOrderUI = (order = []) => {
    const safeOrder = Array.isArray(order) && order.length > 0 ? order : [...DEFAULT_AUTO_SOURCE_ORDER];
    if (autoSourceHint) {
      autoSourceHint.textContent = buildAutoSourceHint(safeOrder);
    }
    if (!autoOrderList) return;

    autoOrderList.replaceChildren();

    safeOrder.forEach((srcId, index) => {
      const meta = SOURCE_META[srcId] || { id: srcId, name: srcId };
      const itemEl = documentObj.createElement('div');
      itemEl.className = 'vocab-auto-order-item';
      itemEl.draggable = true;
      itemEl.setAttribute('data-source-id', srcId);
      itemEl.setAttribute('title', 'Drag to reorder priority');

      const handleEl = documentObj.createElement('span');
      handleEl.className = 'vocab-drag-handle';
      handleEl.textContent = '⋮⋮';

      const titleEl = documentObj.createElement('span');
      titleEl.className = 'vocab-auto-order-item-title';
      titleEl.textContent = meta.name;

      const rankEl = documentObj.createElement('span');
      rankEl.className = 'vocab-auto-order-item-rank';
      rankEl.textContent = `#${index + 1}`;

      itemEl.appendChild(handleEl);
      itemEl.appendChild(titleEl);
      itemEl.appendChild(rankEl);

      itemEl.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedSourceId = srcId;
        itemEl.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', srcId);
        }
      });

      itemEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
        itemEl.classList.add('drag-over');
      });

      itemEl.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        itemEl.classList.remove('drag-over');
      });

      itemEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        itemEl.classList.remove('drag-over');
        const fromId = draggedSourceId || e.dataTransfer?.getData('text/plain');
        const toId = srcId;

        if (!fromId || fromId === toId) return;

        const currentOrderList = [...autoSourceOrder];
        const fromIndex = currentOrderList.indexOf(fromId);
        const toIndex = currentOrderList.indexOf(toId);

        if (fromIndex !== -1 && toIndex !== -1) {
          const [movedItem] = currentOrderList.splice(fromIndex, 1);
          currentOrderList.splice(toIndex, 0, movedItem);

          autoSourceOrder = currentOrderList;
          await autoPopupController.setAutoSourceOrder(currentOrderList);
          renderAutoOrderUI(currentOrderList);

          if (autoPopupController.getDictionarySource() === 'auto') {
            const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
            if (currentWord) {
              performSearch(currentWord, 'auto');
            }
          }
        }
      });

      itemEl.addEventListener('dragend', (e) => {
        e.stopPropagation();
        itemEl.classList.remove('dragging');
        draggedSourceId = null;
      });

      autoOrderList.appendChild(itemEl);
    });
  };

  const autoPopupController = {
    async start() {
      const settings = await settingsStore.load();
      autoPopupEnabled = Boolean(settings?.autoPopupEnabled);
      darkMode = Boolean(settings?.darkMode);
      dictionarySource = settings?.dictionarySource || 'auto';
      autoSourceOrder = settings?.autoSourceOrder || [...DEFAULT_AUTO_SOURCE_ORDER];
      updateBodyTheme(darkMode);
      darkModeToggleElement.checked = darkMode;
      updateSourceMenuUI(dictionarySource);
      renderAutoOrderUI(autoSourceOrder);
    },
    stop() {},
    isAutoPopupEnabled() {
      return autoPopupEnabled;
    },
    isDarkMode() {
      return darkMode;
    },
    getDictionarySource() {
      return dictionarySource;
    },
    getAutoSourceOrder() {
      return autoSourceOrder;
    },
    async setAutoPopupEnabled(enabled) {
      autoPopupEnabled = Boolean(enabled);
      await settingsStore.update({ autoPopupEnabled });
    },
    async setDarkMode(enabled) {
      darkMode = Boolean(enabled);
      updateBodyTheme(darkMode);
      await settingsStore.update({ darkMode });
    },
    async setDictionarySource(source) {
      dictionarySource = source || 'auto';
      updateSourceMenuUI(dictionarySource);
      await settingsStore.update({ dictionarySource });
    },
    async setAutoSourceOrder(order) {
      autoSourceOrder = order || [...DEFAULT_AUTO_SOURCE_ORDER];
      renderAutoOrderUI(autoSourceOrder);
      await settingsStore.update({ autoSourceOrder });
    },
    subscribe(listener) {
      return settingsStore.subscribe((nextSettings) => {
        autoPopupEnabled = Boolean(nextSettings?.autoPopupEnabled);
        darkMode = Boolean(nextSettings?.darkMode);
        dictionarySource = nextSettings?.dictionarySource || 'auto';
        autoSourceOrder = nextSettings?.autoSourceOrder || [...DEFAULT_AUTO_SOURCE_ORDER];
        updateBodyTheme(darkMode);
        darkModeToggleElement.checked = darkMode;
        updateSourceMenuUI(dictionarySource);
        renderAutoOrderUI(autoSourceOrder);
        listener({ autoPopupEnabled, darkMode, dictionarySource, autoSourceOrder });
      });
    },
  };

  if (chromeApi?.tabs?.query && chromeApi?.scripting?.executeScript) {
    try {
      const [activeTab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await chromeApi.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['src/content/runtimeContentScript.js'],
        });
      }
    } catch {
      // Best-effort runtime bootstrap: popup still works even if injection fails.
    }
  }

  const panel = createAutoPopupSettingsPanel({
    toggleElement,
    autoPopupController,
  });

  const handleDarkModeChange = async () => {
    await autoPopupController.setDarkMode(darkModeToggleElement.checked);
  };
  darkModeToggleElement.addEventListener('change', handleDarkModeChange);

  // Source popover event listeners
  if (sourceMenuBtn && sourceMenuPopover) {
    sourceMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSourceMenuOpen = !isSourceMenuOpen;
      sourceMenuPopover.style.display = isSourceMenuOpen ? 'flex' : 'none';
      if (settingsMenuPopover && isSourceMenuOpen) {
        settingsMenuPopover.style.display = 'none';
        isSettingsMenuOpen = false;
      }
    });

    const menuItems = sourceMenuPopover.querySelectorAll('.vocab-source-menu-item');
    menuItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        if (e.target && typeof e.target.closest === 'function' && e.target.closest('#vocab-auto-config-btn')) {
          return;
        }
        e.stopPropagation();
        const nextSource = item.getAttribute('data-source');
        sourceMenuPopover.style.display = 'none';
        isSourceMenuOpen = false;
        await autoPopupController.setDictionarySource(nextSource);
        const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (currentWord) {
          performSearch(currentWord, nextSource);
        }
      });
    });

    const autoConfigBtn = documentObj.getElementById('vocab-auto-config-btn');
    const autoOrderSection = documentObj.getElementById('vocab-auto-order-section');
    let isAutoOrderOpen = false;

    if (autoConfigBtn && autoOrderSection) {
      autoConfigBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isAutoOrderOpen = !isAutoOrderOpen;
        autoOrderSection.style.display = isAutoOrderOpen ? 'flex' : 'none';
        if (isAutoOrderOpen) {
          autoConfigBtn.classList.add('active');
        } else {
          autoConfigBtn.classList.remove('active');
        }
      });
    }
  }

  if (dictionarySourceSelect) {
    dictionarySourceSelect.addEventListener('change', async () => {
      const nextSource = dictionarySourceSelect.value;
      await autoPopupController.setDictionarySource(nextSource);
      const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (currentWord) {
        performSearch(currentWord, nextSource);
      }
    });
  }

  // Settings popover event listeners
  if (settingsMenuBtn && settingsMenuPopover) {
    settingsMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSettingsMenuOpen = !isSettingsMenuOpen;
      settingsMenuPopover.style.display = isSettingsMenuOpen ? 'flex' : 'none';
      if (sourceMenuPopover && isSettingsMenuOpen) {
        sourceMenuPopover.style.display = 'none';
        isSourceMenuOpen = false;
      }
    });

    settingsMenuPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  documentObj.addEventListener('click', (e) => {
    if (sourceMenuBtn && sourceMenuPopover && !sourceMenuBtn.contains(e.target) && !sourceMenuPopover.contains(e.target)) {
      sourceMenuPopover.style.display = 'none';
      isSourceMenuOpen = false;
    }
    if (settingsMenuBtn && settingsMenuPopover && !settingsMenuBtn.contains(e.target) && !settingsMenuPopover.contains(e.target)) {
      settingsMenuPopover.style.display = 'none';
      isSettingsMenuOpen = false;
    }
  });

  await panel.init();
  renderStatus(statusElement, autoPopupController.isAutoPopupEnabled());

  const unsubscribe = autoPopupController.subscribe((nextState) => {
    renderStatus(statusElement, nextState?.autoPopupEnabled);
  });

  const renderHistorySlider = (query = '') => {
    if (!historySliderContainer) return;
    historySliderContainer.replaceChildren();

    let allWords = [];
    if (query) {
      allWords = historyStore.getSearchSuggestions(query, 50);
    } else {
      allWords = historyStore.getRecentSearchWords(50);
    }

    if (!allWords || allWords.length === 0) {
      return;
    }

    const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (currentWord && allWords.length > 0) {
      const wordIdx = allWords.findIndex((w) => (w || '').trim().toLowerCase() === currentWord);
      if (wordIdx !== -1) {
        currentSlideIndex = Math.floor(wordIdx / ITEMS_PER_PAGE);
      }
    }

    const sliderElement = createHistorySliderElement({
      documentObj,
      allWords,
      currentWord,
      currentSlideIndex,
      itemsPerPage: ITEMS_PER_PAGE,
      onSelectWord: (word) => {
        if (searchInput) searchInput.value = word;
        const normalized = (word || '').trim().toLowerCase();
        const wordIdx = allWords.findIndex((w) => (w || '').trim().toLowerCase() === normalized);
        if (wordIdx !== -1) {
          currentSlideIndex = Math.floor(wordIdx / ITEMS_PER_PAGE);
        }
        performSearch(word);
        renderHistorySlider();
      },
      onSlideChange: (newIndex) => {
        currentSlideIndex = newIndex;
        renderHistorySlider(searchInput ? searchInput.value.trim().toLowerCase() : '');
      },
    });

    historySliderContainer.appendChild(sliderElement);
  };

  let currentZeroStateWordIndex = 0;

  const renderZeroStateUI = () => {
    if (!zeroStateContainer) return;
    zeroStateContainer.replaceChildren();
    const recentWords = historyStore.getRecentSearchWords(50);
    const zeroStateEl = createZeroStateElement({
      documentObj,
      historyWords: recentWords,
      currentWordIndex: currentZeroStateWordIndex,
      onSelectWord: (word) => {
        if (searchInput) searchInput.value = word;
        const normalized = (word || '').trim().toLowerCase();
        const wordIdx = recentWords.findIndex((w) => (w || '').trim().toLowerCase() === normalized);
        if (wordIdx !== -1) {
          currentSlideIndex = Math.floor(wordIdx / ITEMS_PER_PAGE);
        }
        performSearch(word);
        renderHistorySlider();
      },
      onShuffleWord: () => {
        currentZeroStateWordIndex++;
        renderZeroStateUI();
      },
    });
    zeroStateContainer.appendChild(zeroStateEl);
    zeroStateContainer.style.display = 'flex';
  };

  function renderState(state, container) {
    container.replaceChildren();

    if (state.status === 'loading') {
      container.setAttribute('aria-busy', 'true');
    } else {
      container.setAttribute('aria-busy', 'false');
    }

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
        const word = (viewModel?.headword || searchInput?.value || '').trim();

        let hasRendered = false;

        const triggerAudioFeedback = (btn) => {
          if (!btn) return;
          btn.classList.add('is-playing');
          setTimeout(() => {
            btn.classList.remove('is-playing');
          }, 1200);
        };

        if (audioObj.us || textValue.includes('US')) {
          let usText = 'US';
          const usMatch = textValue.match(/US\s*([^·]+)/);
          if (usMatch && usMatch[1].trim()) {
            usText = `US ${usMatch[1].trim()}`;
          } else if (textValue && !textValue.includes('UK')) {
            usText = textValue.startsWith('US') ? textValue : `US ${textValue}`;
          }

          pronContainer.appendChild(h('span', { className: 'vocab-pron-item' }, `${usText} `));
          pronContainer.appendChild(
            h('button', {
              className: 'vocab-popup-audio-btn',
              title: 'Play US Pronunciation',
              ariaLabel: 'Play US Pronunciation',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                triggerAudioFeedback(e.currentTarget);
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

          pronContainer.appendChild(h('span', { className: 'vocab-pron-item' }, `${ukText} `));
          pronContainer.appendChild(
            h('button', {
              className: 'vocab-popup-audio-btn',
              title: 'Play UK Pronunciation',
              ariaLabel: 'Play UK Pronunciation',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                triggerAudioFeedback(e.currentTarget);
                playAudioWithFallback(audioObj.uk, word, 'en-GB');
              },
            })
          );
          hasRendered = true;
        }

        if (!hasRendered && (textValue || audioObj.us || audioObj.uk)) {
          if (textValue) {
            pronContainer.appendChild(h('span', { className: 'vocab-pron-item' }, `${textValue} `));
          }
          pronContainer.appendChild(
            h('button', {
              className: 'vocab-popup-audio-btn',
              title: 'Play Pronunciation',
              ariaLabel: 'Play Pronunciation',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                triggerAudioFeedback(e.currentTarget);
                playAudioWithFallback(audioObj.us || audioObj.uk, word, 'en-US');
              },
            })
          );
        }

        container.appendChild(pronContainer);
      } else if (item.type === 'stress-diagram') {
        const stressData = item.value;
        if (stressData && stressData.hasStressInfo && Array.isArray(stressData.syllables)) {
          const wrapper = h('div', { className: 'vocab-stress-wrapper' });
          let isDiagramOpen = false;

          const card = h('div', {
            className: 'vocab-stress-card',
            style: { display: 'none' },
          });
          card.innerHTML = `
            ${generateStressSvg(stressData)}
            <div class="vocab-stress-legend">
              <span class="legend-item"><span class="dot-high">●</span> High (ˈ)</span>
              <span class="legend-item"><span class="dot-mid">●</span> Mid (ˌ)</span>
              <span class="legend-item"><span class="dot-low">●</span> Unstressed</span>
            </div>
          `;

          // Build syllables chain with highlight on stressed syllables
          const syllableNodes = [];
          stressData.syllables.forEach((syl, i) => {
            if (i > 0) {
              syllableNodes.push(h('span', { className: 'vocab-syl-dot' }, '·'));
            }
            const isHigh = syl.level === PITCH_LEVELS.HIGH;
            const isMid = syl.level === PITCH_LEVELS.MID;
            const tagClass = isHigh ? 'vocab-syl-high' : isMid ? 'vocab-syl-mid' : 'vocab-syl-low';
            syllableNodes.push(h('span', { className: `vocab-syl-item ${tagClass}` }, syl.text));
          });

          const syllablesChain = h('div', { className: 'vocab-syllables-chain' }, ...syllableNodes);
          const waveIcon = h('span', { className: 'vocab-stress-wave-icon', innerHTML: waveformSVG });

          const pillLeft = h('div', { className: 'vocab-stress-pill-left' }, waveIcon, syllablesChain);

          const eqBars = h('span', {
            className: 'vocab-eq-bars-container',
            innerHTML: generateEqualizerBarsSvg(stressData),
          });
          const toggleSpan = h('span', { className: 'vocab-stress-toggle-icon' }, '▼');

          const pillRight = h(
            'div',
            { className: 'vocab-stress-pill-right' },
            eqBars,
            toggleSpan
          );

          const pillTitle = stressData.stressSummary
            ? `${stressData.stressSummary} · Click to toggle pitch contour`
            : 'Click to toggle pitch contour';

          const rhythmPill = h(
            'div',
            {
              className: 'vocab-stress-pill',
              role: 'button',
              tabIndex: 0,
              title: pillTitle,
              ariaLabel: pillTitle,
              onClick: (e) => {
                e.stopPropagation();
                isDiagramOpen = !isDiagramOpen;
                card.style.display = isDiagramOpen ? 'flex' : 'none';
                toggleSpan.textContent = isDiagramOpen ? '▲' : '▼';
                toggleSpan.style.color = isDiagramOpen ? '#1677C9' : '';
              },
            },
            pillLeft,
            pillRight
          );

          wrapper.appendChild(rhythmPill);
          wrapper.appendChild(card);
          container.appendChild(wrapper);
        }
      } else if (item.type === 'word-family') {
        const familyList = Array.isArray(item.value) ? item.value : [];
        if (familyList.length > 0) {
          const currentHw = (viewModel?.headword || state.headword || '').toLowerCase();
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
                title: isInflected ? `${famWord} (inflected form)` : `Lookup ${famWord}`,
                ariaLabel: isInflected ? `${famWord} (inflected form)` : `Lookup ${famWord}`,
                disabled: isInflected,
                onClick: (e) => {
                  e.stopPropagation();
                  if (isInflected) return;
                  if (searchInput) searchInput.value = famWord;
                  performSearch(famWord);
                  renderHistorySlider(famWord);
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
        container.appendChild(h('div', { className: 'vocab-popup-title' }, item.value));
      } else if (item.type === 'message') {
        container.appendChild(h('div', { className: 'vocab-popup-message' }, item.value));
      } else if (item.type === 'searchSuggestions') {
        if (item.value) {
          container.appendChild(h('div', { className: 'vocab-popup-search-suggestions', innerHTML: item.value }));
        }
      } else if (item.type === 'guidance-list') {
        const ul = h('ul', { className: 'vocab-popup-guidance-list' });
        item.value.forEach((g) => ul.appendChild(h('li', {}, g)));
        container.appendChild(ul);
      } else if (item.type === 'cta') {
        container.appendChild(h('div', { className: 'vocab-popup-cta' }, h('button', {}, item.value)));
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

  const lookupExecutor = async (word, source) => {
    const cleanWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
    if (!cleanWord || !/^[a-z]+(?:[-'][a-z]+)*$/.test(cleanWord)) {
      return {
        status: 'error',
        error: { type: 'invalid-token', message: 'Invalid search token.' },
      };
    }
    const effectiveSource = source || autoPopupController.getDictionarySource();
    const autoSourceOrder = autoPopupController.getAutoSourceOrder?.() || [...DEFAULT_AUTO_SOURCE_ORDER];
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage(
        {
          type: 'LOOKUP_REQUEST',
          payload: {
            token: cleanWord,
            source: effectiveSource,
            autoSourceOrder,
          },
        },
        (response) => {
          resolve(response);
        },
      );
    });
  };

  const performSearch = async (word, source) => {
    if (!word) {
      if (searchResultsContainer) {
        searchResultsContainer.replaceChildren();
        searchResultsContainer.classList.remove('active');
        searchResultsContainer.removeAttribute('aria-busy');
      }
      if (searchClearBtn) {
        searchClearBtn.style.display = 'none';
      }
      renderZeroStateUI();
      return;
    }
    if (zeroStateContainer) {
      zeroStateContainer.style.display = 'none';
    }
    if (searchClearBtn) {
      searchClearBtn.style.display = 'flex';
    }
    if (searchResultsContainer) {
      searchResultsContainer.classList.add('active');
      renderState({ status: 'loading' }, searchResultsContainer);
    }

    try {
      const response = await lookupExecutor(word, source);
      if (response && response.status === 'success') {
        const canonicalWord = response.data?.parsedPayload?.headword || word;
        await historyStore.addSearchWord(canonicalWord).catch(() => {});
        renderHistorySlider(searchInput ? searchInput.value.trim().toLowerCase() : '');
      }
      if (searchResultsContainer) {
        renderState(response, searchResultsContainer);
      }
    } catch (error) {
      if (searchResultsContainer) {
        renderState({ status: 'error', error: { type: 'unknown', message: error.message } }, searchResultsContainer);
      }
    }
  };

  let debounceTimer = null;
  const handleInput = () => {
    const value = searchInput.value.trim().toLowerCase();
    clearTimeout(debounceTimer);
    renderHistorySlider(value);

    if (!value) {
      performSearch('');
      return;
    }

    debounceTimer = setTimeout(() => {
      performSearch(value);
    }, 400);
  };

  const handleClear = () => {
    searchInput.value = '';
    performSearch('');
    renderHistorySlider('');
    searchInput.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const value = searchInput.value.trim().toLowerCase();
      if (value) {
        clearTimeout(debounceTimer);
        performSearch(value);
      }
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleFocus = () => {
    const value = searchInput.value.trim().toLowerCase();
    renderHistorySlider(value);
  };

  if (searchInput) {
    searchInput.addEventListener('input', handleInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    searchInput.addEventListener('focus', handleFocus);
  }
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', handleClear);
  }

  if (searchInput) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => {
        searchInput.focus();
      });
    } else {
      searchInput.focus();
    }
    renderHistorySlider('');
    renderZeroStateUI();
  }

  const destroy = () => {
    unsubscribe?.();
    panel.destroy();
    darkModeToggleElement.removeEventListener('change', handleDarkModeChange);
    if (searchInput) {
      searchInput.removeEventListener('input', handleInput);
      searchInput.removeEventListener('keydown', handleKeyDown);
      searchInput.removeEventListener('focus', handleFocus);
    }
    if (searchClearBtn) {
      searchClearBtn.removeEventListener('click', handleClear);
    }
    settingsStore.destroy?.();
    historyStore.destroy?.();
  };

  globalThis.addEventListener('unload', destroy, { once: true });

  return {
    destroy,
  };
}

if (globalThis.document?.getElementById) {
  bootstrapPopupRuntime().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[vocabulary-extension] popup runtime bootstrap failed:', message);
  });
}

export { bootstrapPopupRuntime };
