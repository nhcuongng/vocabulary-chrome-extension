export const TOKEN_VALIDATION_REASON = {
  EMPTY: 'empty-token',
  MULTI_TOKEN: 'multi-token',
  INVALID_CHARACTERS: 'invalid-characters',
};

export function normalizeWord(rawToken) {
  if (typeof rawToken !== 'string') {
    return '';
  }

  const compact = rawToken.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }

  const stripped = compact.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
  return stripped.toLowerCase();
}

export function validateMvpOneWordToken(rawSelection) {
  if (typeof rawSelection !== 'string') {
    return {
      isValid: false,
      reasonCode: TOKEN_VALIDATION_REASON.EMPTY,
      normalizedSelection: '',
      normalizedToken: '',
    };
  }

  const normalizedSelection = rawSelection.replace(/\s+/g, ' ').trim();
  if (!normalizedSelection) {
    return {
      isValid: false,
      reasonCode: TOKEN_VALIDATION_REASON.EMPTY,
      normalizedSelection,
      normalizedToken: '',
    };
  }

  const rawTokens = normalizedSelection.split(' ');
  if (rawTokens.length !== 1) {
    return {
      isValid: false,
      reasonCode: TOKEN_VALIDATION_REASON.MULTI_TOKEN,
      normalizedSelection,
      normalizedToken: '',
      tokenCount: rawTokens.length,
    };
  }

  const normalizedToken = normalizeWord(rawTokens[0]);
  const isValidWord = /^[a-z]+(?:[\-'][a-z]+)*$/.test(normalizedToken);

  if (!normalizedToken || !isValidWord) {
    return {
      isValid: false,
      reasonCode: TOKEN_VALIDATION_REASON.INVALID_CHARACTERS,
      normalizedSelection,
      normalizedToken,
      rawToken: rawTokens[0],
    };
  }

  return {
    isValid: true,
    reasonCode: null,
    normalizedSelection,
    normalizedToken,
    rawToken: rawTokens[0],
    tokenCount: 1,
  };
}
