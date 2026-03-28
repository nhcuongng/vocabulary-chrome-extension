import {
  createLookupErrorResponse,
  createLookupNotFoundResponse,
  createLookupSuccessResponse,
  LOOKUP_ERROR_TYPE,
} from '../../shared/lookupContract.js';
import { parseVocabularyHtml } from './vocabularyHtmlParserAdapter.js';

function hasCoreDictionaryData(parsedPayload) {
  const hasHeadword = typeof parsedPayload?.headword === 'string' && parsedPayload.headword.trim().length > 0;
  const hasDefinition =
    Array.isArray(parsedPayload?.definitions) &&
    parsedPayload.definitions.some(
      (definition) => typeof definition === 'string' && definition.trim().length > 0,
    );

  return hasHeadword && hasDefinition;
}

export function safeParseVocabularyHtml({ html, parser = parseVocabularyHtml } = {}) {
  try {
    const parsedPayload = parser(html);

    if (!hasCoreDictionaryData(parsedPayload)) {
      return createLookupNotFoundResponse({
        reason: 'empty-core-data',
        parsedPayload,
      });
    }

    return createLookupSuccessResponse({
      parsedPayload,
    });
  } catch (error) {
    return createLookupErrorResponse(LOOKUP_ERROR_TYPE.PARSE, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
