import { createLookupErrorResponse, LOOKUP_MESSAGE_TYPE, FETCH_AUDIO_MESSAGE_TYPE } from '../shared/lookupContract.js';
import { createServiceWorkerLookupHandler } from './serviceWorkerLookupHandler.js';
import { handleFetchAudioMessage } from './audioFetchHandler.js';

export function bootstrapServiceWorkerRuntime({
  chromeApi = globalThis.chrome,
  messageHandler = createServiceWorkerLookupHandler(),
  audioHandler = handleFetchAudioMessage,
} = {}) {
  const onMessage = chromeApi?.runtime?.onMessage;

  if (!onMessage || typeof onMessage.addListener !== 'function') {
    return {
      started: false,
      dispose: () => {},
    };
  }

  const listener = (message, sender, sendResponse) => {
    if (message?.type === FETCH_AUDIO_MESSAGE_TYPE) {
      Promise.resolve()
        .then(() => audioHandler(message, sender))
        .then((result) => {
          if (result !== null && result !== undefined) {
            sendResponse(result);
          }
        })
        .catch((error) => {
          sendResponse({
            status: 'error',
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        });
      return true;
    }

    if (message?.type !== LOOKUP_MESSAGE_TYPE) {
      return false;
    }
    Promise.resolve()
      .then(() => messageHandler(message, sender))
      .then((result) => {
        if (result !== null && result !== undefined) {
          sendResponse(result);
        }
      })
      .catch((error) => {
        sendResponse(
          createLookupErrorResponse('unknown', {
            type: 'unknown',
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      });

    return true;
  };

  onMessage.addListener(listener);

  return {
    started: true,
    dispose: () => {
      if (typeof onMessage.removeListener === 'function') {
        onMessage.removeListener(listener);
      }
    },
  };
}

if (globalThis.chrome?.runtime?.onMessage) {
  bootstrapServiceWorkerRuntime();
}
