# Contract: the shared rule and the setting (spec 045)

Everything in this file lives in `packages/shared`. The twins never decide whether Bitcoin is shown; they read these.

## `utils/network.ts`

```ts
/** False only for a Bitcoin network while the user chose "Solana only". */
export function isNetworkChosen(networkId: string, bitcoinEnabled: boolean): boolean;

export interface VisibleNetworkIdsParams {
  enabled: string[];
  held?: string[];
  developerNetworks: boolean;
  activeNetworkId?: string | null;
  /** The user's Bitcoin choice; omitted means on. */
  bitcoinEnabled?: boolean;
}
```

Test vectors (`network.test.ts`, written first):

| #   | Input                                                                                   | Expected                                 |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | `isNetworkChosen('bitcoin-mainnet', false)`                                             | `false`                                  |
| 2   | `isNetworkChosen('bitcoin-testnet', false)`                                             | `false`                                  |
| 3   | `isNetworkChosen('solana-mainnet', false)`, `('ethereum-mainnet', false)`               | `true`                                   |
| 4   | `isNetworkChosen(any, true)`                                                            | `true`                                   |
| 5   | `visibleNetworkIds` with all six ids enabled and held, dev off, `bitcoinEnabled: false` | `['solana-mainnet', 'ethereum-mainnet']` |
| 6   | as 5, dev **on**                                                                        | the six minus both Bitcoin ids           |
| 7   | as 5, `activeNetworkId: 'bitcoin-mainnet'`                                              | no Bitcoin id                            |
| 8   | `bitcoinEnabled` omitted or `true`                                                      | every existing vector unchanged          |
| 9   | `bitcoinEnabled: true`, backend did not enable `bitcoin-mainnet`                        | no `bitcoin-mainnet` (choice never adds) |

## `hooks/useUserConfig.ts`

```ts
// UseUserConfigResult gains
bitcoinEnabled: boolean; // record.bitcoinEnabled !== false
setBitcoinEnabled: (enabled: boolean, options?: ToggleDeveloperNetworksOptions) => Promise<void>;

/** The onboarding step's write: through the same queue, seen by every mounted instance. */
export function saveBitcoinChoice(enabled: boolean): Promise<void>;
```

- `setBitcoinEnabled(false, { activeNetworkId, changeNetwork })`: when `isNetworkChosen(activeNetworkId, false)` is false, awaits `changeNetwork('solana-mainnet')`, then `commit(() => ({ bitcoinEnabled: false }))`. `setBitcoinEnabled(true)` never moves the session.
- `persistPatch(patch, from?)`: after `setItem`, calls every registered listener except `from` with the merged record. Each instance registers its `applyConfig` in an effect and removes it on unmount; `commit` passes it as `from`.

## `hooks/useAvailableNetworks.ts`

Reads `bitcoinEnabled` from its own `useUserConfig` instance (live through the listener) and passes it to `visibleNetworkIds` for each chain. No new parameter.

## `contexts/DeveloperModeContext.tsx`

```ts
// DeveloperModeContextValue gains
bitcoinEnabled: boolean; // default true
setBitcoinEnabled: (enabled: boolean, options?: ToggleDeveloperNetworksOptions) => Promise<void>;
```

The provider moves the session to `solana-mainnet` (via `useAccountsContext()[1].changeNetwork`) when the record has loaded, the choice is off and `networkId` is not chosen. Runs once per such state, not on every render.

## `hooks/useDeveloperModeToggles.ts`

```ts
// UseDeveloperModeTogglesResult gains
bitcoinEnabled: boolean;
handleToggleBitcoin: (next: boolean) => void;   // true → write; false → open the confirmation
bitcoinConfirm: ConfirmSheetPropsBase;          // visible, onClose, onConfirm, title, message, confirmText (translated)
```

`onConfirm` calls `setBitcoinEnabled(false, { activeNetworkId: networkId, changeNetwork })` and closes; `onClose` closes and writes nothing, so the switch still reads on.

## Surfaces outside the rule

```ts
// utils/account.ts
export function buildNetworkListFromAccount(
  activeAccount,
  bitcoinEnabled = true
): Array<{ id; name; blockchain }>;

// hooks/useDerivedAccountsScan.ts
export async function findDerivedAccounts(account, accounts, isCancelled, bitcoinEnabled = true);
```

`useAccountAddFlow.selectDerive` filters `getScanNetworks()` with `isNetworkChosen(id, bitcoinEnabled)` from `useDeveloperModeSettings()`. `getScanNetworks`, `getScanNetworksWithMirrors` and `ensureMirrorNetworks` are **not** filtered: they decide which addresses a wallet holds.

## `kit/createNetworkChoiceScreen.tsx`

```ts
export interface NetworkChoiceScreenKit {
  Layout: ComponentType<OnboardingLayoutPropsBase>; // the platform's OnboardingLayout, its ground already bound
  Title: ComponentType<{ children: ReactNode }>; // OnboardingTitle
  Header: ComponentType<ScreenHeaderPropsBase>;
  SettingsSelectorList: ComponentType<SettingsSelectorListPropsBase<NetworkChoiceOption>>;
  mark: ReactNode; // GlobeIcon at componentSizes.logoSizeSmall, text.primary
}
export function createNetworkChoiceScreen(kit: NetworkChoiceScreenKit): ComponentType<{
  flowType: 'create' | 'recover'; // which step dots to draw
  onBack: () => void;
  onContinue: () => void;
}>;
```

A tap on an option awaits `saveBitcoinChoice(option.bitcoinEnabled)` and then calls `onContinue` once; a second tap while the first is saving is ignored. A rejected write leaves the screen as it is, so the tap can be repeated.
