# Feature Specification: Light mode — theme infrastructure and the mobile migration

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `021-light-theme`)
**Created**: 2026-09-01 · **Status**: Draft — implementation starts after spec 020 P2 (colors → semantic) lands

Owner rulings (2026-09-01): the product ships two modes, deep-water first; the light palette's source is `product.pen` (drawn light, `#F7F8FA` ground) mapped onto the existing ramp — never loose hex; Settings gains the "Appearance" row CORE 11 draws (System / Light / Dark, System by default). DESIGN.md §Two modes keeps the mechanism (index flip through one resolver) and the invariants; where the `.pen` draws a value, the `.pen` wins; where it does not, DESIGN.md's draft fills in. Shadows are rebuilt from the material rules, not inverted (DESIGN.md:307).

## The light resolver — `.pen` value → ramp step → semantic token

`.pen` variables: background `#F7F8FA`, surface `#FFFFFF`, border `#E4E7EC`, border-strong `#CDD2DA`, text-primary `#202636`, ink `#161C2D`, text-secondary `#667085`, text-muted `#98A2B3`, brand-primary `#FF5C45`, brand-primary-hover `#E84B36`, brand-primary-soft `#FFF0ED`, on-primary `#FFFFFF`, success `#18A66A`/soft `#EAF8F1`, warning `#D99000`/soft `#FFF6DD`, danger `#D83A52`/soft `#FDECEF`, info `#3478F6`.

| Semantic token | Dark (today) | Light | Source |
|---|---|---|---|
| `depth.column` (screen ground) | neutral-975 | **neutral-25** (`#F6F8FB` ≈ `.pen` background) | .pen |
| `depth.abyss` (deepest) | neutral-1000 | neutral-50 | DESIGN draft, reordered under the `.pen` ground |
| `surface.shelf` / `surface.raised` (cards) | neutral-925 / 900 | **neutral-0** (`.pen` surface white) | .pen |
| `surface.crest` | — | neutral-25 | derived |
| `surface.bedrock` (seed/keys ground) | opaque dark | neutral-0 opaque | rule: opaque, never a membrane |
| `text.primary` | neutral-0 | **neutral-850** (`#212938` ≈ `#202636`) | .pen |
| headline ink (`ScreenHeader`, balances) | neutral-0 | neutral-900 (`#161C2D` = `.pen` ink, exact) | .pen |
| `text.secondary` | neutral-300 | **neutral-600** (`#58637B`; `.pen` `#667085` ≈ neutral-500 measures 4.9:1, 600 gives headroom for 14px medium) ⚠ | .pen + AA |
| `text.tertiary` | neutral-400 | **neutral-500** (`.pen` muted `#98A2B3` ≈ neutral-400 is 3.3:1 on white — fails AA for text) ⚠ | AA over .pen |
| `text.disabled` | — | neutral-400 (non-text use only) | derived |
| `border.default` (card hairline) | neutral-600 | **neutral-100** (`#DDE3ED` ≈ `.pen` border) — decorative edge, exempt from 1.4.11 | .pen |
| `border.strong` | neutral-400 | neutral-200 (`#C3CBDA` ≈ `.pen` border-strong) | .pen |
| `input.edge`, `step.inactive`, any 3:1 UI boundary | border.default | **neutral-500** | DESIGN.md asymmetry rule |
| `accent.fill` | salmon-500 | salmon-500 (invariant) | DESIGN |
| `accent.onFill` / `text.onAccent` | neutral-1000 | neutral-1000 (invariant; `.pen` draws white-on-salmon — rejected: 6.50:1 vs 2.9:1) ⚠ | DESIGN over .pen |
| `text.accent` / `accent.ink` | salmon-300/500 | salmon-700 (5.45:1 on white) | DESIGN |
| `accent.tint` | salmon at low α | salmon-50 (`#FFF1EE` ≈ `.pen` soft) | .pen |
| `status.success` / `.danger` / `.warning` inks | 300/500 | 700 steps | derived (AA on white) |
| `status.*Tint` | dark tints | the `.pen` soft values mapped to the status ramps' lightest step (add a 50/100 step per status ramp if missing) | .pen |
| `overlay.backdrop`, `overlay.scrim` | abyss @ α | neutral-900 @ same α | derived |
| `skeleton.base` / `.highlight` | raised / neutral-800 | neutral-50 / neutral-100 | derived, ≥1.3:1 |
| `scanner.*` | depth steps | stays dark (camera overlay is always dark) | ruling |
| `flesh`, `scales`, `water`, thermocline alphas | — | re-tuned in a dedicated pass; first landing keeps the material dark-only on light ground **hidden** (backgrounds render the light ground flat) ⚠ | rule: rebuild, don't invert |

⚠ = decisions taken while the owner was away; review on return.

## Infrastructure (from `specs/020-codebase-cleanup/research-shared.md` §1.3)
- `packages/shared/src/theme/semantic.ts`: `export function createSemantic(mode: 'dark' | 'light'): Semantic` built from one resolver map (`Record<SemanticToken, RampRef>` per mode); `export const semantic = createSemantic('dark')` stays, same shape, so web/extension/ui and the 27 JSX-only mobile files keep compiling untouched.
- `contrast.test.ts` parameterised over both modes; dark assertions unchanged; light assertions added for every text/ground pair and 3:1 boundary.
- `packages/shared/src/contexts/ThemeContext.tsx` (RN-agnostic, modelled on `CurrencyContext`): `<ThemeProvider systemScheme>` resolves `preference ('system'|'light'|'dark') + systemScheme → mode`, memoises `createSemantic(mode)`, exposes `useTheme(): { mode, preference, setPreference, semantic }`; persists under new `STORAGE_KEYS.APPEARANCE` via `getStorage()` exactly as `CurrencyContext` does. Mobile passes `useColorScheme()`; the OS reader never enters shared.
- `apps/mobile/src/theme/useThemedStyles.ts`: `useThemedStyles(factory)` with a WeakMap cache per mode — each file's `StyleSheet.create` still runs once per mode.
- Mobile migration: the ~80 files with module-scope `StyleSheet.create` reading `semantic.*` become `const stylesFor = (t: Semantic) => StyleSheet.create(...)` + `const styles = useThemedStyles(stylesFor)`; `ScalesBackground`/`DepthBackground` module destructures and `app/_layout.tsx`'s navigation theme become mode-derived.
- Settings: "Appearance" row in the Preferences group (CORE 11), value System/Light/Dark, a single-choice panel like Language; EN+ES keys (Spanish "Apariencia", "Sistema", "Claro", "Oscuro" are certain).

## Out of scope
packages/ui, web and extension (they keep the static dark `semantic`); swap/bridge; the underwater material's light re-tune beyond the flat-ground first landing.
