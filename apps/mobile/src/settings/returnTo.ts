/**
 * Where an add-wallet flow lands when it completes.
 *
 * One route serves Settings → Accounts → Add and Wallets → Add wallet, so the
 * entry point says where completion belongs instead of the panel guessing.
 * Its own module, with no imports, so it can be read without pulling the whole
 * shared barrel behind it.
 */
export function resolveReturnTo(returnTo: string | undefined): '/wallets' | '/' {
  return returnTo === 'wallets' ? '/wallets' : '/';
}
