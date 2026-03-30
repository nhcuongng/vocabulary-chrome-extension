export const LOOKUP_MESSAGE_TYPE = 'LOOKUP_REQUEST';

export const LOOKUP_DECISION_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  DUPLICATE: 'duplicate',
};

export const LOOKUP_RESPONSE_STATUS = {
  SUCCESS: 'success',
  NOT_FOUND: 'not-found',
  ERROR: 'error',
};

export const LOOKUP_ERROR_TYPE = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate-limit',
  PARSE: 'parse',
  UNKNOWN: 'unknown',
  INVALID_TOKEN: 'invalid-token',
};

export function normalizeLookupErrorType(errorType) {
  const knownTypes = new Set(Object.values(LOOKUP_ERROR_TYPE));
  return knownTypes.has(errorType) ? errorType : LOOKUP_ERROR_TYPE.UNKNOWN;
}

export function createLookupRequest({ token, rawText, selectionRect, sourceEvent, requestId }) {
  return {
    type: LOOKUP_MESSAGE_TYPE,
    requestId,
    payload: {
      token,
      rawText,
      selectionRect,
      sourceEvent,
    },
  };
}

export function createValidLookupDecision(request, nextDedupeState) {
  return {
    status: LOOKUP_DECISION_STATUS.VALID,
    request,
    nextDedupeState,
  };
}

export function createInvalidLookupDecision(reason, metadata = {}) {
  return {
    status: LOOKUP_DECISION_STATUS.INVALID,
    reason,
    metadata,
  };
}

export function createDuplicateLookupDecision(metadata = {}) {
  return {
    status: LOOKUP_DECISION_STATUS.DUPLICATE,
    reason: 'duplicate-trigger',
    metadata,
  };
}

export function createLookupSuccessResponse(data) {
  return {
    status: LOOKUP_RESPONSE_STATUS.SUCCESS,
    data,
  };
}

export function createLookupNotFoundResponse(data = {}) {
  // data should contain { token: string }
  return {
    status: LOOKUP_RESPONSE_STATUS.NOT_FOUND,
    data,
  };
}

export function createLookupErrorResponse(errorType, details = {}) {
  return {
    status: LOOKUP_RESPONSE_STATUS.ERROR,
    error: {
      ...details,
      type: normalizeLookupErrorType(errorType),
    },
  };
}
