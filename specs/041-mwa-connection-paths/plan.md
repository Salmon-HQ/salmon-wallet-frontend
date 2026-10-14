# Implementation Plan: A dApp connection that does not dead-end (Mobile Wallet Adapter)

**Branch**: `fix/041-mwa-connection-paths` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/041-mwa-connection-paths/spec.md`

## Summary

Three gates move in front of the request screen in `MwaHost` (`apps/mobile/src/mwa/MwaRoot.tsx`), each a `ConfirmSheet`:

```text
MwaHost
  no wallet            → NoWalletSheet      "Open Salmon" | "Close"     (before the lock)
  locked               → LockContent        (unchanged)
  chain supported, not active, held by the account
                       → NetworkSwitchSheet "Switch to Devnet" | "Cancel"
  otherwise            → MwaRequest         (precheck: unsupported chain → its own message)
```

`mwaPrecheck` (`packages/shared/src/utils/mwa.ts`) gains one distinction: an unsupported chain (`reason: 'network-unsupported'`) versus a supported chain the wallet is not on (`reason: 'network'`, now only reached when the account does not hold that network). A pure helper, `mwaNetworkGate`, decides which gate a request needs, so the decision is unit-tested in shared and the host only renders.

Switching calls the same `actions.changeNetwork` Settings calls; the host's existing wait for `activeBlockchainAccount` covers the reload, and `MwaRequest` is keyed by request id, so it mounts fresh and judges the request on the new network. "Open Salmon" opens `salmonwallet://` (the app's own scheme, already on `MainActivity`) and then declines, which ends the session and closes the dApp activity as every session end does.

## Technical Context

**Language/Version**: TypeScript 5 (React Native 0.86.3, Expo SDK 57)

**Primary Dependencies**: existing `@solana-mobile/mobile-wallet-adapter-walletlib` 1.4.5, `react-native` `Linking`

**Storage**: none new; the network switch writes the same `NETWORK_ID`/`PATH_INDEX` keys Settings writes

**Testing**: Vitest (`packages/shared`: `mwa.test.ts`), Jest + RNTL (`apps/mobile`: the host's gates), then the `solana-mobile playground` hand-test and the Maestro flow on `Seeker_API35` against a release build

**Target Platform**: Android only (Mobile Wallet Adapter has no iOS)

**Project Type**: mobile app in a pnpm monorepo

**Constraints**: JS-only change, so it can ship as an update on the 1.4.0 binary; the dApp Store still needs a new APK for a new submission

**Scale/Scope**: 1 helper + 1 precheck reason in shared, 2 gates in the host, 7 translation keys × 2 languages

## Constitution Check

| Principle                    | Status                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Ownership boundaries      | ✅ Decision logic in `packages/shared/src/utils/mwa.ts`; rendering in `apps/mobile/src/mwa`. No new component: `ConfirmSheet` covers all three screens.                 |
| II. Shared code consumers    | ✅ `mwaPrecheck`'s only consumer is `MwaRequest`; `MwaPrecheck.reason` gains a value. The extension does not use these helpers.                                          |
| III. Wallet safety           | ✅ No change to signing, crypto, storage or the lock. The switch reuses `changeNetwork`; the lock still comes before any request. Owner approved the scope 2026-10-14.    |
| IV. Bilingual copy           | ⚠️ New `dapp.mwa_*` keys in EN and ES; the Spanish is drafted to match the existing `dapp.mwa_*` voice and **flagged for owner review**.                                  |
| V. Functional coverage first | ✅ Vitest for the gate decision and precheck reasons, Jest for the host's gates, then the release-build hand-test.                                                       |
| VI. Ask rather than guess    | ✅ Scope and the protocol constraint are recorded in spec §Clarifications.                                                                                               |

## Project Structure

```text
packages/shared/src/
├── utils/mwa.ts                 # mwaNetworkGate; precheck 'network-unsupported'
├── utils/mwa.test.ts
└── locales/{en,es}/translation.json   # dapp.mwa_* keys
apps/mobile/src/mwa/
├── MwaRoot.tsx                  # MwaHost: no-wallet and network-switch gates
├── MwaRequest.tsx               # message for 'network-unsupported'
└── MwaRoot.test.tsx             # new: the host's gates
```

No contracts: nothing crosses a package or service boundary that did not before.

## Decisions

See [research.md](./research.md).
