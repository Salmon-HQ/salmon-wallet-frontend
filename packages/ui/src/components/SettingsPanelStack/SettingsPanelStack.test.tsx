/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@salmon/shared', () => {
  type StackEntry = { screen: string; props?: unknown };
  const useSettingsPanelStack = () => {
    const [stack, setStack] = React.useState<StackEntry[]>([]);
    const push = React.useCallback(
      (screen: string, props?: unknown) => setStack((p) => [...p, { screen, props }]),
      []
    );
    const pop = React.useCallback(() => setStack((p) => (p.length ? p.slice(0, -1) : p)), []);
    const reset = React.useCallback(() => setStack([]), []);
    return {
      stack,
      push,
      pop,
      reset,
      current: stack.length ? stack[stack.length - 1] : null,
      canGoBack: stack.length > 0,
    };
  };
  return {
    useSettingsPanelStack,
    getSettingsItemTestId: (id: string) => `settings-item-${id}`,
    trackEvent: vi.fn(),
    semantic: { status: { danger: '#f00', dangerTint: '#400' } },
    colors: {
      accent: { primary: '#f60' },
      background: { primary: '#000', card: '#111' },
      border: { default: '#333' },
      dialog: { overlay: '#0008' },
      text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
      sheet: { backdrop: '#0008' },
    },
    spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    fontSize: { label: 10, caption: 12, body: 14, heading: 18 },
    fontWeight: { regular: 400, medium: 500, semibold: 600 },
    letterSpacing: { label: 0.3 },
    borderWidth: { thin: 1 },
    shadowsCSS: { none: 'none', sheet: 'none', card: 'none' },
    opacity: { full: 1, half: 0.5, disabled: 0.5 },
    componentSizes: { backButtonSize: 40, drawerWidth: 320 },
    durationMs: { fast: 150, normal: 300, medium: 250, slow: 400 },
  };
});

import { SettingsPanelStack } from './SettingsPanelStack';
import type { PanelRegistry } from './types';

const makeRegistry = (): PanelRegistry => ({
  accounts: () => <div data-testid="panel-accounts">A</div>,
  avatar: () => <div data-testid="panel-avatar">A</div>,
  security: () => <div data-testid="panel-security">A</div>,
  backup: () => <div data-testid="panel-backup">A</div>,
  privateKey: () => <div data-testid="panel-privateKey">A</div>,
  language: () => <div data-testid="panel-language">A</div>,
  currency: () => <div data-testid="panel-currency">A</div>,
  explorer: () => <div data-testid="panel-explorer">A</div>,
  addressBook: () => <div data-testid="panel-addressBook">A</div>,
  trustedApps: () => <div data-testid="panel-trustedApps">A</div>,
  about: () => <div data-testid="panel-about">A</div>,
  support: () => <div data-testid="panel-support">A</div>,
});

const renderStack = () =>
  render(
    <SettingsPanelStack
      visible
      onClose={vi.fn()}
      panelRegistry={makeRegistry()}
      developerNetworksEnabled={false}
      onDeveloperNetworksToggle={vi.fn()}
      onRemoveWallet={vi.fn()}
      onRemoveAllWallets={vi.fn()}
    />
  );

describe('SettingsPanelStack — menu routing', () => {
  // Mocked t() returns the labelKey itself (no fallback in render path).
  const cases: Array<[string, string]> = [
    ['settings.currency', 'panel-currency'],
    ['settings.private_key', 'panel-privateKey'],
    ['settings.display_language', 'panel-language'],
    ['settings.explorer', 'panel-explorer'],
    ['settings.backup', 'panel-backup'],
    ['settings.profile_picture', 'panel-avatar'],
    ['settings.address_book', 'panel-addressBook'],
    ['settings.trusted_apps', 'panel-trustedApps'],
    ['settings.about', 'panel-about'],
    ['settings.help_support', 'panel-support'],
  ];

  it.each(cases)('clicking "%s" pushes %s', async (label, expectedTestId) => {
    renderStack();
    const btn = screen.getByRole('button', { name: label });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByTestId(expectedTestId)).toBeTruthy();
    });
    const otherIds = cases.map(([, id]) => id).filter((id) => id !== expectedTestId);
    for (const id of otherIds) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });
});

describe('SettingsPanelStack — a toggle row announces once', () => {
  // The row used to be a button wrapping a switch, so the same setting was
  // announced twice. The switch is the only control on the row now.
  const toggles: Array<[string, string]> = [
    ['settings.developer_networks', 'settings-developer-networks-toggle'],
    ['settings.analytics', 'settings-analytics-toggle'],
  ];

  it.each(toggles)('"%s" is a switch and not also a button', (label) => {
    renderStack();

    expect(screen.getByRole('checkbox', { name: label })).toBeTruthy();
    expect(screen.queryByRole('button', { name: label })).toBeNull();
  });

  it.each(toggles)('"%s" keeps its e2e handle on the control', (_label, testId) => {
    renderStack();

    expect(screen.getByTestId(testId)).toBeTruthy();
  });

  it('reports the toggle through the switch itself', () => {
    const onDeveloperNetworksToggle = vi.fn();
    render(
      <SettingsPanelStack
        visible
        onClose={vi.fn()}
        panelRegistry={makeRegistry()}
        developerNetworksEnabled={false}
        onDeveloperNetworksToggle={onDeveloperNetworksToggle}
        onRemoveWallet={vi.fn()}
        onRemoveAllWallets={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('settings-developer-networks-toggle'));

    expect(onDeveloperNetworksToggle).toHaveBeenCalledWith(true);
  });
});

describe('SettingsPanelStack — a rebuilt registry does not remount the panel', () => {
  // The registries in the apps are built by a `useMemo` whose deps include app
  // state (the active account, among others), so every entry gets a fresh
  // function identity whenever that state moves. Mounting the entry as a
  // component type made React read that as a different component and throw the
  // panel's state away mid-flight: adding an account switched the active
  // account, tore down the add panel, and lost the completion handoff, so the
  // panel sat on top of the accounts list instead of returning to it.
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
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.accounts.title' }));
    await waitFor(() => expect(screen.getByTestId('panel-counter')).toBeTruthy());

    fireEvent.click(screen.getByTestId('panel-counter'));
    expect(screen.getByTestId('panel-counter').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('rerender'));

    expect(screen.getByTestId('panel-counter').textContent).toBe('1');
  });
});
