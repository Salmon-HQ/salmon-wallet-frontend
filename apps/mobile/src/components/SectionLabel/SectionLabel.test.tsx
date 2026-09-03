/**
 * `caps` uppercases in the component rather than in the locale file: a
 * translator should never have to ship a shouting string, and Spanish
 * uppercasing is not something a JSON value can be trusted to carry.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { fontSize, s } from '@salmon/shared';
import { SectionLabel } from './SectionLabel';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('SectionLabel', () => {
  it('uppercases the caps variant and leaves the others alone', () => {
    render(
      <>
        <SectionLabel variant="caps">Installed</SectionLabel>
        <SectionLabel variant="group">Today</SectionLabel>
        <SectionLabel variant="title">Recent activity</SectionLabel>
      </>
    );

    expect(screen.getByText('INSTALLED')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Recent activity')).toBeTruthy();
  });

  it('sizes each variant off the type scale', () => {
    render(<SectionLabel variant="title">Recent activity</SectionLabel>);

    expect(flatten(screen.getByText('Recent activity').props.style).fontSize).toBe(
      s(fontSize.bodyLg)
    );
  });
});
