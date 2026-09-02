/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { Chip } from './Chip';
import { ChipGroup } from './ChipGroup';

afterEach(cleanup);

describe('Chip', () => {
  it('announces and fills the selected filter', () => {
    renderInMode('dark', <Chip testID="filter-send" label="SEND" selected onPress={() => {}} />);

    const chip = screen.getByTestId('filter-send');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chip.style.backgroundColor).toBe(asRenderedColor(createSemantic('dark').depth.abyss));
  });

  it('never fills in the outline variant, selected or not', () => {
    renderInMode(
      'dark',
      <Chip testID="badge" label="JUPITER" variant="outline" selected size="sm" />
    );
    expect(screen.getByTestId('badge').style.backgroundColor).toBe('transparent');
  });

  it('takes the light ground when the mode is light', () => {
    const light = createSemantic('light').depth.abyss;
    expect(light).not.toBe(createSemantic('dark').depth.abyss);

    renderInMode('light', <Chip testID="filter-send" label="SEND" selected onPress={() => {}} />);
    expect(screen.getByTestId('filter-send').style.backgroundColor).toBe(asRenderedColor(light));
  });

  it('fires onPress when clicked', () => {
    const onPress = vi.fn();
    renderInMode('dark', <Chip label="History" onPress={onPress} />);

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ChipGroup', () => {
  it('reports the chosen key and marks exactly one chip selected', () => {
    const onChange = vi.fn();
    renderInMode(
      'dark',
      <ChipGroup
        testID="activity-filters"
        options={[
          { key: 'all', label: 'ALL' },
          { key: 'send', label: 'SEND' },
        ]}
        value="all"
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('activity-filters-all').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('activity-filters-send').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByTestId('activity-filters-send'));
    expect(onChange).toHaveBeenCalledWith('send');
  });
});
