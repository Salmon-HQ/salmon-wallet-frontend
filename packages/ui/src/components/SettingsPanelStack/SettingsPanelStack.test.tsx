/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../LoadingScreen', () => ({
  LoadingScreen: ({ title }: { title?: string }) => <div data-testid="loading-screen">{title}</div>,
}));

import { SettingsPanelStack } from './SettingsPanelStack';
import type { PanelRegistry } from './types';

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

const makeRegistry = (): PanelRegistry => ({
  accounts: () => <div data-testid="panel-accounts">A</div>,
  avatar: () => <div data-testid="panel-avatar">A</div>,
  security: () => <div data-testid="panel-security">A</div>,
  backup: () => <div data-testid="panel-backup">A</div>,
  privateKey: () => <div data-testid="panel-privateKey">A</div>,
  language: () => <div data-testid="panel-language">A</div>,
  currency: () => <div data-testid="panel-currency">A</div>,
  explorer: () => <div data-testid="panel-explorer">A</div>,
  appearance: () => <div data-testid="panel-appearance">A</div>,
  addressBook: () => <div data-testid="panel-addressBook">A</div>,
  trustedApps: () => <div data-testid="panel-trustedApps">A</div>,
  about: () => <div data-testid="panel-about">A</div>,
  support: () => <div data-testid="panel-support">A</div>,
});

const renderStack = (
  overrides?: Partial<React.ComponentProps<typeof SettingsPanelStack>>,
  mode: 'dark' | 'light' = 'dark'
) => {
  stubMatchMedia();
  return renderInMode(
    mode,
    <SettingsPanelStack
      visible
      onClose={vi.fn()}
      panelRegistry={makeRegistry()}
      developerNetworksEnabled={false}
      onDeveloperNetworksToggle={vi.fn()}
      onRemoveWallet={vi.fn()}
      onRemoveAllWallets={vi.fn()}
      {...overrides}
    />
  );
};

describe('SettingsPanelStack — menu routing', () => {
  // Mocked t() returns the labelKey itself (no fallback in render path).
  const cases: Array<[string, string]> = [
    ['settings.currency', 'panel-currency'],
    ['settings.private_key', 'panel-privateKey'],
    ['settings.display_language', 'panel-language'],
    ['settings.select_explorer', 'panel-explorer'],
    ['settings.appearance', 'panel-appearance'],
    ['settings.backup', 'panel-backup'],
    ['settings.profile_picture', 'panel-avatar'],
    ['settings.address_book', 'panel-addressBook'],
    ['settings.trusted_apps', 'panel-trustedApps'],
    ['settings.about', 'panel-about'],
    ['settings.help_support', 'panel-support'],
  ];

  it.each(cases)('clicking "%s" pushes %s', async (label, expectedTestId) => {
    renderStack();
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      expect(screen.getByTestId(expectedTestId)).toBeTruthy();
    });
    const otherIds = cases.map(([, id]) => id).filter((id) => id !== expectedTestId);
    for (const id of otherIds) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it('states the current choice beside a choosable row', () => {
    renderStack({ rowValues: { language: 'English', currency: 'USD' } });

    expect(screen.getByTestId('settings-item-display-language-value').textContent).toBe('English');
    expect(screen.getByTestId('settings-item-display-currency-value').textContent).toBe('USD');
  });

  it('runs the danger actions instead of pushing a screen', () => {
    const onRemoveWallet = vi.fn();
    renderStack({ onRemoveWallet });
    fireEvent.click(screen.getByRole('button', { name: 'settings.wallets.remove_wallet' }));
    expect(onRemoveWallet).toHaveBeenCalled();
  });
});

describe('SettingsPanelStack — a toggle row announces once', () => {
  // The switch is the only control on the row; the row itself is not a button.
  const toggles: Array<[string, string]> = [
    ['settings.developer_networks', 'settings-developer-networks-toggle'],
    ['settings.unverified_tokens', 'settings-unverified-tokens-toggle'],
    ['settings.analytics', 'settings-analytics-toggle'],
  ];

  it.each(toggles)('"%s" is a switch and not also a button', (label) => {
    renderStack();

    expect(screen.getByRole('switch', { name: label })).toBeTruthy();
    expect(screen.queryByRole('button', { name: label })).toBeNull();
  });

  it.each(toggles)('"%s" keeps its e2e handle on the control', (_label, testId) => {
    renderStack();

    expect(screen.getByTestId(testId)).toBeTruthy();
  });

  it('reports each toggle through its own switch', () => {
    const onDeveloperNetworksToggle = vi.fn();
    const onUnverifiedTokensToggle = vi.fn();
    renderStack({ onDeveloperNetworksToggle, onUnverifiedTokensToggle });

    fireEvent.click(screen.getByTestId('settings-developer-networks-toggle'));
    expect(onDeveloperNetworksToggle).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByTestId('settings-unverified-tokens-toggle'));
    expect(onUnverifiedTokensToggle).toHaveBeenCalledWith(true);
  });
});

describe('SettingsPanelStack — the screen reads the mode', () => {
  it('draws the danger label in the light danger ink under light', () => {
    renderStack(undefined, 'light');
    const light = createSemantic('light').status.danger;
    expect(light).not.toBe(createSemantic('dark').status.danger);
    expect(screen.getByText(/settings\.sections\.danger_zone/i).style.color).toBe(
      asRenderedColor(light)
    );
  });
});

describe('SettingsPanelStack — a rebuilt registry does not remount the panel', () => {
  // The registries in the apps are built by a `useMemo` whose deps include app
  // state, so every entry gets a fresh function identity whenever that state
  // moves. Mounting the entry as a component type made React read that as a
  // different component and throw the panel's state away mid-flight.
  function Counting(): React.ReactElement {
    const [count, setCount] = React.useState(0);
    return (
      <button type="button" data-testid="panel-counter" onClick={() => setCount((c) => c + 1)}>
        {count}
      </button>
    );
  }

  function Harness(): React.ReactElement {
    const [, force] = React.useState(0);
    // Rebuilt every render, exactly like the app registries.
    const registry = { ...makeRegistry(), accounts: () => <Counting /> } as PanelRegistry;
    return (
      <>
        <button type="button" data-testid="rerender" onClick={() => force((n) => n + 1)} />
        <SettingsPanelStack
          visible
          onClose={vi.fn()}
          panelRegistry={registry}
          developerNetworksEnabled={false}
          onDeveloperNetworksToggle={vi.fn()}
          onRemoveWallet={vi.fn()}
          onRemoveAllWallets={vi.fn()}
        />
      </>
    );
  }

  it('keeps the open panel’s state when the parent re-renders', async () => {
    stubMatchMedia();
    renderInMode('dark', <Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.accounts.title' }));
    await waitFor(() => expect(screen.getByTestId('panel-counter')).toBeTruthy());

    fireEvent.click(screen.getByTestId('panel-counter'));
    expect(screen.getByTestId('panel-counter').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('rerender'));

    expect(screen.getByTestId('panel-counter').textContent).toBe('1');
  });
});

describe('SettingsPanelStack — a panel raises the wait on the stack', () => {
  const waitingRegistry = (): PanelRegistry => ({
    ...makeRegistry(),
    about: ({ onWait }) => (
      <button data-testid="panel-wait-trigger" onClick={() => onWait({ title: 'Adding' })}>
        wait
      </button>
    ),
    support: ({ onClose }) => (
      <button data-testid="panel-close-trigger" onClick={onClose}>
        close
      </button>
    ),
  });

  it('shows the wait the panel asked for', async () => {
    renderStack({ panelRegistry: waitingRegistry() });
    fireEvent.click(screen.getByRole('button', { name: 'settings.about' }));

    await waitFor(() => screen.getByTestId('panel-wait-trigger'));
    expect(screen.queryByTestId('loading-screen')).toBeNull();

    fireEvent.click(screen.getByTestId('panel-wait-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('loading-screen').textContent).toBe('Adding');
    });
  });

  it('lets a panel close the whole settings surface', async () => {
    const onClose = vi.fn();
    renderStack({ onClose, panelRegistry: waitingRegistry() });
    fireEvent.click(screen.getByRole('button', { name: 'settings.help_support' }));

    await waitFor(() => screen.getByTestId('panel-close-trigger'));
    fireEvent.click(screen.getByTestId('panel-close-trigger'));

    expect(onClose).toHaveBeenCalled();
  });

  it('opens straight onto a seeded panel, without flashing the root first', () => {
    renderStack({ initialPanels: [{ screen: 'backup' }] });
    expect(screen.getByTestId('panel-backup')).toBeTruthy();
  });
});
