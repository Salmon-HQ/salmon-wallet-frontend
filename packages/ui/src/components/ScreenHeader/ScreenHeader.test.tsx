/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { ScreenHeader } from './ScreenHeader';

afterEach(cleanup);

describe('ScreenHeader', () => {
  it('draws no back well at all when there is no onBack, in the titled layout', () => {
    renderInMode('dark', <ScreenHeader title="Powerups" />);

    expect(screen.getByRole('heading', { name: 'Powerups' })).toBeTruthy();
    expect(screen.queryByTestId('screen-header-back-button')).toBeNull();
  });

  it('puts the back well and the title on one row, the subtitle under it', () => {
    renderInMode(
      'dark',
      <ScreenHeader title="Recovery phrase" subtitle="Write it down" onBack={() => {}} />
    );

    const row = screen.getByTestId('screen-header-title-row');
    expect(row.contains(screen.getByTestId('screen-header-back-button'))).toBe(true);
    expect(row.contains(screen.getByRole('heading', { name: 'Recovery phrase' }))).toBe(true);
    expect(screen.getByText('Write it down')).toBeTruthy();
  });

  it('fires onBack when the well is pressed', () => {
    const onBack = vi.fn();
    renderInMode('dark', <ScreenHeader title="Send" onBack={onBack} />);

    fireEvent.click(screen.getByTestId('screen-header-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('draws the step indicator centred, in the untitled layout', () => {
    renderInMode(
      'dark',
      <ScreenHeader onBack={() => {}} stepIndicator={{ totalSteps: 3, currentStep: 2 }} />
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByTestId('screen-header-back-button')).toBeTruthy();
  });

  it('takes the light title ink when the mode is light', () => {
    const light = createSemantic('light').text.primary;
    const dark = createSemantic('dark').text.primary;
    expect(light).not.toBe(dark);

    renderInMode('light', <ScreenHeader title="Send" />);
    const heading = screen.getByRole('heading', { name: 'Send' });
    expect(heading.style.color).toBe(asRenderedColor(light));
  });

  it('defaults the back label to the shared "go back" key mobile uses', () => {
    renderInMode('dark', <ScreenHeader title="Send" onBack={() => {}} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('takes a custom back label', () => {
    renderInMode('dark', <ScreenHeader title="Analytics" onBack={() => {}} backLabel="Decline" />);
    expect(screen.getByLabelText('Decline')).toBeTruthy();
  });

  it('is keyboard-operable: focus then Enter fires onBack', () => {
    const onBack = vi.fn();
    renderInMode('dark', <ScreenHeader onBack={onBack} />);

    const button = screen.getByTestId('screen-header-back-button');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
