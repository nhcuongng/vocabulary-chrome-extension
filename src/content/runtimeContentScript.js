import { readSelectionSnapshot } from './selectionDetection.js';
import { createAutoPopupLookupController } from './autoPopupLookupController.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';

import { createLookupFlowOrchestrator } from './lookupFlowOrchestrator.js';
import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
import { computePopupPosition } from './popupPositioning.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`

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
    popupElement.style.borderRadius = '10px';
    popupElement.style.padding = '12px';
    popupElement.style.maxWidth = '380px';
    popupElement.style.minWidth = '200px';
    popupElement.style.fontFamily = 'inherit';
    popupElement.style.fontSize = '16px';
    popupElement.style.color = '#222';
    popupElement.style.transition = 'opacity 0.15s';
    popupElement.tabIndex = -1;
    popupElement.setAttribute('role', 'dialog');
    popupElement.setAttribute('aria-live', 'polite');
    // Stop propagation for all relevant events
    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach((evt) => {
      popupElement.addEventListener(evt, (e) => e.stopPropagation());
    });
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
    // D2 - Compact Utility style rendering (moved to vocab-popup)
    let html = '';
    // Render content, chèn link "Xem thêm" ngay dưới headword nếu có
    content.forEach((item, idx) => {
      if (item.type === 'headword') {
        const cap = typeof item.value === 'string' && item.value.length > 0
          ? item.value.charAt(0).toUpperCase() + item.value.slice(1)
          : item.value;
        const vocabUrl = `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel.headword)}`;
          html += `
          <style>
            .head-word:hover {
              text-decoration: underline;
            }

            .head-word {
              text-decoration:none;
            }
          </style>
          <p style="font-size:30px;font-weight:700;margin:0 0 8px;color:#1677C9;">
        <a href="${vocabUrl}" class="head-word" target="_blank" rel="noopener noreferrer">${cap}</a></p>`;
      } else if (item.type === 'pronunciation') {
        html += `<div style="color:#4B5563;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:8px;">`;
        // Render US pronunciation + audio
        if (item.audio && item.audio.us && item.value.includes('US')) {
          const usMatch = item.value.match(/US\s*([^·]+)/);
          if (usMatch) {
            html += `<span>US ${usMatch[1].trim()}</span>`;
            html += `<button title="US pronunciation" style="background:none;border:none;cursor:pointer;padding:0 4px; color: #4B5563;" onclick="(function(){var a=new Audio('${item.audio.us}');a.play();})()">${speakerSVG}</button>`;
          }
        }
        // Render UK pronunciation + audio
        if (item.audio && item.audio.uk && item.value.includes('UK')) {
          const ukMatch = item.value.match(/UK\s*([^·]+)/);
          if (ukMatch) {
            html += `<span>UK ${ukMatch[1].trim()}</span>`;
            html += `<button title="UK pronunciation" style="background:none;border:none;cursor:pointer;padding:0 4px;  color: #4B5563;" onclick="(function(){var a=new Audio('${item.audio.uk}');a.play();})()">${speakerSVG}</button>`;
          }
        }
        // Fallback: if no US/UK, just show value
        if (!(item.audio && (item.audio.us || item.audio.uk))) {
          html += `<span>${item.value}</span>`;
        }
        html += `</div>`;
      }
      else if (item.type === 'definition') html += `<p style="font-size:15px;line-height:1.5;margin:10px 0;">${item.value}</p>`;
      else if (item.type === 'title') html += `<div style="font-weight:bold;">${item.value}</div>`;
      else if (item.type === 'message') html += `<div>${item.value}</div>`;
      else if (item.type === 'guidance-list') html += `<ul style="margin:8px 0;">${item.value.map((g) => `<li>${g}</li>`).join('')}</ul>`;
      else if (item.type === 'cta') html += `<div style="margin-top:8px;"><button>${item.value}</button></div>`;
      else if (item.type === 'attribution') html += `<div style="margin-top:12px;">${item.value}</div>`;
      else if (item.type === 'permission-disclosure') html += `<div style="font-size:12px;margin-top:4px;">${item.value}</div>`;
    });
    popupElement.innerHTML = html;

    // --- Fix: Ensure popup is measured after DOM update ---
    if (selectionRect) {
      // Force reflow to ensure offsetWidth/offsetHeight are correct
      const popupWidth = popupElement.offsetWidth;
      const popupHeight = popupElement.offsetHeight;
      const viewport = {
        width: windowObj.innerWidth,
        height: windowObj.innerHeight,
        scrollX: windowObj.scrollX,
        scrollY: windowObj.scrollY,
      };
      // Compute position: always prefer below selection, fallback above if not enough space
      let left = selectionRect.left + viewport.scrollX;
      let top = selectionRect.bottom + viewport.scrollY + 8; // 8px margin below selection
      // If popup would overflow bottom, try above selection
      if (top + popupHeight > viewport.scrollY + viewport.height) {
        const aboveTop = selectionRect.top + viewport.scrollY - popupHeight - 8;
        if (aboveTop >= viewport.scrollY) {
          top = aboveTop;
        } else {
          // Clamp to bottom if still overflow
          top = viewport.scrollY + viewport.height - popupHeight - 8;
        }
      }
      // Clamp left to viewport
      if (left + popupWidth > viewport.scrollX + viewport.width) {
        left = viewport.scrollX + viewport.width - popupWidth - 8;
      }
      if (left < viewport.scrollX) left = viewport.scrollX + 8;
      popupElement.style.left = `${left}px`;
      popupElement.style.top = `${top}px`;
      popupElement.style.maxWidth = `${Math.min(380, viewport.width - 16)}px`;
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
