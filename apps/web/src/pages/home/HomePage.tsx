import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { styled } from '@salmon/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  useAccountsContext,
  isWatchOnlyAccount,
  useAvailableNetworks,
  useBalance,
  usePrefetchBalances,
  useUserConfig,
  useAnalyticsConsent,
  useCurrencyContext,
  useLanguage,
  useAddressbook,
  AddressbookError,
  colors,
  semantic,
  spacing,
  fontSize,
  borderRadius,
  fontFamily,
  getBlockchainFromNetworkId,
  BLOCKCHAIN_TO_COINGECKO,
  PERIOD_TO_DAYS,
  useCoinMarketData,
  coinInfoToMarketData,
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  SUPPORT_OPTIONS,
  type BlockchainBalance,
  type BlockchainId,
  type NetworkId,
  type PriceChartPeriod,
  type PriceDataPoint,
  type MarketData,
  type Token,
  type NftData,
  type SettingsPanelEntry,
  type CurrencySelectorItem,
  type LanguageSelectorItem,
  type ExplorerSelectorItem,
  type TrustedAppItem,
  type AddressBookItem,
  type AddressInput,
  type NetworkSelectorItem,
  type NetworkAdapter,
  type BlockchainType,
} from '@salmon/shared';
import {
  WalletHeader,
  TextButton,
  WarningNotice,
  BalanceCardCarousel,
  ActionButtonRow,
  TokenList,
  TokenDetailContent,
  FadeThrough,
  DepthBackground,
  ScalesBackground,
  ReceiveSheet,
  SettingsPanelStack,
  WalletSwitcherSheet,
  ConfirmDialog,
  CurrencySelector,
  LanguageSelector,
  ExplorerSelector,
  SupportSelector,
  TrustedAppsSelector,
  NetworkSelector,
  AccountsPanel,
  AccountEditPanel,
  AccountNamePanel,
  AccountAvatarPanel,
  AccountAddPanel,
  SecurityPanel,
  BackupPanel,
  PrivateKeyPanel,
  AddressBookPanel,
  AddressAddPanel,
  AddressEditPanel,
  AboutPanel,
  type PanelRegistry,
} from '@salmon/ui';

import { CollectiblesTab } from './CollectiblesTab';
import { SwapTab } from './SwapTab';
import { clearSessionKey } from '../../utils/sessionKeyCache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = 'home' | 'collectibles' | 'swap';

const TAB_HASHES: Record<ActiveTab, string> = {
  home: '',
  collectibles: '#collectibles',
  swap: '#swap',
};

// Persist the active tab in the URL hash so navigating to /nft/:mint or
// /token/:address and pressing the back arrow lands the user on the same
// tab they came from (browser history restores `#collectibles`/`#swap`).
const tabFromHash = (hash: string): ActiveTab => {
  if (hash === '#collectibles') return 'collectibles';
  if (hash === '#swap') return 'swap';
  return 'home';
};

// Network ID → BlockchainId mapping for carousel theming
const NETWORK_TO_BLOCKCHAIN: Record<string, BlockchainId> = {
  'solana-mainnet': 'solana',
  'solana-devnet': 'solana-devnet',
  'bitcoin-mainnet': 'bitcoin',
  'bitcoin-testnet': 'bitcoin-testnet',
  'ethereum-mainnet': 'ethereum',
  'ethereum-sepolia': 'ethereum-sepolia',
};

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: colors.background.primary,
});

/**
 * The single line that explains every refusal on this screen. Quiet on
 * purpose: it states why the controls are closed, it is not an alarm.
 */
const WatchOnlyNotice = styled(Box)({
  color: semantic.text.secondary,
  fontSize: fontSize.caption,
  textAlign: 'center',
  marginTop: `-${spacing.lg}px`,
  marginBottom: `${spacing['2xl']}px`,
  paddingLeft: `${spacing.lg}px`,
  paddingRight: `${spacing.lg}px`,
  position: 'relative',
  zIndex: 1,
});

const Main = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
});

const BottomFadeGradient = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 180,
  // Ends on the depth ramp's own floor. Fading to the old flat ground would
  // have lightened the abyss the ramp just arrived at.
  background: `linear-gradient(to bottom, transparent 0%, ${semantic.water.gradient[1]} 60%)`,
  pointerEvents: 'none',
  zIndex: 1,
});

const TabContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
});

const TokenSectionWrapper = styled(Box)({
  flex: 1,
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
});

const TokenSection = styled(Box)({
  flex: 1,
  minHeight: 0,
  padding: `0 ${spacing.lg}px ${spacing.lg}px`,
  overflowY: 'auto',
});

const BottomListFade = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 30,
  background: `linear-gradient(to top, ${colors.background.primary}, transparent)`,
  pointerEvents: 'none',
  zIndex: 3,
  opacity: 0,
  transition: 'opacity 0.15s ease',
});

const TopListFade = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 30,
  background: `linear-gradient(to bottom, ${colors.background.primary}, transparent)`,
  pointerEvents: 'none',
  zIndex: 3,
  opacity: 0,
  transition: 'opacity 0.15s ease',
});

const EmptyState = styled(Box)({
  padding: `${spacing.xl}px ${spacing.lg}px`,
  textAlign: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
});

const EmptyStateText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: 500,
  color: colors.text.secondary,
  marginBottom: spacing.sm,
});

const EmptyStateSubtext = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.disabled,
});

const TabBar = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  borderBottom: `1px solid ${colors.border.default}`,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const TabButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  flex: 1,
  padding: `${spacing.md}px 0`,
  background: 'none',
  border: 'none',
  // The scarcity rule governs *fills*, not ink: four salmon fills on a screen
  // means no fill is primary, which is the failure it exists to prevent. A 2px
  // rule is ink, so the active underline is salmon again (`accent.ink`,
  // 6.07:1 on the app ground) while the label stays `text.primary` at
  // 16.37:1 — the affordance keeps the contrast it gained and gets the warmth
  // back. Send keeps the screen's one and only salmon fill.
  borderBottom: active ? `2px solid ${semantic.accent.ink}` : '2px solid transparent',
  color: active ? colors.text.primary : colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: active ? 600 : 400,
  fontSize: fontSize.base,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:disabled': {
    cursor: 'default',
    color: colors.text.disabled,
  },
  '&:hover': {
    color: colors.text.primary,
  },
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, actions] = useAccountsContext();
  const [{ currency }, { changeCurrency }] = useCurrencyContext();
  const {
    ready,
    activeAccount,
    activeBlockchainAccount,
    networkId,
    accounts,
    accountId,
    activeTrustedApps,
  } = state;

  // User configuration
  const userConfig = useUserConfig({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    },
  });
  const {
    developerNetworks,
    toggleDeveloperNetworks,
    explorer,
    explorers,
    changeExplorer,
    isLoading: explorerLoading,
  } = userConfig;

  // Anonymous usage-analytics consent (opt-in). The first-run prompt now lives
  // in onboarding (auth/analytics-consent); here we only bind the Settings toggle.
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();

  // Language
  const {
    language: currentLanguage,
    availableLanguages,
    languageNames,
    changeLanguage,
  } = useLanguage();

  // Available networks
  const { allNetworks: availableNetworks, networksReady } = useAvailableNetworks({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    },
    developerNetworks,
  });

  // Address book
  const networkAdapter: NetworkAdapter = useMemo(
    () => ({
      getNetwork: async (id: string) => {
        const found = (availableNetworks || []).find((n) => n.id === id);
        if (!found) return undefined;
        return {
          id: found.id,
          name: found.name,
          blockchain: found.id.split('-')[0] as BlockchainType,
        };
      },
      getNetworks: async () =>
        (availableNetworks || []).map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0] as BlockchainType,
        })),
    }),
    [availableNetworks]
  );
  const [
    { contacts, error: addressBookError },
    { addContact, editContact: editAddressBookContact, removeContact, reload: reloadAddressBook },
  ] = useAddressbook({ networkAdapter });
  // Inline error for address-book writes (translation key, rendered by the open panel)
  const [addressBookWriteErrorKey, setAddressBookWriteErrorKey] = useState<string | null>(null);

  // Tab & UI state. activeTab mirrors `location.hash` so browser back/forward
  // restores the user's tab when returning from /nft/:mint or /token/:address.
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => tabFromHash(location.hash));

  // True from the moment a swap or bridge is signed until its outcome has been
  // acknowledged. Before signing this stays false — leaving a review is free.
  const [flowLocked, setFlowLocked] = useState(false);
  // True while swap is a *task* (review onward). The chrome around it offers
  // exits that do not know what step the user is on, so it stands down and the
  // flow's own back arrow is the only way out. Presentation, not a guard:
  // `flowLocked` above still governs what is allowed once signed.
  const [flowIsTask, setFlowIsTask] = useState(false);

  useEffect(() => {
    // Browser back/forward drives the tab through the hash, which is another
    // dismissal path the in-page controls cannot see. Ignore it while a signed
    // transaction is still being reported.
    if (flowLocked) return;
    const next = tabFromHash(location.hash);
    setActiveTabState((prev) => (prev === next ? prev : next));
  }, [location.hash, flowLocked]);

  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      setActiveTabState(tab);
      const targetHash = TAB_HASHES[tab];
      if (location.hash !== targetHash) {
        navigate({ pathname: location.pathname, hash: targetHash }, { replace: true });
      }
    },
    [navigate, location.hash, location.pathname]
  );
  const [activeBlockchainIndex, setActiveBlockchainIndex] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsInitialPanels, setSettingsInitialPanels] = useState<
    SettingsPanelEntry[] | undefined
  >(undefined);
  const [walletSwitcherVisible, setWalletSwitcherVisible] = useState(false);
  const [receiveSheetVisible, setReceiveSheetVisible] = useState(false);
  const [removeWalletDialogVisible, setRemoveWalletDialogVisible] = useState(false);
  const [removeAllWalletsDialogVisible, setRemoveAllWalletsDialogVisible] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<AddressBookItem | null>(null);

  // Open settings if redirected from /settings route
  useEffect(() => {
    if ((location.state as { openSettings?: boolean })?.openSettings) {
      setSettingsVisible(true);
      // Clear the state to avoid re-opening on re-render
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Bitcoin chart state
  const [bitcoinChartPeriod, setBitcoinChartPeriod] = useState<PriceChartPeriod>('1M');

  // A watch-only wallet holds no key, so every flow that spends is closed to
  // it. The refusal is enforced in shared; this only keeps the UI honest.
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  // Switching to a watch-only wallet while standing on Swap would leave the
  // tab gone and its screen still mounted. Send the user home instead.
  useEffect(() => {
    if (isWatchOnly && activeTab === 'swap') setActiveTab('home');
  }, [isWatchOnly, activeTab, setActiveTab]);

  // Filter networks to only those the user has accounts for
  const allNetworks = useMemo(() => {
    if (!activeAccount?.networksAccounts) return availableNetworks;
    const userNetworkIds = Object.keys(activeAccount.networksAccounts);
    return availableNetworks.filter((network) => userNetworkIds.includes(network.id));
  }, [availableNetworks, activeAccount]);

  // Reset carousel index if network list shrinks
  useEffect(() => {
    if (activeBlockchainIndex >= allNetworks.length && allNetworks.length > 0) {
      setActiveBlockchainIndex(0);
      actions.changeNetwork(allNetworks[0].id);
    }
  }, [allNetworks, activeBlockchainIndex, actions]);

  // Sync carousel index with persisted networkId on mount / network change
  useEffect(() => {
    if (!networkId || allNetworks.length === 0) return;
    const idx = allNetworks.findIndex((n) => n.id === networkId);
    if (idx >= 0) {
      setActiveBlockchainIndex(idx);
    }
  }, [networkId, allNetworks]);

  // Balance
  const {
    tokens,
    usdTotal,
    changePercent,
    changeAmount,
    refreshing,
    hasData,
    state: balanceState,
    refresh,
    error: balanceError,
    hiddenBalance,
    toggleHidden,
  } = useBalance({
    account: activeBlockchainAccount,
    networkId: networkId as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount || !networksReady,
    // BE filters unknown-only-tagged SPL tokens by default; opt in via developer mode.
    includeSpam: !!developerNetworks,
  });

  // Warm the chains the user is not looking at, so the first switch of the
  // session lands on a number instead of a skeleton. One request per inactive
  // chain per app load — see the hook for why it is not per switch.
  usePrefetchBalances({
    account: activeAccount,
    networkIds: allNetworks.map((network) => network.id as NetworkId),
    activeNetworkId: networkId as NetworkId | undefined,
    pathIndex: state.pathIndex,
    includeSpam: !!developerNetworks,
  });

  // RQ handles refetch-on-focus via QueryClient defaults (refetchOnWindowFocus).

  // Build blockchain balances for carousel
  const blockchainBalances: BlockchainBalance[] = useMemo(() => {
    return allNetworks.map((network) => {
      const blockchain = NETWORK_TO_BLOCKCHAIN[network.id] || 'solana';
      const isActiveNetwork = network.id === networkId;

      if (isActiveNetwork) {
        // Skeletons belong to the absence of data, never to a fetch in
        // flight. `refreshing` used to blank the hero on every focus and
        // every return to Home while the cache held the numbers throughout.
        return {
          network: { id: network.id, name: network.name, blockchain },
          usdTotal,
          changePercent,
          changeAmount,
          loading: !hasData,
        };
      }
      return {
        network: { id: network.id, name: network.name, blockchain },
        usdTotal: undefined,
        changePercent: undefined,
        changeAmount: undefined,
        loading: false,
      };
    });
  }, [allNetworks, networkId, hasData, usdTotal, changePercent, changeAmount]);

  const handleBlockchainChange = useCallback(
    (_blockchain: BlockchainId, index: number) => {
      setActiveBlockchainIndex(index);
      const selectedBalance = blockchainBalances[index];
      if (selectedBalance) {
        actions.changeNetwork(selectedBalance.network.id);
      }
    },
    [blockchainBalances, actions]
  );

  const currentBlockchain = useMemo(() => {
    const active = blockchainBalances[activeBlockchainIndex];
    return active?.network.blockchain || 'solana';
  }, [activeBlockchainIndex, blockchainBalances]);

  // BE handles spam/unknown filtering via the `includeSpam` query passed
  // to useBalance above. The FE just maps to the TokenList shape.
  const formattedTokens = useMemo(() => {
    return tokens.map((token) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      logo: token.logo ?? undefined,
      price: token.price,
      uiAmount: token.uiAmount,
      usdBalance: token.usdBalance,
      last24HoursChange:
        token.priceChange24h !== undefined ? { perc: token.priceChange24h } : undefined,
      tags: token.tags,
      coingeckoId: token.coingeckoId,
      decimals: token.decimals,
    }));
  }, [tokens]);

  // Bitcoin coin info + chart data via shared React Query hook
  const bitcoinCoinId =
    currentBlockchain === 'bitcoin' ? BLOCKCHAIN_TO_COINGECKO[currentBlockchain] : undefined;
  const {
    coinInfo: bitcoinCoinInfo,
    chartData: bitcoinChartDataRaw,
    infoLoading: bitcoinInfoLoading,
    chartLoading: bitcoinChartLoading,
    chartPending: bitcoinChartPending,
    error: bitcoinDataError,
  } = useCoinMarketData({
    coinId: bitcoinCoinId,
    currency,
    days: PERIOD_TO_DAYS[bitcoinChartPeriod],
    enabled: currentBlockchain === 'bitcoin',
  });
  const bitcoinChartData: PriceDataPoint[] = bitcoinChartDataRaw ?? [];

  const bitcoinMarketData: MarketData | undefined = useMemo(() => {
    if (!bitcoinCoinInfo) return undefined;
    return coinInfoToMarketData(bitcoinCoinInfo);
  }, [bitcoinCoinInfo]);

  const bitcoinToken: Token | undefined = useMemo(() => {
    if (!bitcoinCoinInfo?.marketData) return undefined;
    const md = bitcoinCoinInfo.marketData;
    return {
      address: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      price: md.currentPrice,
      uiAmount: 0,
      usdBalance: 0,
      last24HoursChange: md.priceChangePercentage24h
        ? { perc: md.priceChangePercentage24h, abs: md.priceChange24h }
        : null,
      isVerified: true,
    };
  }, [bitcoinCoinInfo]);

  // Scroll-driven fade refs
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);

  const handleTokenListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom = scrollHeight - scrollTop - clientHeight < 2;
    if (topFadeRef.current) topFadeRef.current.style.opacity = String(Math.min(scrollTop / 30, 1));
    if (bottomFadeRef.current) bottomFadeRef.current.style.opacity = atBottom ? '0' : '1';
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  const accountAddress = activeBlockchainAccount?.getReceiveAddress() || '';
  const accountName = activeAccount?.name || t('home.unnamed_account', 'Account');

  const handleCopyAddress = useCallback(() => {
    if (accountAddress) navigator.clipboard.writeText(accountAddress);
  }, [accountAddress]);

  const handleTokenPress = useCallback(
    (token: Token) => {
      navigate(`/token/${token.address}`);
    },
    [navigate]
  );

  const handleSendPress = useCallback(() => navigate('/send'), [navigate]);
  const handleReceivePress = useCallback(() => setReceiveSheetVisible(true), []);
  const handleActivityPress = useCallback(() => navigate('/activity'), [navigate]);

  // Address book items
  const addressBookItems: AddressBookItem[] = useMemo(
    () =>
      contacts.map((c) => ({
        name: c.name,
        address: c.address,
        networkId: c.network.id,
        networkName: c.network.name,
        domain: c.domain,
      })),
    [contacts]
  );

  // Build panel registry for SettingsPanelStack
  const panelRegistry: PanelRegistry = useMemo(
    () => ({
      avatar: ({ onBack }) => <AccountAvatarPanel onBack={onBack} />,
      backup: ({ onBack }) => <BackupPanel onBack={onBack} />,
      privateKey: ({ onBack }) => <PrivateKeyPanel onBack={onBack} />,
      currency: ({ onBack }) => {
        const currencyItems: CurrencySelectorItem[] = SUPPORTED_CURRENCIES.map((code) => ({
          code,
          name: CURRENCY_MAP[code].name,
          symbol: CURRENCY_MAP[code].symbol,
        }));
        return (
          <CurrencySelector
            currencies={currencyItems}
            activeCurrencyCode={currency}
            onSelectCurrency={(code) => {
              changeCurrency(code as typeof currency);
            }}
            onBack={onBack}
          />
        );
      },
      about: ({ onBack }) => <AboutPanel onBack={onBack} />,
      support: ({ onBack }) => (
        <SupportSelector
          options={SUPPORT_OPTIONS}
          onOpenLink={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onBack={onBack}
        />
      ),
      language: ({ onBack }) => {
        const languageItems: LanguageSelectorItem[] = availableLanguages.map((code) => ({
          code,
          nativeName: languageNames[code],
        }));
        return (
          <LanguageSelector
            languages={languageItems}
            activeLanguageCode={currentLanguage}
            onSelectLanguage={(code) => {
              changeLanguage(code as typeof currentLanguage);
            }}
            onBack={onBack}
          />
        );
      },
      explorer: ({ onBack }) => {
        const explorerItems: ExplorerSelectorItem[] = explorers.map((e) => ({
          key: e.key,
          name: e.name,
        }));
        return (
          <ExplorerSelector
            explorers={explorerItems}
            activeExplorerName={explorer?.name || ''}
            onSelectExplorer={(key) => {
              changeExplorer(key);
            }}
            onBack={onBack}
            loading={explorerLoading}
          />
        );
      },
      network: ({ onBack }) => {
        const userNetworks = activeAccount?.networksAccounts
          ? allNetworks.filter((n) => Object.keys(activeAccount.networksAccounts!).includes(n.id))
          : allNetworks;
        const networkItems: NetworkSelectorItem[] = userNetworks.map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0],
        }));
        return (
          <NetworkSelector
            networks={networkItems}
            activeNetworkId={networkId || 'solana-mainnet'}
            onSelectNetwork={(id) => {
              actions.changeNetwork(id);
            }}
            onBack={onBack}
          />
        );
      },
      addressBook: ({ onBack, onNavigate }) => (
        <AddressBookPanel
          contacts={addressBookItems}
          activeNetworkId={networkId || 'solana-mainnet'}
          onAddContact={() => {
            setAddressBookWriteErrorKey(null);
            onNavigate('address-book-add');
          }}
          onEditContact={(contact) => {
            setAddressBookWriteErrorKey(null);
            setEditingContact(contact);
            onNavigate('address-book-edit');
          }}
          onRemoveContact={async (address) => {
            await removeContact(address);
          }}
          onBack={onBack}
          error={addressBookError}
          onRetry={reloadAddressBook}
        />
      ),
      'address-book-add': ({ onBack }) => {
        const activeNet = allNetworks.find((n) => n.id === networkId) || allNetworks[0];
        const blockchain = (networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressAddPanel
            activeNetworkId={activeNet?.id || 'solana-mainnet'}
            activeNetworkName={
              activeNet?.name || t('general.network_solana_mainnet', 'Solana Mainnet')
            }
            activeBlockchain={blockchain}
            onSave={async (input: AddressInput) => {
              setAddressBookWriteErrorKey(null);
              try {
                await addContact(input);
              } catch (err) {
                setAddressBookWriteErrorKey(
                  err instanceof AddressbookError && err.kind === 'resolve'
                    ? 'settings.addressbook.resolve_failed'
                    : 'settings.addressbook.save_failed'
                );
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
          />
        );
      },
      'address-book-edit': ({ onBack }) => {
        if (!editingContact) return null;
        const blockchain = (editingContact.networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressEditPanel
            contact={editingContact}
            activeBlockchain={blockchain}
            onSave={async (originalAddress: string, input: AddressInput) => {
              setAddressBookWriteErrorKey(null);
              try {
                await editAddressBookContact(originalAddress, input);
                setEditingContact(null);
              } catch (err) {
                setAddressBookWriteErrorKey(
                  err instanceof AddressbookError && err.kind === 'resolve'
                    ? 'settings.addressbook.resolve_failed'
                    : 'settings.addressbook.save_failed'
                );
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
          />
        );
      },
      trustedApps: ({ onBack }) => {
        const trustedAppItems: TrustedAppItem[] = Object.entries(activeTrustedApps || {}).map(
          ([domain, app]) => ({
            domain,
            name: app.name,
            icon: app.icon,
          })
        );
        return (
          <TrustedAppsSelector
            apps={trustedAppItems}
            onRevokeApp={(domain) => {
              actions.removeTrustedApp(domain);
            }}
            onBack={onBack}
          />
        );
      },
      security: ({ onBack }) => (
        <SecurityPanel onBack={onBack} onPasswordChanged={clearSessionKey} />
      ),
      accounts: ({ onBack, onNavigate }) => (
        <AccountsPanel
          onBack={onBack}
          onEditAccount={(id) => {
            setEditingAccountId(id);
            onNavigate('account-edit', { accountId: id });
          }}
          onAddAccount={() => onNavigate('account-add')}
        />
      ),
      'account-edit': ({ onBack, onNavigate, ...props }) => (
        <AccountEditPanel
          accountId={(props.accountId as string) || editingAccountId || accountId || ''}
          onEditName={(id) => {
            setEditingAccountId(id);
            onNavigate('account-name', { accountId: id });
          }}
          onEditAvatar={() => onNavigate('avatar')}
          onBackupSeed={() => onNavigate('backup')}
          onExportPrivateKey={() => onNavigate('privateKey')}
          onBack={onBack}
        />
      ),
      'account-name': ({ onBack, ...props }) => (
        <AccountNamePanel
          accountId={(props.accountId as string) || editingAccountId || accountId || ''}
          onBack={onBack}
        />
      ),
      'account-add': ({ onBack, onWait, onClose }) => (
        <AccountAddPanel
          onComplete={onBack}
          onBack={onBack}
          onWait={onWait}
          onCloseSettings={onClose}
        />
      ),
    }),
    [
      currency,
      changeCurrency,
      availableLanguages,
      currentLanguage,
      languageNames,
      changeLanguage,
      explorers,
      explorer,
      changeExplorer,
      explorerLoading,
      addressBookItems,
      networkId,
      allNetworks,
      addContact,
      editAddressBookContact,
      removeContact,
      addressBookError,
      reloadAddressBook,
      addressBookWriteErrorKey,
      editingContact,
      activeTrustedApps,
      actions,
      editingAccountId,
      accountId,
      activeAccount,
      t,
    ]
  );

  // Reset initialPanels after settings closes
  const handleSettingsClose = useCallback(() => {
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
  }, []);

  // Wallet switcher
  const handleSelectAccount = useCallback(
    (targetAccountId: string) => {
      actions.changeAccount(targetAccountId);
      setWalletSwitcherVisible(false);
    },
    [actions]
  );

  const handleAddAccount = useCallback(() => {
    setWalletSwitcherVisible(false);
    navigate('/auth/create');
  }, [navigate]);

  const handleDeleteAccount = useCallback(
    async (targetAccountId: string) => {
      await actions.removeAccount(targetAccountId);
      setWalletSwitcherVisible(false);
    },
    [actions]
  );

  // Remove wallet dialogs
  const validatePassword = useCallback(
    async (password: string): Promise<boolean> => actions.checkPassword(password),
    [actions]
  );

  const confirmRemoveWallet = useCallback(async () => {
    if (activeAccount?.id) await actions.removeAccount(activeAccount.id);
  }, [actions, activeAccount]);

  const confirmRemoveAllWallets = useCallback(async () => {
    await clearSessionKey();
    await actions.removeAllAccounts();
  }, [actions]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Container data-testid="home-screen">
      {/* Header — withheld while the flow is a task; see `flowIsTask`. */}
      {!flowIsTask && (
        <WalletHeader
          accountName={accountName}
          address={accountAddress}
          onCopyAddress={handleCopyAddress}
          onSettingsPress={() => setSettingsVisible(true)}
          onRefreshPress={refresh}
          refreshing={refreshing}
          onWalletPress={() => setWalletSwitcherVisible(true)}
          avatarUrl={activeAccount?.avatar}
          accountId={activeAccount?.id}
        />
      )}

      {/* Tab Bar — inert while a signed transaction is being reported, since a
          stray tab click is the cheapest way to lose the only outcome report. */}
      {!flowIsTask && (
        <TabBar>
          <TabButton
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
            disabled={flowLocked}
            data-testid="tab-home"
          >
            {t('tabs.home', 'Home')}
          </TabButton>
          <TabButton
            active={activeTab === 'collectibles'}
            onClick={() => setActiveTab('collectibles')}
            disabled={flowLocked}
            data-testid="tab-collectibles"
          >
            {t('tabs.collectibles', 'Collectibles')}
          </TabButton>
          {/* Gone, not greyed: a watch-only wallet can never swap or bridge,
              so the tab is not a door that happens to be locked. */}
          {!isWatchOnly && (
            <TabButton
              active={activeTab === 'swap'}
              onClick={() => setActiveTab('swap')}
              disabled={flowLocked}
              data-testid="tab-swap"
            >
              {t('tabs.swap', 'Swap')}
            </TabButton>
          )}
        </TabBar>
      )}

      <Main>
        {/* The water column: a depth ramp darkening toward the abyss, plus the
            marine snow the deep field's 3.2x scales are read through. Both are
            spent before the token list. */}
        <DepthBackground style={{ zIndex: 0 }} />
        <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
        <BottomFadeGradient />

        <TabContent>
          {activeTab === 'home' && (
            <>
              <BalanceCardCarousel
                blockchains={blockchainBalances}
                hiddenBalance={hiddenBalance}
                onToggleVisibility={toggleHidden}
                onBlockchainChange={handleBlockchainChange}
                activeIndex={activeBlockchainIndex}
                showNetworkLabel={developerNetworks}
              />

              <ActionButtonRow
                onSendPress={handleSendPress}
                onReceivePress={handleReceivePress}
                onActivityPress={handleActivityPress}
                sendDisabled={isWatchOnly}
                style={{ marginTop: spacing['2xl'], marginBottom: spacing['2xl'] }}
              />

              {/* One explanation for every refusal on this screen, rather than
                  a tooltip per control the user has to go hunting for. */}
              {isWatchOnly && (
                <WatchOnlyNotice data-testid="home-watch-only-notice">
                  {t('wallet.watchOnly.disabled_action')}
                </WatchOnlyNotice>
              )}

              {/* Partial-load failure: keep whatever data loaded visible;
                  retry is the header refresh button. */}
              {balanceError && hasData && (
                <Box
                  sx={{ padding: `0 ${spacing.lg}px`, marginBottom: `${spacing.md}px` }}
                  data-testid="balance-load-error"
                >
                  <WarningNotice
                    tone="warning"
                    title={t(
                      'wallet.partial_load_error',
                      "Some balances couldn't be loaded. Shown data may be incomplete."
                    )}
                  />
                </Box>
              )}

              <TokenSectionWrapper>
                <TopListFade ref={topFadeRef} />
                {/* Keyed by chain: switching chains swaps this whole area with
                    a fade-through (enter with fade + settle from scale 0.97)
                    instead of a hard cut; reduce motion keeps the cut. */}
                <FadeThrough transitionKey={currentBlockchain}>
                  {currentBlockchain === 'bitcoin' ? (
                    <TokenSection onScroll={handleTokenListScroll}>
                      {/* Bitcoin's home tab *is* the token detail screen — the
                        same composition the pushed page renders, minus the
                        push. It shares that component so the two cannot drift
                        into different spacing, titles or chart heights again. */}
                      <TokenDetailContent
                        token={hasData ? bitcoinToken : undefined}
                        blockchain="bitcoin"
                        hiddenBalance={hiddenBalance}
                        chartData={bitcoinChartData}
                        chartPeriod={bitcoinChartPeriod}
                        onChartPeriodChange={setBitcoinChartPeriod}
                        chartLoading={bitcoinChartLoading && bitcoinChartData.length === 0}
                        chartPending={bitcoinChartPending}
                        chartError={!!bitcoinDataError && bitcoinChartData.length === 0}
                        coinInfo={bitcoinCoinInfo}
                        marketData={bitcoinMarketData}
                        infoLoading={bitcoinInfoLoading && !bitcoinCoinInfo}
                        bleed={spacing.lg}
                      />
                    </TokenSection>
                  ) : (
                    <TokenSection onScroll={handleTokenListScroll}>
                      {balanceState === 'loading' || formattedTokens.length > 0 ? (
                        <TokenList
                          tokens={formattedTokens}
                          loading={balanceState === 'loading'}
                          onTokenPress={handleTokenPress}
                          hiddenBalance={hiddenBalance}
                          blockchain={getBlockchainFromNetworkId(currentBlockchain)}
                        />
                      ) : balanceState === 'error' ? (
                        /* Failed load with nothing to show is an error state,
                           never "No tokens found" and never an endless
                           skeleton — PRODUCT.md keeps those answers distinct. */
                        <EmptyState data-testid="token-list-error">
                          <EmptyStateText>
                            {t(
                              'wallet.tokens_load_error',
                              "Your tokens couldn't be loaded right now."
                            )}
                          </EmptyStateText>
                          <TextButton onClick={() => refresh()} testID="token-list-retry-button">
                            {t('actions.retry', 'Retry')}
                          </TextButton>
                        </EmptyState>
                      ) : (
                        <EmptyState>
                          <EmptyStateText>{t('home.no_tokens', 'No tokens found')}</EmptyStateText>
                          <EmptyStateSubtext>
                            {t(
                              'home.no_tokens_hint',
                              'Your tokens will appear here once you receive some'
                            )}
                          </EmptyStateSubtext>
                        </EmptyState>
                      )}
                    </TokenSection>
                  )}
                </FadeThrough>
                <BottomListFade ref={bottomFadeRef} />
              </TokenSectionWrapper>
            </>
          )}

          {activeTab === 'collectibles' && (
            <CollectiblesTab
              activeAccount={activeAccount}
              developerNetworks={developerNetworks}
              onNftDetailPress={(nft: NftData) => navigate(`/nft/${nft.mint}`, { state: nft })}
              onSeeAllPress={(data) => navigate('/nft/all', { state: data })}
            />
          )}

          {activeTab === 'swap' && (
            <SwapTab
              onNavigateHome={() => {
                setActiveTab('home');
                refresh();
              }}
              onFlowLockChange={setFlowLocked}
              onTaskChange={setFlowIsTask}
            />
          )}
        </TabContent>
      </Main>

      {/* Overlays */}
      <SettingsPanelStack
        visible={settingsVisible}
        onClose={handleSettingsClose}
        panelRegistry={panelRegistry}
        initialPanels={settingsInitialPanels}
        developerNetworksEnabled={developerNetworks}
        onDeveloperNetworksToggle={toggleDeveloperNetworks}
        analyticsEnabled={analyticsConsent}
        onAnalyticsToggle={setAnalyticsConsent}
        onRemoveWallet={() => {
          setSettingsVisible(false);
          setRemoveWalletDialogVisible(true);
        }}
        onRemoveAllWallets={() => {
          setSettingsVisible(false);
          setRemoveAllWalletsDialogVisible(true);
        }}
      />

      <WalletSwitcherSheet
        visible={walletSwitcherVisible}
        onClose={() => setWalletSwitcherVisible(false)}
        accounts={accounts}
        activeAccountId={accountId || ''}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        onEditAccount={(id) => {
          setWalletSwitcherVisible(false);
          setEditingAccountId(id);
          setSettingsInitialPanels([
            { screen: 'accounts' },
            { screen: 'account-edit', props: { accountId: id } },
          ]);
          setSettingsVisible(true);
        }}
        onDeleteAccount={handleDeleteAccount}
      />

      <ConfirmDialog
        visible={removeWalletDialogVisible}
        onClose={() => setRemoveWalletDialogVisible(false)}
        title={t('settings.remove_wallet', 'Remove Wallet')}
        message={t(
          'settings.remove_wallet_description',
          'Are you sure you want to remove this wallet? Make sure you have backed up your recovery phrase before removing.'
        )}
        confirmText={t('actions.remove', 'Remove')}
        isDanger
        requirePassword
        validatePassword={validatePassword}
        onConfirm={confirmRemoveWallet}
      />

      <ConfirmDialog
        visible={removeAllWalletsDialogVisible}
        onClose={() => setRemoveAllWalletsDialogVisible(false)}
        title={t('settings.remove_all_wallets', 'Remove All Wallets')}
        message={t(
          'settings.remove_all_wallets_description',
          'This will remove ALL wallets from this device. This action cannot be undone. Make sure you have backed up all recovery phrases.'
        )}
        confirmText={t('actions.remove_all', 'Remove All')}
        isDanger
        onConfirm={confirmRemoveAllWallets}
      />

      <ReceiveSheet
        visible={receiveSheetVisible}
        onClose={() => setReceiveSheetVisible(false)}
        address={accountAddress}
        blockchain={getBlockchainFromNetworkId(currentBlockchain)}
      />
    </Container>
  );
}
