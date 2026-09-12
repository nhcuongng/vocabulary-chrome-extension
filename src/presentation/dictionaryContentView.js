/**
 * Shared Dictionary Content View Renderer
 * Renders headword, pronunciation audio, stress diagrams, primary definition,
 * tabbed secondary details (Explanation, Definitions, Word Family, Synonyms/Antonyms),
 * skeletons, errors, not-found guidance, and compliance footer.
 */

import {
  renderSuccessContent,
  renderNotFoundContent,
  renderErrorContent,
} from '../content/popupRenderer.js';
import { mapLookupResultToPopupViewModel } from '../application/popupViewModelMapper.js';
import { isInflectedForm } from '../domain/wordInflectionUtils.js';
import { playAudioWithFallback } from '../domain/audioPlaybackUtils.js';
import {
  generateStressSvg,
  generateEqualizerBarsSvg,
  PITCH_LEVELS,
} from '../domain/stressDiagramUtils.js';
import { renderTabsComponent } from '../content/tabs/tabManager.js';
import { UI_COPY } from '../content/historySliderRenderer.js';
import { interceptPosInHtml } from '../domain/partOfSpeechUtils.js';
import { showQuickPreviewPopover } from './quickPreviewPopover.js';
import { defaultContextImageSearch } from '../domain/contextImageSearch.js';
import { defaultVisualImageSearchAdapter } from '../infrastructure/adapters/visualImageSearchAdapter.js';
import { LOOKUP_VISUAL_IMAGES_MESSAGE_TYPE } from '../shared/lookupContract.js';

export const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

export const waveformSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 10v4"></path>
  <path d="M6 7v10"></path>
  <path d="M10 3v18"></path>
  <path d="M14 8v8"></path>
  <path d="M18 5v14"></path>
  <path d="M22 10v4"></path>
</svg>`;

export const closeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

export const gearSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>`;

export const dragDotsSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 16" fill="currentColor">
  <circle cx="2" cy="2" r="1.5"></circle>
  <circle cx="8" cy="2" r="1.5"></circle>
  <circle cx="2" cy="8" r="1.5"></circle>
  <circle cx="8" cy="8" r="1.5"></circle>
  <circle cx="2" cy="14" r="1.5"></circle>
  <circle cx="8" cy="14" r="1.5"></circle>
</svg>`;

export const eyeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>`;

export const eyeOffSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
  <line x1="1" y1="1" x2="23" y2="23"></line>
</svg>`;

/**
 * Creates DOM helper element builder
 */
export function createDomHelper(documentObj) {
  return function h(tag, props, ...children) {
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
  };
}

/**
 * Render dictionary lookup view into target container
 */
export function renderDictionaryContentView({
  state,
  container,
  documentObj = globalThis.document,
  windowObj = globalThis.window,
  chromeApi = globalThis.chrome,
  historyWords = [],
  settingsAdapter = null,
  lookupExecutor = null,
  onNavigateWord = null,
  onLayoutChange = null,
  h = null,
} = {}) {
  if (!container) return;

  if (container._activeQuickPreview) {
    try {
      container._activeQuickPreview.close();
    } catch {}
  }

  const domH = h || createDomHelper(documentObj);
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
      { type: 'skeleton', value: 'stress' },
      { type: 'skeleton', value: 'def' },
      { type: 'skeleton', value: 'def-short' },
    ];
  }

  const currentWord = (
    viewModel?.headword ||
    state.headword ||
    state?.data?.headword ||
    state?.data?.token ||
    state?.error?.headword ||
    ''
  ).toLowerCase();

  const bodyContainer = domH('div', { className: 'vocab-popup-body vocab-content-fade-in' });
  let footerEl = null;

  content.forEach((item) => {
    if (item.type === 'skeleton') {
      if (item.value === 'headword') {
        const hwRow = domH(
          'div',
          { className: 'skeleton-headword-row' },
          domH('div', { className: 'skeleton skeleton-headword' }),
          domH('div', { className: 'skeleton skeleton-circle-btn' })
        );
        bodyContainer.appendChild(hwRow);
      } else if (item.value === 'pron') {
        const pronRow = domH(
          'div',
          { className: 'skeleton-pron-row' },
          domH('div', { className: 'skeleton skeleton-pron' }),
          domH('div', { className: 'skeleton skeleton-circle-btn' })
        );
        bodyContainer.appendChild(pronRow);
      } else if (item.value === 'stress') {
        bodyContainer.appendChild(domH('div', { className: 'skeleton skeleton-stress' }));
      } else if (item.value === 'def') {
        const defCard1 = domH(
          'div',
          { className: 'skeleton-def-card' },
          domH('div', { className: 'skeleton skeleton-tag' }),
          domH('div', { className: 'skeleton skeleton-def' }),
          domH('div', { className: 'skeleton skeleton-def short' })
        );
        bodyContainer.appendChild(defCard1);
      } else if (item.value === 'def-short') {
        const defCard2 = domH(
          'div',
          { className: 'skeleton-def-card' },
          domH('div', { className: 'skeleton skeleton-tag' }),
          domH('div', { className: 'skeleton skeleton-def' })
        );
        bodyContainer.appendChild(defCard2);
      }
    } else if (item.type === 'headword') {
      const cap =
        typeof item.value === 'string' && item.value.length > 0
          ? item.value.charAt(0).toUpperCase() + item.value.slice(1)
          : item.value;
      const source = viewModel?.source || item.source || 'vocabulary';
      const defaultUrl =
        source === 'cambridge'
          ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(viewModel?.headword || item.value || '')}`
          : `https://www.vocabulary.com/dictionary/${encodeURIComponent(viewModel?.headword || item.value || '')}`;
      const headwordUrl = viewModel?.lookupUrl || item.lookupUrl || defaultUrl;

      const headwordRow = domH('div', { className: 'vocab-popup-headword-row' });
      const headwordP = domH(
        'p',
        { className: 'vocab-popup-headword' },
        domH('a', { href: headwordUrl, className: 'head-word', target: '_blank', rel: 'noopener noreferrer' }, cap)
      );
      headwordRow.appendChild(headwordP);

      // Render mini history stepper [ ‹ 2/8 › ] if history has items
      if (Array.isArray(historyWords) && historyWords.length > 1) {
        const rawIdx = historyWords.findIndex((w) => (w || '').trim().toLowerCase() === currentWord);
        const currentIdx = rawIdx !== -1 ? rawIdx : 0;
        const totalCount = historyWords.length;

        const prevWord = currentIdx > 0 ? historyWords[currentIdx - 1] : null;
        const nextWord = currentIdx < totalCount - 1 ? historyWords[currentIdx + 1] : null;

        const prevBtn = domH(
          'button',
          {
            type: 'button',
            className: 'vocab-stepper-btn prev-btn',
            title: prevWord ? `Previous: "${prevWord}"` : 'No previous word',
            ariaLabel: prevWord ? `Previous word: ${prevWord}` : 'No previous word',
            disabled: !prevWord,
            onClick: (e) => {
              e?.stopPropagation?.();
              if (prevWord && typeof onNavigateWord === 'function') {
                onNavigateWord(prevWord, { fromHistory: true });
              }
            },
          },
          '‹'
        );

        const counterSpan = domH('span', { className: 'vocab-stepper-counter' }, `${currentIdx + 1}/${totalCount}`);

        const nextBtn = domH(
          'button',
          {
            type: 'button',
            className: 'vocab-stepper-btn next-btn',
            title: nextWord ? `Next: "${nextWord}"` : 'No next word',
            ariaLabel: nextWord ? `Next word: ${nextWord}` : 'No next word',
            disabled: !nextWord,
            onClick: (e) => {
              e?.stopPropagation?.();
              if (nextWord && typeof onNavigateWord === 'function') {
                onNavigateWord(nextWord, { fromHistory: true });
              }
            },
          },
          '›'
        );

        const stepper = domH(
          'div',
          { className: 'vocab-history-stepper', role: 'navigation', ariaLabel: 'History word navigation' },
          prevBtn,
          counterSpan,
          nextBtn
        );
        headwordRow.appendChild(stepper);
      }

      bodyContainer.appendChild(headwordRow);
    } else if (item.type === 'pronunciation') {
      const pronContainer = domH('div', { className: 'vocab-popup-pronunciation' });
      const textValue = typeof item.value === 'string' ? item.value.trim() : '';
      const audioObj = item.audio || {};
      const word = (viewModel?.headword || '').trim();

      let hasRendered = false;

      const triggerAudioFeedback = (btn) => {
        if (!btn) return;
        btn.classList.add('is-playing');
        setTimeout(() => {
          btn.classList.remove('is-playing');
        }, 1200);
      };

      if (audioObj.us || textValue.includes('US')) {
        let usText = 'US';
        const usMatch = textValue.match(/US\s*([^·]+)/);
        const ukMatch = textValue.match(/UK\s*([^·]+)/);
        const generalIpaMatch = textValue.match(/(?:\/|\[)[^/\]]+(?:\/|\])/);

        if (usMatch && usMatch[1].trim()) {
          usText = `US ${usMatch[1].trim()}`;
        } else if (ukMatch && ukMatch[1].trim()) {
          usText = `US ${ukMatch[1].trim()}`;
        } else if (generalIpaMatch && generalIpaMatch[0]) {
          usText = `US ${generalIpaMatch[0].trim()}`;
        } else if (textValue && !textValue.includes('UK')) {
          usText = textValue.startsWith('US') ? textValue : `US ${textValue}`;
        }

        pronContainer.appendChild(domH('span', { className: 'vocab-pron-item' }, `${usText} `));
        pronContainer.appendChild(
          domH('button', {
            type: 'button',
            className: 'vocab-popup-audio-btn',
            title: 'Play US Pronunciation',
            ariaLabel: 'Play US Pronunciation',
            innerHTML: speakerSVG,
            onClick: (e) => {
              e?.stopPropagation?.();
              triggerAudioFeedback(e?.currentTarget || e?.target?.closest('button'));
              playAudioWithFallback({
                audioUrl: audioObj.us,
                word,
                accent: 'us',
                windowObj,
              });
            },
          })
        );
        hasRendered = true;
      }

      if (audioObj.uk || textValue.includes('UK')) {
        let ukText = 'UK';
        const ukMatch = textValue.match(/UK\s*([^·]+)/);
        const usMatch = textValue.match(/US\s*([^·]+)/);
        const generalIpaMatch = textValue.match(/(?:\/|\[)[^/\]]+(?:\/|\])/);

        if (ukMatch && ukMatch[1].trim()) {
          ukText = `UK ${ukMatch[1].trim()}`;
        } else if (usMatch && usMatch[1].trim()) {
          ukText = `UK ${usMatch[1].trim()}`;
        } else if (generalIpaMatch && generalIpaMatch[0]) {
          ukText = `UK ${generalIpaMatch[0].trim()}`;
        } else if (textValue && !textValue.includes('US')) {
          ukText = textValue.startsWith('UK') ? textValue : `UK ${textValue}`;
        }

        pronContainer.appendChild(domH('span', { className: 'vocab-pron-item' }, `${ukText} `));
        pronContainer.appendChild(
          domH('button', {
            type: 'button',
            className: 'vocab-popup-audio-btn',
            title: 'Play UK Pronunciation',
            ariaLabel: 'Play UK Pronunciation',
            innerHTML: speakerSVG,
            onClick: (e) => {
              e?.stopPropagation?.();
              triggerAudioFeedback(e?.currentTarget || e?.target?.closest('button'));
              playAudioWithFallback({
                audioUrl: audioObj.uk,
                word,
                accent: 'uk',
                windowObj,
              });
            },
          })
        );
        hasRendered = true;
      }

      if (!hasRendered && (textValue || audioObj.us || audioObj.uk)) {
        if (textValue) {
          pronContainer.appendChild(domH('span', { className: 'vocab-pron-item' }, `${textValue} `));
        }
        pronContainer.appendChild(
          domH('button', {
            type: 'button',
            className: 'vocab-popup-audio-btn',
            title: 'Play Pronunciation',
            ariaLabel: 'Play Pronunciation',
            innerHTML: speakerSVG,
            onClick: (e) => {
              e?.stopPropagation?.();
              triggerAudioFeedback(e?.currentTarget || e?.target?.closest('button'));
              playAudioWithFallback({
                audioUrl: audioObj.us || audioObj.uk,
                word,
                accent: 'us',
                windowObj,
              });
            },
          })
        );
      }

      bodyContainer.appendChild(pronContainer);
    } else if (item.type === 'stress-diagram') {
      const stressData = item.value;
      if (stressData && stressData.hasStressInfo && Array.isArray(stressData.syllables)) {
        const wrapper = domH('div', { className: 'vocab-stress-wrapper' });
        let isDiagramOpen = false;

        const card = domH('div', {
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

        const syllableNodes = [];
        stressData.syllables.forEach((syl, i) => {
          if (i > 0) {
            syllableNodes.push(domH('span', { className: 'vocab-syl-dot' }, '·'));
          }
          const isHigh = syl.level === PITCH_LEVELS.HIGH;
          const isMid = syl.level === PITCH_LEVELS.MID;
          const tagClass = isHigh ? 'vocab-syl-high' : isMid ? 'vocab-syl-mid' : 'vocab-syl-low';
          syllableNodes.push(domH('span', { className: `vocab-syl-item ${tagClass}` }, syl.text));
        });

        const syllablesChain = domH('div', { className: 'vocab-syllables-chain' }, ...syllableNodes);
        const waveIcon = domH('span', { className: 'vocab-stress-wave-icon', innerHTML: waveformSVG });
        const pillLeft = domH('div', { className: 'vocab-stress-pill-left' }, waveIcon, syllablesChain);

        const eqBars = domH('span', {
          className: 'vocab-eq-bars-container',
          innerHTML: generateEqualizerBarsSvg(stressData),
        });
        const toggleSpan = domH('span', { className: 'vocab-stress-toggle-icon' }, '▼');

        const pillRight = domH(
          'div',
          { className: 'vocab-stress-pill-right' },
          eqBars,
          toggleSpan
        );

        const pillTitle = stressData.stressSummary
          ? `${stressData.stressSummary} · Click to toggle pitch contour`
          : 'Click to toggle pitch contour';

        const rhythmPill = domH(
          'div',
          {
            className: 'vocab-stress-pill',
            role: 'button',
            tabIndex: 0,
            title: pillTitle,
            ariaLabel: pillTitle,
            onClick: (e) => {
              e?.stopPropagation?.();
              isDiagramOpen = !isDiagramOpen;
              card.style.display = isDiagramOpen ? 'flex' : 'none';
              toggleSpan.textContent = isDiagramOpen ? '▲' : '▼';
              toggleSpan.style.color = isDiagramOpen ? '#1677C9' : '';
              onLayoutChange?.();
            },
          },
          pillLeft,
          pillRight
        );

        wrapper.appendChild(rhythmPill);
        wrapper.appendChild(card);
        bodyContainer.appendChild(wrapper);
      }
    } else if (item.type === 'definition') {
      const defs = Array.isArray(item.value) ? item.value : [item.value];
      const primaryDefHtmls = [];
      const secondaryTabs = [];

      defs.forEach((defHtml) => {
        if (!defHtml) return;
        const interceptedHtml = interceptPosInHtml(defHtml);
        if (interceptedHtml.includes('vocab-quick-def') && !interceptedHtml.includes('vocab-details')) {
          primaryDefHtmls.push(interceptedHtml);
        } else {
          let tabLabel = 'Explanation';
          let badge = '';

          const labelMatch = interceptedHtml.match(/<span[^>]*class=["'][^"']*vocab-details-label[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
          const rawLabel = labelMatch ? labelMatch[1].replace(/<[^>]*>/g, '').replace(/[✭]/g, '').trim() : '';

          if (rawLabel.toLowerCase().includes('long definition') || interceptedHtml.includes('Long Definition')) {
            tabLabel = 'Explanation';
          } else if (rawLabel) {
            const parenMatch = rawLabel.match(/^(.*?)\s*\((\d+)\)$/);
            if (parenMatch) {
              tabLabel = parenMatch[1].trim();
              badge = parenMatch[2];
            } else if (rawLabel.toLowerCase().includes('definition of')) {
              tabLabel = 'Definitions';
            } else {
              tabLabel = rawLabel;
            }
          } else if (interceptedHtml.includes('custom-definition-list')) {
            tabLabel = 'Definitions';
            const countMatch = interceptedHtml.match(/\((\d+)\)/);
            if (countMatch) badge = countMatch[1];
          }

          const contentMatch = interceptedHtml.match(/<div[^>]*class=["'][^"']*details-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/details>/i);
          const panelContent = contentMatch ? contentMatch[1].trim() : interceptedHtml;

          const existingTab = secondaryTabs.find((t) => t.label.toLowerCase() === tabLabel.toLowerCase());
          if (existingTab) {
            existingTab.contentHtml = `${existingTab.contentHtml}<div style="margin-top: 10px; border-top: 1px solid #f3f4f6; padding-top: 8px;"></div>${panelContent}`;
            if (badge && !existingTab.badge) {
              existingTab.badge = badge;
            }
          } else {
            secondaryTabs.push({
              id: `tab-def-${secondaryTabs.length}`,
              label: tabLabel,
              badge,
              contentHtml: panelContent,
            });
          }
        }
      });

      primaryDefHtmls.forEach((quickHtml) => {
        const quickDefEl = domH('div', { className: 'vocab-popup-definition', innerHTML: quickHtml });
        bodyContainer.appendChild(quickDefEl);
      });

      bodyContainer._pendingTabs = secondaryTabs;
    } else if (item.type === 'word-family') {
      const familyList = Array.isArray(item.value) ? item.value : [];
      if (familyList.length > 0) {
        const currentHw = (viewModel?.headword || state.headword || '').toLowerCase();
        const group = domH('div', { className: 'vocab-word-family-group' });

        familyList.forEach((fam) => {
          const famWord = typeof fam === 'string' ? fam : fam.word;
          const isInflected = isInflectedForm(famWord, currentHw);
          const chip = domH(
            'button',
            {
              type: 'button',
              className: isInflected ? 'vocab-family-chip disabled-inflection' : 'vocab-family-chip',
              title: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
              ariaLabel: isInflected ? UI_COPY.INFLECTED_FORM_TOOLTIP(famWord) : UI_COPY.LOOKUP_FAMILY_TOOLTIP(famWord),
              disabled: isInflected,
              onClick: (e) => {
                e?.stopPropagation?.();
                if (isInflected) return;
                showQuickPreviewPopover({
                  targetElement: chip,
                  word: famWord,
                  container,
                  documentObj,
                  windowObj,
                  lookupExecutor,
                  source: viewModel?.source || 'vocabulary',
                  onExpand: (w) => {
                    if (typeof onNavigateWord === 'function') {
                      onNavigateWord(w);
                    }
                  },
                  h: domH,
                });
              },
            },
            famWord
          );
          group.appendChild(chip);
        });

        const pendingTabs = bodyContainer._pendingTabs || [];
        pendingTabs.push({
          id: 'tab-word-family',
          label: 'Word Family',
          badge: String(familyList.length),
          contentElement: group,
        });
        bodyContainer._pendingTabs = pendingTabs;
      }
    } else if (item.type === 'synonyms-antonyms') {
      const synList = Array.isArray(item.value?.synonyms) ? item.value.synonyms : [];
      const antList = Array.isArray(item.value?.antonyms) ? item.value.antonyms : [];
      const totalCount = synList.length + antList.length;

      if (totalCount > 0) {
        const thesauContainer = domH('div', { className: 'vocab-thesaurus-container' });

        if (synList.length > 0) {
          const synSection = domH('div', {});
          const synTitle = domH('div', { className: 'vocab-thesaurus-section-title synonyms-title' }, `Synonyms (${synList.length})`);
          const synGroup = domH('div', { className: 'vocab-thesaurus-chip-group' });

          synList.forEach((synWord) => {
            const chip = domH(
              'button',
              {
                type: 'button',
                className: 'vocab-synonym-chip',
                title: `Lookup synonym "${synWord}"`,
                ariaLabel: `Lookup synonym "${synWord}"`,
                onClick: (e) => {
                  e?.stopPropagation?.();
                  showQuickPreviewPopover({
                    targetElement: chip,
                    word: synWord,
                    container,
                    documentObj,
                    windowObj,
                    lookupExecutor,
                    source: viewModel?.source || 'vocabulary',
                    onExpand: (w) => {
                      if (typeof onNavigateWord === 'function') {
                        onNavigateWord(w);
                      }
                    },
                    h: domH,
                  });
                },
              },
              synWord
            );
            synGroup.appendChild(chip);
          });

          synSection.appendChild(synTitle);
          synSection.appendChild(synGroup);
          thesauContainer.appendChild(synSection);
        }

        if (antList.length > 0) {
          const antSection = domH('div', {});
          const antTitle = domH('div', { className: 'vocab-thesaurus-section-title antonyms-title' }, `Antonyms (${antList.length})`);
          const antGroup = domH('div', { className: 'vocab-thesaurus-chip-group' });

          antList.forEach((antWord) => {
            const chip = domH(
              'button',
              {
                type: 'button',
                className: 'vocab-antonym-chip',
                title: `Lookup antonym "${antWord}"`,
                ariaLabel: `Lookup antonym "${antWord}"`,
                onClick: (e) => {
                  e?.stopPropagation?.();
                  showQuickPreviewPopover({
                    targetElement: chip,
                    word: antWord,
                    container,
                    documentObj,
                    windowObj,
                    lookupExecutor,
                    source: viewModel?.source || 'vocabulary',
                    onExpand: (w) => {
                      if (typeof onNavigateWord === 'function') {
                        onNavigateWord(w);
                      }
                    },
                    h: domH,
                  });
                },
              },
              antWord
            );
            antGroup.appendChild(chip);
          });

          antSection.appendChild(antTitle);
          antSection.appendChild(antGroup);
          thesauContainer.appendChild(antSection);
        }

        const pendingTabs = bodyContainer._pendingTabs || [];
        pendingTabs.push({
          id: 'tab-synonyms-antonyms',
          label: 'Synonyms & Antonyms',
          badge: String(totalCount),
          contentElement: thesauContainer,
        });
        bodyContainer._pendingTabs = pendingTabs;
      }
    } else if (item.type === 'title') {
      bodyContainer.appendChild(domH('div', { className: 'vocab-popup-title' }, item.value));
    } else if (item.type === 'message') {
      bodyContainer.appendChild(domH('div', { className: 'vocab-popup-message' }, item.value));
    } else if (item.type === 'searchSuggestions') {
      if (item.value) {
        bodyContainer.appendChild(domH('div', { className: 'vocab-popup-search-suggestions', innerHTML: item.value }));
      }
    } else if (item.type === 'guidance-list') {
      const ul = domH('ul', { className: 'vocab-popup-guidance-list' });
      item.value.forEach((g) => ul.appendChild(domH('li', {}, g)));
      bodyContainer.appendChild(ul);
    } else if (item.type === 'cta') {
      bodyContainer.appendChild(domH('div', { className: 'vocab-popup-cta' }, domH('button', { type: 'button' }, item.value)));
    } else if (item.type === 'compliance-footer') {
      footerEl = domH(
        'div',
        { className: 'vocab-popup-compliance-footer' },
        domH('div', { className: 'vocab-popup-attribution', innerHTML: item.value.attribution }),
        domH('div', { className: 'vocab-popup-permission-disclosure', innerHTML: item.value.disclosure })
      );
    }
  });

  // Append Visual Context / Images Tab if we have a successful word lookup
  if (state.status === 'success' && currentWord) {
    const pendingTabs = bodyContainer._pendingTabs || [];
    const imagesPanel = domH('div', { className: 'vocab-images-panel' });
    let imagesLoaded = false;
    let imagesLoading = false;

    const loadImages = async () => {
      if (imagesLoaded || imagesLoading) return;
      imagesLoading = true;
      imagesPanel.replaceChildren();

      // Render Skeleton loader (shimmer animation cards)
      const skeletonGrid = domH(
        'div',
        { className: 'vocab-image-grid skeleton-grid' },
        ...Array.from({ length: 6 }, () =>
          domH(
            'div',
            { className: 'vocab-image-skeleton-card' },
            domH('div', { className: 'skeleton vocab-image-skeleton-thumb' }),
            domH('div', { className: 'skeleton vocab-image-skeleton-text' })
          )
        )
      );
      imagesPanel.appendChild(skeletonGrid);
      onLayoutChange?.();

      try {
        let lookupResult = null;
        if (typeof chromeApi?.runtime?.sendMessage === 'function') {
          lookupResult = await new Promise((resolve, reject) => {
            try {
              chromeApi.runtime.sendMessage(
                {
                  type: LOOKUP_VISUAL_IMAGES_MESSAGE_TYPE,
                  payload: { keyword: currentWord, limit: 6 },
                },
                (response) => {
                  const lastError = chromeApi.runtime?.lastError;
                  if (lastError) {
                    reject(new Error(lastError.message));
                  } else if (response?.status === 'success') {
                    resolve(response.data);
                  } else {
                    reject(new Error(response?.error?.message || 'Lookup failed'));
                  }
                }
              );
            } catch (err) {
              reject(err);
            }
          });
        } else {
          const fetchFn = windowObj?.fetch ? windowObj.fetch.bind(windowObj) : globalThis.fetch;
          lookupResult = await defaultVisualImageSearchAdapter.fetchImagesWithFallback(currentWord, 6, fetchFn);
        }

        imagesLoading = false;
        imagesLoaded = true;
        imagesPanel.replaceChildren();

        const images = Array.isArray(lookupResult?.images) ? lookupResult.images : [];
        const source = lookupResult?.source || 'duckduckgo';
        const sourceLabel = source === 'wikimedia' ? 'Wikimedia Commons' : 'DuckDuckGo';

        if (images.length > 0) {
          const grid = domH('div', { className: 'vocab-image-grid' });
          images.forEach((img) => {
            const card = domH(
              'a',
              {
                href: img.sourceUrl || img.fullUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'vocab-image-card',
                title: img.title || currentWord,
                onClick: (e) => {
                  e?.stopPropagation?.();
                },
              },
              domH('img', {
                src: img.thumbUrl,
                alt: img.title || currentWord,
                className: 'vocab-image-thumb',
                loading: 'lazy',
              }),
              domH('span', { className: 'vocab-image-caption' }, img.title || currentWord)
            );
            grid.appendChild(card);
          });

          const footer = domH(
            'div',
            { className: 'vocab-image-footer' },
            domH('span', { className: 'vocab-image-source-tag' }, `via ${sourceLabel}`)
          );

          imagesPanel.appendChild(grid);
          imagesPanel.appendChild(footer);
        } else {
          // Empty State
          const emptyState = domH(
            'div',
            { className: 'vocab-image-empty-state' },
            domH('div', { className: 'vocab-image-empty-icon' }, '🖼️'),
            domH('div', { className: 'vocab-image-empty-title' }, `No visual images found for '${currentWord}'`),
            domH('div', { className: 'vocab-image-empty-hint' }, 'Try searching a related noun or root word.')
          );
          imagesPanel.appendChild(emptyState);
        }
      } catch {
        imagesLoading = false;
        imagesPanel.replaceChildren();
        // Error State
        const retryBtn = domH(
          'button',
          {
            type: 'button',
            className: 'vocab-image-retry-btn',
            onClick: (e) => {
              e?.stopPropagation?.();
              imagesLoaded = false;
              loadImages();
            },
          },
          '🔄 Retry'
        );
        const errorState = domH(
          'div',
          { className: 'vocab-image-error-state' },
          domH('div', { className: 'vocab-image-error-msg' }, 'Could not load images. Please check your connection.'),
          retryBtn
        );
        imagesPanel.appendChild(errorState);
      }
      onLayoutChange?.();
    };

    pendingTabs.push({
      id: 'tab-illustrations',
      label: 'Illustrations',
      contentElement: imagesPanel,
      onActive: () => {
        loadImages();
      },
    });
    bodyContainer._pendingTabs = pendingTabs;
  }

  // Render Tabs Container if we have pending tabs
  renderTabsComponent({
    bodyContainer,
    popupContainer: container,
    settingsAdapter,
    h: domH,
    updatePopupPosition: onLayoutChange,
    closeSVG,
    gearSVG,
    dragDotsSVG,
    eyeSVG,
    eyeOffSVG,
  });

  container.appendChild(bodyContainer);
  if (footerEl) {
    container.appendChild(footerEl);
  }
}
