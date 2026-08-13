# Maestro suite — `apps/mobile`

End-to-end UI tests for the Salmon Wallet mobile app, driven by
[Maestro](https://docs.maestro.dev). The suite targets the iOS Simulator
or an Android emulator with the Expo dev build of `apps/mobile`
installed.

> Per-app ownership: this suite lives next to the app it exercises and
> is the canonical home for mobile integration tests. See
> `AGENTS.md` for conventions.

## Layout

```
.maestro/
├── flows/
│   ├── smoke/          # read-only walks, idempotent
│   │   ├── auth/        — recover, create, unlock
│   │   ├── home/        — balance, tabs, blockchain switcher
│   │   ├── mobile/      — wallet switcher, keyboard, lock overlay
│   │   ├── nft/         — collectibles detail walk
│   │   ├── activity/    — activity list
│   │   ├── receive/     — receive sheet
│   │   └── settings/    — every Settings panel (read-only)
│   └── actions/        # state-modifying, must be authorized per run
│       ├── account/     — rename, add + remove derived accounts
│       ├── address-book/— save contact
│       ├── profile/     — set profile picture
│       ├── reveal/      — backup seed + private key reveal
│       ├── send/        — on-chain SOL transfer (0.001 SOL)
│       ├── swap/        — intra-Solana swap quote + execute
│       ├── nft/         — NFT transfer (Wallet B → Wallet A)
│       └── reset/       — remove all wallets (DESTRUCTIVE — last)
├── suites/             # orchestrators that runFlow children in order
│   ├── smoke.yaml
│   └── actions.yaml
├── subflows/           # building blocks (recover-walletA/B, settings nav…)
├── screenshots/        # gitignored runtime output, mirrors flows tree
├── .env.test           # gitignored secrets — copy from .env.test.example
└── .env.test.example
```

## Setup

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. Boot the iPhone simulator and install the Expo dev build of
   `apps/mobile` (`pnpm --filter mobile ios` from the repo root).
3. Copy and fill secrets:
   ```bash
   cp .maestro/.env.test.example .maestro/.env.test
   ```
   Required variables:
   - `SALMON_TEST_PASSWORD` — wallet password
   - `SALMON_TEST_SEED_A` — Wallet A seed (12 words, holds SOL)
   - `SALMON_TEST_SEED_B` — Wallet B seed (12 words, receives the NFT on
     the first leg of the transfer round trip)
   - `SALMON_TEST_WALLET_A_ADDR` — Wallet A Solana address
   - `SALMON_TEST_WALLET_B_ADDR` — Wallet B Solana address

## Pre-flight

Before running `suites/actions.yaml` or any single action flow, check what
Wallet A / Wallet B actually hold — a quick RPC query against
`SALMON_TEST_WALLET_A_ADDR` / `SALMON_TEST_WALLET_B_ADDR`
(`solana balance <addr>`, `getTokenAccountsByOwner`) or opening the app
and checking Home/Collectibles. These are real mainnet wallets that you
create and fund yourself in your gitignored `.env.test` — runs spend real
SOL from them.

Per-flow prerequisites:

| Flow                                                   | Needs                                                     |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `auth/*`, `home/*`, `settings/*` (smoke), connect/sign | no funds, but the backend must be reachable — see below   |
| `actions/send/sol-transfer.yaml`                       | Wallet A: SOL for fee + 0.001 SOL                         |
| `actions/swap/*`                                       | Wallet A: balance of the input token                      |
| `actions/nft/*`                                        | Wallet A: the "Mindfolk Founder #5154" NFT (mint `CNM8…`) |

Repo policy: a flow that finds its prerequisite missing skips with a clear
message, never a cryptic failure. If the backend is reachable but behaves
wrong, the flow fails — it does not skip.

### Backend reachability

Account creation and recovery call the API, so **every** flow needs the
backend up — including the ones that need no funds. When it is unreachable
the app spends the axios timeout on the "Recovering Account" screen and
then fails with "Failed to recover account. Please check your seed phrase
and try again", which points at the seed instead of the network.

`apps/mobile/.env` points at `127.0.0.1`, which the iOS Simulator resolves
to the host. The Android emulator does not — map the port into it, and
redo this after every emulator boot because the mapping does not survive
one:

```bash
adb reverse tcp:3001 tcp:3001
```

Confirm the app is actually reaching the backend rather than timing out:

```bash
docker logs --since 3m salmon-api-backend | grep -cE "GET|POST"
```

## Running

Use `./run.sh`. It is to this suite what `playwright.config.ts` + `env.ts` are
to the web and extension ones: it loads the secrets, refuses to start against a
half-ready environment, and hands Maestro a fully specified command.

```bash
apps/mobile/.maestro/run.sh suites/smoke.yaml            # read-only smoke
apps/mobile/.maestro/run.sh suites/actions.yaml          # authorized per run
apps/mobile/.maestro/run.sh flows/smoke/settings/about.yaml
apps/mobile/.maestro/run.sh --device emulator-5554 suites/smoke.yaml
```

Anything it does not recognise is forwarded to `maestro test`, so Maestro's own
flags still work — including sharding, which splits the flows across several
booted devices and is the one supported way to cut the suite's wall-clock:

```bash
apps/mobile/.maestro/run.sh --shard-split=2 suites/smoke.yaml
```

The runner exists because four things here fail quietly rather than loudly:

- **Working directory.** `takeScreenshot` paths are cwd-relative, so the suite
  only behaves when Maestro runs from `apps/mobile/.maestro/`. Anywhere else
  scatters a stray `screenshots/` folder. The runner anchors to its own
  directory, so it works from anywhere.
- **`-e` forwarding.** Maestro (verified on 2.4.0) does not inherit the shell
  environment. Sourcing `.env.test` and running `maestro test` without `-e`
  does not fail — flows interpolate `${SALMON_TEST_SEED_A}` to the literal
  string `undefined`, type it into the seed field, and die many steps later on
  an unrelated selector. The runner forwards all five and names any that are
  missing before the first tap.
- **Android port mapping.** See "Backend reachability" above; the runner
  re-applies `adb reverse` on every run because an emulator reboot drops it.
- **Backend down.** The runner checks and refuses to start, rather than letting
  every flow fail on a screen that blames the seed phrase.

## Conventions

- **Per-flow `clearState + launchApp`**: every action flow recovers
  fresh so it can run stand-alone. Suites use the same building blocks.
- **Selectors**: prefer `id:` (testID) > `text:` > `point:` coords.
  Add testIDs to the component when an element keeps requiring point
  taps.
- **Screenshots** mirror the flows tree (`screenshots/<smoke|actions>/<category>/`).
  Captured outputs are gitignored — only the flow YAML ships.
- **Secrets** never go in flow YAML. Reference env vars and document
  them in `.env.test.example`.
- **Destructive flows** (anything in `actions/reset/`) must be the
  last entry of any orchestrator.
