import { cloneHostEvent } from '../core/host-events.js';

const DEFAULT_EVENT_NAME = 'thatbutton:host-event';

function createEmitResult(overrides) {
  return {
    accepted: true,
    reason: 'emitted',
    ...overrides
  };
}

export function createBrowserHostBridge({
  window: browserWindow = null,
  eventName = DEFAULT_EVENT_NAME,
  dispatchBrowserEvent = false,
  captureEvents = false,
  sink = null
} = {}) {
  const capturedEvents = [];

  function emit(event) {
    let normalizedEvent;
    try {
      normalizedEvent = cloneHostEvent(event);
    } catch (error) {
      return createEmitResult({
        accepted: false,
        reason: 'invalid_event',
        error: error.message
      });
    }

    if (captureEvents) {
      capturedEvents.push(normalizedEvent);
    }

    if (sink !== null && typeof sink !== 'function') {
      return createEmitResult({
        accepted: false,
        reason: 'invalid_sink',
        event: normalizedEvent
      });
    }

    if (typeof sink === 'function') {
      try {
        sink(normalizedEvent);
      } catch (error) {
        return createEmitResult({
          accepted: false,
          reason: 'sink_failed',
          error: error.message,
          event: normalizedEvent
        });
      }
    }

    if (dispatchBrowserEvent && browserWindow?.CustomEvent && browserWindow?.dispatchEvent) {
      browserWindow.dispatchEvent(new browserWindow.CustomEvent(eventName, {
        detail: normalizedEvent
      }));
    }

    return createEmitResult({
      event: normalizedEvent,
      captured: captureEvents
    });
  }

  function getEvents() {
    return capturedEvents.map((event) => cloneHostEvent(event));
  }

  function clearEvents() {
    capturedEvents.length = 0;
  }

  return {
    emit,
    getEvents,
    clearEvents
  };
}

export function createNoopHostBridge() {
  return createBrowserHostBridge();
}

export function createCaptureHostBridge(options = {}) {
  return createBrowserHostBridge({
    ...options,
    captureEvents: true
  });
}
