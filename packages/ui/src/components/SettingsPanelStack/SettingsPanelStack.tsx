/**
 * SettingsPanelStack — Settings on the DOM: the root list and the stack of
 * screens it pushes.
 *
 * The mobile twin is the route pair `app/(app)/settings/index.tsx` +
 * `settings/[panel].tsx`: sections are `SectionLabel` caps over `ListRow`s,
 * each row a leading `IconBubble` and a trailing value, chevron or switch,
 * and every entry pushes its own sub-screen. The side panel has no
 * navigator, so the push is this stack: the root is the screen, each pushed
 * panel a full-height surface over it, sliding in from the right and out the
 * same way — the DOM alternative to the stack's own transition.
 *
 * Settings is a *page*, not an overlay: the app's `SlideStack` mounts it and
 * animates its entrance and exit like any other screen, exactly as mobile's
 * navigator does with the route. So this component owns only the stack it
 * pushes inside itself — never whether Settings is on screen at all. That is
 * the router's business, and keeping it there is what lets any screen (Home,
 * Wallets) open Settings.
 *
 * Every panel paints its own water through `SettingsPanelContent`, so the
 * ground never ghosts through a panel sliding in over the list.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SCREEN_POP_MS,
  SCREEN_PUSH_MS,
  fontFamily,
  fontSize,
  fontWeight,
  getSettingsItemTestId,
  motionEasing,
  motionMs,
  spacing,
  SETTINGS_GROUPS,
  useAccountsContext,
  useDeveloperModeSettings,
  useSettingsPanelStack,
  useWaitExit,
  type IconGlyphProps,
  type SettingsIconName,
  type SettingsRowDef,
  type SettingsScreen,
  type SettingsToggleKey,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { screenSlideAnimation, useReducedMotion } from '../../motion';
import {
  AddressBookIcon,
  ArrowSquareOutIcon,
  CaretRightIcon,
  ChartBarIcon,
  CircleHalfIcon,
  CodeIcon,
  EyeIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MoneyIcon,
  QuestionIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SquaresFourIcon,
  TranslateIcon,
  TrashIcon,
  UserCircleIcon,
  UsersIcon,
  iconSize,
} from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { LoadingScreen } from '../LoadingScreen';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type {
  PanelContentProps,
  PanelRenderer,
  PanelWait,
  SettingsPanelStackProps,
  SettingsRootProps,
} from './types';

// ============================================================================
// The rows — the shared table (`SETTINGS_GROUPS`); the glyphs are the DOM's
// ============================================================================

const SETTINGS_ICONS: Record<SettingsIconName, React.ComponentType<IconGlyphProps>> = {
  users: UsersIcon,
  userCircle: UserCircleIcon,
  shieldCheck: ShieldCheckIcon,
  key: KeyIcon,
  lock: LockIcon,
  translate: TranslateIcon,
  money: MoneyIcon,
  arrowSquareOut: ArrowSquareOutIcon,
  circleHalf: CircleHalfIcon,
  addressBook: AddressBookIcon,
  squaresFour: SquaresFourIcon,
  chartBar: ChartBarIcon,
  code: CodeIcon,
  eye: EyeIcon,
  question: QuestionIcon,
  info: InfoIcon,
  trash: TrashIcon,
  signOut: SignOutIcon,
};

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

/** The switch's geometry — a track two thumbs long. */
const SWITCH_TRACK_WIDTH = 44;
const SWITCH_TRACK_HEIGHT = 24;
const SWITCH_THUMB_SIZE = 20;
const SWITCH_THUMB_INSET = (SWITCH_TRACK_HEIGHT - SWITCH_THUMB_SIZE) / 2;

// ============================================================================
// Motion — the screen slide (`motion/screenSlide`): a panel pushes in from the
// right and pops out the same way, on the one clock every stack reads
// ============================================================================

const PUSH_MS = SCREEN_PUSH_MS;
const POP_MS = SCREEN_POP_MS;

// ============================================================================
// Switch — the toggle row's control, role="switch" on a real button
// ============================================================================

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  testID?: string;
}

function Switch({ checked, onChange, label, hint, testID }: SwitchProps) {
  const { accent, border, text } = useSemantic();
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={hint}
      data-testid={testID}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: SWITCH_TRACK_WIDTH,
        height: SWITCH_TRACK_HEIGHT,
        flexShrink: 0,
        margin: 0,
        padding: 0,
        border: 'none',
        borderRadius: SWITCH_TRACK_HEIGHT / 2,
        cursor: 'pointer',
        // Off-track on `border.default`: the card token vanished against the
        // row's own card ground, leaving the off state invisible.
        backgroundColor: checked ? accent.ink : border.default,
        transition: reduced
          ? undefined
          : `background-color ${motionMs.flick}ms ${motionEasing.current.css}`,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: SWITCH_THUMB_INSET,
          left: SWITCH_THUMB_INSET,
          width: SWITCH_THUMB_SIZE,
          height: SWITCH_THUMB_SIZE,
          borderRadius: '50%',
          backgroundColor: text.primary,
          transform: checked
            ? `translateX(${SWITCH_TRACK_WIDTH - SWITCH_THUMB_SIZE - SWITCH_THUMB_INSET * 2}px)`
            : 'translateX(0)',
          transition: reduced
            ? undefined
            : `transform ${motionMs.flick}ms ${motionEasing.current.css}`,
        }}
      />
    </button>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SettingsPanelStack({
  onClose,
  panelRegistry,
  initialPanels,
  analyticsEnabled = false,
  onAnalyticsToggle,
  onRemoveWallet,
  onRemoveAllWallets,
  rowValues,
}: SettingsPanelStackProps): React.ReactElement | null {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const reduced = useReducedMotion();
  const { stack, push, pop, reset, canGoBack } = useSettingsPanelStack();
  // The two "show me more" settings come from the provider the root mounts —
  // the same instance the carousel and the network panel read (mobile's
  // settings/index.tsx does the same).
  const [{ networkId }, accountActions] = useAccountsContext();
  const {
    developerNetworks,
    showUnverifiedTokens,
    toggleDeveloperNetworks,
    setShowUnverifiedTokens,
  } = useDeveloperModeSettings();
  // Turning the flag off while the session stands on devnet moves it to the
  // mainnet sibling first — the shared toggle owns that passage.
  const handleToggleDeveloperNetworks = useCallback(() => {
    void toggleDeveloperNetworks({
      activeNetworkId: networkId,
      changeNetwork: accountActions.changeNetwork,
    });
  }, [toggleDeveloperNetworks, networkId, accountActions]);
  const handleToggleUnverifiedTokens = useCallback(
    (show: boolean) => {
      void setShowUnverifiedTokens(show);
    },
    [setShowUnverifiedTokens]
  );

  // Track animation state for the top panel
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');
  const animationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialPanelsPushedRef = useRef(false);

  // Seed the stack when Settings is mounted onto a panel — before the first
  // paint, so the root never flashes past. Mounting is the whole lifecycle
  // now: leaving Settings unmounts this component, which is what clears the
  // stack, so there is nothing to reset on the way out.
  useEffect(() => {
    if (initialPanels && initialPanels.length > 0 && !initialPanelsPushedRef.current) {
      initialPanelsPushedRef.current = true;
      reset(initialPanels);
    }
  }, [initialPanels, reset]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  const handlePush = useCallback(
    (screen: SettingsScreen, props?: Record<string, unknown>) => {
      if (animating) return;
      setSlideDirection('in');
      setAnimating(true);
      push(screen, props);
      animationTimerRef.current = setTimeout(() => setAnimating(false), reduced ? 0 : PUSH_MS);
    },
    [push, animating, reduced]
  );

  const handlePop = useCallback(() => {
    if (animating || !canGoBack) return;
    // Animate out first, then pop after animation completes
    setSlideDirection('out');
    setAnimating(true);
    animationTimerRef.current = setTimeout(
      () => {
        pop();
        setAnimating(false);
      },
      reduced ? 0 : POP_MS
    );
  }, [pop, canGoBack, animating, reduced]);

  /**
   * The wait a panel raises, hosted **here** rather than inside the panel: the
   * flows that wait in settings (adding an account) finish by closing settings,
   * so the surface is torn down while the closing wave is still crossing. A
   * wait rendered inside a panel goes with it and the wave plays nowhere.
   * `wait` is kept after it is lowered so the copy survives the exit ramp.
   */
  const [wait, setWait] = useState<PanelWait | null>(null);
  const [waiting, setWaiting] = useState(false);
  const handleWait = useCallback((next: PanelWait | null) => {
    if (next) setWait(next);
    setWaiting(next !== null);
  }, []);
  const { held: waitHeld, onExited: onWaitExited } = useWaitExit(waiting);

  // ---- The root list ----

  const handleRowPress = useCallback(
    (row: SettingsRowDef) => {
      if (row.kind === 'action') {
        if (row.id === 'removeWallet') onRemoveWallet?.();
        else if (row.id === 'removeAll') onRemoveAllWallets?.();
        return;
      }
      if (row.kind === 'toggle') return;
      handlePush(row.id);
    },
    [handlePush, onRemoveWallet, onRemoveAllWallets]
  );

  // Three toggles, one row shape; which setting each flips is this platform's
  // wiring, the row itself is the shared table's.
  const toggles: Record<
    SettingsToggleKey,
    { checked: boolean; onChange?: (checked: boolean) => void }
  > = {
    analytics: { checked: analyticsEnabled, onChange: onAnalyticsToggle },
    developerNetworks: { checked: developerNetworks, onChange: handleToggleDeveloperNetworks },
    unverifiedTokens: { checked: showUnverifiedTokens, onChange: handleToggleUnverifiedTokens },
  };

  const renderRow = useCallback(
    (row: SettingsRowDef) => {
      const label = t(row.labelKey);
      const testID = getSettingsItemTestId(row.id);
      const icon = SETTINGS_ICONS[row.icon];

      if (row.kind === 'toggle') {
        const toggle = toggles[row.id];
        const description = t(row.descriptionKey);
        return (
          <ListRow
            key={row.id}
            testID={testID}
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="surface"
                icon={icon}
                iconSize={iconSize.md}
              />
            }
            title={label}
            subtitle={description}
            trailing={
              // The switch semantics live on the switch itself — a wrapper
              // carrying role="switch" around a real switch announced twice.
              <Switch
                testID={row.testId}
                label={label}
                hint={description}
                checked={toggle.checked}
                onChange={(next) => toggle.onChange?.(next)}
              />
            }
          />
        );
      }

      const value =
        row.kind === 'panel'
          ? rowValues?.[row.id as keyof NonNullable<typeof rowValues>]
          : undefined;
      return (
        <ListRow
          key={row.id}
          testID={testID}
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={icon}
              iconSize={iconSize.md}
              iconColor={row.isDanger ? tokens.status.danger : undefined}
            />
          }
          title={label}
          onPress={() => handleRowPress(row)}
          trailing={
            value ? (
              <span
                data-testid={`${testID}-value`}
                style={{
                  color: tokens.text.secondary,
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.body,
                  maxWidth: '45%',
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </span>
            ) : (
              <CaretRightIcon
                size={iconSize.sm}
                color={row.isDanger ? tokens.status.danger : tokens.text.tertiary}
              />
            )
          }
          style={row.isDanger ? { backgroundColor: tokens.status.dangerTint } : undefined}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `toggles` is rebuilt per render from these six
    [
      analyticsEnabled,
      developerNetworks,
      showUnverifiedTokens,
      handleRowPress,
      onAnalyticsToggle,
      handleToggleDeveloperNetworks,
      handleToggleUnverifiedTokens,
      rowValues,
      tokens,
      t,
    ]
  );

  const root: SettingsRootProps = {
    title: t('settings.title', 'Settings'),
    subtitle: t('settings.subtitle'),
    onBack: onClose,
  };

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

      {/* The screen fills the pane the router gives it; the panels it pushes
          are absolute over that pane, so `relative` is the frame they take. */}
      <div
        data-testid="settings-surface"
        aria-label={root.title}
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* The root: Settings, the screen. */}
        <SettingsPanelContent
          testID="settings-screen"
          title={root.title}
          subtitle={root.subtitle}
          onBack={root.onBack}
        >
          {SETTINGS_GROUPS.map((group) => (
            <div
              key={group.titleKey}
              style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}
            >
              <SectionLabel
                variant="caps"
                style={group.isDanger ? { color: tokens.status.danger } : undefined}
              >
                {t(group.titleKey)}
              </SectionLabel>
              {/* A plain group, not a card: every row already draws its own,
                  and a card of cards paints the membrane twice. */}
              <div
                data-testid={`settings-section-${group.titleKey}`}
                style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}
              >
                {group.rows.map(renderRow)}
              </div>
            </div>
          ))}
        </SettingsPanelContent>

        {/* Stacked panels */}
        {stack.map((entry, idx) => {
          const isTop = idx === stack.length - 1;
          // Only render the top two panels for performance
          if (idx < stack.length - 2) return null;
          const isExiting = isTop && animating && slideDirection === 'out';
          const isEntering = isTop && animating && slideDirection === 'in';
          const renderPanel = panelRegistry[entry.screen];
          if (!renderPanel) {
            console.warn(`SettingsPanelStack: No panel registered for screen "${entry.screen}"`);
            return null;
          }
          const animation = isEntering
            ? screenSlideAnimation('push', reduced)
            : isExiting
              ? screenSlideAnimation('pop', reduced)
              : undefined;
          return (
            <div
              key={`${entry.screen}-${idx}`}
              data-testid={`settings-panel-${entry.screen}`}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: isTop ? 2 : 1,
                animation,
              }}
            >
              {/*
                Rendered through a stable host, not mounted as `<Panel />`. A
                registry entry is a render function and the registries are
                rebuilt by a `useMemo` whose deps include app state such as the
                active account, so an entry gets a fresh identity whenever that
                state moves. Mounting the entry itself made React read that new
                identity as a different component and remount the panel.
              */}
              <PanelHost
                render={renderPanel}
                onBack={isExiting ? () => {} : handlePop}
                onNavigate={isExiting ? () => {} : handlePush}
                onWait={handleWait}
                onClose={onClose}
                {...(entry.props || {})}
              />
            </div>
          );
        })}
      </div>
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
