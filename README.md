# Salmon Wallet


![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![React Native 0.83.6](https://img.shields.io/badge/React%20Native-0.83.6-61dafb?logo=react&logoColor=white)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Solana Web3.js 1.98](https://img.shields.io/badge/@solana%2Fweb3.js-1.98-9945FF?logo=solana&logoColor=white)
![Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

<img width="160" alt="logo-salmon" src="https://github.com/salmonw/salmon-wallet-v2/assets/35810074/ac99529f-aff7-47c6-b443-4a58b41a998d">


**Open Wallet Infrastructure**

Salmon Wallet is an open-source, self-custodial, community-owned wallet built for Solana and the next generation of open financial networks.

Unlike closed wallet platforms, Salmon is designed around transparency, verifiability, and ecosystem alignment. The goal is simple: provide open wallet infrastructure that users, developers, and communities can trust, inspect, and help shape.

> Open source. Self-custody. Community owned.

---

## Why Salmon?

Wallets are one of the most important pieces of crypto infrastructure.

They control:

- Access to applications
- Transaction signing
- Asset management
- Ecosystem discovery
- Default integrations
- User distribution

Most wallet ecosystems remain controlled by private organizations with closed roadmaps and opaque incentives.

Salmon takes a different approach:

- Open-source by default
- Self-custodial architecture
- Community-owned governance
- Verifiable security model
- Ecosystem-neutral integrations
- Built in public

We believe open ecosystems deserve open wallet infrastructure.

---

## Current Platforms

Salmon currently supports:

- Browser Extension
- Web Wallet
- Android App

Coming soon:

- iOS

The project launched in 2022 and continues to evolve with a focus on reliability, security, and ecosystem interoperability.

---

## What Is In This Repo

```text
apps/
├── extension/
├── web/
└── mobile/

packages/
├── shared/
├── ui/
└── assets/

docs/
└── ARCHITECTURE.md
```

### Applications

| Package | Description |
|----------|-------------|
| `apps/extension` | Browser extension built with WXT and React |
| `apps/web` | Web wallet built with Vite and React |
| `apps/mobile` | Mobile wallet built with Expo and React Native |

### Shared Packages

| Package | Description |
|----------|-------------|
| `packages/shared` | Wallet logic, blockchain integrations, APIs, storage, crypto utilities, hooks, types and localization |
| `packages/ui` | Shared React UI components |
| `packages/assets` | Shared fonts and image assets |

---

## Tech Stack

| | Web | Extension | Mobile |
|---|---|---|---|
| **Language** | TypeScript ~5.9 | TypeScript ~5.9 | TypeScript ~5.9 |
| **UI** | React 19.1 | React 19.1 | React 19.2 / React Native 0.83.6 |
| **Framework** | Vite 7 | WXT 0.20 | Expo SDK 55 |
| **Routing** | react-router-dom 7 | react-router-dom 7 | expo-router 55 |
| **Styling** | MUI 7 + Emotion | MUI 7 + Emotion | react-native-paper 5 |
| **Testing** | Vitest + Playwright | Vitest | Jest + Maestro |

**Monorepo tooling:** pnpm Workspaces · Turborepo · ESLint 9

---

## Requirements

- Node.js `^20.19.0` or `^22.12.0`
- pnpm `9.x`

This repository uses `workspace:*` dependencies and requires pnpm.

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install
```

---

## Quick Start

Run all development targets:

```bash
pnpm dev
```

Or run a specific application:

```bash
pnpm web:dev
pnpm extension:dev
pnpm mobile:start
```

Mobile native targets:

```bash
pnpm mobile:ios
pnpm mobile:android
```

---

## Environment Setup

Each application includes example environment files:

```text
apps/web/.env.example
apps/extension/.env.example
apps/mobile/.env.example
apps/mobile/.env.local.example
```

Copy the relevant file before running locally:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/extension/.env.example apps/extension/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Local defaults use `local` environment settings. API URLs can be overridden using the variables documented in each `.env.example`.

---

## Common Commands

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
```

### Web

```bash
pnpm web:build
pnpm web:build:staging
pnpm web:build:prod
```

### Extension

```bash
pnpm extension:build
pnpm extension:build:staging
pnpm extension:build:prod
pnpm extension:build:firefox
pnpm extension:zip:firefox
```

### Mobile

```bash
pnpm mobile -- test
pnpm mobile -- lint
pnpm mobile -- typecheck
```

---

## Browser Extension Source Build

For reproducible extension build notes, see:

```text
SOURCE_BUILD_INSTRUCTIONS.md
```

Firefox build:

```bash
pnpm --filter @salmon/extension build:firefox
```

Output:

```text
apps/extension/dist/firefox-mv2/
```

---

## Testing

Unit and integration tests live with the package or application that owns the behavior:

- Shared wallet logic → `packages/shared`
- Shared UI → `packages/ui`
- Web-specific functionality → `apps/web`
- Extension-specific functionality → `apps/extension`
- Mobile-specific functionality → `apps/mobile`

Run all available tests:

```bash
pnpm test
```

E2E suites are application-owned:

```text
apps/extension/.playwright
apps/web/.playwright
apps/mobile/.maestro
```

Read the suite-local `README.md` and `AGENTS.md` before extending or running E2E tests.

---

## Architecture Principles

The repository follows a simple ownership model:

- Shared cross-platform wallet logic belongs in `packages/shared`
- Shared React UI belongs in `packages/ui`
- React Native code belongs in `apps/mobile`
- Browser-specific runtime code belongs in `apps/web` or `apps/extension`

Before moving code across package boundaries, read:

```text
docs/ARCHITECTURE.md
```

---

## Contributing

We welcome contributors who care about:

- Self-custody
- Open-source infrastructure
- Privacy
- Wallet interoperability
- Solana ecosystem growth

Before opening a PR:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For user-facing copy, update both English and Spanish translations in:

```text
packages/shared/src/locales
```

---

## Security

Never commit:

- Private keys
- Seed phrases
- Secrets
- Production credentials
- Local `.env` files

If you discover a vulnerability, please use responsible disclosure practices and avoid publishing sensitive exploit details publicly.

---

## Vision

Salmon is building more than a wallet.

We're building open wallet infrastructure for users, builders, contributors, and communities that believe crypto should remain open, transparent, and self-sovereign.

Open ecosystems deserve open wallet infrastructure. 🚀

---

## License

Salmon Wallet is released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). See [LICENSE](LICENSE).