# DOM parity — the extension is the mobile app on the DOM

`scripts/check-dom-parity.mjs` runs in CI (`pnpm check:parity`, strict) and
locally (`pnpm check:parity:report` prints findings without failing). This
page says **why** each check exists and **what to do** when one trips, for
a person or an agent about to make a change. The script's header lists the
checks; this is the reasoning.

## The rule it protects

Every screen and every kit component exists twice — once in React Native
(`apps/mobile`), once on the DOM (`packages/ui`, `apps/extension`) — on one
contract. A visual decision is taken once, from one token, and the logic
behind a screen lives once in `packages/shared`; each platform is a thin
provider plus rendering. Without a guard the two apps drift apart one small
fix at a time.

## The six checks, and what each one means when it fails

| Check        | It fails when…                                                                                | What to do                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **theme**    | DOM code imports the static `semantic` / `colors`, uses MUI, a hex literal, or `mode ===`     | Read tokens through `useSemantic()` so the component follows light and dark live.                                                                                                                                            |
| **twins**    | a mobile component or route has no DOM counterpart, or the other way round                    | Build the twin. If it never will exist (camera, biometrics, browser APIs), list it in `MOBILE_ONLY` / `DOM_ONLY` / `MOBILE_ONLY_SCREENS` **with the reason** — those maps are the only place a platform difference may live. |
| **contract** | the two twins do not both `extends` the same `*PropsBase` from `packages/shared/src/types/ui` | Put the props both platforms share in the base; each platform's `types.ts` extends it with its own visual extras. Importing the base without extending it does not count.                                                    |
| **dead**     | a contract under `types/ui` has no reader                                                     | Delete it, or wire the component that should read it.                                                                                                                                                                        |
| **screens**  | a mobile route has no DOM screen named in `SCREENS`                                           | Add the DOM screen and name it, or list the route as platform-only with the reason.                                                                                                                                          |
| **clones**   | more lines are duplicated between mobile and the DOM than `CROSS_PLATFORM_CLONE_LINES_MAX`    | See below.                                                                                                                                                                                                                   |

## The clone ceiling — a ratchet, and when it may move

Two renderings of one design legitimately share shape: a row on React
Native and its DOM twin look alike line by line. So the ceiling is not zero.
What the ceiling catches is **logic** copied into both platforms — a
derivation, a state machine, a formatter written twice — which is the
duplication that drifts.

- **It only goes down by hoisting.** When a lot moves logic into
  `packages/shared` (a hook, a util, a contract) and the measured number
  falls, lower the constant to the new number in the same commit. It can
  never climb back for free.
- **It may go up only for new twins.** A new pair of components adds
  rendering that exists twice by design. If the measured number crosses the
  ceiling and the diff holds **no** copied logic, raise the constant to the
  measured number, in a commit whose message names the new twins and says
  the logic lives in shared. Never raise it to make a copied derivation
  pass: hoist the derivation instead.
- **How to tell which case you are in.** Run `pnpm check:parity:report`
  and read the clone pairs jscpd lists. A pair of `*.tsx` bodies that are
  the same JSX on two platforms is rendering; a pair that computes the same
  value twice is logic and belongs in `packages/shared`.

Related: `AGENTS.md` (§ Twins, § Gates that carry a baseline),
`docs/ARCHITECTURE.md` (the twins section), spec 028 (the redesign that
introduced the guard).
