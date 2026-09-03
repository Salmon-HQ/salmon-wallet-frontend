/**
 * @vitest-environment jsdom
 *
 * The row's accessible name is what a screen reader lands on, and it has to
 * carry the subtitle: two recipients with the same name are told apart only
 * by the address underneath.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { ListRow } from './ListRow';

afterEach(cleanup);

describe('ListRow', () => {
  it('renders leading, title, subtitle and trailing, and presses', () => {
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <ListRow
        testID="recipient-row"
        leading={<span>L</span>}
        title="Ana"
        subtitle="9xQe…4f2"
        trailing={<span>12 SOL</span>}
        onPress={onPress}
      />
    );

    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('9xQe…4f2')).toBeTruthy();
    expect(screen.getByText('12 SOL')).toBeTruthy();

    fireEvent.click(screen.getByTestId('recipient-row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('names itself with the subtitle so identical titles stay distinguishable', () => {
    renderInMode(
      'dark',
      <ListRow leading={<span>L</span>} title="Ana" subtitle="9xQe…4f2" onPress={() => {}} />
    );

    expect(screen.getByRole('button', { name: 'Ana, 9xQe…4f2' })).toBeTruthy();
  });

  it('forwards accessibilityRole="link" for a row that opens an external URL', () => {
    renderInMode(
      'dark',
      <ListRow
        testID="explorer-row"
        leading={<span>L</span>}
        title="View on explorer"
        onPress={() => {}}
        accessibilityRole="link"
      />
    );

    expect(screen.getByRole('link', { name: 'View on explorer' })).toBeTruthy();
  });

  it('takes its title ink from the active mode', () => {
    renderInMode('dark', <ListRow leading={<span>L</span>} title="Ana" />);
    expect(screen.getByText('Ana').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.primary)
    );
    cleanup();

    renderInMode('light', <ListRow leading={<span>L</span>} title="Ana" />);
    expect(screen.getByText('Ana').style.color).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
  });

  it('is keyboard-operable when pressable', () => {
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <ListRow testID="row" leading={<span>L</span>} title="Ana" onPress={onPress} />
    );

    const row = screen.getByTestId('row');
    row.focus();
    fireEvent.click(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
