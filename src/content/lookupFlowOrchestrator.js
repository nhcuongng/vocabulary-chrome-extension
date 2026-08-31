export const POPUP_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  NOT_FOUND: 'not-found',
  ERROR: 'error',
};

export function createLookupFlowOrchestrator({
  lookupExecutor,
  onStateChange,
  telemetryRecorder,
  now = () => Date.now(),
} = {}) {
  if (typeof lookupExecutor !== 'function') {
    throw new Error('lookupExecutor is required');
  }

  if (typeof onStateChange !== 'function') {
    throw new Error('onStateChange is required');
  }

  let currentState = {
    status: POPUP_STATE.IDLE,
  };
  let currentRunId = 0;

  const setState = (state) => {
    currentState = state;
    onStateChange(state);
  };

  async function runLookup(request) {
    const runId = ++currentRunId;
    const requestStartedAtMs = now();
    const loadingRenderedAtMs = now();
    const headword = request.payload.token;
    const source = request.payload.source;
    const selectionRect = request.payload.selectionRect || null;

    setState({
      status: POPUP_STATE.LOADING,
      headword,
      source,
      selectionRect,
      requestStartedAtMs,
      loadingRenderedAtMs,
      loadingLatencyMs: loadingRenderedAtMs - requestStartedAtMs,
    });

    let result;
    try {
      result = await lookupExecutor({ headword, source });
    } catch (error) {
      result = {
        status: 'error',
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }

    const finishedAtMs = now();
    const loadingLatencyMs = loadingRenderedAtMs - requestStartedAtMs;
    if (typeof telemetryRecorder?.recordLookupCompleted === 'function') {
      try {
        const maybePromise = telemetryRecorder.recordLookupCompleted({
          lookupResult: result,
          loadingLatencyMs,
          requestStartedAtMs,
          finishedAtMs,
        });

        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {});
        }
      } catch {
        // Best-effort telemetry only; never break lookup UX.
      }
    }

    if (runId !== currentRunId) {
      return {
        loadingLatencyMs,
        finalState: currentState,
      };
    }

    if (result?.status === 'success') {
      setState({
        status: POPUP_STATE.SUCCESS,
        headword: result?.data?.headword || headword,
        source: result?.data?.source || source,
        selectionRect,
        data: result.data,
      });
    } else if (result?.status === 'not-found') {
      setState({
        status: POPUP_STATE.NOT_FOUND,
        headword: result?.data?.headword || result?.data?.token || headword,
        source: result?.data?.source || source,
        selectionRect,
        data: result.data,
      });
    } else {
      setState({
        status: POPUP_STATE.ERROR,
        headword: result?.error?.headword || headword,
        source: result?.error?.source || source,
        selectionRect,
        error: result?.error ?? {
          type: 'unknown',
          message: 'unknown lookup error',
        },
      });
    }

    return {
      loadingLatencyMs,
      finalState: currentState,
    };
  }

  return {
    runLookup,
    getState: () => currentState,
  };
}
