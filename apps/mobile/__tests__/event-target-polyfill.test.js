/**
 * Guards the EventTarget/CustomEvent polyfill that React Native omits entirely
 * on RN 0.83, and specifically the pass-through dispatch @solana/subscribable
 * depends on.
 */
const { installEventTargetPolyfill } = require('../src/polyfills/event-target');

describe('installEventTargetPolyfill', () => {
  let scope;

  beforeEach(() => {
    scope = {};
    installEventTargetPolyfill(scope);
  });

  it('is a no-op when both globals already exist', () => {
    const native = { EventTarget: function () {}, CustomEvent: function () {} };
    expect(installEventTargetPolyfill(native)).toBe(false);
    expect(native.EventTarget).not.toBe(scope.EventTarget);
  });

  it('installs both globals when they are missing', () => {
    expect(installEventTargetPolyfill({})).toBe(true);
    expect(typeof scope.EventTarget).toBe('function');
    expect(typeof scope.CustomEvent).toBe('function');
  });

  // The regression that made signature confirmation fail: @solana/subscribable
  // reads ev.detail only when `ev instanceof CustomEvent`, so a wrapping
  // dispatch delivers every subscription message as undefined.
  it('hands listeners the dispatched event itself, not a wrapper', () => {
    const target = new scope.EventTarget();
    const event = new scope.CustomEvent('message', { detail: { slot: 42 } });
    const received = [];

    target.addEventListener('message', (ev) => received.push(ev));
    target.dispatchEvent(event);

    expect(received).toEqual([event]);
    expect(received[0] instanceof scope.CustomEvent).toBe(true);
    expect(received[0].detail).toEqual({ slot: 42 });
  });

  it('only notifies listeners registered for the dispatched type', () => {
    const target = new scope.EventTarget();
    const listener = jest.fn();

    target.addEventListener('message', listener);
    target.dispatchEvent(new scope.CustomEvent('error'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('removes listeners on removeEventListener and after a once dispatch', () => {
    const target = new scope.EventTarget();
    const removed = jest.fn();
    const once = jest.fn();

    target.addEventListener('message', removed);
    target.removeEventListener('message', removed);
    target.addEventListener('message', once, { once: true });

    target.dispatchEvent(new scope.CustomEvent('message'));
    target.dispatchEvent(new scope.CustomEvent('message'));

    expect(removed).not.toHaveBeenCalled();
    expect(once).toHaveBeenCalledTimes(1);
  });

  it('honours the signal listener option', () => {
    const target = new scope.EventTarget();
    const controller = new AbortController();
    const listener = jest.fn();

    target.addEventListener('message', listener, { signal: controller.signal });
    target.dispatchEvent(new scope.CustomEvent('message'));
    controller.abort();
    target.dispatchEvent(new scope.CustomEvent('message'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('survives a listener that unsubscribes during dispatch', () => {
    const target = new scope.EventTarget();
    const second = jest.fn();
    const first = () => target.removeEventListener('message', second);

    target.addEventListener('message', first);
    target.addEventListener('message', second);
    target.dispatchEvent(new scope.CustomEvent('message'));

    expect(second).toHaveBeenCalledTimes(1);
  });
});
