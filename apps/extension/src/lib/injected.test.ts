/**
 * @vitest-environment jsdom
 *
 * The injected script is the only code Salmon runs in page scope, so what it
 * defines on `window` is a security surface: a page that could redefine
 * `window.salmon` could impersonate the wallet.
 *
 * Lives here rather than beside the entrypoint because wxt treats every file
 * under `src/entrypoints/` as an entrypoint, and a second "injected" one fails
 * the build.
 *
 * Page-scope *hygiene* (no `globalThis.Buffer`, no `globalThis.process`) is
 * asserted on the built artifact instead of here — under Vitest `@solana/kit`
 * resolves through its node entry, which drags a `Buffer`-dependent websocket
 * transport that the browser build tree-shakes away.
 */
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  const injected = await import('../entrypoints/injected');
  await injected.default.main();
});

describe('injected entrypoint', () => {
  it('exposes the provider as window.salmon', () => {
    expect(typeof (window as unknown as { salmon?: object }).salmon).toBe('object');
  });

  it('aliases the provider as window.solana for legacy dApps', () => {
    const scope = window as unknown as { salmon?: object; solana?: object };
    expect(scope.solana).toBe(scope.salmon);
  });

  it('keeps both handles non-writable and non-configurable', () => {
    for (const key of ['salmon', 'solana']) {
      const descriptor = Object.getOwnPropertyDescriptor(window, key);
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    }
  });
});
