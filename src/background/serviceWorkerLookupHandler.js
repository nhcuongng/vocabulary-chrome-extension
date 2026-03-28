import {
  LOOKUP_MESSAGE_TYPE,
  createLookupErrorResponse,
} from '../shared/lookupContract.js';
import { performDictionaryLookup } from './lookupService.js';

export function createServiceWorkerLookupHandler({
  lookupExecutor = performDictionaryLookup,
} = {}) {
  return async function handleLookupMessage(message) {
    if (message?.type !== LOOKUP_MESSAGE_TYPE) {
      return null;
    }

    const headword = message?.payload?.token;
    if (typeof headword !== 'string' || headword.length === 0) {
      return createLookupErrorResponse('invalid-token', {
        message: 'headword token is required',
      });
    }

    return lookupExecutor({ headword });
  };
}
