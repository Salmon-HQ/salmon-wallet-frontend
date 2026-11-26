/**
 * @vitest-environment jsdom
 *
 * The extension swaps onboarding pages by unmounting them, which drops focus
 * to <body>: the new page's title takes it so a screen reader reads where the
 * user is, unless the page already focused a field itself.
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { OnboardingTitle } from './OnboardingText';

afterEach(cleanup);

describe('OnboardingTitle', () => {
  it('takes focus when the page lands with focus on the body, without a ring', () => {
    renderInMode('dark', <OnboardingTitle>Choose your networks</OnboardingTitle>);

    const title = screen.getByRole('heading', { level: 1, name: 'Choose your networks' });
    expect(document.activeElement).toBe(title);
    expect(title.getAttribute('tabindex')).toBe('-1');
    expect(title.style.outline).toBe('none');
  });

  it('leaves focus on a field the page focused itself', () => {
    renderInMode(
      'dark',
      <>
        <OnboardingTitle>Set a password</OnboardingTitle>
        <input aria-label="Password" autoFocus />
      </>
    );

    expect(document.activeElement).toBe(screen.getByLabelText('Password'));
  });
});
