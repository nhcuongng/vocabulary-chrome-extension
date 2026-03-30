import { getErrorCopyByType, NOT_FOUND_COPY } from '../application/popupCopyCatalog.js';
import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { normalizeLookupErrorType } from '../shared/lookupContract.js';

function renderComplianceFooterContent() {
  return [
    { type: 'attribution', value: buildAttributionText() },
    {
      type: 'permission-disclosure',
      value: buildPermissionDisclosureSummary(),
    },
  ];
}

export function renderSuccessContent(viewModel) {
  const definitions = viewModel.definitions || [];

  return [
    { type: 'headword', value: viewModel?.headword ?? '' },
    {
      type: 'pronunciation',
      value: viewModel?.pronunciation ?? '',
      audio: viewModel?.audio || {},
    },
    {
      type: 'definition',
      value: definitions,
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
