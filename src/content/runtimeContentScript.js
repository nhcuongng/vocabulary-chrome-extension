import { readSelectionSnapshot } from './selectionDetection.js';
import { createAutoPopupLookupController } from './autoPopupLookupController.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';
import { createChromeStorageHistoryAdapter } from '../infrastructure/adapters/chromeStorageHistoryAdapter.js';

import { createLookupFlowOrchestrator } from './lookupFlowOrchestrator.js';
import { createPopupManager } from './popupManager.js';
import { createTriggerIconManager } from './triggerIconManager.js';

export function ensureEcosystemBridgeElement(documentObj = globalThis.document) {
  if (!documentObj) return null;
  const BRIDGE_ID = 'vocabulary-lookup';
  let bridgeEl = documentObj.getElementById?.(BRIDGE_ID);
  if (!bridgeEl && typeof documentObj.createElement === 'function') {
    bridgeEl = documentObj.createElement('div');
    bridgeEl.id = BRIDGE_ID;
    bridgeEl.style.display = 'none';
    bridgeEl.setAttribute('data-extension', 'vocabulary-lookup');

    const appendToDom = () => {
      const targetParent = documentObj.body || documentObj.documentElement;
      if (targetParent && typeof targetParent.appendChild === 'function' && !documentObj.getElementById?.(BRIDGE_ID)) {
        targetParent.appendChild(bridgeEl);
      }
    };

    if (documentObj.body || documentObj.documentElement) {
      appendToDom();
    } else if (typeof documentObj.addEventListener === 'function') {
      documentObj.addEventListener('DOMContentLoaded', appendToDom, { once: true });
    }
  }
  return bridgeEl;
}

export async function bootstrapContentRuntime({
  chromeApi = globalThis.chrome,
  windowObj = globalThis.window,
  documentObj = globalThis.document,
} = {}) {
  if (globalThis.__vocabularyExtensionContentRuntimeStarted) {
    return {
      started: true,
      dispose: () => {},
    };
  }

  if (!chromeApi?.runtime?.sendMessage || !chromeApi?.runtime?.getURL || !documentObj) {
    return {
      started: false,
      dispose: () => {},
    };
  }

  ensureEcosystemBridgeElement(documentObj);

  const settingsStore = createChromeStorageSettingsAdapter({
    storageArea: chromeApi.storage?.local,
    storageChangeEvent: chromeApi.storage?.onChanged,
  });

  const historyStore = createChromeStorageHistoryAdapter({
    storageArea: chromeApi.storage?.local,
    storageChangeEvent: chromeApi.storage?.onChanged,
  });
  await historyStore.load().catch(() => {});

  let pendingTriggerRequest = null;
  let isUserInitiated = false;
  let darkMode = false;
  let dictionarySource = 'auto';
  let autoSourceOrder = ['vocabulary', 'freedictionary', 'cambridge'];
  let autoPopupController = null;

  const lookupExecutor = async ({ headword, source }) => {
    const cleanWord = typeof headword === 'string' ? headword.trim().toLowerCase() : '';
    if (!cleanWord || !/^[a-z]+(?:[-'][a-z]+)*$/.test(cleanWord)) {
      return {
        status: 'error',
        error: { type: 'invalid-token', message: 'headword token is required' },
      };
    }
    const effectiveSource = source || dictionarySource || 'auto';
    const effectiveAutoSourceOrder = autoPopupController?.getAutoSourceOrder?.() || autoSourceOrder;
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage(
        {
          type: 'LOOKUP_REQUEST',
          payload: {
            token: cleanWord,
            source: effectiveSource,
            autoSourceOrder: effectiveAutoSourceOrder,
          },
        },
        (response) => {
          resolve(response);
        },
      );
    });
  };

  const handlePopupLookupWord = (word, { fromHistory = false, source } = {}) => {
    isUserInitiated = true;
    if (source) {
      dictionarySource = source;
    }
    orchestrator.runLookup({ payload: { token: word, source: dictionarySource } });
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: handlePopupLookupWord,
    historyAdapter: historyStore,
    settingsAdapter: settingsStore,
    onSourceChange: (newSource) => {
      dictionarySource = newSource || 'auto';
    },
  });

  const triggerIconManager = createTriggerIconManager({
    documentObj,
    windowObj,
    onClick: () => {
      if (pendingTriggerRequest) {
        isUserInitiated = true;
        triggerIconManager.removeIcon();
        const currentState = orchestrator.getState();
        if (currentState.status !== 'idle') {
          const selection = readSelectionSnapshot(windowObj);
          popupManager.showPopup(currentState, selection.rect, { darkMode });
        } else {
          orchestrator.runLookup(pendingTriggerRequest);
        }
        pendingTriggerRequest = null;
      }
    },
  });

  // --- Orchestrator for lookup flow ---
  const orchestrator = createLookupFlowOrchestrator({
    lookupExecutor,
    onStateChange: (state) => {
      const autoPopupEnabled = autoPopupController.isAutoPopupEnabled();
      if (state.status === 'success') {
        const foundWord = state.data?.parsedPayload?.headword || state.headword;
        if (foundWord) {
          historyStore.addSearchWord(foundWord).catch(() => {});
        }
      }
      if (state.status === 'success' || state.status === 'not-found' || state.status === 'error' || state.status === 'loading') {
        if (!autoPopupEnabled && !isUserInitiated) {
          return;
        }

        triggerIconManager.removeIcon();
        const selection = readSelectionSnapshot(windowObj);
        const targetRect = state.selectionRect || selection?.rect || null;
        popupManager.showPopup(state, targetRect, { darkMode });
      } else if (state.status === 'idle') {
        popupManager.removePopup();
      }
    },
  });

  // --- Selection detection and trigger ---
  autoPopupController = createAutoPopupLookupController({
    eventTarget: documentObj,
    settingsStore,
    getSnapshot: () => readSelectionSnapshot(windowObj),
    onLookupRequest: (request) => {
      isUserInitiated = true;
      triggerIconManager.removeIcon();
      pendingTriggerRequest = null;
      orchestrator.runLookup(request);
    },
    onTriggerIconRequest: (request) => {
      isUserInitiated = false;
      popupManager.removePopup();
      pendingTriggerRequest = request;
      triggerIconManager.showIcon(request.payload.selectionRect);
      orchestrator.runLookup(request);
    },
    onInvalidSelection: (decision) => {
      if (decision.reasonCode === 'empty-selection') {
        isUserInitiated = false;
        popupManager.removePopup();
        triggerIconManager.removeIcon();
        pendingTriggerRequest = null;
      }
    },
  });

  autoPopupController.subscribe((nextState) => {
    if (nextState.autoPopupEnabled) {
      triggerIconManager.removeIcon();
      pendingTriggerRequest = null;
    }
    darkMode = Boolean(nextState.darkMode);
    dictionarySource = nextState.dictionarySource || 'auto';
  });

  await autoPopupController.start();

  const handleEcosystemLookupEvent = (event) => {
    const detail = event?.detail || {};
    const rawWord = detail.word || detail.headword || detail.token || '';
    const cleanWord = typeof rawWord === 'string' ? rawWord.trim().toLowerCase() : '';
    if (!cleanWord) return;

    isUserInitiated = true;
    if (detail.source) {
      dictionarySource = detail.source;
    }

    triggerIconManager.removeIcon();
    pendingTriggerRequest = null;

    let targetRect = null;
    if (detail.rect && typeof detail.rect === 'object') {
      targetRect = {
        left: Number(detail.rect.left) || 0,
        top: Number(detail.rect.top) || 0,
        right: Number(detail.rect.right) || 0,
        bottom: Number(detail.rect.bottom) || 0,
        width: Number(detail.rect.width) || 0,
        height: Number(detail.rect.height) || 0,
      };
    } else if (detail.targetElement?.getBoundingClientRect && typeof detail.targetElement.getBoundingClientRect === 'function') {
      const b = detail.targetElement.getBoundingClientRect();
      targetRect = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
    } else if (detail.target?.getBoundingClientRect && typeof detail.target.getBoundingClientRect === 'function') {
      const b = detail.target.getBoundingClientRect();
      targetRect = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
    } else if (typeof detail.clientX === 'number' && typeof detail.clientY === 'number') {
      targetRect = {
        left: detail.clientX,
        top: detail.clientY,
        right: detail.clientX,
        bottom: detail.clientY,
        width: 0,
        height: 0,
      };
    } else if (typeof detail.x === 'number' && typeof detail.y === 'number') {
      targetRect = {
        left: detail.x,
        top: detail.y,
        right: detail.x,
        bottom: detail.y,
        width: 0,
        height: 0,
      };
    }

    if (!targetRect && windowObj?.innerWidth) {
      const midX = windowObj.innerWidth / 2;
      const midY = (windowObj.innerHeight || 600) / 3;
      targetRect = {
        left: midX - 100,
        top: midY,
        right: midX + 100,
        bottom: midY + 30,
        width: 200,
        height: 30,
      };
    }

    orchestrator.runLookup({
      payload: {
        token: cleanWord,
        selectionRect: targetRect,
        source: dictionarySource,
      },
    });
  };

  const bridgeEl = ensureEcosystemBridgeElement(documentObj);
  if (bridgeEl && typeof bridgeEl.addEventListener === 'function') {
    bridgeEl.addEventListener('vocabulary-lookup', handleEcosystemLookupEvent);
  }

  globalThis.__vocabularyExtensionContentRuntimeStarted = true;

  return {
    started: true,
    dispose: () => {
      bridgeEl?.removeEventListener?.('vocabulary-lookup', handleEcosystemLookupEvent);
      autoPopupController.stop();
      settingsStore.destroy?.();
      popupManager.removePopup();
      triggerIconManager.removeIcon();
      pendingTriggerRequest = null;
      globalThis.__vocabularyExtensionContentRuntimeStarted = false;
    },
  };
}

if (globalThis.chrome?.runtime?.id) {
  bootstrapContentRuntime().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[vocabulary-extension] content runtime bootstrap failed:', message);
  });
}
// No export: Chrome content scripts must not use ES module export syntax.
