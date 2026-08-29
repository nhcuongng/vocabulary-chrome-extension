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

function renderStatus(targetElement, enabled) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = enabled
    ? 'Auto-popup đang bật: bôi đen từ để tra cứu ngay.'
    : 'Auto-popup đang tắt: bạn có thể bật lại bất cứ lúc nào.';
}

async function bootstrapPopupRuntime({
  chromeApi = globalThis.chrome,
  documentObj = globalThis.document,
} = {}) {
  const toggleElement = documentObj.getElementById('auto-popup-toggle');
  const darkModeToggleElement = documentObj.getElementById('dark-mode-toggle');
  const statusElement = documentObj.getElementById('auto-popup-status');
  const attributionElement = documentObj.getElementById('attribution');
  const disclosureElement = documentObj.getElementById('disclosure');
  const searchInput = documentObj.getElementById('vocab-search-input');
  const searchClearBtn = documentObj.getElementById('vocab-search-clear');
  const searchSuggestionsContainer = documentObj.getElementById('vocab-search-suggestions');
  const searchResultsContainer = documentObj.getElementById('vocab-search-results');

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
      updateBodyTheme(darkMode);
      darkModeToggleElement.checked = darkMode;
    },
    stop() {},
    isAutoPopupEnabled() {
      return autoPopupEnabled;
    },
    isDarkMode() {
      return darkMode;
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
    subscribe(listener) {
      return settingsStore.subscribe((nextSettings) => {
        autoPopupEnabled = Boolean(nextSettings?.autoPopupEnabled);
        darkMode = Boolean(nextSettings?.darkMode);
        updateBodyTheme(darkMode);
        darkModeToggleElement.checked = darkMode;
        listener({ autoPopupEnabled, darkMode });
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
      // Best-effort runtime bootstrap: popup vẫn hoạt động dù inject thất bại.
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

  await panel.init();
  renderStatus(statusElement, autoPopupController.isAutoPopupEnabled());

  const unsubscribe = autoPopupController.subscribe((nextState) => {
    renderStatus(statusElement, nextState?.autoPopupEnabled);
  });

  const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>`;

  const updateSuggestions = (query = '') => {
    if (!searchSuggestionsContainer) return;
    searchSuggestionsContainer.replaceChildren();
    const suggestions = historyStore.getSearchSuggestions(query, 5);
    suggestions.forEach((word) => {
      const chip = documentObj.createElement('button');
      chip.className = 'history-chip';
      chip.textContent = word;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchInput) searchInput.value = word;
        performSearch(word);
        searchSuggestionsContainer.replaceChildren();
      });
      searchSuggestionsContainer.appendChild(chip);
    });
  };

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
        const cap = item.value.charAt(0).toUpperCase() + item.value.slice(1);
        const vocabUrl = `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || '')}`;
        container.appendChild(
          h(
            'p',
            { className: 'vocab-popup-headword' },
            h('a', { href: vocabUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
        if (item.audio?.us && item.value.includes('US')) {
          const usMatch = item.value.match(/US\s*([^·]+)/);
          if (usMatch) {
            pronContainer.appendChild(h('span', {}, `US ${usMatch[1].trim()}`));
            pronContainer.appendChild(
              h('button', {
                className: 'vocab-popup-audio-btn',
                innerHTML: speakerSVG,
                onClick: (e) => {
                  e.stopPropagation();
                  new Audio(item.audio.us).play().catch(() => {});
                },
              })
            );
          }
        }
        if (item.audio?.uk && item.value.includes('UK')) {
          const ukMatch = item.value.match(/UK\s*([^·]+)/);
          if (ukMatch) {
            pronContainer.appendChild(h('span', {}, `UK ${ukMatch[1].trim()}`));
            pronContainer.appendChild(
              h('button', {
                className: 'vocab-popup-audio-btn',
                innerHTML: speakerSVG,
                onClick: (e) => {
                  e.stopPropagation();
                  new Audio(item.audio.uk).play().catch(() => {});
                },
              })
            );
          }
        }
        if (!item.audio?.us && !item.audio?.uk) {
          pronContainer.appendChild(h('span', {}, item.value));
        }
        container.appendChild(pronContainer);
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
                  e.stopPropagation();
                  if (searchInput) searchInput.value = famWord;
                  performSearch(famWord);
                  if (searchSuggestionsContainer) searchSuggestionsContainer.replaceChildren();
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
    if (!word || typeof word !== 'string' || !/^\w+$/.test(word)) {
      return {
        status: 'error',
        error: { type: 'invalid-token', message: 'Từ tìm kiếm không hợp lệ.' },
      };
    }
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage({ type: 'LOOKUP_REQUEST', payload: { token: word } }, (response) => {
        resolve(response);
      });
    });
  };

  const performSearch = async (word) => {
    if (!word) {
      if (searchResultsContainer) {
        searchResultsContainer.replaceChildren();
        searchResultsContainer.classList.remove('active');
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

    historyStore.addSearchWord(word).catch(() => {});

    try {
      const response = await lookupExecutor(word);
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
    updateSuggestions(value);

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
    updateSuggestions('');
    searchInput.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const value = searchInput.value.trim().toLowerCase();
      if (value) {
        clearTimeout(debounceTimer);
        performSearch(value);
        if (searchSuggestionsContainer) searchSuggestionsContainer.replaceChildren();
      }
    }
  };

  const handleFocus = () => {
    const value = searchInput.value.trim().toLowerCase();
    updateSuggestions(value);
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
    updateSuggestions('');
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
