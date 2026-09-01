/**
 * A filter chip's selected state is announced, not only painted: colour alone
 * would fail the three-channel rule, and Maestro reads the state, not the fill.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { semantic } from '@salmon/shared';
import { Chip } from './Chip';
import { ChipGroup } from './ChipGroup';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('Chip', () => {
  it('announces and fills the selected filter', () => {
    render(<Chip testID="filter-send" label="SEND" selected onPress={jest.fn()} />);

    const chip = screen.getByTestId('filter-send');
    expect(chip.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(flatten(chip.props.style).backgroundColor).toBe(semantic.depth.abyss);
  });

  it('never fills in the outline variant, selected or not', () => {
    render(<Chip testID="badge" label="JUPITER" variant="outline" selected size="sm" />);

    expect(flatten(screen.getByTestId('badge').props.style).backgroundColor).toBe('transparent');
  });
});

describe('ChipGroup', () => {
  it('reports the chosen key and marks exactly one chip selected', () => {
    const onChange = jest.fn();
    render(
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

    expect(screen.getByTestId('activity-filters-all').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('activity-filters-send').props.accessibilityState.selected).toBe(
      false
    );

    fireEvent.press(screen.getByTestId('activity-filters-send'));
    expect(onChange).toHaveBeenCalledWith('send');
  });
});
