function cloneEvent(event) {
  if (typeof structuredClone === 'function') {
    return structuredClone(event);
  }

  return JSON.parse(JSON.stringify(event));
}

export function createInMemoryTelemetryStore({ initialEvents = [] } = {}) {
  let events = Array.isArray(initialEvents) ? initialEvents.map((event) => cloneEvent(event)) : [];

  return {
    append(event) {
      const cloned = cloneEvent(event);
      events.push(cloned);
      return cloned;
    },
    list() {
      return events.map((event) => cloneEvent(event));
    },
    clear() {
      events = [];
    },
  };
}
