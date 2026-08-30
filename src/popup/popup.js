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
import { createHistorySliderElement } from '../content/historySliderRenderer.js';

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
  const sourceMenuBtn = documentObj.getElementById('vocab-source-menu-btn');
  const sourceMenuPopover = documentObj.getElementById('vocab-source-menu-popover');
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
  let currentSlideIndex = 0;
  const ITEMS_PER_PAGE = 5;
  let isSourceMenuOpen = false;
  let isSettingsMenuOpen = false;

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

  const autoPopupController = {
    async start() {
      const settings = await settingsStore.load();
      autoPopupEnabled = Boolean(settings?.autoPopupEnabled);
      darkMode = Boolean(settings?.darkMode);
      dictionarySource = settings?.dictionarySource || 'auto';
      updateBodyTheme(darkMode);
      darkModeToggleElement.checked = darkMode;
      updateSourceMenuUI(dictionarySource);
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
    subscribe(listener) {
      return settingsStore.subscribe((nextSettings) => {
        autoPopupEnabled = Boolean(nextSettings?.autoPopupEnabled);
        darkMode = Boolean(nextSettings?.darkMode);
        dictionarySource = nextSettings?.dictionarySource || 'auto';
        updateBodyTheme(darkMode);
        darkModeToggleElement.checked = darkMode;
        updateSourceMenuUI(dictionarySource);
        listener({ autoPopupEnabled, darkMode, dictionarySource });
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
        e.stopPropagation();
        const nextSource = item.getAttribute('data-source');
        sourceMenuPopover.style.display = 'none';
        isSourceMenuOpen = false;
        await autoPopupController.setDictionarySource(nextSource);
        const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (currentWord) {
          performSearch(currentWord);
        }
      });
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
    const sliderElement = createHistorySliderElement({
      documentObj,
      allWords,
      currentWord,
      currentSlideIndex,
      itemsPerPage: ITEMS_PER_PAGE,
      onSelectWord: (word) => {
        if (searchInput) searchInput.value = word;
        performSearch(word);
        renderHistorySlider(word);
      },
      onSlideChange: (newIndex) => {
        currentSlideIndex = newIndex;
        renderHistorySlider(searchInput ? searchInput.value.trim().toLowerCase() : '');
      },
    });

    historySliderContainer.appendChild(sliderElement);
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
              className: 'vocab-popup-audio-btn',
              title: 'US pronunciation',
              ariaLabel: 'US pronunciation',
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
              className: 'vocab-popup-audio-btn',
              title: 'UK pronunciation',
              ariaLabel: 'UK pronunciation',
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
              className: 'vocab-popup-audio-btn',
              title: 'Listen pronunciation',
              ariaLabel: 'Listen pronunciation',
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

  const lookupExecutor = async (word) => {
    const cleanWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
    if (!cleanWord || !/^[a-z]+(?:[-'][a-z]+)*$/.test(cleanWord)) {
      return {
        status: 'error',
        error: { type: 'invalid-token', message: 'Invalid search token.' },
      };
    }
    const source = autoPopupController.getDictionarySource();
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage(
        { type: 'LOOKUP_REQUEST', payload: { token: cleanWord, source } },
        (response) => {
          resolve(response);
        },
      );
    });
  };

  const performSearch = async (word) => {
    if (!word) {
      if (searchResultsContainer) {
        searchResultsContainer.replaceChildren();
        searchResultsContainer.classList.remove('active');
        searchResultsContainer.removeAttribute('aria-busy');
      }
      if (searchClearBtn) {
        searchClearBtn.style.display = 'none';
      }
      return;
    }
    if (searchClearBtn) {
      searchClearBtn.style.display = 'flex';
    }
    if (searchResultsContainer) {
      searchResultsContainer.classList.add('active');
      renderState({ status: 'loading' }, searchResultsContainer);
    }

    try {
      const response = await lookupExecutor(word);
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
    searchInput.focus();
    renderHistorySlider('');
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
