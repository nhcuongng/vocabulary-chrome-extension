import { createPopupController } from './popupController.js';
import { renderSuccessContent, renderNotFoundContent, renderErrorContent } from './popupRenderer.js';
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
  UI_COPY,
} from './historySliderRenderer.js';
import { DEFAULT_AUTO_SOURCE_ORDER } from '../shared/userSettings.js';
import { generateStressSvg } from '../domain/stressDiagramUtils.js';

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

export function createPopupManager({
  documentObj,
  windowObj,
  onLookupWord,
  historyAdapter,
  settingsAdapter,
  onSourceChange,
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
  let cleanupActiveDrag = null;

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

  function removePopup() {
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
      currentSlideIndex = 0;
      isHistorySearching = false;
      historySearchQuery = '';
      isAutoOrderOpen = false;
      customPosition = null;
    }
  }

  let isAutoOrderOpen = false;

  function createPopup() {
    if (popupElement) return popupElement;
    popupElement = documentObj.createElement('div');
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

      .skeleton-headword {
        height: 28px;
        width: 60%;
        margin-bottom: 12px;
      }

      .skeleton-pron {
        height: 18px;
        width: 40%;
        margin-bottom: 16px;
      }

      .skeleton-def {
        height: 14px;
        width: 100%;
        margin-bottom: 8px;
      }

      .skeleton-def.short {
        width: 70%;
      }

      .custom-definition-list .definition {
        font-size: 14px;
        margin-right: 10px;
        margin-bottom: 10px;
      }

      .vocab-popup {
        max-height: 340px;
        min-height: 120px;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: #e5e7eb transparent;
        scrollbar-gutter: stable;
        box-sizing: border-box;
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
        width: 380px;
        max-width: calc(100vw - 24px);
        min-width: 260px;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        font-size: 15px;
        color: #222;
        transition: opacity 0.15s;
      }

      /* Header Bar & Slide Navigation */
      .vocab-popup-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f3f4f6;
        cursor: grab;
        user-select: none;
      }
      .vocab-popup-header-bar.dragging {
        cursor: grabbing;
      }

      .vocab-history-search-toggle-btn {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        cursor: pointer;
        padding: 3px 5px;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color 0.15s, color 0.15s;
      }
      .vocab-history-search-toggle-btn:hover {
        background-color: #f3f4f6;
        color: #111827;
      }

      .vocab-history-slider-wrapper {
        display: flex;
        align-items: center;
        gap: 2px;
        flex: 1 1 0px;
        min-width: 0;
        width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      .vocab-slide-nav-btn {
        background: none;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 2px 4px;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color 0.15s, color 0.15s;
      }
      .vocab-slide-nav-btn:hover:not(:disabled) {
        background-color: #f3f4f6;
        color: #111827;
      }
      .vocab-slide-nav-btn:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }

      .vocab-history-slide {
        display: flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;
        flex: 1 1 0px;
        min-width: 0;
        width: 0;
        max-width: 100%;
      }

      .vocab-history-chip {
        font-family: inherit;
        background: #f3f4f6;
        color: #374151;
        font-size: 11px;
        font-weight: 500;
        padding: 3px 4px;
        border-radius: 12px;
        white-space: nowrap;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background-color 0.15s, color 0.15s;
        flex: 1 1 0px;
        min-width: 0;
        width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        text-align: center;
        box-sizing: border-box;
      }
      .vocab-history-chip:hover {
        background: #e0e7ff;
        color: #3730a3;
      }
      .vocab-history-chip.active {
        background: #dbeafe;
        color: #1d4ed8;
        border-color: #93c5fd;
        font-weight: 600;
      }

      .vocab-popup-header-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
        position: relative;
      }

      .vocab-source-menu-wrapper {
        position: relative;
      }

      .vocab-source-menu-btn {
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
      .vocab-source-menu-btn:hover {
        background-color: #f3f4f6;
        color: #1677C9;
      }

      .vocab-source-menu-popover {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        z-index: 1000;
        min-width: 230px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0,0,0,0.06);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .vocab-source-menu-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #9ca3af;
        padding: 4px 8px 2px 8px;
        user-select: none;
      }

      .vocab-source-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        border-radius: 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        transition: background-color 0.15s ease;
      }
      .vocab-source-menu-item:hover {
        background-color: #f3f4f6;
      }
      .vocab-source-menu-item.active {
        background-color: #e0e7ff;
      }
      .vocab-source-menu-item .source-item-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        flex: 1;
        min-width: 0;
      }
      .vocab-source-menu-item .source-item-name {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }
      .vocab-source-menu-item.active .source-item-name {
        color: #3730a3;
      }
      .vocab-source-menu-item .source-item-hint {
        font-size: 10px;
        color: #6b7280;
      }
      .vocab-source-menu-item.active .source-item-hint {
        color: #4f46e5;
      }
      .vocab-source-menu-item .source-item-check {
        font-size: 13px;
        font-weight: 700;
        color: #4f46e5;
        opacity: 0;
        margin-left: 8px;
        flex-shrink: 0;
      }
      .vocab-source-menu-item.active .source-item-check {
        opacity: 1;
      }

      .source-item-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .vocab-auto-config-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #6b7280;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.15s, color 0.15s, transform 0.2s;
        line-height: 1;
      }

      .vocab-auto-config-btn:hover {
        background-color: #f3f4f6;
        color: #1677C9;
      }

      .vocab-auto-config-btn.active {
        color: #1677C9;
        background-color: rgba(22, 119, 201, 0.12);
        transform: rotate(45deg);
      }

      .vocab-auto-order-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 4px 0 6px 0;
        padding: 6px;
        background: rgba(0, 0, 0, 0.03);
        border: 1px dashed #e5e7eb;
        border-radius: 8px;
      }

      .vocab-auto-order-header {
        font-size: 10px;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 2px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .vocab-auto-order-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .vocab-auto-order-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 11px;
        cursor: grab;
        user-select: none;
        transition: background-color 0.15s, border-color 0.15s, transform 0.15s;
      }

      .vocab-auto-order-item:active {
        cursor: grabbing;
      }

      .vocab-auto-order-item.dragging {
        opacity: 0.4;
        border-style: dashed;
      }

      .vocab-auto-order-item.drag-over {
        border-color: #1677C9;
        background: rgba(22, 119, 201, 0.08);
      }

      .vocab-drag-handle {
        color: #9ca3af;
        font-size: 11px;
        cursor: grab;
        flex-shrink: 0;
        letter-spacing: -1px;
      }

      .vocab-auto-order-item-title {
        flex: 1;
        font-weight: 500;
        font-size: 11px;
        color: #374151;
      }

      .vocab-auto-order-item-rank {
        font-size: 9px;
        color: #6b7280;
        font-weight: 600;
        background: #f3f4f6;
        padding: 1px 4px;
        border-radius: 4px;
      }

      /* Stress Diagram & Line Notation */
      .vocab-stress-wrapper {
        margin: 4px 0 8px 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .vocab-stress-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(22, 119, 201, 0.08);
        border: 1px solid rgba(22, 119, 201, 0.2);
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
        width: fit-content;
        color: #111827;
        user-select: none;
        transition: background-color 0.15s, border-color 0.15s;
      }

      .vocab-stress-cta:hover {
        background: rgba(22, 119, 201, 0.14);
        border-color: #1677C9;
      }

      .vocab-stress-icon {
        font-size: 12px;
      }

      .vocab-stress-notation {
        font-family: monospace;
        font-size: 12px;
        font-weight: 700;
        color: #1677C9;
        letter-spacing: 2px;
      }

      .vocab-stress-toggle-icon,
      .vocab-stress-toggle-text {
        font-size: 9px;
        color: #6b7280;
        margin-left: 2px;
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
        margin-top: 4px;
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
      .vocab-popup-theme .head-word:hover {
        text-decoration: underline;
      }
      .vocab-popup-theme .head-word {
        text-decoration: none;
      }
      .vocab-popup-headword {
        font-size: 26px;
        font-weight: 700;
        margin: 0 0 6px;
        color: #1677C9;
      }
      .vocab-popup-pronunciation {
        color: #4B5563;
        font-size: 13px;
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
      }
      .vocab-popup-definition {
        font-size: 14px;
        line-height: 1.5;
        margin: 8px 0;
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
        background: #ffffff;
        margin: 14px -14px -12px -14px;
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
      .vocab-popup.dark-mode .vocab-history-search-toggle-btn {
        border-color: #4b5563;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-history-search-toggle-btn:hover {
        background-color: #374151;
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-slide-nav-btn {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-slide-nav-btn:hover:not(:disabled) {
        background-color: #374151;
        color: #fff;
      }
      .vocab-popup.dark-mode .vocab-history-chip {
        background: #374151;
        color: #d1d5db;
      }
      .vocab-popup.dark-mode .vocab-history-chip:hover {
        background: #1e3a8a;
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .vocab-history-chip.active {
        background: #1e3a8a;
        color: #93c5fd;
        border-color: #3b82f6;
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
      .vocab-popup.dark-mode .vocab-source-menu-item .source-item-hint {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item.active .source-item-hint {
        color: #bfdbfe;
      }
      .vocab-popup.dark-mode .vocab-source-menu-item.active .source-item-check {
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-auto-config-btn {
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-auto-config-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-auto-config-btn.active {
        color: #60a5fa;
        background-color: rgba(96, 165, 250, 0.2);
      }
      .vocab-popup.dark-mode .vocab-auto-order-section {
        background: rgba(255, 255, 255, 0.03);
        border-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-auto-order-item {
        background: #1f2937;
        border-color: #374151;
      }
      .vocab-popup.dark-mode .vocab-auto-order-item-title {
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-auto-order-item-rank {
        background: #374151;
        color: #9ca3af;
      }
      .vocab-popup.dark-mode .vocab-auto-order-item.drag-over {
        border-color: #60a5fa;
        background: rgba(96, 165, 250, 0.15);
      }
      .vocab-popup.dark-mode .vocab-stress-cta {
        background: rgba(96, 165, 250, 0.12);
        border-color: rgba(96, 165, 250, 0.3);
        color: #f3f4f6;
      }
      .vocab-popup.dark-mode .vocab-stress-cta:hover {
        background: rgba(96, 165, 250, 0.2);
        border-color: #60a5fa;
      }
      .vocab-popup.dark-mode .vocab-stress-notation {
        color: #93c5fd;
      }
      .vocab-popup.dark-mode .vocab-stress-toggle-text {
        color: #9ca3af;
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
      .vocab-popup.dark-mode .vocab-history-search-input {
        background: #111827;
        border-color: #4b5563;
        color: #f3f4f6;
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
      .vocab-popup.dark-mode .vocab-family-chip.disabled-inflection {
        background: #374151;
        color: #9ca3af;
        border-color: #4b5563;
      }
      .vocab-popup.dark-mode .vocab-family-chip.disabled-inflection:hover {
        background: #374151;
        color: #9ca3af;
        border-color: #4b5563;
      }
      .vocab-popup.dark-mode .vocab-popup-pronunciation,
      .vocab-popup.dark-mode .vocab-popup-audio-btn,
      .vocab-popup.dark-mode .vocab-popup-search-suggestions,
      .vocab-popup.dark-mode .details-content {
        color: #9ca3af;
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

  function updatePopupPosition() {
    if (!popupElement) return;

    const popupWidth = popupElement.offsetWidth || 380;
    const popupHeight = popupElement.offsetHeight || 200;
    const viewport = {
      width: windowObj.innerWidth || 1024,
      height: windowObj.innerHeight || 768,
      scrollX: windowObj.scrollX || 0,
      scrollY: windowObj.scrollY || 0,
    };

    if (customPosition) {
      const minLeft = viewport.scrollX + 8;
      const maxLeft = Math.max(minLeft, viewport.scrollX + viewport.width - popupWidth - 8);
      const minTop = viewport.scrollY + 8;
      const maxTop = Math.max(minTop, viewport.scrollY + viewport.height - popupHeight - 8);

      const clampedLeft = Math.min(Math.max(customPosition.left, minLeft), maxLeft);
      const clampedTop = Math.min(Math.max(customPosition.top, minTop), maxTop);

      popupElement.style.left = `${clampedLeft}px`;
      popupElement.style.top = `${clampedTop}px`;
      popupElement.style.maxWidth = `${Math.min(380, viewport.width - 16)}px`;
      return;
    }

    if (!absoluteSelectionRect) return;

    let left = absoluteSelectionRect.left;
    let top = absoluteSelectionRect.bottom + 8;

    if (top + popupHeight > viewport.scrollY + viewport.height) {
      const aboveTop = absoluteSelectionRect.top - popupHeight - 8;
      if (aboveTop >= viewport.scrollY) {
        top = aboveTop;
      } else {
        top = viewport.scrollY + viewport.height - popupHeight - 8;
      }
    }

    if (top < viewport.scrollY) top = viewport.scrollY + 8;

    if (left + popupWidth > viewport.scrollX + viewport.width) {
      left = viewport.scrollX + viewport.width - popupWidth - 8;
    }
    if (left < viewport.scrollX) left = viewport.scrollX + 8;

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
    popupElement.style.maxWidth = `${Math.min(380, viewport.width - 16)}px`;
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
      content = [
        { type: 'skeleton', value: 'headword' },
        { type: 'skeleton', value: 'pron' },
        { type: 'skeleton', value: 'def' },
        { type: 'skeleton', value: 'def-short' },
      ];
    }

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
    const currentWord = (viewModel?.headword || state.headword || state?.data?.headword || state?.data?.token || state?.error?.headword || '').toLowerCase();
    const allHistoryWords = historyAdapter?.getRecentSearchWords?.(50) ?? [];

    const headerBar = h('div', { className: 'vocab-popup-header-bar', title: 'Drag to move popup' });
    initHeaderBarDragging(headerBar);

    const sliderWrapper = createHistorySliderElement({
      documentObj,
      allWords: allHistoryWords,
      currentWord,
      currentSlideIndex,
      itemsPerPage: 5,
      h,
      onSelectWord: (word) => {
        navigateToWord(word, { fromHistory: true });
      },
      onSlideChange: (newIndex) => {
        currentSlideIndex = newIndex;
        renderPopupContent(lastState);
      },
    });
    headerBar.appendChild(sliderWrapper);

    // 2. Header Actions: Source Menu Button (Icon with vertical popover) + Close Button
    const headerActions = h('div', { className: 'vocab-popup-header-actions' });
    const sourceWrapper = h('div', { className: 'vocab-source-menu-wrapper' });

    const activeDictSource =
      settingsAdapter?.getSnapshot?.()?.dictionarySource ||
      viewModel?.source ||
      state?.source ||
      'auto';

    const autoSourceOrder =
      settingsAdapter?.getSnapshot?.()?.autoSourceOrder ||
      [...DEFAULT_AUTO_SOURCE_ORDER];

    let isMenuOpen = false;
    let draggedSourceId = null;
    const popoverMenu = h('div', { className: 'vocab-source-menu-popover', style: { display: 'none' } });

    const menuTitle = h('div', { className: 'vocab-source-menu-title' }, UI_COPY.SOURCE_MENU_TITLE);
    popoverMenu.appendChild(menuTitle);

    // 1. Auto Option with Config Gear Button in the same row
    const isAutoActive = activeDictSource === 'auto';
    const autoConfigBtn = h('button', {
      type: 'button',
      className: `vocab-auto-config-btn ${isAutoOrderOpen ? 'active' : ''}`,
      id: 'vocab-auto-config-btn',
      title: 'Configure auto priority order',
      ariaLabel: 'Configure auto priority order',
      innerHTML: gearSVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        isAutoOrderOpen = !isAutoOrderOpen;
        autoOrderSection.style.display = isAutoOrderOpen ? 'flex' : 'none';
        if (isAutoOrderOpen) {
          autoConfigBtn.classList.add('active');
        } else {
          autoConfigBtn.classList.remove('active');
        }
      },
    });

    const autoItemBtn = h(
      'div',
      {
        className: `vocab-source-menu-item ${isAutoActive ? 'active' : ''}`,
        'data-source': 'auto',
        role: 'button',
        tabIndex: 0,
        title: 'Select source: ⚡ Auto',
        onClick: async (e) => {
          if (e?.target && typeof e?.target?.closest === 'function' && e.target.closest('#vocab-auto-config-btn')) {
            return;
          }
          e?.stopPropagation?.();
          popoverMenu.style.display = 'none';
          isMenuOpen = false;
          if (isAutoActive) return;
          if (settingsAdapter?.update) {
            await settingsAdapter.update({ dictionarySource: 'auto' });
          }
          if (typeof onSourceChange === 'function') {
            onSourceChange('auto');
          }
          if (currentWord) {
            navigateToWord(currentWord, { source: 'auto' });
          }
        },
      },
      h('span', { className: 'source-item-name' }, '⚡ Auto'),
      h(
        'div',
        { className: 'source-item-actions' },
        autoConfigBtn,
        h('span', { className: 'source-item-check' }, '✓')
      )
    );
    popoverMenu.appendChild(autoItemBtn);

    // 2. Auto Priority Draggable Section
    const autoOrderSection = h('div', {
      className: 'vocab-auto-order-section',
      style: { display: isAutoOrderOpen ? 'flex' : 'none' },
    });
    const autoOrderHeader = h('div', { className: 'vocab-auto-order-header' }, UI_COPY.AUTO_ORDER_TITLE);
    const autoOrderList = h('div', { className: 'vocab-auto-order-list' });

    autoSourceOrder.forEach((srcId, index) => {
      const meta = SOURCE_META[srcId] || { id: srcId, name: srcId };
      const orderItem = h(
        'div',
        {
          className: 'vocab-auto-order-item',
          draggable: 'true',
          'data-source-id': srcId,
          title: 'Drag to reorder priority',
          onDragStart: (e) => {
            e?.stopPropagation?.();
            draggedSourceId = srcId;
            orderItem.classList.add('dragging');
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', srcId);
            }
          },
          onDragOver: (e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move';
            }
            orderItem.classList.add('drag-over');
          },
          onDragLeave: (e) => {
            e?.stopPropagation?.();
            orderItem.classList.remove('drag-over');
          },
          onDrop: async (e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            orderItem.classList.remove('drag-over');
            const fromId = draggedSourceId || e.dataTransfer?.getData('text/plain');
            const toId = srcId;

            if (!fromId || fromId === toId) return;

            const nextOrder = [...autoSourceOrder];
            const fromIndex = nextOrder.indexOf(fromId);
            const toIndex = nextOrder.indexOf(toId);

            if (fromIndex !== -1 && toIndex !== -1) {
              const [movedItem] = nextOrder.splice(fromIndex, 1);
              nextOrder.splice(toIndex, 0, movedItem);

              if (settingsAdapter?.update) {
                await settingsAdapter.update({ autoSourceOrder: nextOrder });
              }

              renderPopupContent(lastState);

              if (activeDictSource === 'auto' && currentWord) {
                navigateToWord(currentWord, { source: 'auto' });
              }
            }
          },
          onDragEnd: (e) => {
            e?.stopPropagation?.();
            orderItem.classList.remove('dragging');
            draggedSourceId = null;
          },
        },
        h('span', { className: 'vocab-drag-handle' }, '⋮⋮'),
        h('span', { className: 'vocab-auto-order-item-title' }, meta.name),
        h('span', { className: 'vocab-auto-order-item-rank' }, `#${index + 1}`)
      );
      autoOrderList.appendChild(orderItem);
    });

    autoOrderSection.appendChild(autoOrderHeader);
    autoOrderSection.appendChild(autoOrderList);
    popoverMenu.appendChild(autoOrderSection);

    // 3. Single Sources
    const singleSourcesTitle = h('div', { className: 'vocab-source-menu-title', style: { marginTop: '4px' } }, 'Single Source');
    popoverMenu.appendChild(singleSourcesTitle);

    const singleSources = [SOURCE_META.vocabulary, SOURCE_META.freedictionary, SOURCE_META.cambridge];

    singleSources.forEach((s) => {
      const isActive = activeDictSource === s.id;
      const itemBtn = h(
        'button',
        {
          type: 'button',
          className: `vocab-source-menu-item ${isActive ? 'active' : ''}`,
          'data-source': s.id,
          title: `Select source: ${s.name}`,
          onClick: async (e) => {
            e?.stopPropagation?.();
            popoverMenu.style.display = 'none';
            isMenuOpen = false;
            if (isActive) return;
            if (settingsAdapter?.update) {
              await settingsAdapter.update({ dictionarySource: s.id });
            }
            if (typeof onSourceChange === 'function') {
              onSourceChange(s.id);
            }
            if (currentWord) {
              navigateToWord(currentWord, { source: s.id });
            }
          },
        },
        h(
          'div',
          { className: 'source-item-text' },
          h(
            'span', 
            { className: 'source-item-name', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, 
            s.name,
            s.badge ? h('span', { className: 'source-badge-experimental', title: 'Experimental Feature', style: { fontSize: '10px', cursor: 'help' } }, s.badge) : null
          ),
          h('span', { className: 'source-item-hint' }, s.hint)
        ),
        h('span', { className: 'source-item-check' }, '✓')
      );
      popoverMenu.appendChild(itemBtn);
    });

    const sourceBtn = h('button', {
      type: 'button',
      className: 'vocab-source-menu-btn',
      title: UI_COPY.SELECT_SOURCE_TITLE,
      ariaLabel: UI_COPY.SELECT_SOURCE_TITLE,
      innerHTML: dictionarySVG,
      onClick: (e) => {
        e?.stopPropagation?.();
        isMenuOpen = !isMenuOpen;
        popoverMenu.style.display = isMenuOpen ? 'flex' : 'none';
      },
    });

    sourceWrapper.appendChild(sourceBtn);
    sourceWrapper.appendChild(popoverMenu);
    headerActions.appendChild(sourceWrapper);

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

    // 2. Render Main Body Content
    content.forEach((item) => {
      if (item.type === 'skeleton') {
        if (item.value === 'headword') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-headword' }));
        } else if (item.value === 'pron') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-pron' }));
        } else if (item.value === 'def') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-def' }));
        } else if (item.value === 'def-short') {
          popupContainer.appendChild(h('div', { className: 'skeleton skeleton-def short' }));
        }
      } else if (item.type === 'headword') {
        const cap =
          typeof item.value === 'string' && item.value.length > 0
            ? item.value.charAt(0).toUpperCase() + item.value.slice(1)
            : item.value;
        const source = viewModel?.source || item.source || 'vocabulary';
        const defaultUrl = source === 'cambridge'
          ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(viewModel?.headword || item.value || '')}`
          : `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || item.value || '')}`;
        const headwordUrl = viewModel?.lookupUrl || item.lookupUrl || defaultUrl;

        popupContainer.appendChild(
          h(
            'p',
            { className: 'vocab-popup-headword' },
            h('a', { href: headwordUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
          )
        );
      } else if (item.type === 'pronunciation') {
        const pronContainer = h('div', { className: 'vocab-popup-pronunciation' });
        const textValue = typeof item.value === 'string' ? item.value.trim() : '';
        const audioObj = item.audio || {};
        const word = (viewModel?.headword || '').trim();

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
              title: 'US pronunciation',
              ariaLabel: 'US pronunciation',
              className: 'vocab-popup-audio-btn',
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
              title: 'UK pronunciation',
              ariaLabel: 'UK pronunciation',
              className: 'vocab-popup-audio-btn',
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
              title: 'Listen pronunciation',
              ariaLabel: 'Listen pronunciation',
              className: 'vocab-popup-audio-btn',
              innerHTML: speakerSVG,
              onClick: (e) => {
                e.stopPropagation();
                playAudioWithFallback(audioObj.us || audioObj.uk, word, 'en-US');
              },
            })
          );
        }

        popupContainer.appendChild(pronContainer);
      } else if (item.type === 'stress-diagram') {
        const stressData = item.value;
        if (stressData && stressData.hasStressInfo) {
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

          const toggleSpan = h('span', { className: 'vocab-stress-toggle-icon' }, '▼');
          const ctaBtn = h(
            'div',
            {
              className: 'vocab-stress-cta',
              role: 'button',
              tabIndex: 0,
              title: 'Toggle stress line diagram',
              onClick: (e) => {
                e?.stopPropagation?.();
                isDiagramOpen = !isDiagramOpen;
                card.style.display = isDiagramOpen ? 'flex' : 'none';
                toggleSpan.textContent = isDiagramOpen ? '▲' : '▼';
                updatePopupPosition();
              },
            },
            h('span', { className: 'vocab-stress-icon' }, '📈'),
            h('span', {}, 'Stress:'),
            h('span', { className: 'vocab-stress-notation' }, stressData.patternNotation),
            toggleSpan
          );

          wrapper.appendChild(ctaBtn);
          wrapper.appendChild(card);
          popupContainer.appendChild(wrapper);
        }
      } else if (item.type === 'definition') {
        const defs = Array.isArray(item.value) ? item.value : [item.value];
        defs.forEach((defHtml) => {
          if (defHtml) {
            const defContainer = h('div', { className: 'vocab-popup-definition', innerHTML: defHtml });
            const detailsElements = defContainer.querySelectorAll('details.vocab-details');
            detailsElements.forEach((details) => {
              details.addEventListener('toggle', () => {
                updatePopupPosition();
              });
            });
            popupContainer.appendChild(defContainer);
          }
        });
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
                title: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
                ariaLabel: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
                disabled: isInflected,
                onClick: (e) => {
                  e?.stopPropagation?.();
                  if (isInflected) return;
                  navigateToWord(famWord);
                },
              },
              famWord
            );
            group.appendChild(chip);
          });

          contentDiv.appendChild(group);
          details.appendChild(summary);
          details.appendChild(contentDiv);
          details.addEventListener('toggle', () => updatePopupPosition());
          popupContainer.appendChild(details);
        }
      } else if (item.type === 'title') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-title' }, item.value));
      } else if (item.type === 'message') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-message' }, item.value));
      } else if (item.type === 'searchSuggestions') {
        if (item.value) {
          popupContainer.appendChild(h('div', { className: 'vocab-popup-search-suggestions', innerHTML: item.value }));
        }
      } else if (item.type === 'guidance-list') {
        const ul = h('ul', { className: 'vocab-popup-guidance-list' });
        item.value.forEach((g) => ul.appendChild(h('li', {}, g)));
        popupContainer.appendChild(ul);
      } else if (item.type === 'cta') {
        popupContainer.appendChild(h('div', { className: 'vocab-popup-cta' }, h('button', {}, item.value)));
      } else if (item.type === 'compliance-footer') {
        popupContainer.appendChild(
          h(
            'div',
            { className: 'vocab-popup-compliance-footer' },
            h('div', { className: 'vocab-popup-attribution', innerHTML: item.value.attribution }),
            h('div', { className: 'vocab-popup-permission-disclosure', innerHTML: item.value.disclosure })
          )
        );
      }
    });

    updatePopupPosition();
  }

  function showPopup(state, selectionRect, { darkMode = false } = {}) {
    if (selectionRect && typeof selectionRect === 'object') {
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
          removePopup();
        },
        onOpen: () => {
          popupElement.focus();
        },
      });
    }
    popupCtrl.open();
  }

  return {
    showPopup,
    removePopup,
  };
}
