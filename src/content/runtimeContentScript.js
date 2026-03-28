// Quick reference popup for JS code (Vocabulary.com)
function showQuickReferencePopup() {
  // Remove existing popup if any
  const oldPopup = document.getElementById('quick-reference-popup');
  if (oldPopup) oldPopup.remove();

  const popup = document.createElement('div');
  popup.id = 'quick-reference-popup';
  popup.style.position = 'fixed';
  popup.style.top = '40px';
  popup.style.left = '50%';
  popup.style.transform = 'translateX(-50%)';
  popup.style.zIndex = '99999';
  popup.style.background = '#fff';
  popup.style.border = '2px solid #3a3a3a';
  popup.style.borderRadius = '16px';
  popup.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
  popup.style.padding = '32px 24px 16px 24px';
  popup.style.maxWidth = '600px';
  popup.style.fontFamily = 'system-ui, sans-serif';
  popup.style.fontSize = '18px';
  popup.style.color = '#222';
  popup.style.lineHeight = '1.5';

  popup.innerHTML = `
    <div style="font-size:2rem;font-weight:700;margin-bottom:16px;">Quick reference</div>
    <div style="font-size:1.4rem;font-weight:600;margin-bottom:12px;">reference</div>
    <pre style="background:#f6f8fa;border-radius:8px;padding:16px;font-size:1.1rem;overflow-x:auto;margin-bottom:16px;">Module.after(['jquery'], function(){ jQuery(function($) { $('.pron-audio').parent().click(function(){ $(this).children('.pron-audio').get(0).play(); }); }); });</pre>
    <div style="color:#888;font-size:1rem;margin-bottom:4px;">Nguồn dữ liệu tham khảo: Vocabulary.com<br>(<a href='https://www.vocabulary.com/' target='_blank' style='color:#0074d9;'>https://www.vocabulary.com/</a>)</div>
    <div style="color:#888;font-size:1rem;margin-bottom:4px;">Quyền truy cập: activeTab, scripting, storage, host:https://www.vocabulary.com/*; chỉ dùng cho tra cứu từ, lưu cài đặt, và telemetry ẩn danh cục bộ.</div>
    <button id="quick-reference-close" style="position:absolute;top:12px;right:16px;font-size:1.5rem;background:none;border:none;cursor:pointer;color:#888;">&times;</button>
  `;

  document.body.appendChild(popup);
  document.getElementById('quick-reference-close').onclick = () => popup.remove();
}

// Example: Show popup when pressing Ctrl+Shift+Q
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
    showQuickReferencePopup();
  }
});
import { readSelectionSnapshot } from './selectionDetection.js';
import { createAutoPopupLookupController } from './autoPopupLookupController.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';

import { createLookupFlowOrchestrator } from './lookupFlowOrchestrator.js';
import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { computePopupPosition } from './popupPositioning.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';

async function bootstrapContentRuntime({
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

  // --- Popup DOM logic ---
  let popupElement = null;
  let popupCtrl = null;
  let orchestrator = null;

  function removePopup() {
    if (popupElement && popupElement.parentNode) {
      popupElement.parentNode.removeChild(popupElement);
      popupElement = null;
      popupCtrl = null;
      console.log('[VOCAB] Popup removed from DOM');
    }
  }

  function createPopup() {
    if (popupElement) return popupElement;
    popupElement = documentObj.createElement('div');
    popupElement.className = 'vocab-popup';
    popupElement.style.position = 'absolute';
    popupElement.style.zIndex = 2147483647;
    popupElement.style.background = '#fff';
    popupElement.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
    popupElement.style.borderRadius = '8px';
    popupElement.style.padding = '16px';
    popupElement.style.maxWidth = '420px';
    popupElement.style.minWidth = '200px';
    popupElement.style.fontFamily = 'inherit';
    popupElement.style.fontSize = '16px';
    popupElement.style.color = '#222';
    popupElement.style.transition = 'opacity 0.15s';
    popupElement.tabIndex = -1;
    popupElement.setAttribute('role', 'dialog');
    popupElement.setAttribute('aria-live', 'polite');
    popupElement.addEventListener('mousedown', (e) => e.stopPropagation());
    documentObj.body.appendChild(popupElement);
    console.log('[VOCAB] Popup inserted into DOM');
    return popupElement;
  }

  function renderPopupContent(state, selectionRect) {
    if (!popupElement) return;
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
      content = [{ type: 'message', value: 'Đang tra cứu...' }];
    } else {
      content = [];
    }
    // Simple HTML rendering for demo
    popupElement.innerHTML = content.map((item) => {
      if (item.type === 'headword') return `<div style="font-weight:bold;font-size:20px;">${item.value}</div>`;
      if (item.type === 'pronunciation') return `<div style="color:#888;">${item.value}</div>`;
      if (item.type === 'definition') return `<div style="margin:8px 0;">${item.value}</div>`;
      if (item.type === 'title') return `<div style="font-weight:bold;">${item.value}</div>`;
      if (item.type === 'message') return `<div>${item.value}</div>`;
      if (item.type === 'guidance-list') return `<ul style="margin:8px 0;">${item.value.map((g) => `<li>${g}</li>`).join('')}</ul>`;
      if (item.type === 'cta') return `<div style="margin-top:8px;"><button>${item.value}</button></div>`;
      if (item.type === 'attribution') return `<div style="margin-top:12px;font-size:12px;color:#888;">${item.value}</div>`;
      if (item.type === 'permission-disclosure') return `<div style="font-size:12px;color:#888;">${item.value}</div>`;
      return '';
    }).join('');
    // Position popup
    if (selectionRect) {
      const viewport = {
        width: windowObj.innerWidth,
        height: windowObj.innerHeight,
        scrollX: windowObj.scrollX,
        scrollY: windowObj.scrollY,
      };
      const popupSize = { width: popupElement.offsetWidth, height: popupElement.offsetHeight };
      const pos = computePopupPosition({ selectionRect, popupSize, viewport });
      popupElement.style.left = `${pos.left}px`;
      popupElement.style.top = `${pos.top}px`;
      popupElement.style.maxWidth = `${pos.maxWidth}px`;
    }
  }

  function showPopup(state, selectionRect) {
    createPopup();
    renderPopupContent(state, selectionRect);
    if (!popupCtrl) {
      popupCtrl = createPopupController({
        eventTarget: documentObj,
        popupElement,
        onClose: ({ reason }) => {
          removePopup();
          console.log('[VOCAB] Popup closed', reason);
        },
        onOpen: () => {
          popupElement.focus();
        },
      });
    }
    popupCtrl.open();
  }

  // --- Orchestrator for lookup flow ---
  orchestrator = createLookupFlowOrchestrator({
    lookupExecutor: async ({ headword }) => {
      // Lấy token đúng từ request.token hoặc request.payload.token
     
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
      console.log('[VOCAB] orchestrator onStateChange:', state);
      if (state.status === 'success' || state.status === 'not-found' || state.status === 'error' || state.status === 'loading') {
        const selection = readSelectionSnapshot(windowObj);
        showPopup(state, selection.rect);
      } else if (state.status === 'idle') {
        removePopup();
      }
    },
  });

  // --- Selection detection and trigger ---
  const autoPopupController = createAutoPopupLookupController({
    eventTarget: documentObj,
    settingsStore,
    getSnapshot: () => readSelectionSnapshot(windowObj),
    onLookupRequest: (request) => {
      // Truyền nguyên object request để orchestrator xử lý đúng
      orchestrator.runLookup(request);
      console.log('[VOCAB] onLookupRequest', request);
    },
  });

  await autoPopupController.start();
  console.log('[VOCAB] Content script started');

  globalThis.__vocabularyExtensionContentRuntimeStarted = true;

  return {
    started: true,
    dispose: () => {
      autoPopupController.stop();
      settingsStore.destroy?.();
      removePopup();
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
