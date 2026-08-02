/**
 * Guards the AbortSignal gap fill against React Native's abort-controller@3
 * polyfill, which is what ships on RN 0.83 and lacks every static and instance
 * member @solana/kit's subscription machinery uses.
 */
const { AbortController, AbortSignal } = require('abort-controller/dist/abort-controller');
const { installAbortSignalGapFill } = require('../src/polyfills/abort-signal');

describe('installAbortSignalGapFill', () => {
  let scope;

  beforeEach(() => {
    // A fresh class per test, so patching one does not leak into the next.
    class TestAbortSignal extends AbortSignal {}
    class TestAbortController extends AbortController {
      get signal() {
        const signal = super.signal;
        Object.setPrototypeOf(signal, TestAbortSignal.prototype);
        return signal;
      }
    }
    scope = { AbortSignal: TestAbortSignal, AbortController: TestAbortController };
  });

  it('documents the RN 0.83 baseline it exists to fix', () => {
    expect(typeof AbortSignal.timeout).toBe('undefined');
    expect(typeof AbortSignal.any).toBe('undefined');
    expect(typeof AbortSignal.prototype.throwIfAborted).toBe('undefined');
  });

  it('installs timeout, abort, any and throwIfAborted', () => {
    expect(installAbortSignalGapFill(scope)).toBe(true);

    expect(typeof scope.AbortSignal.timeout).toBe('function');
    expect(typeof scope.AbortSignal.abort).toBe('function');
    expect(typeof scope.AbortSignal.any).toBe('function');
    expect(typeof scope.AbortSignal.prototype.throwIfAborted).toBe('function');
  });

  it('aborts a timeout signal with a TimeoutError reason', async () => {
    installAbortSignalGapFill(scope);

    const signal = scope.AbortSignal.timeout(1);
    expect(signal.aborted).toBe(false);

    await new Promise((resolve) => signal.addEventListener('abort', resolve));

    expect(signal.aborted).toBe(true);
    expect(signal.reason.name).toBe('TimeoutError');
    expect(() => signal.throwIfAborted()).toThrow('The operation was aborted due to timeout');
  });

  it('propagates the first aborting signal through any()', () => {
    installAbortSignalGapFill(scope);

    const controller = new scope.AbortController();
    const combined = scope.AbortSignal.any([controller.signal, new scope.AbortController().signal]);
    expect(combined.aborted).toBe(false);

    const reason = new Error('cancelled');
    controller.signal.reason = reason;
    controller.abort();

    expect(combined.aborted).toBe(true);
    expect(combined.reason).toBe(reason);
  });

  it('short-circuits any() when a signal is already aborted', () => {
    installAbortSignalGapFill(scope);

    const controller = new scope.AbortController();
    controller.abort();

    expect(scope.AbortSignal.any([controller.signal]).aborted).toBe(true);
  });

  it('does nothing on a runtime that already implements timeout', () => {
    const native = { AbortSignal: { timeout: () => null }, AbortController: class {} };

    expect(installAbortSignalGapFill(native)).toBe(false);
    expect(typeof native.AbortSignal.any).toBe('undefined');
  });

  it('throwIfAborted is a no-op while the signal is live', () => {
    installAbortSignalGapFill(scope);

    expect(() => new scope.AbortController().signal.throwIfAborted()).not.toThrow();
  });
});
