/**
 * `useThemedStyles` — the mobile app's one way to read colour in a stylesheet.
 *
 * ## Why this exists
 *
 * React Native captures `StyleSheet.create`'s result into a module's closure
 * at import time. A module-scope block that reads `semantic.text.primary` has
 * therefore already resolved a hex before the first component mounts, and no
 * amount of re-rendering — or remounting — will ever change it. That is the
 * single blocker between this app and a runtime light mode
 * (`specs/020-codebase-cleanup/research-shared.md` §1.2).
 *
 * The fix is to move the block into a factory and call it inside the
 * component:
 *
 * ```tsx
 * const stylesFor = (t: Semantic) =>
 *   StyleSheet.create({ title: { color: t.text.primary } });
 *
 * export function Title() {
 *   const styles = useThemedStyles(stylesFor);
 *   return <Text style={styles.title} />;
 * }
 * ```
 *
 * ## Why the cache
 *
 * Naively, that runs `StyleSheet.create` on every render of every component —
 * ~80 files' worth. The factory is a module constant, so it is a stable
 * identity that can key a `WeakMap`: each factory's block is created **once
 * per mode** for the whole process, and every consumer of it shares one style
 * object. A `useMemo` would give one entry per component instance instead;
 * the WeakMap gives one per factory, which is what the module-scope block
 * used to give and what memoised children downstream expect.
 *
 * The map is weak so a factory that goes away with its module (fast refresh,
 * a lazily-required screen) takes its cached styles with it.
 *
 * Factories that build something other than a stylesheet — a tone→ink record,
 * for instance — do not belong here; call {@link useSemantic} and build them
 * inline. They cost an object literal, not a `StyleSheet.create`.
 */
import type { Semantic, ThemeMode } from '@salmon/shared';
import { ThemeContext, semantic as deepWater } from '@salmon/shared';
import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

/**
 * The active mode and its tokens, or deep water when nothing provides them.
 *
 * `useTheme()` throws without a `ThemeProvider`, which is the right contract
 * for a screen and the wrong one for a leaf: `Card`, `ListRow`, `IconBubble`
 * and the rest of the kit are rendered in isolation by ~40 component tests,
 * and the app mounts exactly one provider, at the root, above every one of
 * them. Falling back to the shipped dark set means a provider-less render is
 * the mode the product has always had rather than a crash — and it keeps the
 * kit's migration from rippling into every test that ever renders a card.
 * Anything inside the app is under the provider and follows the mode.
 */
function useThemeOrDeepWater(): { mode: ThemeMode; semantic: Semantic } {
  return useContext(ABSENT_THEME_FALLBACK) ?? { mode: 'dark', semantic: deepWater };
}

/**
 * Stands in when the barrel itself was mocked without the context.
 *
 * Component tests here routinely hand-list the slice of `@salmon/shared` they
 * need, and `useContext` throws on `undefined` rather than returning it — so
 * without this a test that never asked for a theme would fail on
 * `$$typeof` instead of on anything it was written to check. The cast is the
 * honest description of a mocked module: the type says the export is always
 * there, the runtime says otherwise.
 */
const ABSENT_THEME = createContext<{ mode: ThemeMode; semantic: Semantic } | null>(null);
const ABSENT_THEME_FALLBACK = (ThemeContext ?? ABSENT_THEME) as typeof ABSENT_THEME;

/** A module-constant factory. Its identity is the cache key, so it must not be inline. */
type StyleFactory<T> = (t: Semantic) => T;

/**
 * factory → mode → the stylesheet that factory produces for that mode.
 * `unknown` because one map holds every factory's differently-shaped result;
 * the cast on the way out is guarded by the key's own type.
 */
const cache = new WeakMap<StyleFactory<never>, Partial<Record<ThemeMode, unknown>>>();

/**
 * The active mode's stylesheet for `factory`, created once per mode.
 *
 * @param factory A module-scope function of the tokens. Defining it inside a
 * component defeats the cache: a new identity every render is a new entry and
 * a fresh `StyleSheet.create` each time.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (t: Semantic) => T
): T {
  const { mode, semantic } = useThemeOrDeepWater();

  const key = factory as unknown as StyleFactory<never>;
  let byMode = cache.get(key);
  if (!byMode) {
    byMode = {};
    cache.set(key, byMode);
  }

  const hit = byMode[mode];
  if (hit) {
    return hit as T;
  }

  const created = factory(semantic);
  byMode[mode] = created;
  return created;
}

/**
 * The active mode's tokens, for colour read straight in JSX — an icon's
 * `color`, a `placeholderTextColor`, a tone record built at render.
 *
 * A thin alias of `useTheme().semantic`: the point is that a component reading
 * one token does not have to know a context called "theme" exists, and that
 * `semantic.` at a call site becomes `t.` uniformly whether it came from here
 * or from a style factory.
 */
export function useSemantic(): Semantic {
  return useThemeOrDeepWater().semantic;
}

/**
 * The active mode, for the handful of places where the *drawing* changes
 * rather than a colour: the backgrounds whose underwater material is deferred
 * on a light ground, and the status bar's light/dark glyphs.
 *
 * Same provider-less fallback as the other two — a component that reads the
 * mode outside the app renders the mode the app has always had.
 */
export function useThemeMode(): ThemeMode {
  return useThemeOrDeepWater().mode;
}
