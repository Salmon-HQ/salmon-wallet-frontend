/**
 * One add-wallet screen, two entry points (FR-004).
 *
 * Settings → Accounts → Add and Wallets → Add wallet both push
 * `/settings/account-add`; the only thing that differs is where the finished
 * flow lands, and that is `returnTo`. A second implementation is what this
 * guards against — the two used to be the same panel reached through two
 * different surfaces, and the wallet switcher's version threw the user into
 * settings for a flow that had nothing to do with it.
 */
import { resolveReturnTo } from '../src/settings/returnTo';

describe('add-wallet shared route', () => {
  it('lands back on Wallets when Wallets opened it', () => {
    expect(resolveReturnTo('wallets')).toBe('/wallets');
  });

  it('lands on Home otherwise — the wallet it just created is already active', () => {
    expect(resolveReturnTo(undefined)).toBe('/');
    expect(resolveReturnTo('settings')).toBe('/');
  });
});
