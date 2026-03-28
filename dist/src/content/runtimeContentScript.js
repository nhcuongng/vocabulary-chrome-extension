(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/shared/lookupContract.js
  var LOOKUP_MESSAGE_TYPE = "LOOKUP_REQUEST";
  var LOOKUP_DECISION_STATUS = {
    VALID: "valid",
    INVALID: "invalid",
    DUPLICATE: "duplicate"
  };
  var LOOKUP_ERROR_TYPE = {
    NETWORK: "network",
    TIMEOUT: "timeout",
    RATE_LIMIT: "rate-limit",
    PARSE: "parse",
    UNKNOWN: "unknown",
    INVALID_TOKEN: "invalid-token"
  };
  function normalizeLookupErrorType(errorType) {
    const knownTypes = new Set(Object.values(LOOKUP_ERROR_TYPE));
    return knownTypes.has(errorType) ? errorType : LOOKUP_ERROR_TYPE.UNKNOWN;
  }
  function createLookupRequest({ token, rawText, selectionRect, sourceEvent, requestId }) {
    return {
      type: LOOKUP_MESSAGE_TYPE,
      requestId,
      payload: {
        token,
        rawText,
        selectionRect,
        sourceEvent
      }
    };
  }
  function createValidLookupDecision(request, nextDedupeState) {
    return {
      status: LOOKUP_DECISION_STATUS.VALID,
      request,
      nextDedupeState
    };
  }
  function createInvalidLookupDecision(reason, metadata = {}) {
    return {
      status: LOOKUP_DECISION_STATUS.INVALID,
      reason,
      metadata
    };
  }
  function createDuplicateLookupDecision(metadata = {}) {
    return {
      status: LOOKUP_DECISION_STATUS.DUPLICATE,
      reason: "duplicate-trigger",
      metadata
    };
  }

  // src/shared/wordNormalization.js
  var TOKEN_VALIDATION_REASON = {
    EMPTY: "empty-token",
    MULTI_TOKEN: "multi-token",
    INVALID_CHARACTERS: "invalid-characters"
  };
  function normalizeWord(rawToken) {
    if (typeof rawToken !== "string") {
      return "";
    }
    const compact = rawToken.replace(/\s+/g, " ").trim();
    if (!compact) {
      return "";
    }
    const stripped = compact.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    return stripped.toLowerCase();
  }
  function validateMvpOneWordToken(rawSelection) {
    if (typeof rawSelection !== "string") {
      return {
        isValid: false,
        reasonCode: TOKEN_VALIDATION_REASON.EMPTY,
        normalizedSelection: "",
        normalizedToken: ""
      };
    }
    const normalizedSelection = rawSelection.replace(/\s+/g, " ").trim();
    if (!normalizedSelection) {
      return {
        isValid: false,
        reasonCode: TOKEN_VALIDATION_REASON.EMPTY,
        normalizedSelection,
        normalizedToken: ""
      };
    }
    const rawTokens = normalizedSelection.split(" ");
    if (rawTokens.length !== 1) {
      return {
        isValid: false,
        reasonCode: TOKEN_VALIDATION_REASON.MULTI_TOKEN,
        normalizedSelection,
        normalizedToken: "",
        tokenCount: rawTokens.length
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
        rawToken: rawTokens[0]
      };
    }
    return {
      isValid: true,
      reasonCode: null,
      normalizedSelection,
      normalizedToken,
      rawToken: rawTokens[0],
      tokenCount: 1
    };
  }

  // src/content/selectionDetection.js
  var SELECTION_EVENT_TYPES = ["mouseup", "touchend", "keyup"];
  var DEFAULT_SELECTION_DEBOUNCE_MS = 150;
  var DEFAULT_DEDUPE_WINDOW_MS = 350;
  var INVALID_SELECTION_REASONS = {
    EMPTY: "empty-selection",
    MULTI_TOKEN: "multi-token-selection",
    INVALID_TOKEN: "invalid-token-selection",
    MISSING_RECT: "missing-selection-rect"
  };
  function validateSelectionToken(text) {
    const result = validateMvpOneWordToken(text);
    console.log("[VOCAB][selectionDetection] validateSelectionToken input:", text, "result:", result);
    if (!result.isValid) {
      if (result.reasonCode === TOKEN_VALIDATION_REASON.EMPTY) {
        return createInvalidLookupDecision(INVALID_SELECTION_REASONS.EMPTY, {
          normalizedText: result.normalizedSelection,
          reasonCode: result.reasonCode
        });
      }
      if (result.reasonCode === TOKEN_VALIDATION_REASON.MULTI_TOKEN) {
        return createInvalidLookupDecision(INVALID_SELECTION_REASONS.MULTI_TOKEN, {
          normalizedText: result.normalizedSelection,
          tokenCount: result.tokenCount,
          reasonCode: result.reasonCode
        });
      }
      return createInvalidLookupDecision(INVALID_SELECTION_REASONS.INVALID_TOKEN, {
        normalizedText: result.normalizedSelection,
        token: result.rawToken,
        normalizedToken: result.normalizedToken,
        reasonCode: result.reasonCode
      });
    }
    return {
      status: LOOKUP_DECISION_STATUS.VALID,
      normalizedText: result.normalizedSelection,
      token: result.normalizedToken,
      rawToken: result.rawToken
    };
  }
  function toSerializableRect(rect) {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
    if (!rect) {
      return null;
    }
    return {
      x: Number((_b2 = (_a2 = rect.x) != null ? _a2 : rect.left) != null ? _b2 : 0),
      y: Number((_d = (_c = rect.y) != null ? _c : rect.top) != null ? _d : 0),
      width: Number((_e = rect.width) != null ? _e : 0),
      height: Number((_f = rect.height) != null ? _f : 0),
      top: Number((_h = (_g = rect.top) != null ? _g : rect.y) != null ? _h : 0),
      left: Number((_j = (_i = rect.left) != null ? _i : rect.x) != null ? _j : 0),
      right: Number((_n = rect.right) != null ? _n : Number((_l = (_k = rect.left) != null ? _k : rect.x) != null ? _l : 0) + Number((_m = rect.width) != null ? _m : 0)),
      bottom: Number((_r = rect.bottom) != null ? _r : Number((_p = (_o = rect.top) != null ? _o : rect.y) != null ? _p : 0) + Number((_q = rect.height) != null ? _q : 0))
    };
  }
  function readSelectionSnapshot(windowObj = globalThis.window) {
    var _a2, _b2, _c, _d;
    const selection = (_a2 = windowObj == null ? void 0 : windowObj.getSelection) == null ? void 0 : _a2.call(windowObj);
    if (!selection || selection.rangeCount === 0) {
      return { text: "", rect: null };
    }
    const text = selection.toString();
    let rect = null;
    try {
      if (!selection.isCollapsed) {
        rect = (_d = (_c = (_b2 = selection.getRangeAt(0)).getBoundingClientRect) == null ? void 0 : _c.call(_b2)) != null ? _d : null;
      }
    } catch (e) {
      rect = null;
    }
    return {
      text,
      rect: toSerializableRect(rect)
    };
  }
  function createSelectionFingerprint(token, rect) {
    if (!rect) {
      return `${token}|no-rect`;
    }
    const rounded = [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(Number(value != null ? value : 0))).join(":");
    return `${token}|${rounded}`;
  }
  function buildLookupDecision({
    snapshot,
    eventType,
    dedupeState = { lastFingerprint: null, lastTriggeredAtMs: 0 },
    nowMs = Date.now(),
    dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
    requestId
  }) {
    const validation = validateSelectionToken(snapshot == null ? void 0 : snapshot.text);
    console.log("[VOCAB][selectionDetection] buildLookupDecision snapshot:", snapshot, "validation:", validation);
    if (validation.status !== LOOKUP_DECISION_STATUS.VALID) {
      return __spreadProps(__spreadValues({}, validation), {
        metadata: __spreadProps(__spreadValues({}, validation.metadata), {
          eventType
        })
      });
    }
    const selectionRect = toSerializableRect(snapshot == null ? void 0 : snapshot.rect);
    if (!selectionRect) {
      return createInvalidLookupDecision(INVALID_SELECTION_REASONS.MISSING_RECT, {
        eventType,
        token: validation.token
      });
    }
    const fingerprint = createSelectionFingerprint(validation.token, selectionRect);
    const isDuplicate = dedupeState.lastFingerprint === fingerprint && nowMs - dedupeState.lastTriggeredAtMs < dedupeWindowMs;
    if (isDuplicate) {
      return createDuplicateLookupDecision({
        eventType,
        token: validation.token,
        fingerprint,
        lastTriggeredAtMs: dedupeState.lastTriggeredAtMs,
        dedupeWindowMs
      });
    }
    const nextDedupeState = {
      lastFingerprint: fingerprint,
      lastTriggeredAtMs: nowMs
    };
    const request = createLookupRequest({
      token: validation.token,
      rawText: validation.normalizedText,
      selectionRect,
      sourceEvent: eventType,
      requestId
    });
    return createValidLookupDecision(request, nextDedupeState);
  }
  function createSelectionDetectionController({
    eventTarget,
    getSnapshot = () => readSelectionSnapshot(globalThis.window),
    onLookupRequest,
    onInvalidSelection,
    onIgnoredDuplicate,
    debounceMs = DEFAULT_SELECTION_DEBOUNCE_MS,
    dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
    now = () => Date.now(),
    setTimer = (callback, timeout) => setTimeout(callback, timeout),
    clearTimer = (timerId) => clearTimeout(timerId)
  } = {}) {
    if (!eventTarget || typeof eventTarget.addEventListener !== "function" || typeof eventTarget.removeEventListener !== "function") {
      throw new Error("eventTarget with addEventListener/removeEventListener is required");
    }
    if (typeof onLookupRequest !== "function") {
      throw new Error("onLookupRequest callback is required");
    }
    let timerId = null;
    let started = false;
    let pendingEventType = null;
    let dedupeState = {
      lastFingerprint: null,
      lastTriggeredAtMs: 0
    };
    let nextRequestNumber = 1;
    const flush = () => {
      timerId = null;
      let snapshot;
      try {
        snapshot = getSnapshot();
      } catch (e) {
        onInvalidSelection == null ? void 0 : onInvalidSelection(
          createInvalidLookupDecision(INVALID_SELECTION_REASONS.INVALID_TOKEN, {
            eventType: pendingEventType,
            reasonCode: "snapshot-read-failed"
          })
        );
        return null;
      }
      const decision = buildLookupDecision({
        snapshot,
        eventType: pendingEventType,
        dedupeState,
        nowMs: now(),
        dedupeWindowMs,
        requestId: `lookup-${nextRequestNumber++}`
      });
      console.log("[VOCAB][selectionDetection] Decision:", decision);
      if (decision.status === LOOKUP_DECISION_STATUS.VALID) {
        dedupeState = decision.nextDedupeState;
        console.log("[VOCAB][selectionDetection] onLookupRequest called with:", decision.request);
        onLookupRequest(decision.request);
        return decision;
      }
      if (decision.status === LOOKUP_DECISION_STATUS.DUPLICATE) {
        onIgnoredDuplicate == null ? void 0 : onIgnoredDuplicate(decision);
        return decision;
      }
      onInvalidSelection == null ? void 0 : onInvalidSelection(decision);
      return decision;
    };
    const isRelevantKeyup = (event) => {
      const key = event == null ? void 0 : event.key;
      if (typeof key !== "string" || key.length === 0) {
        return true;
      }
      return [
        "Shift",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown"
      ].includes(key);
    };
    const handleInteraction = (event) => {
      var _a2;
      pendingEventType = (_a2 = event == null ? void 0 : event.type) != null ? _a2 : "unknown";
      if (pendingEventType === "keyup" && !isRelevantKeyup(event)) {
        return;
      }
      if (timerId !== null) {
        clearTimer(timerId);
      }
      timerId = setTimer(flush, debounceMs);
    };
    const start = () => {
      if (started) {
        return;
      }
      for (const eventType of SELECTION_EVENT_TYPES) {
        eventTarget.addEventListener(eventType, handleInteraction);
      }
      started = true;
    };
    const stop = () => {
      if (!started) {
        return;
      }
      for (const eventType of SELECTION_EVENT_TYPES) {
        eventTarget.removeEventListener(eventType, handleInteraction);
      }
      if (timerId !== null) {
        clearTimer(timerId);
        timerId = null;
      }
      started = false;
    };
    return {
      start,
      stop,
      flush,
      handleInteraction,
      getState: () => ({
        started,
        pendingEventType,
        dedupeState
      })
    };
  }

  // src/content/autoPopupLookupController.js
  function createAutoPopupLookupController({
    eventTarget,
    onLookupRequest,
    settingsStore,
    getSnapshot,
    onInvalidSelection,
    onIgnoredDuplicate,
    debounceMs,
    dedupeWindowMs,
    now,
    setTimer,
    clearTimer
  } = {}) {
    if (!settingsStore || typeof settingsStore.load !== "function") {
      throw new Error("settingsStore with load() is required");
    }
    const selectionController = createSelectionDetectionController({
      eventTarget,
      onLookupRequest,
      getSnapshot,
      onInvalidSelection,
      onIgnoredDuplicate,
      debounceMs,
      dedupeWindowMs,
      now,
      setTimer,
      clearTimer
    });
    let runtimeStarted = false;
    let autoPopupEnabled = true;
    let unsubscribeSettingsStore = null;
    const listeners = /* @__PURE__ */ new Set();
    const emit = () => {
      const payload = {
        autoPopupEnabled
      };
      for (const listener of listeners) {
        listener(payload);
      }
    };
    const applyAutoPopupEnabled = (enabled) => {
      autoPopupEnabled = Boolean(enabled);
      if (runtimeStarted) {
        if (autoPopupEnabled) {
          selectionController.start();
        } else {
          selectionController.stop();
        }
      }
      emit();
    };
    const start = async () => {
      if (runtimeStarted) {
        return;
      }
      runtimeStarted = true;
      try {
        const loadedSettings = await settingsStore.load();
        if (typeof settingsStore.subscribe === "function") {
          unsubscribeSettingsStore = settingsStore.subscribe((nextSettings) => {
            applyAutoPopupEnabled(nextSettings == null ? void 0 : nextSettings.autoPopupEnabled);
          });
        }
        applyAutoPopupEnabled(loadedSettings == null ? void 0 : loadedSettings.autoPopupEnabled);
      } catch (error) {
        runtimeStarted = false;
        unsubscribeSettingsStore == null ? void 0 : unsubscribeSettingsStore();
        unsubscribeSettingsStore = null;
        throw error;
      }
    };
    const stop = () => {
      if (!runtimeStarted) {
        return;
      }
      runtimeStarted = false;
      unsubscribeSettingsStore == null ? void 0 : unsubscribeSettingsStore();
      unsubscribeSettingsStore = null;
      selectionController.stop();
    };
    const setAutoPopupEnabled = async (enabled) => {
      var _a2, _b2;
      const nextValue = Boolean(enabled);
      if (typeof settingsStore.update === "function") {
        await settingsStore.update({ autoPopupEnabled: nextValue });
        return;
      }
      if (typeof settingsStore.save !== "function") {
        throw new Error("settingsStore must provide update() or save()");
      }
      const currentSettings = (_b2 = (_a2 = settingsStore.getSnapshot) == null ? void 0 : _a2.call(settingsStore)) != null ? _b2 : typeof settingsStore.load === "function" ? await settingsStore.load() : {};
      await settingsStore.save(__spreadProps(__spreadValues({}, currentSettings), {
        autoPopupEnabled: nextValue
      }));
    };
    const subscribe = (listener) => {
      if (typeof listener !== "function") {
        throw new Error("listener must be a function");
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    return {
      start,
      stop,
      setAutoPopupEnabled,
      subscribe,
      isAutoPopupEnabled: () => autoPopupEnabled,
      getState: () => ({
        runtimeStarted,
        autoPopupEnabled,
        selectionState: selectionController.getState()
      })
    };
  }

  // src/shared/userSettings.js
  var USER_SETTINGS_SCHEMA_VERSION = 1;
  var USER_SETTINGS_STORAGE_KEY = "user-settings";
  var DEFAULT_USER_SETTINGS = Object.freeze({
    schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
    autoPopupEnabled: true
  });
  function toBooleanOrNull(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return null;
  }
  function normalizeUserSettings(rawValue) {
    var _a2;
    if (rawValue == null) {
      return __spreadValues({}, DEFAULT_USER_SETTINGS);
    }
    if (typeof rawValue === "boolean") {
      return {
        schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
        autoPopupEnabled: rawValue
      };
    }
    if (typeof rawValue !== "object") {
      return __spreadValues({}, DEFAULT_USER_SETTINGS);
    }
    const normalizedAutoPopupEnabled = (_a2 = toBooleanOrNull(rawValue.autoPopupEnabled)) != null ? _a2 : DEFAULT_USER_SETTINGS.autoPopupEnabled;
    return {
      schemaVersion: USER_SETTINGS_SCHEMA_VERSION,
      autoPopupEnabled: normalizedAutoPopupEnabled
    };
  }
  function mergeUserSettings(currentSettings, patch) {
    const normalizedCurrent = normalizeUserSettings(currentSettings);
    if (!patch || typeof patch !== "object") {
      return normalizedCurrent;
    }
    return normalizeUserSettings(__spreadValues(__spreadValues({}, normalizedCurrent), patch));
  }

  // src/infrastructure/adapters/chromeStorageSettingsAdapter.js
  function isPromiseLike(value) {
    return !!value && typeof value.then === "function";
  }
  function isSameSettings(left, right) {
    return (left == null ? void 0 : left.schemaVersion) === (right == null ? void 0 : right.schemaVersion) && (left == null ? void 0 : left.autoPopupEnabled) === (right == null ? void 0 : right.autoPopupEnabled);
  }
  async function readFromStorageArea(storageArea, storageKey) {
    const maybePromise = storageArea.get(storageKey);
    if (isPromiseLike(maybePromise)) {
      const raw = await maybePromise;
      return raw == null ? void 0 : raw[storageKey];
    }
    return new Promise((resolve, reject) => {
      storageArea.get(storageKey, (raw) => {
        var _a2, _b2;
        const lastError = (_b2 = (_a2 = globalThis.chrome) == null ? void 0 : _a2.runtime) == null ? void 0 : _b2.lastError;
        if (lastError) {
          reject(lastError);
          return;
        }
        resolve(raw == null ? void 0 : raw[storageKey]);
      });
    });
  }
  async function writeToStorageArea(storageArea, storageKey, value) {
    const payload = {
      [storageKey]: value
    };
    const maybePromise = storageArea.set(payload);
    if (isPromiseLike(maybePromise)) {
      await maybePromise;
      return;
    }
    await new Promise((resolve, reject) => {
      storageArea.set(payload, () => {
        var _a2, _b2;
        const lastError = (_b2 = (_a2 = globalThis.chrome) == null ? void 0 : _a2.runtime) == null ? void 0 : _b2.lastError;
        if (lastError) {
          reject(lastError);
          return;
        }
        resolve();
      });
    });
  }
  function createChromeStorageSettingsAdapter({
    storageArea = ((_b2) => (_b2 = ((_a2) => (_a2 = globalThis.chrome) == null ? void 0 : _a2.storage)()) == null ? void 0 : _b2.local)(),
    storageChangeEvent = ((_d) => (_d = ((_c) => (_c = globalThis.chrome) == null ? void 0 : _c.storage)()) == null ? void 0 : _d.onChanged)(),
    storageKey = USER_SETTINGS_STORAGE_KEY,
    storageAreaName = "local",
    defaultSettings = DEFAULT_USER_SETTINGS
  } = {}) {
    var _a3;
    if (!storageArea || typeof storageArea.get !== "function" || typeof storageArea.set !== "function") {
      throw new Error("storageArea with get/set is required");
    }
    let currentSettings = normalizeUserSettings(defaultSettings);
    let initialized = false;
    let writeQueue = Promise.resolve();
    let pendingLocalWriteSettings = null;
    const listeners = /* @__PURE__ */ new Set();
    const emit = (settings, meta) => {
      for (const listener of listeners) {
        listener(settings, meta);
      }
    };
    const handleStorageChanged = (changes, areaName) => {
      if (areaName !== storageAreaName) {
        return;
      }
      const changed = changes == null ? void 0 : changes[storageKey];
      if (!changed) {
        return;
      }
      const nextSettings = normalizeUserSettings(changed.newValue);
      if (pendingLocalWriteSettings && isSameSettings(nextSettings, pendingLocalWriteSettings)) {
        pendingLocalWriteSettings = null;
        return;
      }
      if (isSameSettings(nextSettings, currentSettings)) {
        return;
      }
      currentSettings = nextSettings;
      initialized = true;
      emit(nextSettings, { source: "external-change" });
    };
    (_a3 = storageChangeEvent == null ? void 0 : storageChangeEvent.addListener) == null ? void 0 : _a3.call(storageChangeEvent, handleStorageChanged);
    const load = async () => {
      try {
        const rawSettings = await readFromStorageArea(storageArea, storageKey);
        currentSettings = normalizeUserSettings(rawSettings);
      } catch (e) {
        currentSettings = normalizeUserSettings(defaultSettings);
      }
      initialized = true;
      emit(currentSettings, { source: "load" });
      return currentSettings;
    };
    const save = async (nextSettings) => {
      const normalizedNextSettings = normalizeUserSettings(nextSettings);
      writeQueue = writeQueue.then(async () => {
        pendingLocalWriteSettings = normalizedNextSettings;
        await writeToStorageArea(storageArea, storageKey, normalizedNextSettings);
        currentSettings = normalizedNextSettings;
        initialized = true;
        emit(currentSettings, { source: "save" });
        return currentSettings;
      });
      return writeQueue;
    };
    const update = async (patch) => {
      const base = initialized ? currentSettings : await load();
      const merged = mergeUserSettings(base, patch);
      return save(merged);
    };
    const subscribe = (listener) => {
      if (typeof listener !== "function") {
        throw new Error("listener must be a function");
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const destroy = () => {
      var _a4;
      (_a4 = storageChangeEvent == null ? void 0 : storageChangeEvent.removeListener) == null ? void 0 : _a4.call(storageChangeEvent, handleStorageChanged);
    };
    return {
      load,
      save,
      update,
      subscribe,
      destroy,
      getSnapshot: () => normalizeUserSettings(currentSettings)
    };
  }

  // src/content/lookupFlowOrchestrator.js
  var POPUP_STATE = {
    IDLE: "idle",
    LOADING: "loading",
    SUCCESS: "success",
    NOT_FOUND: "not-found",
    ERROR: "error"
  };
  function createLookupFlowOrchestrator({
    lookupExecutor,
    onStateChange,
    telemetryRecorder,
    now = () => Date.now()
  } = {}) {
    if (typeof lookupExecutor !== "function") {
      throw new Error("lookupExecutor is required");
    }
    if (typeof onStateChange !== "function") {
      throw new Error("onStateChange is required");
    }
    let currentState = {
      status: POPUP_STATE.IDLE
    };
    let currentRunId = 0;
    const setState = (state) => {
      console.log("[VOCAB] Popup setState", state);
      currentState = state;
      onStateChange(state);
    };
    async function runLookup(request) {
      var _a2;
      const runId = ++currentRunId;
      const requestStartedAtMs = now();
      const loadingRenderedAtMs = now();
      const headword = request.payload.token;
      setState({
        status: POPUP_STATE.LOADING,
        headword,
        requestStartedAtMs,
        loadingRenderedAtMs,
        loadingLatencyMs: loadingRenderedAtMs - requestStartedAtMs
      });
      let result;
      try {
        console.log("[VOCAB] Call lookupExecutor", headword);
        result = await lookupExecutor({ headword });
        console.log("[VOCAB] lookupExecutor result", result);
      } catch (error) {
        result = {
          status: "error",
          error: {
            type: "unknown",
            message: error instanceof Error ? error.message : String(error)
          }
        };
      }
      const finishedAtMs = now();
      const loadingLatencyMs = loadingRenderedAtMs - requestStartedAtMs;
      if (typeof (telemetryRecorder == null ? void 0 : telemetryRecorder.recordLookupCompleted) === "function") {
        try {
          const maybePromise = telemetryRecorder.recordLookupCompleted({
            lookupResult: result,
            loadingLatencyMs,
            requestStartedAtMs,
            finishedAtMs
          });
          if (maybePromise && typeof maybePromise.catch === "function") {
            maybePromise.catch(() => {
            });
          }
        } catch (e) {
        }
      }
      if (runId !== currentRunId) {
        return {
          loadingLatencyMs,
          finalState: currentState
        };
      }
      if ((result == null ? void 0 : result.status) === "success") {
        setState({
          status: POPUP_STATE.SUCCESS,
          data: result.data
        });
      } else if ((result == null ? void 0 : result.status) === "not-found") {
        setState({
          status: POPUP_STATE.NOT_FOUND,
          data: result.data
        });
      } else {
        setState({
          status: POPUP_STATE.ERROR,
          error: (_a2 = result == null ? void 0 : result.error) != null ? _a2 : {
            type: "unknown",
            message: "unknown lookup error"
          }
        });
      }
      return {
        loadingLatencyMs,
        finalState: currentState
      };
    }
    return {
      runLookup,
      getState: () => currentState
    };
  }

  // src/content/popupController.js
  function createPopupController({
    eventTarget,
    popupElement,
    onClose,
    onOpen
  } = {}) {
    if (!eventTarget || typeof eventTarget.addEventListener !== "function" || typeof eventTarget.removeEventListener !== "function") {
      throw new Error("eventTarget with addEventListener/removeEventListener is required");
    }
    if (!popupElement || typeof popupElement.contains !== "function") {
      throw new Error("popupElement with contains() is required");
    }
    let opened = false;
    let previousActiveElement = null;
    const handleKeydown = (event) => {
      if ((event == null ? void 0 : event.key) === "Escape") {
        close("escape");
      }
    };
    const handlePointerDown = (event) => {
      const target = event == null ? void 0 : event.target;
      if (target && typeof target === "object" && !popupElement.contains(target)) {
        close("click-outside");
      }
    };
    function attachListeners() {
      eventTarget.addEventListener("keydown", handleKeydown);
      eventTarget.addEventListener("pointerdown", handlePointerDown);
    }
    function detachListeners() {
      eventTarget.removeEventListener("keydown", handleKeydown);
      eventTarget.removeEventListener("pointerdown", handlePointerDown);
    }
    function open() {
      var _a2;
      if (opened) {
        return;
      }
      opened = true;
      previousActiveElement = (_a2 = eventTarget.activeElement) != null ? _a2 : null;
      attachListeners();
      onOpen == null ? void 0 : onOpen();
    }
    function close(reason = "manual") {
      if (!opened) {
        return;
      }
      opened = false;
      detachListeners();
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
      onClose == null ? void 0 : onClose({ reason });
    }
    return {
      open,
      close,
      isOpen: () => opened
    };
  }

  // src/application/popupCopyCatalog.js
  var NOT_FOUND_COPY = {
    title: "Kh\xF4ng t\xECm th\u1EA5y k\u1EBFt qu\u1EA3",
    message: "T\u1EEB b\u1EA1n ch\u1ECDn ch\u01B0a c\xF3 d\u1EEF li\u1EC7u ph\xF9 h\u1EE3p trong ngu\u1ED3n hi\u1EC7n t\u1EA1i.",
    guidance: [
      "B\u1ECF d\u1EA5u c\xE2u \u1EDF \u0111\u1EA7u/cu\u1ED1i t\u1EEB.",
      "Ch\u1EC9 ch\u1ECDn m\u1ED9t t\u1EEB duy nh\u1EA5t.",
      "Th\u1EED l\u1EA1i v\u1EDBi d\u1EA1ng t\u1EEB g\u1ED1c (v\xED d\u1EE5: run thay v\xEC running)."
    ]
  };
  var ERROR_COPY_BY_TYPE = {
    [LOOKUP_ERROR_TYPE.RATE_LIMIT]: {
      title: "B\u1EA1n \u0111ang tra c\u1EE9u qu\xE1 nhanh",
      message: "H\u1EC7 th\u1ED1ng t\u1EA1m gi\u1EDBi h\u1EA1n truy v\u1EA5n \u0111\u1EC3 b\u1EA3o v\u1EC7 ngu\u1ED3n d\u1EEF li\u1EC7u. Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt gi\xE2y.",
      cta: "\u0110\u1EE3i r\u1ED3i th\u1EED l\u1EA1i"
    },
    [LOOKUP_ERROR_TYPE.NETWORK]: {
      title: "M\u1EA5t k\u1EBFt n\u1ED1i m\u1EA1ng",
      message: "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i \u0111\u1EBFn ngu\u1ED3n t\u1EEB \u0111i\u1EC3n l\xFAc n\xE0y.",
      cta: "Th\u1EED l\u1EA1i"
    },
    [LOOKUP_ERROR_TYPE.TIMEOUT]: {
      title: "Y\xEAu c\u1EA7u b\u1ECB qu\xE1 th\u1EDDi gian",
      message: "K\u1EBFt n\u1ED1i ch\u1EADm h\u01A1n ng\u01B0\u1EE1ng cho ph\xE9p. Vui l\xF2ng th\u1EED l\u1EA1i.",
      cta: "Th\u1EED l\u1EA1i"
    },
    [LOOKUP_ERROR_TYPE.PARSE]: {
      title: "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u t\u1EEB \u0111i\u1EC3n",
      message: "\u0110\u1ECBnh d\u1EA1ng d\u1EEF li\u1EC7u ngu\u1ED3n c\xF3 th\u1EC3 \u0111\xE3 thay \u0111\u1ED5i.",
      cta: "\u0110\xF3ng"
    },
    [LOOKUP_ERROR_TYPE.UNKNOWN]: {
      title: "\u0110\xE3 x\u1EA3y ra l\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh",
      message: "Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt.",
      cta: "Th\u1EED l\u1EA1i"
    },
    [LOOKUP_ERROR_TYPE.INVALID_TOKEN]: {
      title: "T\u1EEB \u0111\xE3 ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7",
      message: "H\xE3y ch\u1ECDn m\u1ED9t t\u1EEB ti\u1EBFng Anh h\u1EE3p l\u1EC7 r\u1ED3i th\u1EED l\u1EA1i.",
      cta: "\u0110\xF3ng"
    }
  };
  function getErrorCopyByType(errorType) {
    var _a2;
    const normalizedType = normalizeLookupErrorType(errorType);
    return (_a2 = ERROR_COPY_BY_TYPE[normalizedType]) != null ? _a2 : ERROR_COPY_BY_TYPE[LOOKUP_ERROR_TYPE.UNKNOWN];
  }

  // src/application/complianceDisclosureCatalog.js
  var PERMISSION_DISCLOSURE_ITEMS = [
    {
      permission: "activeTab",
      rationale: "Ch\u1EC9 \u0111\u1ECDc t\u1EEB b\u1EA1n ch\u1EE7 \u0111\u1ED9ng b\xF4i \u0111en tr\xEAn tab \u0111ang xem \u0111\u1EC3 kh\u1EDFi t\u1EA1o tra c\u1EE9u."
    },
    {
      permission: "scripting",
      rationale: "Ti\xEAm content script cho \u0111\xFAng tab \u0111ang d\xF9ng nh\u1EB1m b\u1EAFt selection v\xE0 hi\u1EC3n th\u1ECB popup."
    },
    {
      permission: "storage",
      rationale: "L\u01B0u c\xE0i \u0111\u1EB7t auto-popup v\xE0 telemetry \u1EA9n danh c\u1EE5c b\u1ED9 tr\xEAn tr\xECnh duy\u1EC7t."
    },
    {
      permission: "host:https://www.vocabulary.com/*",
      rationale: "G\u1EEDi y\xEAu c\u1EA7u tra c\u1EE9u t\u1EEB v\xE0 nh\u1EADn n\u1ED9i dung \u0111\u1ECBnh ngh\u0129a t\u1EEB ngu\u1ED3n \u0111\xE3 c\xF4ng b\u1ED1."
    }
  ];
  function normalizePermissionName(permission) {
    if (typeof permission !== "string") {
      return "";
    }
    return permission.trim();
  }
  function formatPermissionLabel(permission) {
    const normalized = normalizePermissionName(permission);
    if (!normalized) {
      return "";
    }
    if (normalized.startsWith("host:")) {
      return normalized;
    }
    return normalized;
  }
  function buildAttributionText() {
    return `<span style="display:inline-block;vertical-align:middle;">
    <span title='Ngu\u1ED3n d\u1EEF li\u1EC7u: Vocabulary.com (https://www.vocabulary.com/)' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><circle cx="10" cy="10" r="9" stroke="#888" stroke-width="2" fill="#f6f8fa"/><text x="10" y="15" text-anchor="middle" font-size="12" fill="#888" font-family="Arial, sans-serif">i</text></svg>
    </span>
    <span style="color:#888;font-size:12px;">Vocabulary.com</span>
  </span>`;
  }
  function buildPermissionDisclosureSummary() {
    const permissions = PERMISSION_DISCLOSURE_ITEMS.map((item) => formatPermissionLabel(item.permission));
    const fullText = `Quy\u1EC1n truy c\u1EADp: ${permissions.join(", ")}; ch\u1EC9 d\xF9ng cho tra c\u1EE9u t\u1EEB, l\u01B0u c\xE0i \u0111\u1EB7t, v\xE0 telemetry \u1EA9n danh c\u1EE5c b\u1ED9.`;
    return `<span style="display:inline-block;vertical-align:middle;">
    <span title='${fullText.replace(/'/g, "&apos;")}' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><path d="M10 2L17 5V10C17 14.4183 13.4183 18 9 18C4.58172 18 1 14.4183 1 10V5L10 2Z" stroke="#888" stroke-width="2" fill="#f6f8fa"/></svg>
    </span>
    <span style="color:#888;font-size:12px;">Quy\u1EC1n truy c\u1EADp</span>
  </span>`;
  }

  // src/content/popupRenderer.js
  function renderComplianceFooterContent() {
    return [
      { type: "attribution", value: buildAttributionText() },
      {
        type: "permission-disclosure",
        value: buildPermissionDisclosureSummary()
      }
    ];
  }
  function renderSuccessContent(viewModel) {
    var _a2, _b2, _c, _d;
    return [
      { type: "headword", value: (_a2 = viewModel == null ? void 0 : viewModel.headword) != null ? _a2 : "" },
      { type: "pronunciation", value: (_b2 = viewModel == null ? void 0 : viewModel.pronunciation) != null ? _b2 : "" },
      {
        type: "definition",
        value: (_d = (_c = viewModel == null ? void 0 : viewModel.definition) != null ? _c : viewModel == null ? void 0 : viewModel.mainDefinition) != null ? _d : ""
      },
      ...renderComplianceFooterContent()
    ];
  }
  function renderNotFoundContent(viewModel = {}) {
    var _a2, _b2;
    const guidance = Array.isArray(viewModel == null ? void 0 : viewModel.guidance) ? viewModel.guidance : NOT_FOUND_COPY.guidance;
    return [
      { type: "title", value: (_a2 = viewModel == null ? void 0 : viewModel.title) != null ? _a2 : NOT_FOUND_COPY.title },
      { type: "message", value: (_b2 = viewModel == null ? void 0 : viewModel.message) != null ? _b2 : NOT_FOUND_COPY.message },
      { type: "guidance-list", value: guidance },
      ...renderComplianceFooterContent()
    ];
  }
  function renderErrorContent(error = {}) {
    var _a2;
    const normalizedErrorType = normalizeLookupErrorType((_a2 = error == null ? void 0 : error.type) != null ? _a2 : error == null ? void 0 : error.errorType);
    const copy = getErrorCopyByType(normalizedErrorType);
    return [
      { type: "title", value: copy.title },
      { type: "message", value: copy.message },
      { type: "cta", value: copy.cta },
      ...renderComplianceFooterContent()
    ];
  }

  // src/application/popupViewModelMapper.js
  function normalizeDefinitions(definitions) {
    if (!Array.isArray(definitions)) {
      return [];
    }
    return definitions.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }
  function mapParsedPayloadToPopupViewModel(parsedPayload) {
    var _a2, _b2, _c;
    const headword = ((_a2 = parsedPayload == null ? void 0 : parsedPayload.headword) != null ? _a2 : "").trim();
    const pronunciation = (_b2 = parsedPayload == null ? void 0 : parsedPayload.pronunciation) != null ? _b2 : "";
    const definitions = normalizeDefinitions(parsedPayload == null ? void 0 : parsedPayload.definitions);
    const mainDefinition = (_c = definitions[0]) != null ? _c : "";
    if (!headword || !mainDefinition) {
      return {
        state: "not-found",
        orderedFields: ["title", "message", "guidance"],
        title: NOT_FOUND_COPY.title,
        message: NOT_FOUND_COPY.message,
        guidance: [...NOT_FOUND_COPY.guidance]
      };
    }
    return {
      state: "success",
      orderedFields: ["headword", "pronunciation", "definition"],
      headword,
      pronunciation,
      definition: mainDefinition,
      mainDefinition
    };
  }
  function mapLookupErrorToPopupViewModel(error = {}) {
    var _a2;
    const normalizedErrorType = normalizeLookupErrorType((_a2 = error == null ? void 0 : error.type) != null ? _a2 : error == null ? void 0 : error.errorType);
    const copy = getErrorCopyByType(normalizedErrorType);
    return {
      state: "error",
      orderedFields: ["title", "message", "cta"],
      type: normalizedErrorType,
      errorType: normalizedErrorType,
      title: copy.title,
      message: copy.message,
      cta: copy.cta
    };
  }
  function mapLookupResultToPopupViewModel(lookupResult) {
    var _a2, _b2, _c, _d;
    if ((lookupResult == null ? void 0 : lookupResult.status) === "success") {
      return mapParsedPayloadToPopupViewModel((_c = (_b2 = (_a2 = lookupResult == null ? void 0 : lookupResult.data) == null ? void 0 : _a2.parsedPayload) != null ? _b2 : lookupResult == null ? void 0 : lookupResult.data) != null ? _c : {});
    }
    if ((lookupResult == null ? void 0 : lookupResult.status) === "not-found") {
      return {
        state: "not-found",
        orderedFields: ["title", "message", "guidance"],
        title: NOT_FOUND_COPY.title,
        message: NOT_FOUND_COPY.message,
        guidance: [...NOT_FOUND_COPY.guidance]
      };
    }
    return mapLookupErrorToPopupViewModel((_d = lookupResult == null ? void 0 : lookupResult.error) != null ? _d : {});
  }

  // src/content/runtimeContentScript.js
  async function bootstrapContentRuntime({
    chromeApi = globalThis.chrome,
    windowObj = globalThis.window,
    documentObj = globalThis.document
  } = {}) {
    var _a2, _b2, _c, _d;
    if (globalThis.__vocabularyExtensionContentRuntimeStarted) {
      return {
        started: true,
        dispose: () => {
        }
      };
    }
    if (!((_a2 = chromeApi == null ? void 0 : chromeApi.runtime) == null ? void 0 : _a2.sendMessage) || !((_b2 = chromeApi == null ? void 0 : chromeApi.runtime) == null ? void 0 : _b2.getURL) || !documentObj) {
      return {
        started: false,
        dispose: () => {
        }
      };
    }
    const settingsStore = createChromeStorageSettingsAdapter({
      storageArea: (_c = chromeApi.storage) == null ? void 0 : _c.local,
      storageChangeEvent: (_d = chromeApi.storage) == null ? void 0 : _d.onChanged
    });
    let popupElement = null;
    let popupCtrl = null;
    let orchestrator = null;
    function removePopup() {
      if (popupElement && popupElement.parentNode) {
        popupElement.parentNode.removeChild(popupElement);
        popupElement = null;
        popupCtrl = null;
        console.log("[VOCAB] Popup removed from DOM");
      }
    }
    function createPopup() {
      if (popupElement)
        return popupElement;
      popupElement = documentObj.createElement("div");
      popupElement.className = "vocab-popup";
      popupElement.style.position = "absolute";
      popupElement.style.zIndex = 2147483647;
      popupElement.style.background = "#fff";
      popupElement.style.boxShadow = "0 2px 12px rgba(0,0,0,0.18)";
      popupElement.style.borderRadius = "10px";
      popupElement.style.padding = "12px";
      popupElement.style.maxWidth = "380px";
      popupElement.style.minWidth = "200px";
      popupElement.style.fontFamily = "inherit";
      popupElement.style.fontSize = "16px";
      popupElement.style.color = "#222";
      popupElement.style.transition = "opacity 0.15s";
      popupElement.tabIndex = -1;
      popupElement.setAttribute("role", "dialog");
      popupElement.setAttribute("aria-live", "polite");
      ["mousedown", "mouseup", "click", "dblclick", "contextmenu"].forEach((evt) => {
        popupElement.addEventListener(evt, (e) => e.stopPropagation());
      });
      documentObj.body.appendChild(popupElement);
      console.log("[VOCAB] Popup inserted into DOM");
      return popupElement;
    }
    function renderPopupContent(state, selectionRect) {
      if (!popupElement)
        return;
      let viewModel = null;
      let content = [];
      if (state.status === "success" || state.status === "not-found" || state.status === "error") {
        viewModel = mapLookupResultToPopupViewModel(state);
        if (state.status === "success") {
          content = renderSuccessContent(viewModel);
        } else if (state.status === "not-found") {
          content = renderNotFoundContent(viewModel);
        } else {
          content = renderErrorContent(state.error);
        }
      } else if (state.status === "loading") {
        content = [{ type: "message", value: "\u0110ang tra c\u1EE9u..." }];
      } else {
        content = [];
      }
      popupElement.innerHTML = content.map((item) => {
        if (item.type === "headword") {
          const cap = typeof item.value === "string" && item.value.length > 0 ? item.value.charAt(0).toUpperCase() + item.value.slice(1) : item.value;
          return `<p style="font-size:30px;font-weight:700;margin:0 0 8px;color:#1677C9;">${cap}</p>`;
        }
        if (item.type === "pronunciation")
          return `<div style="color:#4B5563;font-size:14px;margin-bottom:10px;">${item.value}</div>`;
        if (item.type === "definition")
          return `<p style="font-size:15px;line-height:1.5;margin:10px 0;">${item.value}</p>`;
        if (item.type === "title")
          return `<div style="font-weight:bold;">${item.value}</div>`;
        if (item.type === "message")
          return `<div>${item.value}</div>`;
        if (item.type === "guidance-list")
          return `<ul style="margin:8px 0;">${item.value.map((g) => `<li>${g}</li>`).join("")}</ul>`;
        if (item.type === "cta")
          return `<div style="margin-top:8px;"><button>${item.value}</button></div>`;
        if (item.type === "attribution")
          return `<div style="margin-top:12px;">${item.value}</div>`;
        if (item.type === "permission-disclosure")
          return `<div style="font-size:12px;margin-top:4px;">${item.value}</div>`;
        return "";
      }).join("");
      if (selectionRect) {
        const popupWidth = popupElement.offsetWidth;
        const popupHeight = popupElement.offsetHeight;
        const viewport = {
          width: windowObj.innerWidth,
          height: windowObj.innerHeight,
          scrollX: windowObj.scrollX,
          scrollY: windowObj.scrollY
        };
        let left = selectionRect.left + viewport.scrollX;
        let top = selectionRect.bottom + viewport.scrollY + 8;
        if (top + popupHeight > viewport.scrollY + viewport.height) {
          const aboveTop = selectionRect.top + viewport.scrollY - popupHeight - 8;
          if (aboveTop >= viewport.scrollY) {
            top = aboveTop;
          } else {
            top = viewport.scrollY + viewport.height - popupHeight - 8;
          }
        }
        if (left + popupWidth > viewport.scrollX + viewport.width) {
          left = viewport.scrollX + viewport.width - popupWidth - 8;
        }
        if (left < viewport.scrollX)
          left = viewport.scrollX + 8;
        popupElement.style.left = `${left}px`;
        popupElement.style.top = `${top}px`;
        popupElement.style.maxWidth = `${Math.min(380, viewport.width - 16)}px`;
      }
    }
    function showPopup(state, selectionRect) {
      createPopup();
      renderPopupContent(state, selectionRect);
      if (!popupCtrl) {
        popupCtrl = createPopupController({
          eventTarget: documentObj,
          popupElement,
          onClose: ({ reason }) => {
            removePopup();
            console.log("[VOCAB] Popup closed", reason);
          },
          onOpen: () => {
            popupElement.focus();
          }
        });
      }
      popupCtrl.open();
    }
    orchestrator = createLookupFlowOrchestrator({
      lookupExecutor: async ({ headword }) => {
        console.log("[VOCAB] lookupExecutor received headword:", headword);
        if (!headword || typeof headword !== "string" || !/^\w+$/.test(headword)) {
          console.log("[VOCAB] lookupExecutor: invalid or empty headword");
          return {
            status: "error",
            error: { type: "invalid-token", message: "headword token is required" }
          };
        }
        return new Promise((resolve) => {
          chromeApi.runtime.sendMessage({ type: "LOOKUP_REQUEST", payload: { token: headword } }, (response) => {
            console.log("[VOCAB] lookupExecutor got response:", response);
            resolve(response);
          });
        });
      },
      onStateChange: (state) => {
        console.log("[VOCAB] orchestrator onStateChange:", state);
        if (state.status === "success" || state.status === "not-found" || state.status === "error" || state.status === "loading") {
          const selection = readSelectionSnapshot(windowObj);
          showPopup(state, selection.rect);
        } else if (state.status === "idle") {
          removePopup();
        }
      }
    });
    const autoPopupController = createAutoPopupLookupController({
      eventTarget: documentObj,
      settingsStore,
      getSnapshot: () => readSelectionSnapshot(windowObj),
      onLookupRequest: (request) => {
        orchestrator.runLookup(request);
        console.log("[VOCAB] onLookupRequest", request);
      }
    });
    await autoPopupController.start();
    console.log("[VOCAB] Content script started");
    globalThis.__vocabularyExtensionContentRuntimeStarted = true;
    return {
      started: true,
      dispose: () => {
        var _a3;
        autoPopupController.stop();
        (_a3 = settingsStore.destroy) == null ? void 0 : _a3.call(settingsStore);
        removePopup();
        globalThis.__vocabularyExtensionContentRuntimeStarted = false;
      }
    };
  }
  var _a, _b;
  if ((_b = (_a = globalThis.chrome) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) {
    bootstrapContentRuntime().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[vocabulary-extension] content runtime bootstrap failed:", message);
    });
  }
})();
//# sourceMappingURL=runtimeContentScript.js.map
