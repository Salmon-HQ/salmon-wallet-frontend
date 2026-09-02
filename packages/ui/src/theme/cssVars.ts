/**
 * The resolved semantic set, as CSS custom properties.
 *
 * The DOM kit reads colour two ways: `useSemantic()` in styled code, and
 * `var(--sw-…)` wherever a value has to reach plain CSS — a gradient in a
 * stylesheet, a pseudo-element, a `background-image` data URI. Both come from
 * the same object, so a token can never drift between them.
 *
 * The name of a variable is the token's path: `--sw-<group>-<token>`, with
 * every extra level joined by another `-`. Token names keep their camelCase
 * (custom properties are case-sensitive, and a kebab transform would make the
 * variable un-greppable from the token it mirrors).
 */
import type { Semantic } from '@salmon/shared';

/** Every leaf of `tokens` as a custom-property name → value pair. */
export function semanticToCssVars(tokens: Semantic): Record<string, string> {
  const vars: Record<string, string> = {};

  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      // Tuples (`water.gradient`) index by position: `--sw-water-gradient-0`.
      value.forEach((entry, index) => walk(entry, `${path}-${index}`));
      return;
    }
    if (value !== null && typeof value === 'object') {
      // Records (`water.crestShadow`, `chain.hintInk`) take their key.
      for (const [key, entry] of Object.entries(value)) {
        walk(entry, `${path}-${key}`);
      }
      return;
    }
    vars[path] = String(value);
  };

  for (const [group, entries] of Object.entries(tokens)) {
    walk(entries, `--sw-${group}`);
  }

  return vars;
}

/**
 * Writes the set onto an element (the document root, in the app) and declares
 * the mode to the UA so form controls, scrollbars and the canvas follow it.
 */
export function applySemanticCssVars(
  element: HTMLElement,
  tokens: Semantic,
  mode: 'dark' | 'light'
): void {
  for (const [name, value] of Object.entries(semanticToCssVars(tokens))) {
    element.style.setProperty(name, value);
  }
  element.style.colorScheme = mode;
}
