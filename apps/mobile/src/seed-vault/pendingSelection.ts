/**
 * The Seed Vault account picked during onboarding, waiting for the password
 * screen. Held in memory, never in route params: a deep link can set route
 * params, and a planted address there would become the new wallet.
 */
export interface SeedVaultSelection {
  authToken: string;
  derivationPath: string;
  address: string;
}

let pending: SeedVaultSelection | null = null;

export function setPendingSeedVaultSelection(selection: SeedVaultSelection | null): void {
  pending = selection;
}

export function getPendingSeedVaultSelection(): SeedVaultSelection | null {
  return pending;
}
