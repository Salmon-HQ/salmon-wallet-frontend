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
   - `SALMON_TEST_SEED_B` — Wallet B seed (12 words, holds the
     Salmon Logo NFT)
   - `SALMON_TEST_WALLET_A_ADDR` — Wallet A Solana address
   - `SALMON_TEST_WALLET_B_ADDR` — Wallet B Solana address

## Pre-flight

Before running `suites/actions.yaml` or any single action flow, check what
Wallet A / Wallet B actually hold — a quick RPC query against
`SALMON_TEST_WALLET_A_ADDR` / `SALMON_TEST_WALLET_B_ADDR`
(`solana balance <addr>`, `getTokenAccountsByOwner`) or opening the app
and checking Home/Collectibles. These are real mainnet wallets.

Per-flow prerequisites:

| Flow | Needs |
|---|---|
| `auth/*`, `home/*`, `settings/*` (smoke), connect/sign | nothing — no funds required |
| `actions/send/sol-transfer.yaml` | Wallet A: SOL for fee + 0.001 SOL |
| `actions/swap/*` | Wallet A: balance of the input token |
| `actions/nft/*` | Wallet B: the Salmon Logo NFT |

Repo policy: a flow that finds its prerequisite missing skips with a clear
message, never a cryptic failure. If the backend is reachable but behaves
wrong, the flow fails — it does not skip.

## Running

> **Working directory matters.** `takeScreenshot` paths in the flow YAML
> are resolved relative to the directory you invoke Maestro from. The
> flows here use `screenshots/<smoke|actions>/...`, so you MUST run
> Maestro from `apps/mobile/.maestro/`. Running from anywhere else
> creates a stray `screenshots/` folder at that cwd — the repo-root
> `.gitignore` blocks the obvious mis-locations defensively, but the
> right thing is to `cd` first.

```bash
cd apps/mobile/.maestro
set -a && . ./.env.test && set +a
export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000

# Read-only smoke
maestro test suites/smoke.yaml

# State-modifying actions (authorized per run)
maestro test suites/actions.yaml

# Single flow
maestro test flows/actions/send/sol-transfer.yaml \
  -e SALMON_TEST_SEED_A="$SALMON_TEST_SEED_A" \
  -e SALMON_TEST_PASSWORD="$SALMON_TEST_PASSWORD" \
  -e SALMON_TEST_WALLET_B_ADDR="$SALMON_TEST_WALLET_B_ADDR"
```

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
