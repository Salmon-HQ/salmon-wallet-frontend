/**
 * The running app's version, as a single source of truth.
 *
 * The extension replaces `__APP_VERSION__` at build time with its own
 * package.json version — see the `define` block in
 * `apps/extension/wxt.config.ts`. Mobile does not
 * go through Vite and reads `app.json` directly in `apps/mobile/index.js`.
 *
 * The guard keeps this importable from vitest and any other context that does
 * not run the define, where the constant is genuinely unknown rather than some
 * stale literal — a wrong version is worse than an absent one, because the
 * backend now records anything non-semver as empty instead of trusting it.
 */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '';
