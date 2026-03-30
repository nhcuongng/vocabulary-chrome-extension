import { getErrorCopyByType, NOT_FOUND_COPY } from '../application/popupCopyCatalog.js';
import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { normalizeLookupErrorType } from '../shared/lookupContract.js';

function renderComplianceFooterContent() {
  return [
    // { type: 'attribution', value: buildAttributionText() },
    // {
    //   type: 'permission-disclosure',
    //   value: buildPermissionDisclosureSummary(),
    // },
  ];
}

export function renderSuccessContent(viewModel) {
  // Build the HTML for definitions with a 'more' popup
  const definitions = viewModel.definitions || [];
  let definitionHtml = '';
  if (definitions.length > 0) {
    const firstDef = definitions[0];
    const moreDefs = definitions.slice(1);
    if (moreDefs.length === 0) {
      definitionHtml = firstDef;
    } else {
      // Unique id for popup in case of multiple entries
      const popupId = `more-definitions-popup-${Math.random().toString(36).substr(2, 9)}`;
      definitionHtml = `
        <span>${firstDef}</span>
        <span 
          class="more-trigger" 
          style="font-size: 8px; text-decoration: italic; cursor: pointer; color: #1677C9; margin-left: 4px;"
          data-popup-id="${popupId}"
        >more</span>
        <div 
          id="${popupId}"
          class="more-definitions-popup vocab-popup-theme" 
          style="display: none; position: absolute; z-index: 2147483647; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.18); border-radius: 10px; padding: 12px; width: 300px; height: 300px; font-family: inherit; font-size: 16px; color: #222; border: none;"
        >
          <div style="height: calc(100% - 30px); overflow-y: auto">
            ${moreDefs.map(def => `<div style='margin-bottom: 8px;'>${def}</div>`).join('')}
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: center; width: 100%; bottom: 12px; left: 0; padding: 4px 12px; box-sizing: border-box;">
            <button class="close-more-definitions-popup" style="cursor: pointer; font-size: 15px; background: red; color: white; border: none; border-radius: 6px; padding: 4px 12px;">Close</button>
          </div>
        </div>
      `;
    }
  }
  return [
    { type: 'headword', value: viewModel?.headword ?? '' },
    {
      type: 'pronunciation',
      value: viewModel?.pronunciation ?? '',
      audio: viewModel?.audio || {},
    },
    {
      type: 'definition',
      value: definitionHtml,
    },
    ...renderComplianceFooterContent(),
  ];
}

export function renderNotFoundContent(viewModel = {}) {
  const guidance = Array.isArray(viewModel?.guidance)
    ? viewModel.guidance
    : NOT_FOUND_COPY.guidance;

  return [
    { type: 'title', value: viewModel?.title ?? NOT_FOUND_COPY.title },
    { type: 'message', value: viewModel?.message ?? NOT_FOUND_COPY.message },
    { type: 'guidance-list', value: guidance },
    ...renderComplianceFooterContent(),
  ];
}

export function renderErrorContent(error = {}) {
  const normalizedErrorType = normalizeLookupErrorType(error?.type ?? error?.errorType);
  const copy = getErrorCopyByType(normalizedErrorType);

  return [
    { type: 'title', value: copy.title },
    { type: 'message', value: copy.message },
    { type: 'cta', value: copy.cta },
    ...renderComplianceFooterContent(),
  ];
}
