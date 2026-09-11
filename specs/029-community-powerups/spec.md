# Feature Specification: Community Powerups — a manifest, a pull request, no plugin runtime

**Spec dir** `029-community-powerups` · **Created** 2026-09-11 · **Status**: Owner-approved 2026-09-11 (§8 answers), not scheduled — build hold stands. Builds on `027-powerups-boundary` (implemented for §1–3 on `feat/swap-0x`); does not restate it.

Source of intent: the owner's model, approved verbatim. This document records that model; it does not redesign it. Backend counterpart: the `salmon-wallet-backend` session mirrors §5 before either side implements.

## The property

**A third party can ship a Powerup inside Salmon without Salmon ever running third-party code it did not review, and without a Powerup ever touching keys, storage or the RPC send path.** Spec 027 made the second half a build property. This spec adds the first half: a Powerup is a reviewed folder in this repo with a declared manifest, not a runtime plugin.

## 1. A Powerup is a folder with a manifest

Every Powerup — core or community — is the folder set `powerups/<id>/`:

| Piece                                            | Lives in                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Logic, types, services, hooks, locales, manifest | `packages/shared/src/powerups/<id>/`                                           |
| Mobile UI (twin)                                 | `apps/mobile/src/powerups/` (entry) + `apps/mobile/src/components` / `screens` |
| DOM UI (twin)                                    | `packages/ui/src/powerups.ts` (entry) + `packages/ui/src/components`           |

`packages/shared/src/powerups/<id>/manifest.ts` exports one object:

- `id` — the folder name, the catalogue key, and the Home sub-tab key (a Powerup is a surface of Home, not a route).
- `tier: 'core' | 'community'`.
- `networks` — the network ids it acts on; hidden elsewhere (`isPowerupOnNetwork` today).
- `nameKey` / `descriptionKey` — translation key paths, resolved at render.
- `permissions` — what leaves the device: `'address' | 'balances' | 'none'`, as a list. This is a **declaration the reviewer checks**, not something the runtime can enforce.
- `endpoints` — every external origin the Powerup calls directly (empty for one that only talks to the Salmon backend).
- `locales` — the locale namespace it contributes (EN + ES, under its own folder).
- `entries` — the component keys each platform mounts (catalogue tile, Home sub-tab), resolved per platform by id inside each twin.

`registry.ts` becomes a list of manifests instead of a list of inline entries. Nothing else about the registry changes: `getPowerup`, `isPowerupOnNetwork` and `catalog.ts` keep their signatures and read the manifest fields.

**Rationale.** The registry already carries `id`, copy keys, `tier` and `networks`; the manifest is that record moved next to the code it describes and widened by the three fields a reviewer and a disclosure need (`permissions`, `endpoints`, `locales`). One file per Powerup means a contributor's pull request is readable in one place and a reviewer's checklist has a single subject.

### What does not change

- The build flag (`EXPO_PUBLIC_POWERUPS` / `VITE_POWERUPS`) still aliases `powerups/index.ts` to `index.off.ts` — every Powerup, core and community, disappears from a build with the flag off. `scripts/check-powerups-bundle.mjs` still greps a built bundle for markers.
- The ESLint boundary block still forbids `powerups/**` from importing `core/signing`, `core/broadcast`, `crypto`, `storage`, account classes, or `@solana/kit` signing/sending functions, and still bans `.signer` / `.keyPair` / mnemonic member access. A community Powerup is under the same block by construction: it lives under `powerups/**`.
- `requestSignature(proposal)` stays the one door to signing. Core renders the confirmation; the Powerup never sees signed bytes.

## 2. Two kinds of Powerup

### 2.1 Read-only (display data)

A read-only Powerup **may** call its own third-party endpoints — the ones its manifest declares. It renders data; it never produces a transaction.

Before install, the catalogue shows a **disclosure derived from the manifest**: for each declared endpoint and permission, one line of the form _"This Powerup sends your address to `<host>`."_ — `permissions: ['none']` with no `endpoints` renders _"This Powerup sends nothing off your device."_ The copy is generated from the manifest, not written per Powerup, so it cannot drift from what the code declares.

Install is the user's act: the disclosure is the gate, and the catalogue's `installed` state (today's `installedIds`) is what it gates.

### 2.2 Transaction-building

**Anything that builds a transaction goes through the Salmon backend.** A Powerup that produces a transaction does not call a third-party endpoint for it, ever — it calls one Salmon endpoint (§5), gets an unsigned transaction back, and proposes it through `requestSignature`. The backend validates what it builds, and the same envelope the Swap uses carries it.

**Rationale.** Transaction bytes from a third party, reviewed once at PR time, are still bytes the wallet would sign at runtime against a server the Salmon team does not control. Routing every build through the backend means the party that can change the bytes is the party that also carries the kill switch.

## 3. No plugin runtime

There is no plugin loader, no remote code, no third-party bundle, no sandbox to design. A community Powerup enters by **pull request to this repo**, is reviewed by the Salmon team, and ships inside the app binary like any other code.

**Rationale.** A wallet that downloads and runs third-party code at runtime owns a sandbox escape as a funds-loss bug. Review-at-PR is slower for the contributor and strictly cheaper for the user. SOT "Model C" (marketplace / runtime) stays closed.

## 4. Tier labels origin only

`tier: 'core'` means Salmon authored it; `tier: 'community'` means a third party did. That is the whole meaning: it is an attribution badge in the catalogue.

Tier does **not** decide disclosure. Custody and data exposure do: a community read-only Powerup that sends nothing shows the "sends nothing" line; a core Powerup that sends the address to a third party shows the address line. The disclosure comes from `permissions` + `endpoints`, never from `tier`.

## 5. Backend contract the frontend needs

### 5.1 Build

`GET /v1/{networkId}/powerups/{id}/build` — query parameters are the Powerup's own (documented in its PR); the backend validates them per id. Response is the **same envelope as the swap build**:

| Field                                      | Meaning                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction`                              | Base64 unsigned transaction, zero signatures, the user as fee payer                                                                                                 |
| `expiresAt`                                | ISO; the client rebuilds after it                                                                                                                                   |
| `display`                                  | The inputs to `ProposalDisplay`: title, optional exchange sides, rows, advanced rows, pending copy — as translation keys plus params, never as pre-rendered English |
| fee lines (`salmonFee`, and any route fee) | `{ amount (base units, string), mint, side: 'input' \| 'output', bps, decimals, symbol }`, or `null`                                                                |
| `attribution`                              | Rendered verbatim, e.g. "Powered by X"                                                                                                                              |
| `provider`, `providerDisplayName`          | Data, never a UI branch                                                                                                                                             |

The client maps this to `TransactionProposal` exactly as `powerups/swap/proposal.ts` does today, and hands it to `requestSignature`. There is no execute step: the backend never receives signed bytes.

**Decided (owner, 2026-09-11)**: the CLIENT builds the confirmation rows from typed response fields, exactly as `powerups/swap/proposal.ts` does; the backend sends no translation keys. The `display` row above is therefore read as "the typed fields the rows are built from", not as pre-shaped rows.

The response also carries **`contributor: { name, url } | null`** — who authored the Powerup, from the registry entry Salmon maintainers keep — rendered next to the data-provider `attribution` on the confirmation.

### 5.2 Kill switch

`GET /v1/networks` gains, per network, `powerups: { id: string; enabled: boolean; reason?: 'region' | 'maintenance' | 'deprecated' }[]` — spec 027 §4's allowlist, with the reason a disabled Powerup shows (owner, 2026-09-11: with a reason code). Rules:

- A Powerup absent from the list, or listed with `enabled: false`, is not offered and not mountable; a disabled one that the device has installed shows its `reason` copy in place of its surface (`powerups.disabled.region` / `.maintenance` / `.deprecated`, EN+ES), never a blank tab.
- **Fail closed**: an unavailable or unparseable field means no Powerups, not all Powerups.
- A stored reference to a now-disabled Powerup (a restored Home sub-tab) falls back to Home rather than crashing.
- `/v1/networks` is CloudFront-cached and region-agnostic. Region is decided per request at build time, not here.

### 5.3 Errors

Reusing the swap codes unchanged (`ApiError` shape `{ error, error_description }`):

| Status | Code                 | Client behavior                                                                                           |
| ------ | -------------------- | --------------------------------------------------------------------------------------------------------- |
| 403    | `wallet_restricted`  | Its own state block and copy; no retry loop                                                               |
| 403    | `region_restricted`  | Its own "not available in your region" state; never a generic provider error, never a silent empty result |
| 404    | `no_route`           | Generic, user-facing "no route" message (`transaction.errors.noRoute`)                                    |
| 422    | validation codes     | Generic build-failure copy; the specific code is logged, not shown                                        |
| 503    | upstream unavailable | Busy-network copy, retryable                                                                              |

`describeSwapBuildError` generalises to `describePowerupBuildError` with the same mapping table; per-Powerup codes may extend the table from the Powerup's own folder.

## 6. What a contributor must deliver

A community Powerup PR is complete when all of these are in it:

- [ ] `packages/shared/src/powerups/<id>/manifest.ts` with every field of §1 filled, `endpoints` exhaustive, `permissions` honest.
- [ ] Twins: a mobile component and a DOM component on **one contract** in `packages/shared/src/types/ui/<id>-*.ts` (`XPropsBase`), each platform's `types.ts` extending it. `pnpm check:parity` passes with no new `MOBILE_ONLY` / `DOM_ONLY` entry unless the PR argues for one.
- [ ] `locales/en.json` + `locales/es.json` under the Powerup's folder, registered in `powerups/locales.ts`. Every user-facing string via `t('<id>.…')`; no hardcoded copy. Spanish is written by a speaker, never guessed.
- [ ] Tests in the owning packages: Vitest for shared logic and the DOM twin, Jest for the mobile twin. Coverage thresholds of the touched packages do not drop.
- [ ] A bundle marker: at least one string unique to the Powerup added to `MARKERS` in `scripts/check-powerups-bundle.mjs`, so a Powerups-off build proves the Powerup is absent.
- [ ] No new direct dependency without a reviewer's explicit sign-off.
- [ ] For a transaction-building Powerup: the backend endpoint exists and is reviewed first; the client PR only consumes it.

Reviewer's gate: manifest declarations match the code (grep the folder for every network call and compare against `endpoints`), the ESLint boundary passes, the disclosure the manifest generates is accurate, and no Powerup code reaches core paths.

## 7. What changes in the Swap Powerup

Swap becomes `powerups/swap` **with a manifest** — and nothing else moves:

```ts
// packages/shared/src/powerups/swap/manifest.ts
id: 'swap', tier: 'core', networks: ['solana-mainnet'],
nameKey: 'swap.catalog.name', descriptionKey: 'swap.catalog.description',
permissions: ['address', 'balances'], endpoints: [],  // Salmon backend only
locales: 'swap', entries: { tab: 'swap' }
```

`registry.ts` imports it instead of declaring the entry inline. Files, tests, locales, the API service, the proposal builder and both twins stay exactly where they are. Swap keeps calling `GET /v1/{networkId}/ft/swap/build` — §5.1's generic path is for new Powerups; migrating Swap onto it buys nothing and is explicitly not in scope.

## 8. Decisions (owner, 2026-09-11, relayed by the backend session)

1. Confirmation rows: the client builds them from typed fields, as Swap does. The backend sends no i18n keys.
2. A disabled Powerup carries a reason code; the allowlist is `powerups: [{ id, enabled, reason? }]` (§5.2).
3. Contributor attribution: the build response carries `contributor: { name, url }` from the registry entry, shown beside the data-provider attribution (§5.1); the catalogue detail's "Made by" row reads the same source.
4. Install scope: per device (local storage), as today. No server-side persistence per public key for now.
5. Kill switch for read-only Powerups: by id via the allowlist only. No per-endpoint switch.

Under discussion backend-side, nothing to change here yet: contributors should never need to touch the backend repo — a tx-building Powerup gets its bytes from Salmon through a registry entry Salmon maintainers add.

## Non-goals

- A plugin runtime, remote code loading, a sandbox, or a marketplace (SOT Model C stays closed).
- CLA, CODEOWNERS, governance, and the review SLA — separate documents.
- Revenue sharing or paid Powerups.
- Migrating Swap onto the generic build path (§7).
- Stake and Ramp Powerups — the build hold stands.
- Runtime enforcement of `permissions`: it is a reviewed declaration, not a capability system.
- Any change to spec 027's boundary, build flag, or `requestSignature` contract.

## Acceptance criteria

1. Every Powerup in `registry.ts` is a manifest imported from its own folder; no Powerup metadata is declared inline in the registry.
2. A manifest missing a required field fails typecheck.
3. The catalogue renders a disclosure generated from `permissions` + `endpoints` before install, and a Powerup with no endpoints renders the "sends nothing" line.
4. Disclosure copy is identical for a core and a community Powerup with identical `permissions` and `endpoints` (tier changes only the badge).
5. A build with the Powerups flag off carries no manifest, no locale and no marker of any Powerup — `scripts/check-powerups-bundle.mjs` passes, and passes with `--expect-present` when the flag is on.
6. A fixture Powerup importing `core/signing`, `crypto` or `storage` fails lint (existing `boundary.test.ts` extended to the new folder shape).
7. `GET /v1/networks` without `powerups` yields an empty catalogue, not a full one.
8. `403 wallet_restricted`, `403 region_restricted`, `404 no_route`, `422` and `503` each render their own state from the shared mapping, with no generic swallow.
9. `pnpm check:parity` and the i18n check pass with the Swap manifest in place and no other Swap change.
