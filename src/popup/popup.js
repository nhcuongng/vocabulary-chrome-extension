import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { createAutoPopupSettingsPanel } from '../application/autoPopupSettingsPanel.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';
import { createChromeStorageHistoryAdapter } from '../infrastructure/adapters/chromeStorageHistoryAdapter.js';
import {
  createHistorySliderElement,
  SOURCE_META,
} from '../content/historySliderRenderer.js';
import { createZeroStateElement } from './popupZeroStateRenderer.js';
import {
  renderDictionaryContentView,
  createDomHelper,
} from '../presentation/dictionaryContentView.js';


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
  const simpleLearnToggleElement = documentObj.getElementById('simple-learn-toggle');
  const rememberLastLookupToggleElement = documentObj.getElementById('remember-last-lookup-toggle');
  const statusElement = documentObj.getElementById('auto-popup-status');
  const attributionElement = documentObj.getElementById('attribution');
  const disclosureElement = documentObj.getElementById('disclosure');
  const searchInput = documentObj.getElementById('vocab-search-input');
  const searchClearBtn = documentObj.getElementById('vocab-search-clear');
  const historySliderContainer = documentObj.getElementById('vocab-history-slider-wrapper');
  const searchResultsContainer = documentObj.getElementById('vocab-search-results');
  const zeroStateContainer = documentObj.getElementById('vocab-zero-state-container');
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
  let simpleLearn = false;
  let rememberLastLookup = true;
  let currentSlideIndex = 0;
  const ITEMS_PER_PAGE = 5;
  let isSettingsMenuOpen = false;

  const updateBodyTheme = (isDark) => {
    if (isDark) {
      documentObj.body.classList.add('dark-mode');
    } else {
      documentObj.body.classList.remove('dark-mode');
    }
  };

  const autoPopupController = {
    async start() {
      const settings = await settingsStore.load();
      autoPopupEnabled = Boolean(settings?.autoPopupEnabled);
      darkMode = Boolean(settings?.darkMode);
      simpleLearn = Boolean(settings?.simpleLearn);
      rememberLastLookup = Boolean(settings?.rememberLastLookup ?? true);
      updateBodyTheme(darkMode);
      darkModeToggleElement.checked = darkMode;
      if (simpleLearnToggleElement) {
        simpleLearnToggleElement.checked = simpleLearn;
      }
      if (rememberLastLookupToggleElement) {
        rememberLastLookupToggleElement.checked = rememberLastLookup;
      }
    },
    stop() {},
    isAutoPopupEnabled() {
      return autoPopupEnabled;
    },
    isDarkMode() {
      return darkMode;
    },
    isSimpleLearn() {
      return simpleLearn;
    },
    isRememberLastLookup() {
      return rememberLastLookup;
    },
    getDictionarySource() {
      return simpleLearn ? 'freedictionary' : 'vocabulary';
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
    async setSimpleLearn(enabled) {
      simpleLearn = Boolean(enabled);
      if (simpleLearnToggleElement) {
        simpleLearnToggleElement.checked = simpleLearn;
      }
      await settingsStore.update({ simpleLearn });
    },
    async setRememberLastLookup(enabled) {
      rememberLastLookup = Boolean(enabled);
      if (rememberLastLookupToggleElement) {
        rememberLastLookupToggleElement.checked = rememberLastLookup;
      }
      await settingsStore.update({ rememberLastLookup });
    },
    async setDictionarySource(source) {
      simpleLearn = source === 'freedictionary';
      if (simpleLearnToggleElement) {
        simpleLearnToggleElement.checked = simpleLearn;
      }
      await settingsStore.update({ simpleLearn });
    },
    subscribe(listener) {
      return settingsStore.subscribe((nextSettings) => {
        autoPopupEnabled = Boolean(nextSettings?.autoPopupEnabled);
        darkMode = Boolean(nextSettings?.darkMode);
        simpleLearn = Boolean(nextSettings?.simpleLearn);
        rememberLastLookup = Boolean(nextSettings?.rememberLastLookup ?? true);
        updateBodyTheme(darkMode);
        darkModeToggleElement.checked = darkMode;
        if (simpleLearnToggleElement) {
          simpleLearnToggleElement.checked = simpleLearn;
        }
        if (rememberLastLookupToggleElement) {
          rememberLastLookupToggleElement.checked = rememberLastLookup;
        }
        listener({ autoPopupEnabled, darkMode, simpleLearn, rememberLastLookup });
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

  const handleSimpleLearnChange = async () => {
    if (simpleLearnToggleElement) {
      await autoPopupController.setSimpleLearn(simpleLearnToggleElement.checked);
      const currentWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (currentWord) {
        performSearch(currentWord);
      }
    }
  };
  if (simpleLearnToggleElement) {
    simpleLearnToggleElement.addEventListener('change', handleSimpleLearnChange);
  }

  const handleRememberLastLookupChange = async () => {
    if (rememberLastLookupToggleElement) {
      await autoPopupController.setRememberLastLookup(rememberLastLookupToggleElement.checked);
    }
  };
  if (rememberLastLookupToggleElement) {
    rememberLastLookupToggleElement.addEventListener('change', handleRememberLastLookupChange);
  }

  // Settings popover event listeners
  if (settingsMenuBtn && settingsMenuPopover) {
    settingsMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSettingsMenuOpen = !isSettingsMenuOpen;
      settingsMenuPopover.style.display = isSettingsMenuOpen ? 'flex' : 'none';
    });

    settingsMenuPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  documentObj.addEventListener('click', (e) => {
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

    const recentWords = historyStore.getRecentSearchWords(50);

    renderDictionaryContentView({
      state,
      container,
      documentObj,
      windowObj: globalThis.window,
      historyWords: recentWords,
      settingsAdapter: settingsStore,
      onNavigateWord: (famWord) => {
        if (searchInput) searchInput.value = famWord;
        const normalized = (famWord || '').trim().toLowerCase();
        const wordIdx = recentWords.findIndex((w) => (w || '').trim().toLowerCase() === normalized);
        if (wordIdx !== -1) {
          currentSlideIndex = Math.floor(wordIdx / ITEMS_PER_PAGE);
        }
        performSearch(famWord);
        renderHistorySlider(famWord);
      },
      onLayoutChange: () => {},
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
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage(
        {
          type: 'LOOKUP_REQUEST',
          payload: {
            token: cleanWord,
            source: effectiveSource,
          },
        },
        (response) => {
          resolve(response);
        },
      );
    });
  };

  let debounceTimer = null;
  let latestSearchRequestId = 0;
  let isComposing = false;

  const performSearch = async (word, source) => {
    const requestId = ++latestSearchRequestId;

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
      if (requestId !== latestSearchRequestId) {
        return;
      }
      if (response && response.status === 'success') {
        const canonicalWord = response.data?.parsedPayload?.headword || word;
        await historyStore.addSearchWord(canonicalWord).catch(() => {});
        renderHistorySlider(searchInput ? searchInput.value.trim().toLowerCase() : '');
      }
      if (searchResultsContainer) {
        renderState(response, searchResultsContainer);
      }
    } catch (error) {
      if (requestId !== latestSearchRequestId) {
        return;
      }
      if (searchResultsContainer) {
        renderState({ status: 'error', error: { type: 'unknown', message: error.message } }, searchResultsContainer);
      }
    }
  };

  const handleInput = () => {
    clearTimeout(debounceTimer);
    const value = searchInput.value.trim().toLowerCase();
    renderHistorySlider(value);

    if (!value) {
      performSearch('');
      return;
    }

    if (isComposing) {
      return;
    }

    debounceTimer = setTimeout(() => {
      const currentValue = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (currentValue) {
        performSearch(currentValue);
      } else {
        performSearch('');
      }
    }, 400);
  };

  const handleCompositionStart = () => {
    isComposing = true;
  };

  const handleCompositionEnd = () => {
    isComposing = false;
    handleInput();
  };

  const handleClear = () => {
    clearTimeout(debounceTimer);
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
    searchInput.addEventListener('compositionstart', handleCompositionStart);
    searchInput.addEventListener('compositionend', handleCompositionEnd);
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

    const recentWords = historyStore.getRecentSearchWords(1);
    const lastWord = recentWords && recentWords.length > 0 ? recentWords[0] : '';

    if (rememberLastLookup && lastWord) {
      searchInput.value = lastWord;
      renderHistorySlider(lastWord);
      performSearch(lastWord);
    } else {
      renderHistorySlider('');
      renderZeroStateUI();
    }
  }

  const destroy = () => {
    clearTimeout(debounceTimer);
    unsubscribe?.();
    panel.destroy();
    darkModeToggleElement.removeEventListener('change', handleDarkModeChange);
    if (rememberLastLookupToggleElement) {
      rememberLastLookupToggleElement.removeEventListener('change', handleRememberLastLookupChange);
    }
    if (searchInput) {
      searchInput.removeEventListener('input', handleInput);
      searchInput.removeEventListener('compositionstart', handleCompositionStart);
      searchInput.removeEventListener('compositionend', handleCompositionEnd);
      searchInput.removeEventListener('keydown', handleKeyDown);
      searchInput.removeEventListener('focus', handleFocus);
    }
    if (searchClearBtn) {
      searchClearBtn.removeEventListener('click', handleClear);
    }
    settingsStore.destroy?.();
    historyStore.destroy?.();
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unload', destroy, { once: true });
  }

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
