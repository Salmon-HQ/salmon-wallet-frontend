import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

import {
  AddressBookIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  CodeIcon,
  CompassIcon,
  CurrencyDollarIcon,
  GlobeIcon,
  InfoIcon,
  KeyIcon,
  PlugsConnectedIcon,
  QuestionIcon,
  ShieldCheckIcon,
  TrashIcon,
  TrashSimpleIcon,
  UserCircleIcon,
  VaultIcon,
  XIcon,
  iconSize,
} from '../../icons';

import {
  colors,
  semantic,
  spacing,
  useSettingsPanelStack,
  getSettingsItemTestId,
  type SettingsScreen,
  fontSize,
  fontWeight,
  letterSpacing,
  borderWidth,
  shadowsCSS,
  opacity,
  componentSizes,
  durationMs,
  useWaitExit,
} from '@salmon/shared';
import { styled } from '../../utils/styled';
import { LoadingScreen } from '../LoadingScreen';

import type { PanelContentProps, PanelRenderer, PanelWait, SettingsPanelStackProps } from './types';

// Re-use the same section/item types from the old SettingsSheet
interface SettingsItem {
  id: SettingsScreen | 'developerNetworks' | 'analytics';
  labelKey: string;
  descriptionKey?: string;
  type: 'navigation' | 'toggle' | 'action';
  isDanger?: boolean;
}

interface SettingsSection {
  titleKey: string;
  isDanger?: boolean;
  items: SettingsItem[];
}

// ============================================================================
// Constants
// ============================================================================

const DRAWER_WIDTH = componentSizes.drawerWidth;
const PUSH_DURATION = durationMs.medium;
const POP_DURATION = durationMs.normal;

const ICON_MAP: Record<string, React.ReactNode> = {
  avatar: <UserCircleIcon />,
  security: <ShieldCheckIcon />,
  backup: <VaultIcon />,
  privateKey: <KeyIcon />,
  language: <GlobeIcon />,
  currency: <CurrencyDollarIcon />,
  explorer: <CompassIcon />,
  addressBook: <AddressBookIcon />,
  trustedApps: <PlugsConnectedIcon />,
  developerNetworks: <CodeIcon />,
  analytics: <ChartLineUpIcon />,
  removeWallet: <TrashIcon />,
  removeAll: <TrashSimpleIcon />,
  about: <InfoIcon />,
  support: <QuestionIcon />,
  accounts: <UserCircleIcon />,
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    titleKey: 'settings.sections.account',
    items: [
      { id: 'accounts', labelKey: 'settings.accounts.title', type: 'navigation' },
      { id: 'avatar', labelKey: 'settings.profile_picture', type: 'navigation' },
      { id: 'security', labelKey: 'settings.security.title', type: 'navigation' },
      { id: 'backup', labelKey: 'settings.backup', type: 'navigation' },
      { id: 'privateKey', labelKey: 'settings.private_key', type: 'navigation' },
    ],
  },
  {
    titleKey: 'settings.sections.preferences',
    items: [
      { id: 'language', labelKey: 'settings.display_language', type: 'navigation' },
      { id: 'currency', labelKey: 'settings.currency', type: 'navigation' },
      { id: 'explorer', labelKey: 'settings.explorer', type: 'navigation' },
    ],
  },
  {
    titleKey: 'settings.sections.advanced',
    items: [
      { id: 'addressBook', labelKey: 'settings.address_book', type: 'navigation' },
      { id: 'trustedApps', labelKey: 'settings.trusted_apps', type: 'navigation' },
      {
        id: 'developerNetworks',
        labelKey: 'settings.developer_networks',
        descriptionKey: 'settings.developer_networks_desc',
        type: 'toggle',
      },
      {
        id: 'analytics',
        labelKey: 'settings.analytics',
        descriptionKey: 'settings.analytics_description',
        type: 'toggle',
      },
      { id: 'about', labelKey: 'settings.about', type: 'navigation' },
      { id: 'support', labelKey: 'settings.help_support', type: 'navigation' },
    ],
  },
  {
    titleKey: 'settings.sections.danger_zone',
    isDanger: true,
    items: [
      { id: 'removeWallet', labelKey: 'settings.remove_wallet', type: 'action', isDanger: true },
      { id: 'removeAll', labelKey: 'settings.remove_all_wallets', type: 'action', isDanger: true },
    ],
  },
];

// ============================================================================
// Styled Components
// ============================================================================

const DrawerPaper = styled(Box)({
  width: DRAWER_WIDTH,
  height: '100%',
  backgroundColor: colors.background.primary,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
});

const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.lg}px ${spacing.lg}px`,
  borderBottom: `${borderWidth.thin}px solid ${colors.border.default}`,
  flexShrink: 0,
});

const HeaderTitle = styled(Typography)({
  fontSize: fontSize.heading,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

const CloseButton = styled(IconButton)({
  color: colors.text.secondary,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const MenuContent = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: `${spacing.sm}px 0`,
});

const SectionTitle = styled(Typography)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
  fontSize: fontSize.label,
  fontWeight: fontWeight.semibold,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.label,
  color: $isDanger ? semantic.status.danger : colors.text.secondary,
  padding: `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`,
  marginTop: spacing.sm,
}));

const StyledListItem = styled(ListItem)({
  padding: 0,
});

const StyledListItemButton = styled(ListItemButton)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
  padding: `${spacing.md}px ${spacing.lg}px`,
  '&:hover': {
    backgroundColor: $isDanger ? semantic.status.dangerTint : colors.background.card,
  },
}));

// A toggle row is not a button. The row used to be a `ListItemButton`
// (role button) wrapping a `Switch` (role checkbox), so a screen reader
// announced the same setting twice; the switch is the only control here and
// the row is the layout around it — the same collapse the mobile surface made
// (DESIGN.md §"The settings surface joined the system").
const ToggleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: `${spacing.md}px ${spacing.lg}px`,
});

const StyledListItemIcon = styled(ListItemIcon)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
  minWidth: componentSizes.backButtonSize,
  color: $isDanger ? semantic.status.danger : colors.text.secondary,
}));

const StyledListItemText = styled(ListItemText)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
  '& .MuiListItemText-primary': {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: $isDanger ? semantic.status.danger : colors.text.primary,
  },
  '& .MuiListItemText-secondary': {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
}));

const StyledSwitch = styled(Switch)({
  '& .MuiSwitch-switchBase': {
    '&.Mui-checked': {
      color: colors.accent.primary,
      '& + .MuiSwitch-track': {
        backgroundColor: colors.accent.primary,
        opacity: opacity.disabled,
      },
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: colors.text.secondary,
  },
});

const StyledDivider = styled(Divider)({
  backgroundColor: colors.border.default,
  margin: `${spacing.sm}px ${spacing.lg}px`,
});

const ChevronIcon = styled(CaretRightIcon)({
  color: colors.text.secondary,
  width: iconSize.md,
  height: iconSize.md,
});

// ============================================================================
// Component
// ============================================================================

export function SettingsPanelStack({
  visible,
  onClose,
  panelRegistry,
  initialPanels,
  developerNetworksEnabled = false,
  onDeveloperNetworksToggle,
  analyticsEnabled = false,
  onAnalyticsToggle,
  onRemoveWallet,
  onRemoveAllWallets,
}: SettingsPanelStackProps): React.ReactElement {
  const { t } = useTranslation();
  const { stack, push, pop, reset, canGoBack } = useSettingsPanelStack();

  // Track animation state for the top panel
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');
  const animationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialPanelsPushedRef = useRef(false);

  // Push initial panels when drawer opens (no animation, instant)
  useEffect(() => {
    if (visible && initialPanels && initialPanels.length > 0 && !initialPanelsPushedRef.current) {
      initialPanelsPushedRef.current = true;
      for (const entry of initialPanels) {
        push(entry.screen, entry.props);
      }
    }
    if (!visible) {
      initialPanelsPushedRef.current = false;
    }
  }, [visible, initialPanels, push]);

  // Reset stack when drawer closes
  useEffect(() => {
    if (!visible) {
      // Delay reset to allow drawer close animation
      const timer = setTimeout(() => {
        reset();
        setAnimating(false);
      }, durationMs.slow);
      return () => clearTimeout(timer);
    }
  }, [visible, reset]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const handlePush = useCallback(
    (screen: SettingsScreen, props?: Record<string, unknown>) => {
      if (animating) return;
      setSlideDirection('in');
      setAnimating(true);
      push(screen, props);
      animationTimerRef.current = setTimeout(() => {
        setAnimating(false);
      }, PUSH_DURATION);
    },
    [push, animating]
  );

  const handlePop = useCallback(() => {
    if (animating || !canGoBack) return;
    // Animate out first, then pop after animation completes
    setSlideDirection('out');
    setAnimating(true);
    animationTimerRef.current = setTimeout(() => {
      pop();
      setAnimating(false);
    }, POP_DURATION);
  }, [pop, canGoBack, animating]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * The wait a panel raises, hosted **here** rather than inside the panel.
   *
   * Two reasons, and both are about lifetime rather than looks. A wait stands
   * over the whole app, and the flows that wait in settings (adding an account)
   * finish by closing settings — so the drawer is torn down while the closing
   * wave is still crossing. A wait rendered inside a panel goes with it and the
   * wave plays nowhere, which is the exact cut `useWaitExit` exists to prevent.
   * Rendered as a sibling of the drawer, the wait outlives the surface that
   * raised it and leaves over the screen underneath.
   *
   * `wait` is kept after it is lowered so the copy survives the exit ramp —
   * only `waiting` flips, which is what starts the wait's own passage out.
   */
  const [wait, setWait] = useState<PanelWait | null>(null);
  const [waiting, setWaiting] = useState(false);
  const handleWait = useCallback((next: PanelWait | null) => {
    if (next) setWait(next);
    setWaiting(next !== null);
  }, []);
  const { held: waitHeld, onExited: onWaitExited } = useWaitExit(waiting);

  // ---- Settings menu (panel 0) ----

  const handleItemClick = useCallback(
    (item: SettingsItem) => {
      if (item.type === 'navigation') {
        if (item.id !== 'developerNetworks' && item.id !== 'analytics') {
          handlePush(item.id);
        }
      } else if (item.type === 'action') {
        if (item.id === 'removeWallet' && onRemoveWallet) {
          onRemoveWallet();
        } else if (item.id === 'removeAll' && onRemoveAllWallets) {
          onRemoveAllWallets();
        }
      }
    },
    [handlePush, onRemoveWallet, onRemoveAllWallets]
  );

  // Resolves the checked state, handler, and test id for each toggle item, so
  // the toggle row renders generically instead of hard-coding one setting.
  const toggleConfigFor = useCallback(
    (
      id: string
    ): { checked: boolean; onToggle?: (enabled: boolean) => void; testId: string } | null => {
      if (id === 'developerNetworks') {
        return {
          checked: developerNetworksEnabled,
          onToggle: onDeveloperNetworksToggle,
          testId: 'settings-developer-networks-toggle',
        };
      }
      if (id === 'analytics') {
        return {
          checked: analyticsEnabled,
          onToggle: onAnalyticsToggle,
          testId: 'settings-analytics-toggle',
        };
      }
      return null;
    },
    [developerNetworksEnabled, onDeveloperNetworksToggle, analyticsEnabled, onAnalyticsToggle]
  );

  const renderItem = useCallback(
    (item: SettingsItem) => {
      const icon = ICON_MAP[item.id] || <InfoIcon />;
      const label = t(item.labelKey) || item.labelKey;
      const description = item.descriptionKey ? t(item.descriptionKey) : undefined;

      if (item.type === 'toggle') {
        const toggle = toggleConfigFor(item.id);
        const checked = toggle?.checked ?? false;
        const descriptionId = description ? `${item.id}-description` : undefined;
        return (
          <StyledListItem key={item.id}>
            <ToggleRow data-testid={getSettingsItemTestId(item.id)}>
              <StyledListItemIcon>{icon}</StyledListItemIcon>
              <StyledListItemText
                primary={label}
                secondary={description}
                secondaryTypographyProps={descriptionId ? { id: descriptionId } : undefined}
              />
              <StyledSwitch
                edge="end"
                checked={checked}
                onChange={() => toggle?.onToggle?.(!checked)}
                slotProps={{
                  input: {
                    'data-testid': toggle?.testId ?? getSettingsItemTestId(item.id),
                    'aria-label': label,
                    'aria-describedby': descriptionId,
                  } as React.InputHTMLAttributes<HTMLInputElement>,
                }}
              />
            </ToggleRow>
          </StyledListItem>
        );
      }

      return (
        <StyledListItem key={item.id}>
          <StyledListItemButton
            data-testid={getSettingsItemTestId(item.id)}
            $isDanger={item.isDanger}
            onClick={() => handleItemClick(item)}
          >
            <StyledListItemIcon $isDanger={item.isDanger}>{icon}</StyledListItemIcon>
            <StyledListItemText $isDanger={item.isDanger} primary={label} secondary={description} />
            {item.type === 'navigation' && <ChevronIcon />}
          </StyledListItemButton>
        </StyledListItem>
      );
    },
    [t, toggleConfigFor, handleItemClick]
  );

  const renderSection = useCallback(
    (section: SettingsSection, index: number) => {
      const isLastSection = index === SETTINGS_SECTIONS.length - 1;
      return (
        <React.Fragment key={section.titleKey}>
          <SectionTitle $isDanger={section.isDanger}>
            {t(section.titleKey) || section.titleKey}
          </SectionTitle>
          <List disablePadding>{section.items.map(renderItem)}</List>
          {!isLastSection && <StyledDivider />}
        </React.Fragment>
      );
    },
    [t, renderItem]
  );

  return (
    <>
      {waitHeld && wait && (
        <LoadingScreen
          visible={waiting}
          title={wait.title}
          subtitle={wait.subtitle}
          onExited={onWaitExited}
        />
      )}
      <Drawer
        anchor="right"
        open={visible}
        onClose={handleClose}
        disableEnforceFocus
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: shadowsCSS.none,
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: colors.dialog.overlay,
            },
          },
        }}
      >
        <DrawerPaper>
          {/* Base: Settings Menu (panel 0) */}
          <Header>
            <HeaderTitle>{t('settings.title', 'Settings')}</HeaderTitle>
            <CloseButton
              onClick={handleClose}
              aria-label={t('actions.close', 'Close')}
              data-testid="settings-close-button"
            >
              <XIcon />
            </CloseButton>
          </Header>
          <MenuContent>{SETTINGS_SECTIONS.map(renderSection)}</MenuContent>

          {/* Stacked panels */}
          {stack.map((entry, idx) => {
            const isTop = idx === stack.length - 1;
            // Only render top 2 panels for performance
            if (idx < stack.length - 2) return null;
            const isExiting = isTop && animating && slideDirection === 'out';
            const renderPanel = panelRegistry[entry.screen];
            if (!renderPanel) {
              console.warn(`SettingsPanelStack: No panel registered for screen "${entry.screen}"`);
              return null;
            }
            return (
              <PanelWrapper
                key={`${entry.screen}-${idx}`}
                $isTop={isTop}
                $animating={animating && isTop}
                $direction={isTop && animating ? slideDirection : 'idle'}
              >
                {/*
                Rendered through a stable host, not mounted as `<Panel />`. A
                registry entry is a render function (`PanelRenderer`) and the
                registries are rebuilt by a `useMemo` whose deps include app
                state such as the active account, so an entry gets a fresh
                identity whenever that state moves. Mounting the entry itself
                made React read that new identity as a different component and
                remount the panel: adding an account switches the active
                account, which tore the add panel down mid-flight and lost the
                completion handoff parked behind its wait, leaving the panel
                sitting on top of the accounts list instead of returning to it.
                (The mobile stack already calls its registry this way.)
              */}
                <PanelHost
                  render={renderPanel}
                  onBack={isExiting ? () => {} : handlePop}
                  onNavigate={isExiting ? () => {} : handlePush}
                  onWait={handleWait}
                  onClose={handleClose}
                  {...(entry.props || {})}
                />
              </PanelWrapper>
            );
          })}
        </DrawerPaper>
      </Drawer>
    </>
  );
}

/**
 * Renders one registry entry.
 *
 * A stable component type, so React reconciles the panel by the identity of
 * the components the entry returns rather than by the entry itself.
 */
function PanelHost({ render, ...props }: { render: PanelRenderer } & PanelContentProps) {
  return render(props);
}

// ============================================================================
// Panel Wrapper with animation
// ============================================================================

const PanelWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isTop' && prop !== '$animating' && prop !== '$direction',
})<{ $isTop: boolean; $animating: boolean; $direction: 'in' | 'out' | 'idle' }>(({
  $isTop,
  $animating,
  $direction,
}) => {
  const isSlideIn = $animating && $isTop && $direction === 'in';
  const isSlideOut = $animating && $isTop && $direction === 'out';

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
    zIndex: $isTop ? 2 : 1,
    transform: 'translateX(0)',
    ...(isSlideIn
      ? {
          animation: `slideInFromRight ${PUSH_DURATION}ms ease-out forwards`,
        }
      : {}),
    ...(isSlideOut
      ? {
          animation: `slideOutToRight ${POP_DURATION}ms ease-in forwards`,
        }
      : {}),
    '@keyframes slideInFromRight': {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
    },
    '@keyframes slideOutToRight': {
      from: { transform: 'translateX(0)' },
      to: { transform: 'translateX(100%)' },
    },
  };
});
