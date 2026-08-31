import { getErrorCopyByType, NOT_FOUND_COPY } from '../application/popupCopyCatalog.js';
import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { normalizeLookupErrorType } from '../shared/lookupContract.js';

function renderComplianceFooterContent(source = 'vocabulary') {
  return [
    {
      type: 'compliance-footer',
      value: {
        attribution: buildAttributionText(source),
        disclosure: buildPermissionDisclosureSummary(),
      },
    },
  ];
}

export function renderSuccessContent(viewModel) {
  const definitions = viewModel.definitions || [];
  const wordFamily = Array.isArray(viewModel.wordFamily) ? viewModel.wordFamily : [];
  const source = viewModel?.source || 'vocabulary';

  const items = [
    {
      type: 'headword',
      value: viewModel?.headword ?? '',
      source,
      lookupUrl: viewModel?.lookupUrl || '',
    },
    {
      type: 'pronunciation',
      value: viewModel?.pronunciation ?? '',
      audio: viewModel?.audio || {},
    },
  ];

  if (viewModel?.stressDiagram?.hasStressInfo) {
    items.push({
      type: 'stress-diagram',
      value: viewModel.stressDiagram,
    });
  }

  items.push({
    type: 'definition',
    value: definitions,
  });

  if (wordFamily.length > 0) {
    items.push({
      type: 'word-family',
      value: wordFamily,
    });
  }

  items.push(...renderComplianceFooterContent(source));

  return items;
}

export function renderNotFoundContent(viewModel = {}) {
  const guidance = Array.isArray(viewModel?.guidance)
    ? viewModel.guidance
    : NOT_FOUND_COPY.guidance;
  const source = viewModel?.source || 'vocabulary';

  return [
    { type: 'title', value: viewModel?.title ?? NOT_FOUND_COPY.title },
    { type: 'message', value: viewModel?.message ?? NOT_FOUND_COPY.message },
    { type: 'searchSuggestions', value: viewModel?.searchSuggestions ?? '' },
    { type: 'guidance-list', value: guidance },
    ...renderComplianceFooterContent(source),
  ];
}

export function renderErrorContent(error = {}) {
  const normalizedErrorType = normalizeLookupErrorType(error?.type ?? error?.errorType);
  const copy = getErrorCopyByType(normalizedErrorType);
  const source = error?.source || 'vocabulary';

  return [
    { type: 'title', value: copy.title },
    { type: 'message', value: copy.message },
    { type: 'cta', value: copy.cta },
    ...renderComplianceFooterContent(source),
  ];
}
