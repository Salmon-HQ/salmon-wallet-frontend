/**
 * What this hook must not get wrong is identity.
 *
 * A stylesheet that is recreated per render silently un-memoises every child
 * it is passed to, and a stylesheet that is *not* recreated when the mode
 * changes is exactly the module-scope bug this hook exists to remove. Both
 * directions are asserted here.
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../test-utils/themeTokens') }));

import type { Semantic } from '@salmon/shared';

import { renderWithTheme } from '../../test-utils/renderWithTheme';
import { useSemantic, useThemedStyles } from './useThemedStyles';

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    label: { color: t.text.primary, backgroundColor: t.depth.column },
  });

/** Records every stylesheet identity the hook has handed out. */
const seen: unknown[] = [];

function Probe({ tag }: { tag: string }) {
  const styles = useThemedStyles(stylesFor);
  const t = useSemantic();
  seen.push(styles);
  return (
    <Text testID={tag} style={styles.label}>
      {t.text.primary}
    </Text>
  );
}

beforeEach(() => {
  seen.length = 0;
});

describe('useThemedStyles', () => {
  it('hands two components the same object — the factory ran once', () => {
    renderWithTheme(
      <>
        <Probe tag="a" />
        <Probe tag="b" />
      </>
    );

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(1);
  });

  it('keeps the same object across a re-render', () => {
    const { rerender } = renderWithTheme(<Probe tag="a" />);
    const first = seen[0];

    rerender(<Probe tag="a" />);

    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(first);
  });

  it('produces a different object — and different colour — in the other mode', () => {
    const dark = renderWithTheme(<Probe tag="dark" />, { mode: 'dark' });
    const darkStyles = seen[0];
    const darkInk = dark.getByTestId('dark').props.children;

    seen.length = 0;
    const light = renderWithTheme(<Probe tag="light" />, { mode: 'light' });
    const lightStyles = seen[0];
    const lightInk = light.getByTestId('light').props.children;

    expect(lightStyles).not.toBe(darkStyles);
    expect(lightInk).not.toBe(darkInk);
  });

  it('returns the cached object again when the first mode comes back', () => {
    renderWithTheme(<Probe tag="a" />, { mode: 'dark' });
    const first = seen[0];

    seen.length = 0;
    renderWithTheme(<Probe tag="a" />, { mode: 'light' });

    seen.length = 0;
    renderWithTheme(<Probe tag="a" />, { mode: 'dark' });

    expect(seen[0]).toBe(first);
  });
});

describe('useSemantic', () => {
  it('follows the mode', () => {
    const dark = renderWithTheme(<Probe tag="dark" />, { mode: 'dark' });
    const light = renderWithTheme(<Probe tag="light" />, { mode: 'light' });

    expect(dark.getByTestId('dark').props.children).not.toBe(
      light.getByTestId('light').props.children
    );
  });
});
