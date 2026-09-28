# Implementation Plan: End-to-end suites rebuilt on the definitive layout

**Branch**: `feat/powerups-foundations` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Fix every stale selector and coordinate tap found by the audit
([research.md](./research.md)), make the onboarding/recovery subflows and the
extension helpers handle every intermediate screen by condition, add a
preflight to both runners, classify the legacy extension drivers, and add a
CI selector audit so the suites cannot drift again. Then run both suites
unattended to prove it, and record the traps in the global skills.

## Technical Context

**Language/Version**: YAML (Maestro 2.x), TypeScript (Playwright 1.63), Node 24 for scripts

**Primary Dependencies**: Maestro CLI, `@playwright/test`, adb

**Testing**: the suites themselves; the audit script has its own `node --test` file like `check-dom-parity`

**Target Platform**: Android emulator (gesture + 3-button); Chromium with the MV3 build. iOS deferred (Xcode 26.4 needs macOS 26.2).

**Constraints**: no EAS; secrets only from gitignored `.env.test`; state-modifying flows devnet-only and last

## Constitution Check

| Principle              | Status   | Note                                                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| I. Ownership           | Pass     | Suites stay next to their apps; the audit script sits beside the other repo checks in `scripts/`. |
| III. Wallet safety     | Pass     | No product code path changes except added testIDs; secrets never printed.                         |
| V. Functional coverage | Pass     | This is the E2E layer the constitution keeps next to each app.                                    |
| Quality gates          | Required | The new audit joins CI; renamed testIDs traced through both suites.                               |

## Structure

```text
scripts/check-e2e-selectors.mjs (+ .test.mjs)   # drift guard (R5)
apps/mobile/.maestro/
├── run.sh                 # + device, bundle prewarm, SDK match, single-run lock
├── subflows/*.yaml        # onboarding/recovery through every intermediate screen
└── flows/**               # stale selectors and point taps fixed (R1)
apps/extension/.playwright/
├── helpers.ts, global-setup.ts   # sleeps out, preflight in
├── tests/*.spec.ts               # stale selectors fixed; ported drivers
└── scripts/                      # capture tools only, documented
~/.claude/skills/{maestro-mobile-testing,playwright-web-testing}/SKILL.md
```

## Order

1. Audit script first (red on today's stale selectors), wired into CI.
2. Mobile: subflows → stale flows → point taps (add testIDs) → run.sh preflight → unattended smoke run on Android.
3. Extension: helpers/sleeps → stale specs → port drivers, delete obsolete → preflight → unattended run.
4. Skills and suite READMEs.
