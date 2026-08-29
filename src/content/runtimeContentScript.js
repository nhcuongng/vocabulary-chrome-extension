import { readSelectionSnapshot } from './selectionDetection.js';
import { createAutoPopupLookupController } from './autoPopupLookupController.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';
import { createChromeStorageHistoryAdapter } from '../infrastructure/adapters/chromeStorageHistoryAdapter.js';

import { createLookupFlowOrchestrator } from './lookupFlowOrchestrator.js';
import { createPopupManager } from './popupManager.js';
import { createTriggerIconManager } from './triggerIconManager.js';

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

  const settingsStore = createChromeStorageSettingsAdapter({
    storageArea: chromeApi.storage?.local,
    storageChangeEvent: chromeApi.storage?.onChanged,
  });

  const historyStore = createChromeStorageHistoryAdapter({
    storageArea: chromeApi.storage?.local,
    storageChangeEvent: chromeApi.storage?.onChanged,
  });
  await historyStore.load().catch(() => {});

  const lookupExecutor = async ({ headword }) => {
    if (!headword || typeof headword !== 'string' || !/^\w+$/.test(headword)) {
      return {
        status: 'error',
        error: { type: 'invalid-token', message: 'headword token is required' },
      };
    }
    return new Promise((resolve) => {
      chromeApi.runtime.sendMessage({ type: 'LOOKUP_REQUEST', payload: { token: headword } }, (response) => {
        resolve(response);
      });
    });
  };

  const handlePopupLookupWord = (word, { fromHistory = false } = {}) => {
    isUserInitiated = true;
    if (!fromHistory) {
      historyStore.addSearchWord(word).catch(() => {});
    }
    orchestrator.runLookup({ payload: { token: word } });
  };

  const popupManager = createPopupManager({
    documentObj,
    windowObj,
    onLookupWord: handlePopupLookupWord,
    historyAdapter: historyStore,
  });

  let pendingTriggerRequest = null;
  let isUserInitiated = false;
  let darkMode = false;

  const triggerIconManager = createTriggerIconManager({
    documentObj,
    windowObj,
    onClick: () => {
      if (pendingTriggerRequest) {
        isUserInitiated = true;
        triggerIconManager.removeIcon();
        const token = pendingTriggerRequest.payload.token;
        if (token) historyStore.addSearchWord(token).catch(() => {});
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
      if (state.status === 'success' || state.status === 'not-found' || state.status === 'error' || state.status === 'loading') {
        if (!autoPopupEnabled && !isUserInitiated) {
          return;
        }

        triggerIconManager.removeIcon();
        const selection = readSelectionSnapshot(windowObj);
        popupManager.showPopup(state, selection.rect, { darkMode });
      } else if (state.status === 'idle') {
        popupManager.removePopup();
      }
    },
  });

  // --- Selection detection and trigger ---
  const autoPopupController = createAutoPopupLookupController({
    eventTarget: documentObj,
    settingsStore,
    getSnapshot: () => readSelectionSnapshot(windowObj),
    onLookupRequest: (request) => {
      isUserInitiated = true;
      triggerIconManager.removeIcon();
      pendingTriggerRequest = null;
      const token = request?.payload?.token;
      if (token) historyStore.addSearchWord(token).catch(() => {});
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
  });

  await autoPopupController.start();

  globalThis.__vocabularyExtensionContentRuntimeStarted = true;

  return {
    started: true,
    dispose: () => {
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
