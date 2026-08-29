import {
  createLookupErrorResponse,
  createLookupNotFoundResponse,
  createLookupSuccessResponse,
  LOOKUP_ERROR_TYPE,
} from '../../shared/lookupContract.js';
import { parseCambridgeHtml } from './cambridgeHtmlParserAdapter.js';

function hasCoreDictionaryData(parsedPayload) {
  const hasHeadword = typeof parsedPayload?.headword === 'string' && parsedPayload.headword.trim().length > 0;
  const hasDefinition =
    Array.isArray(parsedPayload?.definitions) &&
    parsedPayload.definitions.some(
      (definition) => typeof definition === 'string' && definition.trim().length > 0,
    );

  return hasHeadword && hasDefinition;
}

export function safeParseCambridgeHtml({ html, parser = parseCambridgeHtml } = {}) {
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
