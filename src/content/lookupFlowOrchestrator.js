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

  async function runLookup({ headword }) {
    const runId = ++currentRunId;
    const requestStartedAtMs = now();
    const loadingRenderedAtMs = now();

    setState({
      status: POPUP_STATE.LOADING,
      headword,
      requestStartedAtMs,
      loadingRenderedAtMs,
      loadingLatencyMs: loadingRenderedAtMs - requestStartedAtMs,
    });

    let result;
    try {
      result = await lookupExecutor({ headword });
    } catch (error) {
      result = {
        status: 'error',
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }

    if (runId !== currentRunId) {
      return {
        loadingLatencyMs: loadingRenderedAtMs - requestStartedAtMs,
        finalState: currentState,
      };
    }

    if (result?.status === 'success') {
      setState({
        status: POPUP_STATE.SUCCESS,
        data: result.data,
      });
    } else if (result?.status === 'not-found') {
      setState({
        status: POPUP_STATE.NOT_FOUND,
        data: result.data,
      });
    } else {
      setState({
        status: POPUP_STATE.ERROR,
        error: result?.error ?? {
          type: 'unknown',
          message: 'unknown lookup error',
        },
      });
    }

    return {
      loadingLatencyMs: loadingRenderedAtMs - requestStartedAtMs,
      finalState: currentState,
    };
  }

  return {
    runLookup,
    getState: () => currentState,
  };
}
