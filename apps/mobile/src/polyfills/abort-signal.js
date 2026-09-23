/**
 * Fills the gaps in React Native's AbortSignal polyfill.
 *
 * React Native's setUpXHR.js unconditionally replaces global.AbortSignal with
 * abort-controller@3.0.0, which predates most of the current spec. Verified on
 * RN 0.83.6: AbortSignal.timeout, AbortSignal.abort, AbortSignal.any and
 * signal.throwIfAborted are all undefined, and signals carry no `reason`.
 *
 * @solana/kit's RPC subscription machinery uses every one of those, so signature
 * confirmation for signed proposals and NFT burns throws "AbortSignal.timeout is not a
 * function" on mobile without this.
 *
 * Each member is feature-detected on its own: Expo's runtime (SDK 56+) patches
 * `timeout` and `any` onto the same abort-controller and nothing else, so the
 * presence of one member says nothing about the rest. This becomes a no-op the
 * moment every member exists. DOMException is not assumed to exist on Hermes,
 * so aborts carry a plain Error with the spec's `name`, which is what callers
 * branch on.
 */
function installAbortSignalGapFill(scope = globalThis) {
  const AbortSignalCtor = scope.AbortSignal;
  if (!AbortSignalCtor) {
    return false;
  }
  let installed = false;
  const fill = (target, name, value) => {
    if (typeof target[name] === 'function') return;
    target[name] = value;
    installed = true;
  };

  const abortError = (message, name) => {
    const error = new Error(message);
    error.name = name;
    return error;
  };

  // abort-controller@3's abort() takes no reason, so it is attached directly.
  const abortWith = (controller, reason) => {
    controller.signal.reason = reason;
    controller.abort();
  };

  const signalWith = (reason, delayMs) => {
    const controller = new scope.AbortController();
    if (delayMs === undefined) {
      abortWith(controller, reason);
    } else {
      setTimeout(() => abortWith(controller, reason), delayMs);
    }
    return controller.signal;
  };

  fill(AbortSignalCtor, 'timeout', (ms) =>
    signalWith(abortError('The operation was aborted due to timeout', 'TimeoutError'), ms)
  );

  fill(AbortSignalCtor, 'abort', (reason) =>
    signalWith(
      reason === undefined ? abortError('The operation was aborted', 'AbortError') : reason
    )
  );

  fill(AbortSignalCtor, 'any', (signals) => {
    const controller = new scope.AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        abortWith(controller, signal.reason);
        break;
      }
      signal.addEventListener('abort', () => abortWith(controller, signal.reason));
    }
    return controller.signal;
  });

  fill(AbortSignalCtor.prototype, 'throwIfAborted', function throwIfAborted() {
    if (this.aborted) {
      throw this.reason === undefined
        ? abortError('The operation was aborted', 'AbortError')
        : this.reason;
    }
  });

  return installed;
}

module.exports = { installAbortSignalGapFill };
