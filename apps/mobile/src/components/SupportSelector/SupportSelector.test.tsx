/**
 * Support rows leave the app, and the glyph has to say so.
 *
 * The right-pointing caret is the promise of a lateral slide — an affordance
 * internal navigation no longer keeps, and one these rows never earned: every
 * one of them hands off to a browser or a mail client. They keep an
 * affordance, but the external-link glyph, not the navigation caret.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../SettingsScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

import { SupportSelector } from './SupportSelector';

const OPTIONS = [
  { id: 'faq', title: 'settings.faq', description: 'settings.faq_desc', url: 'https://x/faq' },
  { id: 'email', title: 'settings.email', description: 'settings.email_desc', url: 'mailto:a@b.c' },
] as any;

function renderSelector() {
  return render(<SupportSelector options={OPTIONS} onOpenLink={jest.fn()} onBack={jest.fn()} />);
}

describe('SupportSelector', () => {
  it('carries no navigation caret', () => {
    const { CaretRightIcon } = jest.requireActual('../../icons');

    expect(renderSelector().UNSAFE_queryAllByType(CaretRightIcon)).toHaveLength(0);
  });

  it('marks every row as leaving the app', () => {
    const { ArrowSquareOutIcon } = jest.requireActual('../../icons');

    expect(renderSelector().UNSAFE_queryAllByType(ArrowSquareOutIcon)).toHaveLength(OPTIONS.length);
  });
});
