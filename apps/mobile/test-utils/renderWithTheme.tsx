/**
 * `render` with the theme provider mounted around it.
 *
 * Every component that reads colour through `useThemedStyles` / `useSemantic`
 * needs a `ThemeProvider` above it, the same way one needs a navigation
 * container. This is that wrapper, plus the one thing a test actually wants
 * from it: the ability to render the same tree in the other mode and compare.
 *
 * The provider is imported by path, not through `@salmon/shared`, so it is
 * the same module instance whether or not the test under it mocks the barrel
 * (`jest.mock('@salmon/shared', () => requireActual('../test-utils/themeTokens'))`
 * re-exports this very file). Two instances would mean two React contexts and
 * a `useTheme` that cannot see this provider.
 */
import { render, type RenderOptions } from '@testing-library/react-native';
import React, { type ReactElement } from 'react';

import { ThemeProvider } from '../../../packages/shared/src/contexts/ThemeContext';

export interface RenderWithThemeOptions extends RenderOptions {
  /** Which mode to render in. Defaults to the shipped deep-water dark. */
  mode?: 'dark' | 'light';
}

export function renderWithTheme(ui: ReactElement, options: RenderWithThemeOptions = {}) {
  const { mode = 'dark', ...renderOptions } = options;

  // `systemScheme` rather than the preference: the provider's stored
  // preference arrives asynchronously, and 'system' + an explicit scheme
  // resolves synchronously on the first render, which is what an assertion
  // made straight after `render` needs.
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider systemScheme={mode}>{children}</ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
