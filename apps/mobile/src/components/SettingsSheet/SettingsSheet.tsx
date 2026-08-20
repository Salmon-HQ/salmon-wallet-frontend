/**
 * SettingsSheet - Settings content rendered inside the GateContainer
 * expanded state, with horizontal sub-panel transitions handled by
 * SettingsPanelStack.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  AddressBookIcon,
  ArrowSquareOutIcon,
  ChartBarIcon,
  CodeIcon,
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
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { SettingsPanelStack } from '../SettingsPanelStack';
import { SettingsHeaderContext, type SettingsHeaderState } from '../SettingsHeaderContext';
import {
  colors,
  spacing,
  contentPadding,
  borderRadius,
  fontSize,
  componentSizes,
  fontFamilyNative,
  useSettingsPanelStack,
  getSettingsItemTestId,
  type SettingsScreen,
  type SettingsPanelEntry,
  letterSpacing,
  motionMs,
  resolveMotionMs,
  semantic,
} from '@salmon/shared';

import type { SettingsSheetProps, SettingsOption, SettingsSection } from './types';
import type { MobilePanelRegistry } from '../SettingsPanelStack';

// ============================================================================
// Constants
// ============================================================================

const DANGER_COLORS = {
  text: semantic.status.danger,
  background: semantic.status.dangerTint,
  iconBackground: semantic.status.dangerTint,
} as const;

// The key-material rows carry no weight of their own. A settings list is a
// table of contents, and warning ink on a row that only opens a screen reads
// as "something is wrong here" when nothing is. The caution belongs before the
// decision it guards, and the decision is the reveal: both destinations open
// with a full warning notice, and the seed adds the clipboard and screenshot
// notices on top. See DESIGN.md §Components, the settings surface.

const NEUTRAL_OPTION_COLORS = {
  background: colors.background.card,
} as const;

const SCREEN_TITLE_KEYS: Partial<Record<SettingsScreen, string>> = {
  accounts: 'settings.accounts.title',
  avatar: 'settings.profile_picture',
  security: 'settings.security.title',
  backup: 'settings.backup',
  privateKey: 'settings.private_key',
  language: 'settings.display_language',
  currency: 'settings.currency',
  explorer: 'settings.select_explorer',
  network: 'settings.developer_networks',
  addressBook: 'settings.address_book',
  'address-book-add': 'settings.addressbook.add',
  'address-book-edit': 'settings.addressbook.edit',
  trustedApps: 'settings.trusted_apps',
  support: 'settings.help_support',
  about: 'settings.about',
  'account-edit': 'settings.account_edit.title',
  'account-name': 'settings.account_edit.name_section',
  'account-add': 'settings.account_add.title',
};

const DYNAMIC_HEADER_SCREENS = new Set<SettingsScreen>(['account-add', 'privateKey']);

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    titleKey: 'settings.sections.account',
    options: [
      { id: 'accounts', icon: UsersIcon, labelKey: 'settings.accounts.title' },
      { id: 'avatar', icon: UserCircleIcon, labelKey: 'settings.profile_picture' },
      { id: 'security', icon: ShieldCheckIcon, labelKey: 'settings.security.title' },
      { id: 'backup', icon: KeyIcon, labelKey: 'settings.backup' },
      { id: 'privateKey', icon: LockIcon, labelKey: 'settings.private_key' },
    ],
  },
  {
    titleKey: 'settings.sections.preferences',
    options: [
      { id: 'language', icon: TranslateIcon, labelKey: 'settings.display_language' },
      { id: 'currency', icon: MoneyIcon, labelKey: 'settings.currency' },
      { id: 'explorer', icon: ArrowSquareOutIcon, labelKey: 'settings.select_explorer' },
    ],
  },
  {
    titleKey: 'settings.sections.advanced',
    options: [
      { id: 'addressBook', icon: AddressBookIcon, labelKey: 'settings.address_book' },
      { id: 'trustedApps', icon: SquaresFourIcon, labelKey: 'settings.trusted_apps' },
      {
        id: 'network',
        icon: CodeIcon,
        labelKey: 'settings.developer_networks',
        isToggle: true,
      },
      {
        id: 'analytics',
        icon: ChartBarIcon,
        labelKey: 'settings.analytics',
        isToggle: true,
      },
    ],
  },
  {
    titleKey: 'settings.sections.support',
    options: [
      { id: 'support', icon: QuestionIcon, labelKey: 'settings.help_support' },
      { id: 'about', icon: InfoIcon, labelKey: 'settings.about' },
    ],
  },
  {
    titleKey: 'settings.sections.danger_zone',
    isDanger: true,
    options: [
      {
        id: 'removeWallet',
        icon: TrashIcon,
        labelKey: 'settings.wallets.remove_wallet',
        isDanger: true,
        isAction: true,
      },
      {
        id: 'removeAll',
        icon: SignOutIcon,
        labelKey: 'settings.wallets.remove_all_wallets',
        isDanger: true,
        isAction: true,
      },
    ],
  },
];

// ============================================================================
// Extended props (adds panelRegistry)
// ============================================================================

interface SettingsSheetWithPanelsProps extends SettingsSheetProps {
  panelRegistry?: MobilePanelRegistry;
  initialPanels?: SettingsPanelEntry[];
  /** Reports current header title and back action to parent (GateContainer) */
  onHeaderChange?: (title: string, onBack: (() => void) | undefined) => void;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsSheet({
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
  onHeaderChange,
  optionValues,
}: SettingsSheetWithPanelsProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { stack, push, pop, reset, canGoBack } = useSettingsPanelStack();
  const [headerOverride, setHeaderOverride] = React.useState<SettingsHeaderState | null>(null);
  const headerOverrideBackRef = React.useRef<(() => void) | null>(null);
  const headerOverrideOwnerRef = React.useRef<symbol | null>(null);
  const [animating, setAnimating] = React.useState(false);

  // These are bookkeeping timers, not animations: they clear the `animating`
  // flag once the panel stack has finished moving. They read the same two
  // tokens the stack animates on — `route` in, `ebb` out — so the gate cannot
  // outlast (or undercut) the motion it is gating.
  const isReduceMotionEnabled = useReducedMotion();
  const pushDurationMs = resolveMotionMs(motionMs.route, isReduceMotionEnabled);
  const popDurationMs = resolveMotionMs(motionMs.ebb, isReduceMotionEnabled);
  const [slideDirection, setSlideDirection] = React.useState<'in' | 'out' | 'idle'>('idle');
  const animationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Top fade gradient opacity
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);

  // Reset stack when sheet closes
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
          animationTimerRef.current = null;
        }
        setAnimating(false);
        setSlideDirection('idle');
        reset();
      }, pushDurationMs);
      return () => clearTimeout(timer);
    }
  }, [visible, reset, pushDurationMs]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const finishAnimation = useCallback(() => {
    setAnimating(false);
    setSlideDirection('idle');
    animationTimerRef.current = null;
  }, []);

  const handlePush = useCallback(
    (screen: SettingsScreen, props?: Record<string, unknown>) => {
      if (animating) return;
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      setSlideDirection('in');
      setAnimating(true);
      push(screen, props);
      animationTimerRef.current = setTimeout(() => {
        finishAnimation();
      }, pushDurationMs);
    },
    [animating, finishAnimation, push, pushDurationMs]
  );

  const handlePop = useCallback(() => {
    if (animating || !canGoBack) return;
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    setSlideDirection('out');
    setAnimating(true);
    animationTimerRef.current = setTimeout(() => {
      pop();
      finishAnimation();
    }, popDurationMs);
  }, [animating, canGoBack, finishAnimation, pop, popDurationMs]);

  // Push initial panels when drawer opens
  const initialPanelsPushedRef = React.useRef(false);
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

  const handleOptionPress = useCallback(
    (option: SettingsOption) => {
      if (option.isAction) {
        if (option.id === 'removeWallet' && onRemoveWallet) {
          onRemoveWallet();
        } else if (option.id === 'removeAll' && onRemoveAllWallets) {
          onRemoveAllWallets();
        }
        onClose();
        return;
      }

      // Push panel instead of navigating
      if (!option.isToggle && option.id !== 'developerNetworks' && panelRegistry) {
        handlePush(option.id as SettingsScreen);
      }
    },
    [handlePush, onClose, onRemoveAllWallets, onRemoveWallet, panelRegistry]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const opacity = Math.min(offsetY / 30, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  const renderSectionHeader = useCallback(
    (section: SettingsSection) => {
      const title = t(section.titleKey) || section.titleKey;
      return (
        <View
          key={`header-${section.titleKey}`}
          style={[styles.sectionHeader, section.isDanger && styles.sectionHeaderDanger]}
        >
          <Text
            style={[styles.sectionHeaderText, section.isDanger && styles.sectionHeaderTextDanger]}
          >
            {title}
          </Text>
        </View>
      );
    },
    [t]
  );

  const renderOption = useCallback(
    (option: SettingsOption, sectionIsDanger?: boolean, showDivider?: boolean) => {
      const label = t(option.labelKey) || option.labelKey;
      const isDanger = option.isDanger || sectionIsDanger;
      const value = optionValues?.[option.id];

      if (option.isToggle) {
        const isAnalytics = option.id === 'analytics';
        const checked = isAnalytics ? analyticsEnabled : developerNetworksEnabled;
        const onToggle = isAnalytics ? onAnalyticsToggle : onDeveloperNetworksToggle;
        const descriptionKey = isAnalytics
          ? 'settings.analytics_description'
          : 'settings.developer_networks_description';
        const toggleTestId = isAnalytics
          ? 'settings-analytics-toggle'
          : 'settings-developer-networks-toggle';
        return (
          <View
            key={`toggle-${option.labelKey}`}
            testID={getSettingsItemTestId(option.id)}
            style={[styles.optionRow, showDivider && styles.optionRowDivided]}
          >
            <View style={styles.iconContainer}>
              <option.icon size={iconSize.lg} color={semantic.text.primary} />
            </View>
            <View style={styles.toggleLabelContainer}>
              <Text style={styles.optionLabel}>{label}</Text>
              <Text style={styles.toggleDescription}>{t(descriptionKey)}</Text>
            </View>
            <View style={styles.toggleControl}>
              {/* The switch semantics live on the Switch itself. A wrapper View
                  carrying role="switch" around a real Switch announced twice. */}
              <Switch
                testID={toggleTestId}
                accessibilityLabel={label}
                accessibilityHint={t(descriptionKey)}
                value={checked}
                onValueChange={(value) => onToggle?.(value)}
                // Off-track on `border.default`: the card token vanished
                // against the row's own card ground.
                trackColor={{ false: semantic.border.default, true: semantic.accent.ink }}
                thumbColor={semantic.text.primary}
              />
            </View>
          </View>
        );
      }

      return (
        <TouchableOpacity
          key={option.id}
          testID={getSettingsItemTestId(option.id)}
          style={[styles.optionRow, showDivider && styles.optionRowDivided]}
          onPress={() => handleOptionPress(option)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={[styles.iconContainer, isDanger && styles.iconContainerDanger]}>
            <option.icon
              size={iconSize.lg}
              color={isDanger ? DANGER_COLORS.text : semantic.text.primary}
            />
          </View>
          {/* No chevron: the right-pointing caret promised a lateral slide,
              and the push now sinks and floats on the vertical. */}
          <Text style={[styles.optionLabel, isDanger && styles.optionLabelDanger]}>{label}</Text>
          {/* What the row currently reads. It is the answer the user opened
              the screen for, so the row states it instead of hiding it one
              tap away. */}
          {!!value && (
            <Text
              testID={`${getSettingsItemTestId(option.id)}-value`}
              style={styles.optionValue}
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [
      t,
      handleOptionPress,
      developerNetworksEnabled,
      onDeveloperNetworksToggle,
      analyticsEnabled,
      onAnalyticsToggle,
      optionValues,
    ]
  );

  // One card per section, not one per row. Eleven identically-sized chips
  // separated by air read as noise, and the gaps were doing no work: the
  // section label already says where one group ends. Grouped, the rows share a
  // ground and are parted by a decorative hairline, which is the least ink
  // that can say "these are siblings".
  const renderSection = useCallback(
    (section: SettingsSection, index: number) => (
      <View key={`section-${index}`} style={styles.section}>
        {renderSectionHeader(section)}
        <View
          testID={`settings-section-${section.titleKey}`}
          style={[styles.sectionCard, section.isDanger && styles.sectionCardDanger]}
        >
          {section.options.map((option, optionIndex) =>
            renderOption(option, section.isDanger, optionIndex > 0)
          )}
        </View>
      </View>
    ),
    [renderSectionHeader, renderOption]
  );

  const hasPanels = panelRegistry && stack.length > 0;
  const currentPanel = stack.length > 0 ? stack[stack.length - 1] : null;
  const fallbackTitle = currentPanel
    ? t(SCREEN_TITLE_KEYS[currentPanel.screen] || 'settings.title')
    : t('settings.title');
  const currentTitle = headerOverride?.title || fallbackTitle;
  const currentBackAction = currentPanel ? headerOverride?.onBack || handlePop : undefined;
  const invokeHeaderOverrideBack = useCallback(() => {
    headerOverrideBackRef.current?.();
  }, []);
  const handleHeaderStateChange = useCallback(
    (ownerId: symbol, nextState: SettingsHeaderState | null) => {
      if (!nextState) {
        if (headerOverrideOwnerRef.current !== ownerId) {
          return;
        }
        headerOverrideOwnerRef.current = null;
        headerOverrideBackRef.current = null;
        setHeaderOverride((previousState) => (previousState === null ? previousState : null));
        return;
      }

      headerOverrideOwnerRef.current = ownerId;
      headerOverrideBackRef.current = nextState.onBack;
      setHeaderOverride((previousState) => {
        const hasSameTitle = previousState?.title === nextState.title;
        if (hasSameTitle && previousState !== null) {
          return previousState;
        }

        return {
          title: nextState.title,
          onBack: invokeHeaderOverrideBack,
        };
      });
    },
    [invokeHeaderOverrideBack]
  );
  const headerContextValue = useMemo(
    () => ({ setHeaderState: handleHeaderStateChange }),
    [handleHeaderStateChange]
  );
  // Report header state to parent (GateContainer)
  useEffect(() => {
    onHeaderChange?.(currentTitle, currentBackAction ?? undefined);
  }, [currentTitle, currentBackAction, onHeaderChange]);

  useEffect(() => {
    if (!currentPanel || !DYNAMIC_HEADER_SCREENS.has(currentPanel.screen)) {
      headerOverrideOwnerRef.current = null;
      headerOverrideBackRef.current = null;
      setHeaderOverride(null);
    }
  }, [currentPanel]);

  return (
    <SettingsHeaderContext.Provider value={headerContextValue}>
      <View style={styles.container}>
        {/* Base: Settings Menu (panel 0) */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing['2xl'] },
          ]}
          scrollEnabled
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {SETTINGS_SECTIONS.map(renderSection)}
        </ScrollView>

        {/* Top fade gradient */}
        <Animated.View
          style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
          pointerEvents="none"
        >
          {/* The fade must read the ground it fades over. That ground is now
              the thick thermocline, so the fade is the same membrane ink
              laid on twice at the top and thinning to nothing — the material
              densifying, not an opaque band pasted over it. */}
          <LinearGradient
            colors={[semantic.surface.membraneThick, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Stacked panels overlay */}
        {hasPanels && panelRegistry && (
          <View style={styles.panelOverlay}>
            <SettingsPanelStack
              panelRegistry={panelRegistry}
              stack={stack}
              onNavigate={handlePush}
              onBack={handlePop}
              animating={animating}
              slideDirection={slideDirection}
            />
          </View>
        )}
      </View>
    </SettingsHeaderContext.Provider>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  topSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topSheetContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: contentPadding.screen,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderDanger: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: semantic.status.dangerTint,
    paddingTop: spacing.md,
  },
  // The `label` role: 10/600/uppercase/+0.3px, as the other on-system
  // surfaces render section and plane labels.
  sectionHeaderText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.label,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  sectionHeaderTextDanger: {
    color: DANGER_COLORS.text,
  },
  // The section's card, not the row's. `r4` is the card step; the row inside
  // it is no longer a surface of its own, so the Control Radius Rule has
  // nothing left to apply to here.
  sectionCard: {
    backgroundColor: NEUTRAL_OPTION_COLORS.background,
    borderRadius: borderRadius.r4,
    overflow: 'hidden',
  },
  sectionCardDanger: {
    backgroundColor: DANGER_COLORS.background,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  // Decorative by rule: the grouping is already carried by the card, so
  // nothing depends on this line being seen.
  optionRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: semantic.border.hairline,
  },
  iconContainer: {
    width: componentSizes.iconSize2XL,
    height: componentSizes.iconSize2XL,
    borderRadius: borderRadius.r2,
    // One step above the card it now sits on. At the row's old ink the tile
    // and its ground were the same value, which is what made the list read as
    // one grey field.
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: DANGER_COLORS.iconBackground,
  },
  optionLabel: {
    flex: 1,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
  optionLabelDanger: {
    color: DANGER_COLORS.text,
  },
  optionValue: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    marginLeft: spacing.sm,
    maxWidth: '45%',
    textAlign: 'right',
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toggleControl: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDescription: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginTop: spacing.xxs,
  },
  topFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: componentSizes.sheetFadeGradientHeight,
    zIndex: 1,
  },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export default SettingsSheet;
