import { readSelectionSnapshot } from './selectionDetection.js';
import { createAutoPopupLookupController } from './autoPopupLookupController.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';

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

  const popupManager = createPopupManager({ documentObj, windowObj });
  let pendingTriggerRequest = null;
  let isUserInitiated = false;

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
          popupManager.showPopup(currentState, selection.rect);
        } else {
          orchestrator.runLookup(pendingTriggerRequest);
        }
        pendingTriggerRequest = null;
      }
    },
  });

  // --- Orchestrator for lookup flow ---
  const orchestrator = createLookupFlowOrchestrator({
    lookupExecutor: async ({ headword }) => {
      console.log('[VOCAB] lookupExecutor received headword:', headword);
      if (!headword || typeof headword !== 'string' || !/^\w+$/.test(headword)) {
        console.log('[VOCAB] lookupExecutor: invalid or empty headword');
        return {
          status: 'error',
          error: { type: 'invalid-token', message: 'headword token is required' },
        };
      }
      return new Promise((resolve) => {
        chromeApi.runtime.sendMessage({ type: 'LOOKUP_REQUEST', payload: { token: headword } }, (response) => {
          console.log('[VOCAB] lookupExecutor got response:', response);
          resolve(response);
        });
      });
    },
    onStateChange: (state) => {
      const autoPopupEnabled = autoPopupController.isAutoPopupEnabled();
      if (state.status === 'success' || state.status === 'not-found' || state.status === 'error' || state.status === 'loading') {
        if (!autoPopupEnabled && !isUserInitiated) {
          return;
        }

        triggerIconManager.removeIcon();
        const selection = readSelectionSnapshot(windowObj);
        popupManager.showPopup(state, selection.rect);
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
      orchestrator.runLookup(request);
      console.log('[VOCAB] onLookupRequest', request);
    },
    onTriggerIconRequest: (request) => {
      isUserInitiated = false;
      popupManager.removePopup();
      pendingTriggerRequest = request;
      triggerIconManager.showIcon(request.payload.selectionRect);
      orchestrator.runLookup(request);
      console.log('[VOCAB] onTriggerIconRequest', request);
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

  autoPopupController.subscribe(({ autoPopupEnabled }) => {
    if (autoPopupEnabled) {
      triggerIconManager.removeIcon();
      pendingTriggerRequest = null;
    }
  });

  await autoPopupController.start();
  console.log('[VOCAB] Content script started');

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
