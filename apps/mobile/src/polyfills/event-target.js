/**
 * Provides the EventTarget and CustomEvent globals React Native omits.
 *
 * Verified on RN 0.83.6: neither `globalThis.EventTarget` nor
 * `globalThis.CustomEvent` is defined. Metro already resolves every
 * @solana/* package to its `.native.mjs` build, and those builds capture
 * `var t = globalThis.EventTarget` at module scope, then `new t()` when a
 * subscription opens. With `t` undefined, Hermes throws
 * "Cannot read property 'prototype' of undefined" — which surfaced as
 * signature confirmation failing *after* the transaction had already landed.
 *
 * Pass-through dispatch is the load-bearing detail. @solana/subscribable's
 * data publisher gates on `ev instanceof CustomEvent` before reading
 * `ev.detail`, so dispatchEvent has to hand listeners the very object it was
 * given. Wrapping implementations (event-target-shim, which ships with React
 * Native) fail that check silently: subscribers still fire, but always with
 * `undefined` data.
 *
 * Feature-detected as a pair: this becomes a no-op the moment React Native
 * ships both globals, and installing only one risks pairing a real
 * EventTarget with a polyfilled CustomEvent it would reject.
 *
 * Scope is deliberately the subset @solana/kit uses: `once` and `signal`
 * listener options, no capture phase, no bubbling, no event.target.
 */
class PolyfilledCustomEvent {
  constructor(type, init) {
    this.type = String(type);
    this.detail = init ? init.detail : undefined;
  }
}

class PolyfilledEventTarget {
  constructor() {
    // type -> Map<listener, once>. A Map keyed by listener gives the spec's
    // "adding an identical listener twice is a no-op" for free.
    this._listenersByType = new Map();
  }

  addEventListener(type, listener, options) {
    if (!listener) {
      return;
    }
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.signal) {
      if (opts.signal.aborted) {
        return;
      }
      opts.signal.addEventListener('abort', () => this.removeEventListener(type, listener));
    }
    let listeners = this._listenersByType.get(type);
    if (!listeners) {
      listeners = new Map();
      this._listenersByType.set(type, listeners);
    }
    listeners.set(listener, Boolean(opts.once));
  }

  removeEventListener(type, listener) {
    const listeners = this._listenersByType.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  dispatchEvent(event) {
    const listeners = this._listenersByType.get(event.type);
    if (!listeners) {
      return true;
    }
    // Snapshot: listeners routinely unsubscribe themselves mid-dispatch.
    for (const [listener, once] of Array.from(listeners)) {
      if (once) {
        listeners.delete(listener);
      }
      const handler = typeof listener === 'function' ? listener : listener.handleEvent;
      handler.call(this, event);
    }
    return true;
  }
}

function installEventTargetPolyfill(scope = globalThis) {
  if (typeof scope.EventTarget === 'function' && typeof scope.CustomEvent === 'function') {
    return false;
  }

  scope.EventTarget = PolyfilledEventTarget;
  scope.CustomEvent = PolyfilledCustomEvent;

  return true;
}

module.exports = { installEventTargetPolyfill };
