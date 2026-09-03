/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic, fontSize } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { SectionLabel } from './SectionLabel';

afterEach(cleanup);

describe('SectionLabel', () => {
  it('uppercases the caps variant and leaves the others alone', () => {
    renderInMode(
      'dark',
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
    renderInMode('dark', <SectionLabel variant="title">Recent activity</SectionLabel>);
    expect(screen.getByText('Recent activity').style.fontSize).toBe(`${fontSize.bodyLg}px`);
  });

  it('draws the dark and light ink from the active tokens', () => {
    renderInMode('dark', <SectionLabel variant="title">Recent activity</SectionLabel>);
    expect(screen.getByText('Recent activity').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.primary)
    );
    cleanup();

    renderInMode('light', <SectionLabel variant="title">Recent activity</SectionLabel>);
    expect(screen.getByText('Recent activity').style.color).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
  });

  it('announces as a heading, as mobile does with accessibilityRole="header"', () => {
    renderInMode('dark', <SectionLabel variant="title">Recent activity</SectionLabel>);
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeTruthy();
  });

  // `aria-level` is a *required* attribute of `role="heading"`, so a label
  // without one is a critical `aria-required-attr` violation — on every screen
  // this component appears on, which is most of them. The suite asserted the
  // role and not the level, so the whole app shipped the violation until the
  // extension's axe scan reached a settings screen.
  it.each([
    ['title', 2],
    ['group', 3],
    ['caps', 3],
  ] as const)('gives the %s variant a heading level', (variant, level) => {
    renderInMode('dark', <SectionLabel variant={variant}>Danger zone</SectionLabel>);
    expect(screen.getByRole('heading', { level })).toBeTruthy();
  });
});
