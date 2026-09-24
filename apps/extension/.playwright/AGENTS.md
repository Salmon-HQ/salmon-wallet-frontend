# AGENTS.md instructions for `.playwright`

> Companion to `README.md`. README says what exists and how to run it; this
> file holds the conventions and the traps an agent needs to extend the suite.

## Mental model

- **Specs** — `tests/*.spec.ts`, run with `pnpm --filter @salmon/extension e2e`.
  They use the fixture in `fixtures.ts` (a persistent profile with the built
  extension loaded → `{ context, extensionId, popup }`), the flow helpers in
  `helpers.ts`, and web-first `expect`. All test coverage lives here.
- **Capture tools** — the `.mjs` programs left in `scripts/` (store shots and
  visual proofs, plus `lib.mjs` they share). They take screenshots; they do not
  assert and are not coverage. `dapp-providers.mjs` (against a public
  dApp) and `test-dapp.html` stay until dApp specs replace them.

## Preflight

`global-setup.ts` stops the run before any spec, naming the fix, when:

- `.env.test` lacks a secret the suite needs;
- the extension build is missing or older than its sources
  (`pnpm --filter @salmon/extension build`);
- this Playwright version's Chromium is not installed;
- `scripts/devnet-fixtures.cjs` (repo root) cannot fund Wallet A or give it
  the NFT fixture — see Devnet below.

A spec whose prerequisite is absent (backend down, opt-in flag unset) skips
with a message; a prerequisite that is present but misbehaving fails. A spec
never skips because of the state an earlier spec left behind.

## Selectors

`getByTestId` against the shared `data-testid` contract, always. Never a
coordinate, a CSS class, `input[type=…]` or a positional index as the anchor;
if a control has no id, add one to the component. `scripts/check-e2e-selectors.mjs`
(CI) fails on an id the source does not render.

## Devnet

Every spec that sends, burns or views funds or NFTs runs on Solana devnet.
`selectDevnet` turns Developer Networks on and picks the Solana Devnet tab;
`assertDevnet` is the guard before anything moves. `devnet-fixtures.cjs` tops
Wallet A up from B below 0.05 SOL, mints the "Salmon Test NFT" fixture to A
when it has none (find it with `fixtureNftCard`), and stops the run naming the
faucet when B is below 0.5 SOL. Transfers go one way, A → B: the next run mints
another. Specs that change state on chain are opt-in with `SALMON_E2E_ONCHAIN=1`.

## Traps found the hard way

| Trap                                                                                                           | Do this                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A headed Chrome jumps to the owner's screen; a `mousemove` over it is wallet activity and resets the auto-lock | Run with `SALMON_E2E_HEADLESS=1`.                                                                                                                 |
| An action with no timeout inherits the test's (up to 15 min) and hangs on a missing selector                   | The config bounds actions at 30 s; pass a longer one only where real work runs.                                                                   |
| `locator.count()` answers before the popup renders                                                             | Wait on a condition (`or()`, `waitFor`), never count to decide a branch.                                                                          |
| On the DOM, a `ScreenHeader`'s `testID` names the header, not its back arrow (mobile puts it on the arrow)     | Chain to `screen-header-back-button` inside it.                                                                                                   |
| Settings keeps lower panels mounted under the top one, back arrows included                                    | Click only the visible arrow (`closeSettings`).                                                                                                   |
| Adding an account closes Settings and lands on Home                                                            | Wait for Home, then reopen Settings.                                                                                                              |
| Chain tabs are keyed by network id (`solana-devnet`, `bitcoin-mainnet`)                                        | Match the exact id, or a prefix only when one tab can match.                                                                                      |
| Leaving the page (reload, close) clears the session key and locks                                              | A reload is a new unlock — see `lock.spec.ts`.                                                                                                    |
| A toggle or flag persists in the profile                                                                       | Give the spec its own `profileName` with `freshProfile: true`.                                                                                    |
| The devnet NFT index can list an NFT the wallet no longer owns                                                 | Use the fixture card, never "the first card".                                                                                                     |
| `npx playwright install chromium` times out while curl downloads fine                                          | Download the zip from the URL it prints and unpack it into `~/Library/Caches/ms-playwright/chromium-<rev>/` with an `INSTALLATION_COMPLETE` file. |

## Sensitive workflows

- Send and NFT transfer go to the test wallets' addresses from `.env.test`,
  never inline, with amounts acceptable to lose (`0.0001 SOL`).
- Burn asserts the irreversible notice before confirming, and proves the burn
  by the receipt, not by the card leaving the screen.
- Remove-all-wallets runs last in a spec: it invalidates the profile.

## Adding a spec

1. `tests/<flow>.spec.ts`, importing `{ test, expect }` from `../fixtures`.
2. Reuse `helpers.ts` (`unlockOrRecover`, `waitHome`, `closeSettings`,
   `selectDevnet`, `assertDevnet`, `fixtureNftCard`); extend it rather than
   copying a helper into a spec.
3. Gate on the backend with `isBackendUp()` from `../env`.
4. The suite is serial (`workers: 1`): profiles and on-chain state are not
   parallel-safe.
