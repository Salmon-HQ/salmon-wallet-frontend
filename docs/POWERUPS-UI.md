# Powerups — the UI runbook

What every Powerup, core or community, present or future, **must reuse** and
**must not modify** so that it looks and behaves like Salmon on both twins
without a redesign. `AGENTS.md` is the canonical rule source; this document
is the building-block inventory it points to for anything under
`powerups/**`. Product context is `PRODUCT.md` §Powerups; design rationale is
`DESIGN.md` (sections named per block); the boundary is spec 027 and the
contribution flow is spec 029 §6.

A Powerup **composes**; it never **draws**. Every visible thing a Powerup
shows is one of the blocks below, filled through the block's contract. The
one place a Powerup may write its own component is its own folder, and that
component must itself be composed from these blocks (see §What a Powerup may
add). A Powerup that needs a block this runbook does not have does not draw
one: it opens the gap as a decision (see §Gaps found so far).

## 0. The three rules that outrank every block

1. **Twins, one contract.** Every screen and component exists twice — React
   Native in `apps/mobile`, DOM in `packages/ui` — on one `XPropsBase` in
   `packages/shared/src/types/ui`. `pnpm check:parity` fails a mobile file
   without its twin. Logic lives once, in `packages/shared/src/powerups/<id>/`.
2. **Tokens only.** No hex, no literal spacing, no font size, no duration, no
   easing anywhere in a Powerup. Colours through `useSemantic()` (DOM) /
   `useThemedStyles` (mobile); spacing, radii, sizes from
   `packages/shared/src/theme` (`spacing`, `borderRadius`, `componentSizes`,
   `fontSize`, `motionMs`, `motionEasing`). Mobile scales with `s`/`vs`/`ms`.
3. **Core signs, core waits, core receipts.** A Powerup that builds a
   transaction calls the Salmon backend and hands the envelope to
   `requestSignature`. Core renders the confirmation, the wait and the receipt.
   The Powerup never renders a confirm button, a spinner over a signature, or a
   success screen of its own.

## 1. The blocks

Each block: where it lives per twin, its contract, when it is mandatory, what
is fixed, and how it is used. "Fixed" means the Powerup neither overrides a
style prop nor wraps the block to change its look. Every block accepts
`testID` (`Testable`) unless noted.

### 1.1 Home sub-tab — the entry point

|          |                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/powerups/index.ts` → `getPowerupTab(id)` returns a `ComponentType<PowerupTabProps>` (a thin file in `apps/mobile/src/screens/<Id>Tab.tsx`) |
| DOM      | `packages/ui/src/powerups.ts` exports `<Id>Page` (`null` in `.off.ts`); `apps/extension/src/pages/home/HomePage.tsx` mounts it by `effectiveSubTab`         |
| Contract | `manifest.entries.tab = '<id>'`; the key joins `HomeSubTabKey` / `HOME_TAB_KEYS` in `packages/shared/src/hooks/useHomeShell.ts`                             |

- **Mandatory** for any Powerup with a surface. A read-only Powerup with
  nothing to show declares no `tab` and is "installed, not tabbed".
- **Fixed:** the row is `PortfolioSubTabs` over `UnderlineTabs`; the label is
  `t(manifest.nameKey)`; the underline, the type, the carousel when the row
  overruns (leading/trailing fades only toward hidden tabs, from
  `overflowEdges`), the order sheet and the per-device install are Home's.
  A Powerup never adds chrome above the row, never registers a route, never
  touches the tab bar (there is none — DESIGN.md §Navigation).
- **Fixed:** the seam under the row is Home's. The Powerup's root starts at
  `paddingTop: 0` with `spacing.headerPadding` (a form) or
  `spacing.screenGutter` (a list) at the sides — exactly where Portfolio and
  NFTs start. The content region plays the sink/float on a tab switch; the
  Powerup does not animate its own mount.
- **Fixed:** the disabled state. When the backend lists the Powerup as
  disabled, Home renders `StateBlock tone="empty"` with
  `t('powerups.disabled.<reason>')` in place of the surface. The Powerup's
  component is not mounted; it needs no code for this.

```tsx
// apps/mobile/src/screens/MemoTab.tsx — the whole file is the account's inputs
export default function MemoTab({ onNavigateHome }: PowerupTabProps) {
  const [{ ready, activeAccount, activeBlockchainAccount, networkId }] = useAccountsContext();
  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.centered}>
        <StateBlock tone="empty" title={t('swap.errors.noAccount')} />
      </View>
    );
  }
  return (
    <MemoScreen
      publicKey={activeBlockchainAccount.getReceiveAddress()}
      networkId={networkId ?? null}
      onNavigateHome={onNavigateHome}
    />
  );
}
```

### 1.2 Catalogue tile, detail, disclosure, "Made by"

|          |                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Mobile   | `apps/mobile/src/components/PowerupsCatalog` (a sheet over Home, detail as a second sheet at the same height)      |
| DOM      | `packages/ui/src/components/PowerupsPage` (a page of Home's stack, detail pushed with `SlideStack`)                |
| Contract | `PowerupsCatalogPropsBase` fed by `getPowerupCatalog` from the manifests; the Powerup writes **only its manifest** |

- **Mandatory:** the manifest fields `nameKey`, `descriptionKey`, `aboutKey`,
  `actionKeys`, `authorKey`, `permissions`, `endpoints`, `networks`, `tier`.
- **Fixed:** the tile (`ListRow` + `IconBubble` + "Installed"), the detail
  (row with `PowerupBadge`, `+`/`−` control, About, What you can do, Uses,
  facts card with Made by and Networks), the **disclosure** generated by
  `describeDisclosure(manifest)` from `permissions` + `endpoints` (never
  written per Powerup), the disabled `WarningNotice` per reason, and the
  icon: a Powerup has no custom art; the catalogue resolves an icon by id
  from the platform's Phosphor set and falls back to the lightning.
- A Powerup adds a catalogue string by adding a key to its own locale folder;
  it never edits the catalogue components.

### 1.3 Amount entry — the number with the converted line under it

|          |                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/components/AmountEntryCard`                                                                                                                   |
| DOM      | `packages/ui/src/components/AmountEntryCard`                                                                                                                   |
| Contract | `AmountEntryCardPropsBase<TStyle>`: `value`, `onChangeValue`, `editable?`, `placeholder?`, `subtext?`, `loading?`, `focused?`, `onFocus?`, `onBlur?`, `style?` |

- **Mandatory** wherever a Powerup asks for an amount (Send and Swap are the
  reference). `subtext` is the fiat line under the number, formatted by the
  caller from `useCurrencyContext()` (`formatValue` / `formatPrecise`), never
  by the card. `loading` keeps the field mounted, hides the value and centres
  the wait overlay at the placeholder's size. `focused` paints the accent
  edge; the Powerup passes it from its own focus state.
- **Fixed:** the card's shape, the centred number and placeholder, the
  overlay, the accent edge, no trailing ticker. The token beside it is the
  Swap's token chip (`SwapAmountInput`), the only sanctioned way to put a
  token on the card.
- **Shortcuts:** the percentage row is `ChipGroup variant="outline"` driven by
  `useAmountShortcuts({ balance, decimals, setAmount, maxLabel })` →
  `{ options, selected, select, onAmountChange }`. The selected chip and the
  card turn accent; the Powerup does not restyle either.

```tsx
const shortcuts = useAmountShortcuts({ balance, decimals, setAmount, maxLabel: t('common.max') });
<AmountEntryCard value={amount} onChangeValue={shortcuts.onAmountChange} placeholder="0" subtext={fiatLine} focused={focused} onFocus={…} onBlur={…} />
<ChipGroup variant="outline" options={shortcuts.options} value={shortcuts.selected ?? ''} onChange={shortcuts.select} />
```

### 1.4 Token / asset picker

|          |                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/components/Send/TokenPickerSheet` (+ `TokenSelectList`)                                                               |
| DOM      | `packages/ui/src/components/SendPage/TokenPickerSheet` (+ `TokenSelectList`)                                                           |
| Contract | `TokenPickerSheetPropsBase`: `tokens`, `onSelectToken`, `visible`, `onClose`, `loading`, `showBalances?`, `verifiedOnly?`, `onSearch?` |

- **Mandatory** for any pick among tokens. It is a sheet (one state: one
  pick), with the thermocline, the search field and the same rows as every
  other sheet. `onSearch` plugs a remote search (`useTokenSearch`) — the
  Swap's catalogue comes from `useSwapCatalog()`.
- **Fixed:** everything visible. A Powerup never hand-rolls a modal or a list
  of tokens (DESIGN.md §Sheets — the swap's old selector is the cautionary
  tale).

### 1.5 Sheets

|          |                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/components/BottomSheetContainer` (+ `SheetTitle`, `BottomSheetTitleHeader`)                                             |
| DOM      | `packages/ui/src/components/BottomSheetContainer` (+ `SheetTitle`)                                                                       |
| Contract | `BottomSheetContainerPropsBase`: `visible`, `onClose`, `onClosed?`, `title?` / `headerContent?`, `dismissible?`, `maxHeight?`, `height?` |

- **Mandatory** for any sheet. One state per sheet; a second tap that changes
  what the surface is means a screen, not a sheet (DESIGN.md §Sheets).
- **Fixed:** handle, backdrop, `rise`/`ebb` motion, the thermocline material,
  the 92% ceiling, hugging content, no Close button. A sheet opened from
  inside another reads `useParentSheetHeight()` and passes it as `height`, so
  it rises exactly as tall as the sheet under it.

### 1.6 Confirmation — core renders it from typed fields

|          |                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/components/TransactionConfirmation` (mounted once by `ConfirmationHost`)                                                                                                               |
| DOM      | `packages/ui/src/components/TransactionConfirmation` (mounted once by `ConfirmationHost`)                                                                                                               |
| Contract | `TransactionProposal` / `ProposalDisplay` in `packages/shared/src/core/confirmation/types.ts`; built by `toPowerupProposal(envelope, { networkId, display, pending, refresh })` from `powerups/backend` |

- **Mandatory** for every transaction. The Powerup calls
  `buildPowerup(id, networkId, params)` (GET `/v1/{networkId}/powerups/{id}/build`),
  maps the envelope to a `ProposalDisplay` — `title`, `rows` (label/value,
  already translated and formatted), optional `exchange` (send/receive sides
  for a swap-like screen), `advancedRows`, `warning`, `receipt { title, rate?, fee? }`,
  `pendingTitle`, `pendingSubtitle` — and awaits `requestSignature(proposal)`.
- **Fixed:** the whole screen: the Salmon fee as its own line, the provider
  attribution and the `contributor` ("Made by") slot filled from the
  envelope, the back/confirm controls, the refresh on `expiresAt`, the
  watch-only refusal (`NoSigningAccountError`), the cancel
  (`SignatureRequestCancelledError`). The Powerup never sees signed bytes and
  never adds an element to this screen.
- The backend sends no i18n keys; the client builds the rows from typed
  fields (spec 029 §8.1).

### 1.7 The wait — loading screen and skeletons

|          |                                                                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile   | `apps/mobile/src/components/LoadingScreen`; `SkeletonRow`, `ShimmerRect`                                                                                                                                                                                       |
| DOM      | `packages/ui/src/components/LoadingScreen`; `SkeletonRow`, `ShimmerRect`                                                                                                                                                                                       |
| Contract | `LoadingScreenPropsBase`: `visible`, `title?`, `subtitle?`, `tips?`, `tipInterval?`, `showTips?`, `waves?`, `onExited?`, `surfaces?` (+ `logoSize?`, `spinnerSize?`); `SkeletonRowPropsBase`: `leadingSize?`, `lines?`, `trailingWidth?`, `count?`, `padding?` |

- **Signing wait — fixed and not the Powerup's:** `ConfirmationHost` shows
  `LoadingScreen waves` with the proposal's `pendingTitle`/`pendingSubtitle`
  from the confirm until the chain confirms, holds it through its last wave
  (`useWaitExit`), then floats the receipt in. The Powerup supplies the two
  strings and nothing else.
- **Data wait — the Powerup's, but only these two:** a list that is loading
  draws `SkeletonRow` (one per expected row, `lines={2}`); a whole surface
  that must wait draws `LoadingScreen` with `visible` and a `title`. No
  spinner, no custom pulse, no `ActivityIndicator`. A field's own wait is the
  amount card's `loading`; a button's is `PrimaryButton loading`.
- **Fixed:** the timing (`packages/shared/src/motion/wavefront.ts`,
  `wait.ts`), the mark, the crest paint, `waitDelay` / `waitMinVisible`
  gates, the tip cadence, the sink of the mark, the reduce-motion mapping.

### 1.8 The receipt and the pending banner

|          |                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Mobile   | `apps/mobile/src/components/ReceiptScreen` (tones `transfer` / `exchange`); `PendingActivityBanner` mounted by the root layout |
| DOM      | `packages/ui/src/components/ReceiptScreen`; `PendingActivityBanner` mounted by the app shell                                   |
| Contract | `ReceiptScreenPropsBase` (discriminated on `tone`); `TransactionProposal.pending { kind, summary? }`                           |

- **Fixed and not the Powerup's:** after `requestSignature` resolves, core
  shows `ReceiptScreen tone="exchange"` from `display.receipt` (title, rate,
  fee, the exchange sides, the explorer link as the sheets' secondary
  button), and records `proposal.pending` as a confirmed item in the banner.
  The Powerup's part is `display.receipt` and `pending`, plus what it does
  when the receipt is dismissed (`onNavigateHome`, back to Portfolio).
- A read-only Powerup has no receipt.

### 1.9 States: empty, error, notice, disabled-by-reason

|          |                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile   | `apps/mobile/src/components/StateBlock`, `WarningNotice`                                                                                                                                                           |
| DOM      | `packages/ui/src/components/StateBlock`, `WarningNotice`                                                                                                                                                           |
| Contract | `StateBlockPropsBase`: `tone: 'empty' \| 'error'`, `title`, `body?`, `onRetry?`, `retryLabel?`, `retryTestID?`; `WarningNoticePropsBase`: `tone?: 'error' \| 'warning' \| 'info'`, `title`, `children?`, `action?` |

- **Mandatory coverage.** Every Powerup surface renders all of: **loading**
  (§1.7), **empty** (`StateBlock tone="empty"` with a title and, when the
  emptiness has a cause, a body), **error** (`StateBlock tone="error"` with
  `onRetry` when the read can be retried), and — for a transaction-building
  Powerup — the **build failures** below. A blank region is never a state.
- **Error copy is a contract, not text.** Every failure is a translation key
  rendered with `t()`; raw provider text never reaches the screen. A
  transaction-building Powerup maps its `ApiError` with
  `describePowerupBuildError(error, { codes?, fallback? })`, which already
  covers `region_restricted` / `wallet_restricted` (→ `kind: 'unavailable'`,
  the Powerup renders `StateBlock` with the region / wallet copy), `no_route`,
  `missing_parameter` / `invalid_parameter` / provider mismatches
  (→ `transaction.errors.buildFailed`), `simulation_failed`, the busy family
  (`transaction.errors.networkBusy`), and `not_found`
  (→ `powerups.disabled.maintenance`). A Powerup adds only its own codes
  through `codes` (memo: `note_too_long`).
- **Inline notices** (a warning that does not block, an error beside a form)
  are `WarningNotice`; a field's own error is the field's `error` prop
  (§1.10). No hand-drawn red text.
- **Disabled by reason** (`maintenance` / `region` / `deprecated`) is Home's
  and the catalogue's (§1.1, §1.2); the Powerup has no code for it.

### 1.10 Form fields, buttons, rows, cards, labels

| Block            | Mobile                               | DOM                                  | Contract                                                                                                                                      |
| ---------------- | ------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Text field       | `TextField` (`components/TextInput`) | `TextInput`                          | `TextInputPropsBase`: `value`, `onChangeText`, `placeholder?`, `error?`, `maxLength?`, `mono?`, `disabled?`, `autoFocus?`, `onSubmitEditing?` |
| Search           | `SearchField`                        | `SearchField`                        | `SearchFieldPropsBase`                                                                                                                        |
| Primary action   | `PrimaryButton`                      | `PrimaryButton`                      | `ButtonPropsBase`: `onPress`, `children: string`, `disabled?`, `loading?`                                                                     |
| Secondary action | `SecondaryButton`                    | `SecondaryButton`                    | `ButtonPropsBase` (+ `icon` / `trailingIcon` per platform)                                                                                    |
| Row              | `ListRow`                            | `ListRow`                            | `ListRowPropsBase`: `leading`, `title`, `subtitle?`, `trailing?`, `onPress?`, `padding?`, `emphasis?`                                         |
| Fact             | `KeyValueRow`                        | `KeyValueRow`                        | `KeyValueRowPropsBase`: `label`, `value`, `valueTone?`, `labelWeight?`, `layout?`, `valueFont?`                                               |
| Container        | `Card`                               | `Card`                               | `CardPropsBase`: `tone?`, `padding?`, `gap?`, `radius?`, `onPress?`                                                                           |
| Section label    | `SectionLabel`                       | `SectionLabel`                       | `SectionLabelPropsBase`: `variant: 'caps' \| 'group' \| 'title'`                                                                              |
| Mark             | `IconBubble`                         | `IconBubble`                         | `IconBubblePropsBase`: `size`, `tone`, `icon?`, `shape?`                                                                                      |
| Chips            | `Chip` / `ChipGroup`                 | `Chip` / `ChipGroup`                 | `ChipPropsBase` / `ChipGroupPropsBase`                                                                                                        |
| Token mark       | `TokenLogo`                          | `TokenLogo` (`components/TokenList`) | `uri`, `symbol`, `size`                                                                                                                       |

- **Fixed:** a primary is the flesh button, 56 tall, bold label, its geometry
  never a function of state; a commit inside a live form takes a fixed
  narrower step (`componentSizes.copyButtonWidth` × `buttonHeightCompact`,
  as Memo and Swap do), full-width only on a terminal screen. A field is the
  control radius with the accent focus edge and the danger error edge; error
  outranks focus. Icons come from `icons.ts` (Phosphor) on both twins, take
  a text token, never their own colour; a Powerup ships no icon assets.
- A label above a field is `SectionLabel variant="caps"`. A supporting line
  under a field has no block yet (§Gaps, G1).

### 1.11 Motion — what a Powerup may animate

|        |                                                                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared | `packages/shared/src/theme/durations.ts` (`motionMs`, `motionEasing`, `resolveMotionMs`), `packages/shared/src/motion` (`sinkFloat`, `wait`, `wavefront`, `crest`, `useFocusModePhase`) |
| Mobile | `apps/mobile/src/utils/sinkAndFloat.ts` (`floatEntering`, `sinkExiting`), `apps/mobile/src/utils/motion.ts` (`timing`, `curve`), Reanimated `useReducedMotion`                          |
| DOM    | `packages/ui/src/motion` (`SinkFloat`, `floatEntering`, `sinkExiting`, `SlideStack`, `useReducedMotion`)                                                                                |

- **Allowed:** exactly two verbs. Content that is replaced **sinks and
  floats** (`SinkFloat` on the DOM, `entering={floatEntering(reduceMotion)}`
  / `exiting={sinkExiting(reduceMotion)}` on mobile). A pushed screen
  **slides** (`SlideStack` / the stack's own transition). State changes in
  place use `motionMs.swell`; enters `drift`; exits `ebb`; sheets `rise`;
  the water `tide`. Easing is `motionEasing.current` (or `settle` for a
  value coming to rest). Reduced motion always goes through
  `resolveMotionMs` / the `useReducedMotion` guard.
- **Forbidden:** a custom easing, a literal duration, a bounce, a spinner, a
  transition on layout properties, a second motion vocabulary next to the
  wait, animating the Powerup's own mount (Home already plays the verb),
  animating chrome.

## 2. What a Powerup may add

- **Its folder.** Logic, hooks, types, locales, manifest in
  `packages/shared/src/powerups/<id>/`; the mobile screen in
  `apps/mobile/src/components/<Id>Screen` + `apps/mobile/src/screens/<Id>Tab.tsx`;
  the DOM page in `packages/ui/src/components/<Id>Page`; the contract in
  `packages/shared/src/types/ui/<id>-screen.ts`; registration in the three
  entries (`apps/mobile/src/powerups/index.ts`, `packages/ui/src/powerups.ts`
  - `.off.ts`, `apps/extension/src/pages/home/HomePage.tsx`) and in
    `scripts/check-dom-parity.mjs`' `MAP`.
- **New components only inside that folder**, composed from §1's blocks and
  the tokens. Anything two Powerups would share climbs into the kit through
  its own PR (a new `XPropsBase`, both twins, tests) — never as a copy in a
  second Powerup.
- **Its own strings** under `<id>.*` in `locales/en.json` + `locales/es.json`,
  registered in `powerups/locales.ts`, Spanish written by a speaker (voseo
  rioplatense), never guessed.
- **Its own error codes** through `describePowerupBuildError`'s `codes`.
- **Direct third-party reads** only for a read-only Powerup, only to the
  hosts its manifest's `endpoints` declare, with plain `fetch`; never a
  transaction from a third party (spec 029 §2.2); never a new dependency
  without a reviewer's sign-off; never a remote image, font or script.

## 3. Reviewer checklist for a Powerup PR

Apply in order; a "no" on any line blocks.

1. **Boundary.** `pnpm turbo run lint` green: nothing under `powerups/**`
   imports `core/signing`, `core/broadcast`, `crypto`, `storage`, account
   classes or `@solana/kit` signing; no `.signer` / `.keyPair` / mnemonic
   access. The manifest's `endpoints` list matches every network call in the
   folder (grep for `fetch(`, `axios`, `http`).
2. **Manifest honest.** `permissions` matches what leaves the device;
   `networks` matches where the backend builds; `tier` is the author's
   origin only; the generated disclosure reads true.
3. **Twins.** `pnpm check:parity` green with no new `MOBILE_ONLY` /
   `DOM_ONLY` entry; one `XPropsBase`; both `types.ts` extend it; the
   duplication ceiling did not rise (hoist rows and derivations into
   shared, as `kaminoPositionRows` does).
4. **Blocks only.** Every visible element is a §1 block or a folder-local
   composition of them: no `<Text style={{color:'#…'}}>`, no MUI, no custom
   modal, no spinner, no icon asset, no literal spacing / size / duration /
   easing. DOM reads colour through `useSemantic()` only.
5. **States.** Loading, empty, error (with retry when retryable), and — for
   a builder — every `describePowerupBuildError` outcome has a screen, with
   `testID`s on each state.
6. **Core does the money.** Transaction bytes come from
   `/v1/{networkId}/powerups/{id}/build` only; `requestSignature` is the one
   door; no confirm, wait, or receipt drawn by the Powerup; `pending` and
   `receipt` filled on the proposal.
7. **i18n.** `pnpm check:i18n` green; every string via `t('<id>.…')`; EN and
   ES both present; no orphan keys.
8. **Tests.** Vitest for the shared logic and the DOM twin, Jest for the
   mobile twin; coverage floors of the touched packages unchanged or higher.
9. **Bundle.** A marker string in `scripts/check-powerups-bundle.mjs`
   `MARKERS`; a Powerups-off build proves the Powerup absent.
10. **Backend first** for a builder: the endpoint exists and was reviewed
    before the client PR; the client PR only consumes it.
11. **No new dependency, no remote asset, no seed material anywhere**
    (`pnpm check:no-secrets`).

## 4. Gaps found so far

Recorded as decisions for the owner, not as prose. Each one was hit while
rebuilding `memo` and `kamino-positions` strictly under this runbook.

| #   | Gap                                                                                                                                                                               | Decision needed                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | No block for a **supporting line under a field** (Memo's byte count). Today it is hand-drawn on both twins.                                                                       | Add `hint?: string` to `TextInputPropsBase` (rendered under the field like `error`, in `text.secondary`), or a `FieldHint` kit component.                 |
| G2  | No **list-with-facts card** block: a card titled by a bold line over `KeyValueRow`s (Kamino's loan card, Swap Review's data card, the receipt). Each draws the title line itself. | Promote to a kit `FactsCard` (`title`, `rows`) on both twins, or accept the title line as a permitted folder-local composition.                           |
| G3  | The **"no account" empty state** every tab wrapper draws (`swap.errors.noAccount`) is repeated per Powerup and borrows Swap's key.                                                | Move it into Home's `PowerupTabBody` / HomePage branch so a Powerup is only mounted with an account, and rename the key to `powerups.no_account`.         |
| G4  | **Read-only Powerups have no kill-switch UI test** and no partner-outage copy standard: Kamino wrote its own "did not answer" lines.                                              | Standardise `powerups.partner.unreachable` / `powerups.partner.partial` keys for every third-party read, or keep per-Powerup copy.                        |
| G5  | **Icon by id.** The catalogue maps ids to Phosphor glyphs in a table inside each catalogue twin; a new Powerup either edits the catalogue or gets the lightning.                  | Add `iconName` (a Phosphor name from `icons.ts`) to the manifest, resolved by each twin's icon module.                                                    |
| G6  | **No PR template section for Powerups.** The checklist in §3 exists only here.                                                                                                    | Add a "Powerup PR" block to `.github/PULL_REQUEST_TEMPLATE.md` and a `powerups/**` line to `CODEOWNERS`; CLA stays a separate decision (memory: CLA lot). |
| G7  | **A tx-building fixture with amounts** does not exist on local; the amount card + fee lines (§1.3, §1.6) cannot be exercised end to end without one.                              | Ask the backend for the offered `transfer-sol` fixture, or accept Swap as the only reference.                                                             |
| G8  | `HomeSubTabKey` and `PowerupId` are **hand-maintained unions**; a new Powerup edits `useHomeShell.ts` and `manifest.ts`.                                                          | Derive both from the registry (`typeof POWERUPS[number]['id']`) so a manifest is the only place an id is written.                                         |
