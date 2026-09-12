import { createPopupController } from './popupController.js';
import {
  renderDictionaryContentView,
  createDomHelper,
} from '../presentation/dictionaryContentView.js';
import {
  createHistoryMenuElement,
  UI_COPY,
} from './historySliderRenderer.js';
import { playAudioWithFallback } from '../domain/audioPlaybackUtils.js';


export function calculateResponsivePopupDimensions(viewport = {}) {
  const vpWidth = Number(viewport.width) > 0 ? Number(viewport.width) : 1024;
  const vpHeight = Number(viewport.height) > 0 ? Number(viewport.height) : 768;

  let targetWidth;
  if (vpWidth <= 420) {
    targetWidth = Math.max(260, vpWidth - 24);
  } else {
    targetWidth = Math.min(420, Math.max(340, Math.round(vpWidth * 0.32)));
    targetWidth = Math.min(targetWidth, vpWidth - 24);
  }

  const maxHeight = Math.min(520, Math.max(260, Math.round(vpHeight * 0.55)));
  const minHeight = Math.min(220, Math.max(160, Math.round(vpHeight * 0.3)));

  return {
    width: targetWidth,
    maxHeight,
    minHeight,
  };
}

const waveformSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 10v4"></path>
  <path d="M6 7v10"></path>
  <path d="M10 3v18"></path>
  <path d="M14 8v8"></path>
  <path d="M18 5v14"></path>
  <path d="M22 10v4"></path>
</svg>`;

const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

const searchSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
</svg>`;

const dictionarySVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
</svg>`;

const gearSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>`;

const checkSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`;

const dragDotsSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 16" fill="currentColor">
  <circle cx="2" cy="2" r="1.5"></circle>
  <circle cx="8" cy="2" r="1.5"></circle>
  <circle cx="2" cy="8" r="1.5"></circle>
  <circle cx="8" cy="8" r="1.5"></circle>
  <circle cx="2" cy="14" r="1.5"></circle>
  <circle cx="8" cy="14" r="1.5"></circle>
</svg>`;

const starSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>`;

const eyeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

const eyeOffSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
  <line x1="1" y1="1" x2="23" y2="23"></line>
</svg>`;

export function createPopupManager({
  documentObj,
  windowObj,
  onLookupWord,
  historyAdapter,
  settingsAdapter,
  onSourceChange,
  lookupExecutor,
} = {}) {
  let popupElement = null;
  let popupCtrl = null;
  let absoluteSelectionRect = null;
  let isListening = false;
  let lastState = null;

  let currentSlideIndex = 0;
  let isHistorySearching = false;
  let historySearchQuery = '';
  let customPosition = null;
  let currentPlacement = null;
  let cleanupActiveDrag = null;
  let customWords = null;
  let lastRenderedWord = null;
  let activeSearchSource = null;
  let isHistoryMenuOpen = false;

  function setCustomWords(words) {
    if (Array.isArray(words)) {
      customWords = words
        .filter((w) => typeof w === 'string')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
    } else {
      customWords = null;
    }
  }

  const handleScrollResize = () => {
    if (popupElement && (absoluteSelectionRect || customPosition)) {
      updatePopupPosition();
    }
  };

  let throttleTimeout = null;
  const throttledHandleScrollResize = () => {
    if (throttleTimeout) return;
    throttleTimeout = setTimeout(() => {
      handleScrollResize();
      throttleTimeout = null;
    }, 50);
  };

  function removePopup({ clearSelection = false } = {}) {
    if (popupElement && popupElement.parentNode) {
      windowObj.removeEventListener('scroll', throttledHandleScrollResize, true);
      windowObj.removeEventListener('resize', throttledHandleScrollResize, true);
      isListening = false;
      cleanupActiveDrag?.();
      cleanupActiveDrag = null;
      popupElement.parentNode.removeChild(popupElement);
      popupElement = null;
      popupCtrl = null;
      lastState = null;
      lastRenderedWord = null;
      customWords = null;
      currentSlideIndex = 0;
      isHistorySearching = false;
      historySearchQuery = '';
      isHistoryMenuOpen = false;
      isAutoOrderOpen = false;
      activeSearchSource = null;
      customPosition = null;
      currentPlacement = null;
      absoluteSelectionRect = null;

      if (clearSelection && windowObj?.getSelection) {
        try {
          const sel = windowObj.getSelection();
          if (sel && !sel.isCollapsed) {
            if (typeof sel.removeAllRanges === 'function') {
              sel.removeAllRanges();
            } else if (typeof sel.empty === 'function') {
              sel.empty();
            }
          }
        } catch {}
      }
    }
  }

  let isAutoOrderOpen = false;

  function createPopup() {
    if (popupElement) return popupElement;
    popupElement = documentObj.createElement('div');
    popupElement.tabIndex = -1;
    popupElement.style.position = 'absolute';
    popupElement.style.zIndex = 2147483647;
    // Shadow DOM root
    const shadow = popupElement.attachShadow({ mode: 'open' });
    // Popup container inside shadow
    const popupContainer = documentObj.createElement('div');
    popupContainer.className = 'vocab-popup vocab-popup-theme';
    popupContainer.tabIndex = -1;
    popupContainer.setAttribute('role', 'dialog');
    popupContainer.setAttribute('aria-live', 'polite');
    popupContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (popupContainer._activeQuickPreview) {
          popupContainer._activeQuickPreview.close();
          return;
        }
        if (isHistoryMenuOpen) {
          isHistoryMenuOpen = false;
          if (lastState) {
            renderPopupContent(lastState);
          }
          return;
        }
        if (popupCtrl) {
          popupCtrl.close('escape');
        } else {
          removePopup({ clearSelection: true });
        }
      }
    });
    popupContainer.addEventListener('pointerdown', (e) => {
      if (isHistoryMenuOpen) {
        const menuContainer = popupContainer.querySelector('.vocab-history-menu-container');
        if (menuContainer && typeof menuContainer.contains === 'function') {
          if (!menuContainer.contains(e.target)) {
            isHistoryMenuOpen = false;
            if (lastState) {
              renderPopupContent(lastState);
            }
          }
        }
      }
    });
    // Style for shadow root
    const style = documentObj.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .skeleton {
        background: #f6f7f8;
        background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
        background-repeat: no-repeat;
        background-size: 800px 100%;
        display: inline-block;
        position: relative;
        animation-duration: 1.5s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: shimmer;
        animation-timing-function: linear;
        border-radius: 4px;
      }

      .skeleton-headword-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        gap: 8px;
      }

      .skeleton-headword {
        height: 28px;
        width: 55%;
        border-radius: 6px;
      }

      .skeleton-circle-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .skeleton-pron-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }

      .skeleton-pron {
        height: 18px;
        width: 38%;
        border-radius: 4px;
      }

      .skeleton-stress {
        height: 24px;
        width: 100%;
        margin-bottom: 12px;
        border-radius: 8px;
      }

      .skeleton-def-card {
        padding: 8px 10px;
        background: #f9fafb;
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .vocab-popup.dark-mode .skeleton-def-card {
        background: #1f2937;
        border-color: #374151;
      }

      .skeleton-tag {
        height: 14px;
        width: 22%;
        border-radius: 4px;
        margin-bottom: 6px;
      }

      .skeleton-def {
        height: 15px;
        width: 100%;
        margin-bottom: 6px;
        border-radius: 4px;
      }

      .skeleton-def.short {
        width: 75%;
        margin-bottom: 0;
      }

      .custom-definition-list .definition {
        font-size: 14px;
        margin-right: 10px;
        margin-bottom: 10px;
      }

      .vocab-popup {
        display: flex;
        flex-direction: column;
        height: var(--vocab-popup-height, 420px);
        max-height: var(--vocab-popup-max-height, 420px);
        min-height: var(--vocab-popup-min-height, 200px);
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: #e5e7eb transparent;
        scrollbar-gutter: stable;
        box-sizing: border-box;
        outline: none;
      }

      .vocab-popup:focus {
        outline: none;
      }

      .vocab-popup::-webkit-scrollbar {
        width: 5px;
      }

      .vocab-popup::-webkit-scrollbar-track {
        background: transparent;
      }

      .vocab-popup::-webkit-scrollbar-thumb {
        background-color: #d1d5db;
        border-radius: 4px;
      }

      .vocab-popup::-webkit-scrollbar-thumb:hover {
        background-color: #9ca3af;
      }

      .vocab-popup-theme {
        background: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        border-radius: 12px;
        padding: 12px 14px;
        width: var(--vocab-popup-width, 380px);
        max-width: calc(100vw - 24px);
        min-width: 260px;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        font-size: 15px;
        color: #222;
        transition: opacity 0.15s;
      }

      @keyframes vocabFadeSlideIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .vocab-popup-body {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        min-width: 0;
      }

      .vocab-content-fade-in {
        animation: vocabFadeSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* Header Bar & Drag Handle */
      .vocab-popup-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f3f4f6;
        cursor: grab;
        user-select: none;
      }
      .vocab-popup-header-bar.dragging {
        cursor: grabbing;
      }

      .vocab-popup-drag-handle {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 600;
        cursor: grab;
        padding: 2px 4px;
        border-radius: 4px;
        transition: color 0.15s;
        letter-spacing: -0.01em;
      }
      .vocab-popup-drag-handle:hover {
        color: #111827;
      }
      .vocab-popup-drag-icon {
        display: flex;
        align-items: center;
        color: #9ca3af;
        opacity: 0.8;
      }
      .vocab-popup-brand-icon {
        display: flex;
        align-items: center;
        color: #3b82f6;
      }
      .vocab-popup-title-text {
        white-space: nowrap;
      }

      .vocab-popup-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        position: relative;
      }

      /* History Menu Button & Popover */
      .vocab-history-menu-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .vocab-history-menu-btn {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        padding: 3px 6px;
        color: #6b7280;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 500;
        transition: background-color 0.15s, color 0.15s, border-color 0.15s;
      }
      .vocab-history-menu-btn:hover {
        background-color: #f3f4f6;
        color: #111827;
        border-color: #d1d5db;
      }
      .vocab-history-menu-btn.active {
        background-color: #eff6ff;
        color: #1d4ed8;
        border-color: #93c5fd;
      }
      .vocab-history-menu-badge {
        font-size: 10px;
        font-weight: 600;
        background: #e5e7eb;
        color: #4b5563;
        padding: 0 4px;
        border-radius: 8px;
        line-height: 1.3;
      }
      .vocab-history-menu-btn.active .vocab-history-menu-badge {
        background: #bfdbfe;
        color: #1e40af;
      }

      .vocab-history-menu-popover {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 190px;
        max-height: 240px;
        z-index: 100;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .vocab-history-popover-header {
        padding: 5px 8px;
        background: #f9fafb;
        border-bottom: 1px solid #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vocab-history-popover-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
      }
      .vocab-history-popover-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.15s, color 0.15s;
      }
      .vocab-history-popover-close-btn:hover {
        background-color: #e5e7eb;
        color: #374151;
      }

      .vocab-history-popover-list {
        padding: 4px;
        overflow-y: auto;
        max-height: 200px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .vocab-history-popover-item {
        background: none;
        border: none;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 6px;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        color: #374151;
        text-align: left;
        transition: background-color 0.12s, color 0.12s;
      }
      .vocab-history-popover-item:hover {
        background: #f3f4f6;
        color: #111827;
      }
      .vocab-history-popover-item.active {
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 600;
      }
      .vocab-history-item-index {
        font-size: 10px;
        color: #9ca3af;
        width: 16px;
        flex-shrink: 0;
      }
      .vocab-history-item-word {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .vocab-history-popover-empty {
        font-size: 11px;
        color: #9ca3af;
        padding: 8px 6px;
        text-align: center;
        font-style: italic;
      }

      .vocab-history-slider-wrapper {
        display: none;
      }

      .vocab-history-chip {
        display: none;
      }

      .vocab-simple-learn-toggle-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        min-width: 96px;
        gap: 5px;
        background: #f3f4f6;
        padding: 2px 7px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        color: #4b5563;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.15s, color 0.15s;
      }
      .vocab-simple-learn-label {
        display: inline-block;
        min-width: 58px;
        text-align: center;
        white-space: nowrap;
      }
      .vocab-simple-learn-toggle-wrapper:hover {
        background: #e5e7eb;
        color: #1f2937;
      }
      .vocab-simple-learn-toggle-wrapper.active {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .vocab-simple-learn-switch {
        position: relative;
        width: 24px;
        height: 13px;
        background: #d1d5db;
        border-radius: 10px;
        transition: background-color 0.15s;
        display: inline-block;
      }
      .vocab-simple-learn-switch::after {
        content: '';
        position: absolute;
        top: 1.5px;
        left: 2px;
        width: 10px;
        height: 10px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.15s;
      }
      .vocab-simple-learn-toggle-wrapper.active .vocab-simple-learn-switch {
        background: #2563eb;
      }
      .vocab-simple-learn-toggle-wrapper.active .vocab-simple-learn-switch::after {
        transform: translateX(10px);
      }

      /* Stress Diagram & Syllable Rhythm Pill */
      .vocab-stress-wrapper {
        margin: 2px 0 8px 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .vocab-stress-pill {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 4px 10px;
        min-height: 28px;
        box-sizing: border-box;
        margin: 0 0 10px 0;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
      }

      .vocab-stress-pill:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }

      .vocab-stress-pill-left {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .vocab-stress-wave-icon {
        display: flex;
        align-items: center;
        color: #1677C9;
        flex-shrink: 0;
      }

      .vocab-syllables-chain {
        display: flex;
        align-items: center;
        gap: 2px;
        font-family: inherit;
        font-size: 12px;
      }

      .vocab-syl-item {
        color: #64748b;
        font-weight: 500;
      }

      .vocab-syl-item.vocab-syl-high {
        color: #1677C9;
        font-weight: 700;
        background: rgba(22, 119, 201, 0.12);
        padding: 0 4px;
        border-radius: 4px;
      }

      .vocab-syl-item.vocab-syl-mid {
        color: #0284c7;
        font-weight: 600;
      }

      .vocab-syl-dot {
        color: #94a3b8;
        font-size: 10px;
        margin: 0 1px;
      }

      .vocab-stress-pill-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .vocab-eq-bars-container {
        display: flex;
        align-items: center;
      }

      .vocab-stress-summary-badge {
        font-size: 10px;
        font-weight: 600;
        color: #475569;
        background: #ffffff;
        padding: 1px 6px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        white-space: nowrap;
      }

      .vocab-stress-toggle-icon {
        font-size: 9px;
        color: #94a3b8;
        transition: transform 0.15s ease;
      }

      .vocab-stress-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .vocab-stress-card .vocab-stress-svg {
        width: 100%;
        max-width: 280px;
        height: auto;
      }

      .vocab-stress-legend {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 10px;
        color: #6b7280;
        border-top: 1px dashed #e5e7eb;
        padding-top: 4px;
        width: 100%;
        justify-content: center;
      }

      .vocab-stress-legend .legend-item {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .vocab-stress-legend .dot-high {
        color: #1677C9;
        font-size: 9px;
      }

      .vocab-stress-legend .dot-mid {
        color: #0284c7;
        font-size: 8px;
      }

      .vocab-stress-legend .dot-low {
        color: #9ca3af;
        font-size: 7px;
      }

      /* Search History Inline Bar */
      .vocab-history-search-bar {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }

      .vocab-history-search-input {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 12px;
        outline: none;
        background: #f9fafb;
        color: #111827;
        width: 100%;
        box-sizing: border-box;
      }
      .vocab-history-search-input:focus {
        border-color: #1677C9;
        background: #fff;
      }

      .vocab-history-search-clear-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .vocab-history-search-clear-btn:hover {
        color: #4b5563;
      }

      .vocab-history-empty {
        font-size: 11px;
        color: #9ca3af;
        font-style: italic;
        padding: 0 4px;
      }

      .vocab-popup-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s, color 0.2s;
        flex-shrink: 0;
      }
      .vocab-popup-close-btn:hover {
        background-color: #f3f4f6;
        color: #4b5563;
      }

      /* Content Elements */
      .vocab-popup-headword-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 32px;
        margin: 0 0 6px 0;
      }
      .vocab-popup-theme .head-word:hover {
        text-decoration: underline;
      }
      .vocab-popup-theme .head-word {
        text-decoration: none;
      }
      .vocab-popup-headword {
        font-size: 26px;
        font-weight: 700;
        margin: 0;
        color: #1677C9;
        line-height: 1.15;
      }

      /* Headword History Stepper */
      .vocab-history-stepper {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 2px 4px;
        user-select: none;
        flex-shrink: 0;
      }

      .vocab-stepper-btn {
        background: transparent;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #475569;
        font-size: 13px;
        font-weight: 700;
        padding: 0;
        line-height: 1;
        transition: background-color 0.15s, color 0.15s;
      }

      .vocab-stepper-btn:hover:not(:disabled) {
        background: #e2e8f0;
        color: #0f172a;
      }

      .vocab-stepper-btn:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }

      .vocab-stepper-counter {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        padding: 0 3px;
      }
      .vocab-popup-pronunciation {
        color: #4B5563;
        font-size: 13px;
        min-height: 22px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vocab-popup-audio-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0 4px;
        color: #4B5563;
        display: flex;
        transition: transform 0.15s ease;
      }
      .vocab-popup-audio-btn.is-playing {
        color: #1677C9 !important;
        animation: vocabAudioPulse 0.6s ease-in-out infinite alternate;
      }
      .vocab-popup.dark-mode .vocab-popup-audio-btn.is-playing {
        color: #60a5fa !important;
      }
      @keyframes vocabAudioPulse {
        0% { transform: scale(1); opacity: 0.85; }
        100% { transform: scale(1.22); opacity: 1; }
      }
      .vocab-popup-definition {
        font-size: 14px;
        line-height: 1.5;
        margin: 8px 0;
      }
      .vocab-quick-def {
        font-size: 14px;
        line-height: 1.5;
        color: #1f2937;
        margin: 6px 0 10px 0;
        padding: 6px 8px 6px 10px;
        min-height: 44px;
        box-sizing: border-box;
        background: #f8fafc;
        border-left: 3px solid #1677C9;
        border-radius: 0 6px 6px 0;
      }
      .vocab-quick-def p {
        margin: 0;
      }
      .vocab-popup-title {
        font-weight: bold;
      }
      .vocab-popup-search-suggestions {
        margin-top: 10px;
        font-size: 13px;
        color: #4B5563;
      }
      .vocab-popup-search-suggestions a,
      .search-suggestion-link {
        color: #1677C9;
        text-decoration: underline;
        font-weight: 500;
        transition: color 0.15s ease;
      }
      .vocab-popup-search-suggestions a:hover,
      .search-suggestion-link:hover {
        color: #0d5ca0;
      }
      .vocab-popup-guidance-list {
        margin: 8px 0;
      }
      .vocab-popup-cta {
        margin-top: 8px;
      }
      .vocab-popup-compliance-footer {
        position: sticky;
        bottom: -12px;
        margin-top: auto;
        flex-shrink: 0;
        background: #ffffff;
        margin-left: -14px;
        margin-right: -14px;
        margin-bottom: -12px;
        padding: 8px 14px 7px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-top: 1px solid #e5e7eb;
        box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.04);
        z-index: 10;
      }
      .vocab-popup-attribution {
        margin-top: 0;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }
      .vocab-popup-permission-disclosure {
        font-size: 11px;
        margin-top: 0;
        color: #9ca3af;
      }

      /* Details & Summary custom styles */
      details.vocab-details {
        margin-bottom: 8px;
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        padding: 6px 8px;
        background: #fff;
      }
      details.vocab-details summary {
        cursor: pointer;
        list-style: none;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }
      details.vocab-details summary::-webkit-details-marker {
        display: none;
      }
      details.vocab-details .vocab-details-label {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        background: #e0e7ff;
        color: #3730a3;
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 8px;
        margin-right: 8px;
        vertical-align: middle;
      }
      details.vocab-details .collapse-icon {
        display: inline-block;
        transition: transform 0.2s ease;
        color: #9ca3af;
        font-size: 10px;
      }
      details.vocab-details[open] .collapse-icon {
        transform: rotate(90deg);
      }
      details.vocab-details .details-content {
        margin-top: 6px;
        color: #4b5563;
        font-size: 13px;
        line-height: 1.5;
      }
      details.vocab-details .details-content p {
        margin: 0;
      }

      /* Tabbed Interface styles - Connected Underline & Subtle Card Surface */
      .vocab-tabs-container {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 6px 10px;
        box-sizing: border-box;
      }
      .vocab-tab-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1px solid #e5e7eb;
        margin: 0;
        padding: 0 0 2px 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .vocab-tab-bar::-webkit-scrollbar {
        display: none;
      }
      .vocab-tab-list {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .vocab-tab-list::-webkit-scrollbar {
        display: none;
      }
      .vocab-tab-btn {
        background: transparent;
        border: none;
        border-bottom: 2.5px solid transparent;
        margin-bottom: -1px;
        outline: none;
        padding: 5px 8px;
        border-radius: 4px 4px 0 0;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
        white-space: nowrap;
        user-select: none;
      }
      .vocab-tab-btn:hover {
        color: #1f2937;
      }
      .vocab-tab-btn.active {
        color: #0b5ea8;
        border-bottom-color: #0b5ea8;
        font-weight: 600;
      }
      .vocab-tab-badge {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 10px;
        background: #e5e7eb;
        color: #4b5563;
      }
      .vocab-tab-btn.active .vocab-tab-badge {
        background: #dbeafe;
        color: #1e40af;
      }
      .vocab-tab-reorder-btn {
        background: transparent;
        border: none;
        outline: none;
        padding: 4px 6px;
        border-radius: 4px;
        color: #9ca3af;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      .vocab-tab-reorder-btn:hover {
        background: #f3f4f6;
        color: #4b5563;
      }
      .vocab-tab-reorder-btn.active {
        background: #e0f2fe;
        color: #0284c7;
      }
      .vocab-tabs-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        backdrop-filter: blur(1px);
        animation: fadeInTab 0.15s ease-out;
      }
      .vocab-tabs-modal {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 90%;
        max-width: 320px;
        padding: 12px 14px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
      }
      .vocab-tabs-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 6px;
      }
      .vocab-tabs-modal-title {
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
      }
      .vocab-tabs-modal-close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .vocab-tabs-modal-close-btn:hover {
        background: #f1f5f9;
        color: #475569;
      }
      .vocab-tabs-modal-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 180px;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
        padding: 2px 0;
        box-sizing: border-box;
      }
      .vocab-tabs-modal-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        user-select: none;
        box-sizing: border-box;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .vocab-tabs-modal-item.dragging {
        opacity: 0.4;
        background: #f1f5f9;
      }
      .vocab-tabs-modal-item.drag-over {
        border-color: #0284c7;
        background: #e0f2fe;
        outline: 1.5px dashed #0284c7;
        outline-offset: -1px;
      }
      .vocab-tabs-modal-item-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .vocab-tabs-modal-drag-handle {
        color: #94a3b8;
        cursor: grab;
        display: inline-flex;
        align-items: center;
      }
      .vocab-tabs-modal-drag-handle:active {
        cursor: grabbing;
      }
      .vocab-tabs-modal-item-label {
        font-size: 12px;
        font-weight: 500;
        color: #334155;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vocab-tabs-modal-item.hidden-tab .vocab-tabs-modal-item-label {
        color: #94a3b8;
        text-decoration: line-through;
      }
      .vocab-tabs-modal-eye-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: #0284c7;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .vocab-tabs-modal-eye-btn:hover {
        background: #e2e8f0;
      }
      .vocab-tabs-modal-eye-btn.tab-hidden {
        color: #94a3b8;
      }
      .vocab-tabs-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #f1f5f9;
        padding-top: 8px;
        margin-top: 2px;
      }
      .vocab-tabs-modal-reset-btn {
        background: transparent;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 500;
        color: #64748b;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .vocab-tabs-modal-reset-btn:hover {
        background: #f1f5f9;
        color: #334155;
        border-color: #94a3b8;
      }
      .vocab-tabs-modal-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .vocab-tabs-modal-save-btn {
        background: #0284c7;
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #ffffff;
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      .vocab-tabs-modal-save-btn:hover {
        background: #0369a1;
      }
      .vocab-tab-panels {
        max-height: 220px;
        overflow-y: auto;
        padding: 8px 2px 4px 2px;
        scrollbar-width: thin;
      }
      .vocab-tab-panel {
        display: none;
      }
      .vocab-tab-panel.active {
        display: block;
        animation: fadeInTab 0.15s ease-out;
      }
      @keyframes fadeInTab {
        from { opacity: 0; transform: translateY(2px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Part of Speech (POS) Chips */
      .vocab-pos-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        padding: 2px 7px;
        border-radius: 9999px;
        margin-right: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        vertical-align: middle;
        border: 1px solid transparent;
        user-select: none;
      }
      .vocab-pos-chip.vocab-pos-noun {
        background: #dbeafe;
        color: #1e40af;
        border-color: #bfdbfe;
      }
      .vocab-pos-chip.vocab-pos-verb {
        background: #dcfce7;
        color: #166534;
        border-color: #bbf7d0;
      }
      .vocab-pos-chip.vocab-pos-adjective {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .vocab-pos-chip.vocab-pos-adverb {
        background: #f3e8ff;
        color: #6b21a8;
        border-color: #e9d5ff;
      }
      .vocab-pos-chip.vocab-pos-pronoun {
        background: #ccfbf1;
        color: #115e59;
        border-color: #99f6e4;
      }
      .vocab-pos-chip.vocab-pos-preposition {
        background: #ffe4e6;
        color: #9f1239;
        border-color: #fecdd3;
      }
      .vocab-pos-chip.vocab-pos-conjunction {
        background: #ffedd5;
        color: #9a3412;
        border-color: #fed7aa;
      }
      .vocab-pos-chip.vocab-pos-interjection,
      .vocab-pos-chip.vocab-pos-phrase,
      .vocab-pos-chip.vocab-pos-idiom,
      .vocab-pos-chip.vocab-pos-other {
        background: #f1f5f9;
        color: #334155;
        border-color: #e2e8f0;
      }

      /* Word Family Section */
      .vocab-word-family-group {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .vocab-family-chip {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
      }
      .vocab-family-chip:hover {
        background: #dcfce7;
        color: #14532d;
        border-color: #86efac;
      }
      .vocab-family-chip.disabled-inflection {
        cursor: not-allowed;
        opacity: 0.65;
        background: #f3f4f6;
        color: #6b7280;
        border-color: #e5e7eb;
      }
      .vocab-family-chip.disabled-inflection:hover {
        background: #f3f4f6;
        color: #6b7280;
        border-color: #e5e7eb;
      }

      /* Synonyms & Antonyms Section */
      .vocab-thesaurus-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 2px;
      }
      .vocab-thesaurus-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 2px 0 2px 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .vocab-thesaurus-section-title.synonyms-title {
        color: #15803d;
      }
      .vocab-thesaurus-section-title.antonyms-title {
        color: #c2410c;
      }
      .vocab-thesaurus-chip-group {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .vocab-synonym-chip {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .vocab-synonym-chip:hover {
        background: #dcfce7;
        color: #14532d;
        border-color: #86efac;
      }
      .vocab-antonym-chip {
        background: #fff7ed;
        color: #9a3412;
        border: 1px solid #fed7aa;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .vocab-antonym-chip:hover {
        background: #ffedd5;
        color: #7c2d12;
        border-color: #fdba74;
      }

      /* Quick Preview Popover for Synonyms, Antonyms, and Word Family */
      .vocab-quick-preview-popover {
        position: absolute;
        z-index: 120;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 290px;
        max-width: calc(100% - 16px);
        padding: 10px 12px;
        font-family: inherit;
        font-size: 13px;
        color: #1f2937;
        box-sizing: border-box;
        animation: vocabFadeSlideIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .vocab-quick-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f1f5f9;
      }

      .vocab-quick-preview-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        text-transform: capitalize;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .vocab-quick-preview-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .vocab-quick-preview-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        padding: 3px;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.12s, color 0.12s, border-color 0.12s;
      }

      .vocab-quick-preview-btn:hover {
        background-color: #f1f5f9;
        color: #0f172a;
        border-color: #e2e8f0;
      }

      .vocab-quick-preview-btn.expand-btn:hover {
        color: #2563eb;
        background-color: #eff6ff;
        border-color: #bfdbfe;
      }

      .vocab-quick-preview-pron-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 12px;
        color: #64748b;
      }

      .vocab-quick-preview-ipa {
        font-family: inherit;
        font-style: italic;
      }

      .vocab-quick-preview-audio-btn {
        background: rgba(37, 99, 235, 0.1);
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #2563eb;
        padding: 0;
        transition: background-color 0.15s, transform 0.1s;
      }

      .vocab-quick-preview-audio-btn:hover {
        background: rgba(37, 99, 235, 0.2);
        transform: scale(1.08);
      }

      .vocab-quick-preview-popover .vocab-quick-def {
        margin: 4px 0 2px 0;
        font-size: 13px;
        line-height: 1.5;
        color: #1f2937;
        padding: 6px 8px 6px 10px;
        background: #f8fafc;
        border-left: 3px solid #1677C9;
        border-radius: 0 6px 6px 0;
        max-height: 120px;
        overflow-y: auto;
      }

      .vocab-quick-preview-empty {
        font-size: 12px;
        font-style: italic;
        color: #94a3b8;
      }

      /* Dark mode styles */
      .vocab-popup.dark-mode {
        background: #1f2937;
        color: #f3f4f6;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
      .vocab-popup.dark-mode .vocab-popup-headword {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-popup-header-bar {
        border-bottom-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-popup-drag-handle {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-popup-drag-handle:hover {
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-popup-brand-icon {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-history-menu-btn {
        border-color: #374151;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-history-menu-btn:hover {
        background-color: #374151;
        color: #f3f4f6;
        border-color: #4b5563;
      }
      .vocab-popup.dark-mode .vocab-history-menu-btn.active {
        background-color: #1e3a8a;
        color: #93c5fd;
        border-color: #3b82f6;
      }
      .vocab-popup.dark-mode .vocab-history-menu-badge {
        background: #374151;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-history-menu-btn.active .vocab-history-menu-badge {
        background: #1e40af;
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .vocab-history-menu-popover {
        background: #1f2937;
        border-color: #374151;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      }
      .vocab-popup.dark-mode .vocab-history-popover-header {
        background: #111827;
        border-bottom-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-history-popover-title {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-history-popover-close-btn {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-history-popover-close-btn:hover {
        background-color: #374151;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-history-popover-item {
        color: #d1d5db;
      }
      .vocab-popup.dark-mode .vocab-history-popover-item:hover {
        background: #374151;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-history-popover-item.active {
        background: #1e3a8a;
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-history-popover-empty {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-source-menu-btn:hover {
        background-color: #374151;
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-source-menu-popover {
        background: #1f2937;
        border-color: #374151;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      }
      .vocab-popup.dark-mode .vocab-source-menu-title {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item:hover {
        background-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item.active {
        background-color: #1e3a8a;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item .source-item-name {
        color: #e5e7eb;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item.active .source-item-name {
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-simple-learn-toggle-wrapper {
        background: #374151;
        color: #d1d5db;
      }
      .vocab-popup.dark-mode .vocab-simple-learn-toggle-wrapper:hover {
        background: #4b5563;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-simple-learn-toggle-wrapper.active {
        background: #1e3a8a;
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-simple-learn-switch {
        background: #4b5563;
      }
      .vocab-popup.dark-mode .vocab-simple-learn-toggle-wrapper.active .vocab-simple-learn-switch {
        background: #3b82f6;
      }
      .vocab-popup.dark-mode .vocab-stress-pill {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
      }
      .vocab-popup.dark-mode .vocab-stress-pill:hover {
        background: #334155;
        border-color: #475569;
      }
      .vocab-popup.dark-mode .vocab-stress-wave-icon {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-syl-item {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-syl-item.vocab-syl-high {
        color: #93c5fd;
        background: rgba(96, 165, 250, 0.2);
      }
      .vocab-popup.dark-mode .vocab-syl-item.vocab-syl-mid {
        color: #38bdf8;
      }
      .vocab-popup.dark-mode .vocab-syl-dot {
        color: #64748b;
      }
      .vocab-popup.dark-mode .vocab-stress-summary-badge {
        background: #0f172a;
        border-color: #334155;
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-stress-toggle-icon {
        color: #64748b;
      }
      .vocab-popup.dark-mode .vocab-stress-card {
        background: #1f2937;
        border-color: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .vocab-popup.dark-mode .vocab-stress-legend {
        border-top-color: #374151;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-history-stepper {
        background: #1e293b;
        border-color: #334155;
      }
      .vocab-popup.dark-mode .vocab-stepper-btn {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-stepper-btn:hover:not(:disabled) {
        background: #334155;
        color: #f1f5f9;
      }
      .vocab-popup.dark-mode .vocab-stepper-counter {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-history-search-input {
        background: #111827;
        border-color: #4b5563;
        color: #f3f4f6;
      }
      /* Dark mode for POS chips */
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-noun {
        background: rgba(30, 64, 175, 0.35);
        color: #93c5fd;
        border-color: rgba(147, 197, 253, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-verb {
        background: rgba(22, 101, 52, 0.35);
        color: #86efac;
        border-color: rgba(134, 239, 172, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-adjective {
        background: rgba(146, 64, 14, 0.35);
        color: #fcd34d;
        border-color: rgba(252, 211, 77, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-adverb {
        background: rgba(107, 33, 168, 0.35);
        color: #d8b4fe;
        border-color: rgba(216, 180, 254, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-pronoun {
        background: rgba(17, 94, 89, 0.35);
        color: #5eead4;
        border-color: rgba(94, 234, 212, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-preposition {
        background: rgba(159, 18, 57, 0.35);
        color: #fda4af;
        border-color: rgba(253, 164, 175, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-conjunction {
        background: rgba(154, 52, 18, 0.35);
        color: #fdba74;
        border-color: rgba(253, 186, 116, 0.35);
      }
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-interjection,
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-phrase,
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-idiom,
      .vocab-popup.dark-mode .vocab-pos-chip.vocab-pos-other {
        background: rgba(51, 65, 85, 0.45);
        color: #cbd5e1;
        border-color: rgba(203, 213, 225, 0.25);
      }

      .vocab-popup.dark-mode .vocab-family-chip {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #047857;
      }
      .vocab-popup.dark-mode .vocab-family-chip:hover {
        background: #065f46;
        color: #d1fae5;
      }
      .vocab-popup.dark-mode .vocab-thesaurus-section-title.synonyms-title {
        color: #4ade80;
      }
      .vocab-popup.dark-mode .vocab-thesaurus-section-title.antonyms-title {
        color: #fb923c;
      }
      .vocab-popup.dark-mode .vocab-synonym-chip {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #047857;
      }
      .vocab-popup.dark-mode .vocab-synonym-chip:hover {
        background: #065f46;
        color: #d1fae5;
      }
      .vocab-popup.dark-mode .vocab-antonym-chip {
        background: #7c2d12;
        color: #fed7aa;
        border-color: #9a3412;
      }
      .vocab-popup.dark-mode .vocab-antonym-chip:hover {
        background: #9a3412;
        color: #ffedd5;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-popover {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      }
      .vocab-popup.dark-mode .vocab-quick-preview-header {
        border-bottom-color: #334155;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-title {
        color: #f8fafc;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-btn {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-btn:hover {
        background-color: #334155;
        color: #f8fafc;
        border-color: #475569;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-btn.expand-btn:hover {
        color: #60a5fa;
        background-color: rgba(37, 99, 235, 0.2);
        border-color: #3b82f6;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-pron-row {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-audio-btn {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-def {
        color: #cbd5e1;
      }
      .vocab-popup.dark-mode .vocab-quick-preview-empty {
        color: #94a3b8;
      }
      .vocab-popup.dark-mode .vocab-popup-pronunciation,
      .vocab-popup.dark-mode .vocab-popup-audio-btn,
      .vocab-popup.dark-mode .vocab-popup-search-suggestions,
      .vocab-popup.dark-mode .details-content {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-quick-def {
        background: #111827;
        color: #f3f4f6;
        border-left-color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-popup-compliance-footer {
        background: #1f2937;
        border-top-color: #374151;
        box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.3);
      }
      .vocab-popup.dark-mode .vocab-popup-attribution {
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-popup-permission-disclosure {
        color: #6b7280;
      }
      .vocab-popup.dark-mode details.vocab-details {
        background: #111827;
        border-color: #374151;
      }
      .vocab-popup.dark-mode details.vocab-details summary {
        color: #e5e7eb;
      }
      .vocab-popup.dark-mode details.vocab-details .vocab-details-label {
        background: #1e3a8a;
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .vocab-tabs-container {
        background: #111827;
        border-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-tab-bar {
        border-bottom-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-tab-btn {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-tab-btn:hover {
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-tab-btn.active {
        color: #60a5fa;
        border-bottom-color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-tab-badge {
        background: #374151;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-tab-btn.active .vocab-tab-badge {
        background: #1e3a8a;
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-tab-reorder-btn {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-tab-reorder-btn:hover {
        background: #374151;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-tab-reorder-btn.active {
        background: #1e3a8a;
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-backdrop {
        background: rgba(0, 0, 0, 0.6);
      }
      .vocab-popup.dark-mode .vocab-tabs-modal {
        background: #1f2937;
        border-color: #374151;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-header {
        border-bottom-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-title {
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-close-btn {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-close-btn:hover {
        background: #374151;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-item {
        background: #111827;
        border-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-item.dragging {
        background: #1f2937;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-item.drag-over {
        border-color: #60a5fa;
        background: #1e293b;
        outline: 1.5px dashed #60a5fa;
        outline-offset: -1px;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-drag-handle {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-item-label {
        color: #e5e7eb;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-item.hidden-tab .vocab-tabs-modal-item-label {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-eye-btn {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-eye-btn:hover {
        background: #374151;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-eye-btn.tab-hidden {
        color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-footer {
        border-top-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-reset-btn {
        border-color: #4b5563;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-reset-btn:hover {
        background: #374151;
        color: #f3f4f6;
        border-color: #6b7280;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-save-btn {
        background: #2563eb;
      }
      .vocab-popup.dark-mode .vocab-tabs-modal-save-btn:hover {
        background: #1d4ed8;
      }
      .vocab-popup.dark-mode .vocab-popup-search-suggestions a,
      .vocab-popup.dark-mode .search-suggestion-link {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-popup-search-suggestions a:hover,
      .vocab-popup.dark-mode .search-suggestion-link:hover {
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .skeleton {
        background: #374151;
        background-image: linear-gradient(to right, #374151 0%, #4b5563 20%, #374151 40%, #374151 100%);
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(popupContainer);

    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'pointerdown'].forEach((evt) => {
      popupElement.addEventListener(evt, (e) => e.stopPropagation());
    });
    documentObj.body.appendChild(popupElement);
    popupElement._vocabShadow = shadow;
    popupElement._vocabContainer = popupContainer;
    return popupElement;
  }

  function updatePopupPosition({ forceReanchor = false } = {}) {
    if (!popupElement) return;

    const viewport = {
      width: windowObj.innerWidth || 1024,
      height: windowObj.innerHeight || 768,
      scrollX: windowObj.scrollX || 0,
      scrollY: windowObj.scrollY || 0,
    };

    const { width: responsiveWidth, maxHeight, minHeight } = calculateResponsivePopupDimensions(viewport);

    const popupContainer = popupElement._vocabContainer;
    if (popupContainer && popupContainer.style) {
      if (typeof popupContainer.style.setProperty === 'function') {
        popupContainer.style.setProperty('--vocab-popup-width', `${responsiveWidth}px`);
        popupContainer.style.setProperty('--vocab-popup-height', `${maxHeight}px`);
        popupContainer.style.setProperty('--vocab-popup-max-height', `${maxHeight}px`);
        popupContainer.style.setProperty('--vocab-popup-min-height', `${minHeight}px`);
      }
      popupContainer.style.width = `${responsiveWidth}px`;
      popupContainer.style.maxWidth = `${responsiveWidth}px`;
      popupContainer.style.height = `${maxHeight}px`;
      popupContainer.style.maxHeight = `${maxHeight}px`;
      popupContainer.style.minHeight = `${minHeight}px`;
    }

    const popupWidth = popupElement.offsetWidth || responsiveWidth;
    const popupHeight = popupElement.offsetHeight || maxHeight;

    if (customPosition) {
      const minLeft = viewport.scrollX + 8;
      const maxLeft = Math.max(minLeft, viewport.scrollX + viewport.width - popupWidth - 8);
      const minTop = viewport.scrollY + 8;
      const maxTop = Math.max(minTop, viewport.scrollY + viewport.height - popupHeight - 8);

      const clampedLeft = Math.min(Math.max(customPosition.left, minLeft), maxLeft);
      const clampedTop = Math.min(Math.max(customPosition.top, minTop), maxTop);

      popupElement.style.left = `${clampedLeft}px`;
      popupElement.style.top = `${clampedTop}px`;
      popupElement.style.maxWidth = `${Math.min(responsiveWidth, viewport.width - 16)}px`;
      return;
    }

    if (!absoluteSelectionRect) return;

    if (!currentPlacement || forceReanchor) {
      const spaceBelow = viewport.scrollY + viewport.height - (absoluteSelectionRect.bottom + 8);
      const spaceAbove = absoluteSelectionRect.top - 8 - viewport.scrollY;

      if (spaceBelow >= Math.min(popupHeight, maxHeight) || spaceBelow >= spaceAbove) {
        currentPlacement = 'below';
      } else {
        currentPlacement = 'above';
      }
    }

    let left = absoluteSelectionRect.left;
    if (left + popupWidth > viewport.scrollX + viewport.width - 8) {
      left = viewport.scrollX + viewport.width - popupWidth - 8;
    }
    if (left < viewport.scrollX + 8) {
      left = viewport.scrollX + 8;
    }

    let top = absoluteSelectionRect.bottom + 8;
    if (currentPlacement === 'above') {
      top = absoluteSelectionRect.top - popupHeight - 8;
      if (top < viewport.scrollY + 8) {
        top = viewport.scrollY + 8;
      }
    } else {
      top = absoluteSelectionRect.bottom + 8;
      if (top + popupHeight > viewport.scrollY + viewport.height - 8) {
        top = Math.max(viewport.scrollY + 8, viewport.scrollY + viewport.height - popupHeight - 8);
      }
    }

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
    popupElement.style.maxWidth = `${Math.min(responsiveWidth, viewport.width - 16)}px`;
  }

  function initHeaderBarDragging(headerBarEl) {
    if (!headerBarEl) return;

    const handleDragStart = (e) => {
      if (e.button !== 0) return;

      if (e.target && typeof e.target.closest === 'function') {
        const interactive = e.target.closest(
          'button, input, select, textarea, .vocab-history-chip, .vocab-source-menu-popover, .vocab-auto-order-item, .vocab-auto-order-section, [role="button"]'
        );
        if (interactive) return;
      }

      let isDragging = true;
      const dragStartX = e.clientX ?? 0;
      const dragStartY = e.clientY ?? 0;
      const elemInitialLeft = popupElement.offsetLeft;
      const elemInitialTop = popupElement.offsetTop;

      headerBarEl.classList.add('dragging');
      e.preventDefault?.();
      e.stopPropagation?.();

      const handlePointerMove = (moveEvt) => {
        if (!isDragging || !popupElement) return;
        moveEvt.preventDefault?.();
        moveEvt.stopPropagation?.();

        const currentClientX = moveEvt.clientX ?? 0;
        const currentClientY = moveEvt.clientY ?? 0;
        const deltaX = currentClientX - dragStartX;
        const deltaY = currentClientY - dragStartY;

        const viewport = {
          width: windowObj.innerWidth || 1024,
          height: windowObj.innerHeight || 768,
          scrollX: windowObj.scrollX || 0,
          scrollY: windowObj.scrollY || 0,
        };

        const popupWidth = popupElement.offsetWidth || 380;
        const popupHeight = popupElement.offsetHeight || 200;

        const rawLeft = elemInitialLeft + deltaX;
        const rawTop = elemInitialTop + deltaY;

        const minLeft = viewport.scrollX + 8;
        const maxLeft = Math.max(minLeft, viewport.scrollX + viewport.width - popupWidth - 8);
        const minTop = viewport.scrollY + 8;
        const maxTop = Math.max(minTop, viewport.scrollY + viewport.height - popupHeight - 8);

        const clampedLeft = Math.min(Math.max(rawLeft, minLeft), maxLeft);
        const clampedTop = Math.min(Math.max(rawTop, minTop), maxTop);

        customPosition = { left: clampedLeft, top: clampedTop };
        popupElement.style.left = `${clampedLeft}px`;
        popupElement.style.top = `${clampedTop}px`;
      };

      const handlePointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        headerBarEl.classList.remove('dragging');
        windowObj.removeEventListener('pointermove', handlePointerMove, true);
        windowObj.removeEventListener('pointerup', handlePointerUp, true);
        windowObj.removeEventListener('mousemove', handlePointerMove, true);
        windowObj.removeEventListener('mouseup', handlePointerUp, true);
        cleanupActiveDrag = null;
      };

      cleanupActiveDrag = handlePointerUp;

      windowObj.addEventListener('pointermove', handlePointerMove, true);
      windowObj.addEventListener('pointerup', handlePointerUp, true);
      windowObj.addEventListener('mousemove', handlePointerMove, true);
      windowObj.addEventListener('mouseup', handlePointerUp, true);
    };

    headerBarEl.addEventListener('pointerdown', handleDragStart);
    headerBarEl.addEventListener('mousedown', handleDragStart);
  }

  function navigateToWord(word, { fromHistory = false, source } = {}) {
    if (!word || typeof word !== 'string') return;
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    const allHistoryWords = (Array.isArray(customWords) && customWords.length > 0)
      ? customWords
      : (historyAdapter?.getRecentSearchWords?.(50) ?? []);

    const wordIdx = allHistoryWords.findIndex((w) => (w || '').trim().toLowerCase() === normalized);
    if (wordIdx !== -1) {
      currentSlideIndex = Math.floor(wordIdx / 5);
    }

    if (typeof onLookupWord === 'function') {
      const opts = { fromHistory };
      if (source) {
        opts.source = source;
      }
      onLookupWord(normalized, opts);
    }
  }

  function renderPopupContent(state) {
    if (!popupElement) return;
    lastState = state;
    const popupContainer = popupElement._vocabContainer;
    popupContainer.replaceChildren();

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
          } else if (key === 'disabled') {
            if (value) el.setAttribute('disabled', '');
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

    // 1. Render Header Bar: Slide (5 words/slide) with Prev/Next, Source Switcher, Close Button
    const currentWord = (state?.data?.headword || state?.headword || state?.data?.token || state?.error?.headword || '').toLowerCase();
    const allHistoryWords = (Array.isArray(customWords) && customWords.length > 0)
      ? customWords
      : (historyAdapter?.getRecentSearchWords?.(50) ?? []);

    if (currentWord && allHistoryWords.length > 0) {
      const wordIdx = allHistoryWords.findIndex((w) => (w || '').trim().toLowerCase() === currentWord);
      if (wordIdx !== -1 && lastRenderedWord !== currentWord) {
        currentSlideIndex = Math.floor(wordIdx / 5);
        lastRenderedWord = currentWord;
      }
    }

    const headerBar = h('div', { className: 'vocab-popup-header-bar', title: 'Drag to move popup' });
    initHeaderBarDragging(headerBar);

    // Left: Drag Handle (Brand & Quick Lookup)
    const dragHandle = h(
      'div',
      { className: 'vocab-popup-drag-handle', title: 'Drag to move popup' },
      h('span', { className: 'vocab-popup-drag-icon', innerHTML: dragDotsSVG }),
      h('span', { className: 'vocab-popup-brand-icon', innerHTML: dictionarySVG }),
      h('span', { className: 'vocab-popup-title-text' }, 'Quick Lookup')
    );
    headerBar.appendChild(dragHandle);

    // Right: Header Actions (History Dropdown + Simple Learn Toggle + Close Button)
    const headerActions = h('div', { className: 'vocab-popup-header-actions' });

    // 1. History Menu Button & Popover
    let currentHistoryMenuWrapper = null;
    const renderHistoryMenu = () => {
      const newMenu = createHistoryMenuElement({
        documentObj,
        allWords: allHistoryWords,
        currentWord,
        isOpen: isHistoryMenuOpen,
        h,
        onToggleOpen: (open) => {
          isHistoryMenuOpen = open;
          renderHistoryMenu();
        },
        onSelectWord: (word) => {
          navigateToWord(word, { fromHistory: true });
        },
      });

      if (currentHistoryMenuWrapper && currentHistoryMenuWrapper.parentNode === headerActions) {
        if (typeof headerActions.replaceChild === 'function') {
          headerActions.replaceChild(newMenu, currentHistoryMenuWrapper);
        } else if (typeof headerActions.removeChild === 'function') {
          headerActions.removeChild(currentHistoryMenuWrapper);
          if (headerActions.childNodes && headerActions.childNodes.length > 0 && typeof headerActions.insertBefore === 'function') {
            headerActions.insertBefore(newMenu, headerActions.childNodes[0]);
          } else {
            headerActions.appendChild(newMenu);
          }
        }
      } else {
        if (headerActions.childNodes && headerActions.childNodes.length > 0 && typeof headerActions.insertBefore === 'function') {
          headerActions.insertBefore(newMenu, headerActions.childNodes[0]);
        } else {
          headerActions.appendChild(newMenu);
        }
      }
      currentHistoryMenuWrapper = newMenu;
    };

    renderHistoryMenu();

    // 2. Simple Learn Toggle
    let isSimpleLearn = false;
    if (activeSearchSource) {
      isSimpleLearn = activeSearchSource === 'freedictionary';
    } else if (state?.requestedSource) {
      isSimpleLearn = state.requestedSource === 'freedictionary';
    } else if (state?.source) {
      isSimpleLearn = state.source === 'freedictionary';
    } else {
      isSimpleLearn = Boolean(settingsAdapter?.getSnapshot?.()?.simpleLearn);
    }

    const simpleLearnToggle = h(
      'div',
      {
        className: `vocab-simple-learn-toggle-wrapper ${isSimpleLearn ? 'active' : ''}`,
        role: 'button',
        tabIndex: 0,
        title: UI_COPY.SIMPLE_LEARN_TITLE,
        ariaLabel: UI_COPY.SIMPLE_LEARN_TITLE,
        onClick: async (e) => {
          e?.stopPropagation?.();
          const nextSimpleLearn = !isSimpleLearn;
          const nextSource = nextSimpleLearn ? 'freedictionary' : 'vocabulary';
          activeSearchSource = nextSource;
          if (settingsAdapter?.update) {
            await settingsAdapter.update({ simpleLearn: nextSimpleLearn });
          }
          if (typeof onSourceChange === 'function') {
            onSourceChange(nextSource);
          }
          if (currentWord) {
            navigateToWord(currentWord, { source: nextSource });
          } else {
            renderPopupContent(lastState);
          }
        },
      },
      h(
        'span',
        { className: 'vocab-simple-learn-label' },
        isSimpleLearn ? UI_COPY.SIMPLE_LEARN_LABEL_FREEDICT : UI_COPY.SIMPLE_LEARN_LABEL
      ),
      h('span', { className: 'vocab-simple-learn-switch' })
    );

    headerActions.appendChild(simpleLearnToggle);

    // 3. Close Button
    const closeBtn = h('button', {
      type: 'button',
      className: 'vocab-popup-close-btn',
      title: UI_COPY.CLOSE_POPUP,
      ariaLabel: UI_COPY.CLOSE_POPUP,
      innerHTML: closeSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        if (popupCtrl) {
          popupCtrl.close('close-button');
        } else {
          removePopup();
        }
      },
    });
    headerActions.appendChild(closeBtn);

    headerBar.appendChild(headerActions);
    popupContainer.appendChild(headerBar);

    // 2. Render Main Body Content using shared renderer
    renderDictionaryContentView({
      state,
      container: popupContainer,
      documentObj,
      windowObj,
      historyWords: allHistoryWords,
      settingsAdapter,
      lookupExecutor,
      onNavigateWord: (w, opts) => navigateToWord(w, opts),
      onLayoutChange: updatePopupPosition,
      h,
    });

    updatePopupPosition();
  }

  function showPopup(state, selectionRect, { darkMode = false, customWords: words } = {}) {
    if (words !== undefined) {
      setCustomWords(words);
    }
    const isFirstOpen = !popupElement || !popupElement.parentNode;
    if (selectionRect && typeof selectionRect === 'object' && (selectionRect.width > 0 || selectionRect.height > 0 || selectionRect.left > 0 || selectionRect.top > 0)) {
      const scrollX = windowObj?.scrollX || 0;
      const scrollY = windowObj?.scrollY || 0;
      const left = Number(selectionRect.left) || 0;
      const top = Number(selectionRect.top) || 0;
      const width = Number(selectionRect.width) || 0;
      const height = Number(selectionRect.height) || 0;
      const right = typeof selectionRect.right === 'number' ? selectionRect.right : left + width;
      const bottom = typeof selectionRect.bottom === 'number' ? selectionRect.bottom : top + height;

      absoluteSelectionRect = {
        left: left + scrollX,
        top: top + scrollY,
        bottom: bottom + scrollY,
        right: right + scrollX,
        width,
        height,
      };
    }

    createPopup();

    const popupContainer = popupElement._vocabContainer;
    if (darkMode) {
      popupContainer.classList.add('dark-mode');
    } else {
      popupContainer.classList.remove('dark-mode');
    }

    renderPopupContent(state);

    if (isFirstOpen) {
      updatePopupPosition({ forceReanchor: true });
    }

    if (!isListening) {
      windowObj.addEventListener('scroll', throttledHandleScrollResize, true);
      windowObj.addEventListener('resize', throttledHandleScrollResize, true);
      isListening = true;
    }

    if (!popupCtrl) {
      popupCtrl = createPopupController({
        eventTarget: documentObj,
        popupElement,
        onClose: ({ reason }) => {
          removePopup({ clearSelection: reason === 'escape' });
        },
        onOpen: () => {
          if (popupContainer && typeof popupContainer.focus === 'function') {
            try {
              popupContainer.focus({ preventScroll: true });
            } catch {
              popupContainer.focus();
            }
          } else if (typeof popupElement.focus === 'function') {
            popupElement.focus();
          }
        },
      });
    }
    popupCtrl.open();

    if (popupContainer && typeof popupContainer.focus === 'function') {
      try {
        popupContainer.focus({ preventScroll: true });
      } catch {
        popupContainer.focus();
      }
    }
  }

  function isOpen() {
    return Boolean(popupElement && popupElement.parentNode && popupCtrl?.isOpen?.());
  }

  function getCurrentState() {
    return lastState;
  }

  function playCurrentAudio(preferredAccent = 'us') {
    if (!lastState) return false;
    const audioObj = lastState?.data?.parsedPayload?.audio || {};
    const word = lastState?.data?.parsedPayload?.headword || lastState?.headword || '';
    if (!word) return false;

    const accent = (preferredAccent === 'uk' || preferredAccent === 'en-GB' || preferredAccent === 'gb') ? 'uk' : 'us';
    const targetAudioUrl = accent === 'uk' ? (audioObj.uk || audioObj.us) : (audioObj.us || audioObj.uk);

    playAudioWithFallback({
      audioUrl: targetAudioUrl,
      word,
      accent,
      windowObj,
    });
    return true;
  }

  return {
    showPopup,
    removePopup,
    setCustomWords,
    isOpen,
    getCurrentState,
    playCurrentAudio,
  };
}
