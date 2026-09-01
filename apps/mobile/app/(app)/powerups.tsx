/**
 * Powerups — POWERUPS 02 · Browse.
 *
 * The launcher sheet is gone: a sheet left the Home header showing above it,
 * and the catalogue is a place you go rather than a panel you peek at. This
 * is a full-height screen presented from the bottom, so it covers Home
 * entirely, and the same FAB that opened it sits in the same spot rotated to
 * a close mark — one control, not two.
 *
 * There is no back well: the FAB, the system back and the swipe are the three
 * ways out, and a chevron would be a fourth that means the same thing.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  borderRadius,
  useAccountsContext,
  fontFamilyNative,
  fontSize,
  lineHeight,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import {
  Card,
  ChipGroup,
  DepthBackground,
  IconBubble,
  ListRow,
  PowerupBadge,
  PowerupsFab,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
} from '../../src/components';
import { LightningIcon, MagnifyingGlassIcon } from '../../src/icons';
import { useTabChrome } from '../../hooks/useTabChrome';
import { useDeveloperMode } from '../../src/contexts/DeveloperModeContext';
import { getPowerups, type Powerup } from '../../src/powerups/catalog';

/** The lightning that marks the catalogue, per the `.pen` header. */
const TITLE_GLYPH_SIZE = 17;
/** The search pill's magnifier. */
const SEARCH_GLYPH_SIZE = 18;
/** The installed tile's mark. */
const TILE_BUBBLE_SIZE = 48;
/** The featured card's mark — the same 48, on ink. */
const FEATURED_BUBBLE_SIZE = 48;
/** The catalogue row's mark. */
const ROW_BUBBLE_SIZE = 44;

type FilterKey = 'all' | 'featured' | 'official' | 'community';

const FILTER_KEYS: FilterKey[] = ['all', 'featured', 'official', 'community'];

function matchesFilter(powerup: Powerup, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'featured') return !!powerup.featured;
  return powerup.tier === filter;
}

export default function PowerupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scrollBottomPadding, floatingBottomOffset } = useTabChrome();
  const developerMode = useDeveloperMode();

  // The lock overlay mounts in `(app)/_layout.tsx`, above the whole stack —
  // that covers every plain pushed screen (Wallets, Activity). Powerups is
  // the one exception: `presentation: 'fullScreenModal'` (see the Stack
  // config in `(app)/_layout.tsx`) gives iOS its own native window, stacked
  // above the entire React tree, so no React-level overlay — however high —
  // can paint over it. This screen has to close itself instead.
  const [{ locked }] = useAccountsContext();
  useEffect(() => {
    if (locked) router.back();
  }, [locked, router]);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  // The mock catalogue is developer-only: without the flag the screen shows
  // the one powerup the wallet can actually open, and says so everywhere else.
  const catalogue = useMemo(
    () => getPowerups({ includeMocks: developerMode }),
    [developerMode]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogue.filter((powerup) => {
      if (!matchesFilter(powerup, filter)) return false;
      if (!needle) return true;
      // Searching the rendered copy, not the key: the user types what they
      // read, and what they read is the localised string.
      const name = t(powerup.name).toLowerCase();
      const description = t(powerup.description).toLowerCase();
      return name.includes(needle) || description.includes(needle);
    });
  }, [catalogue, filter, query, t]);

  // A powerup appears exactly once: installed ones are tiles and nothing else,
  // featured ones outrank their tier. Otherwise Swap would be a tile AND an
  // official row, and the catalogue would look twice as full as it is.
  const installed = visible.filter((powerup) => powerup.installed);
  const featured = visible.filter((powerup) => !powerup.installed && powerup.featured);
  const official = visible.filter(
    (powerup) => !powerup.installed && !powerup.featured && powerup.tier === 'official'
  );
  const community = visible.filter(
    (powerup) => !powerup.installed && !powerup.featured && powerup.tier === 'community'
  );

  const filterOptions = useMemo(
    () => FILTER_KEYS.map((key) => ({ key, label: t(`powerups.filters.${key}`) })),
    [t]
  );

  const handleOpen = useCallback(
    (powerup: Powerup) => {
      if (!powerup.route) return;
      // Swap lives in the tab navigator, which is BEHIND this screen: pushing
      // it without dismissing first would open it under the catalogue.
      router.back();
      router.push(powerup.route as never);
    },
    [router]
  );

  const emptyState = (key: string) => (
    <Text testID={`powerups-empty-${key}`} style={styles.empty}>
      {t('powerups.empty_section')}
    </Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Presented over the tab shell, so it mounts its own water column —
          the shell's ground is behind it, not under it. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        title={t('powerups.browse_title')}
        subtitle={t('powerups.browse_subtitle')}
        titleGlyph={
          <LightningIcon
            weight="bold"
            size={ms(TITLE_GLYPH_SIZE)}
            color={semantic.accent.ink}
          />
        }
      />

      <ScrollView
        testID="powerups-browse-screen"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchPill}>
          <MagnifyingGlassIcon size={ms(SEARCH_GLYPH_SIZE)} color={semantic.text.secondary} />
          <TextInput
            testID="powerups-search-input"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('powerups.search_placeholder')}
            placeholderTextColor={semantic.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('powerups.search_placeholder')}
          />
        </View>

        <ChipGroup
          testID="powerups-filters"
          size="sm"
          options={filterOptions}
          value={filter}
          onChange={(key) => setFilter(key as FilterKey)}
        />

        <View style={styles.section}>
          <SectionLabel variant="caps">{t('powerups.installed')}</SectionLabel>
          {installed.length > 0 ? (
            <View testID="powerups-installed-grid" style={styles.grid}>
              {installed.map((powerup) => (
                <Card
                  key={powerup.id}
                  testID={`powerups-tile-${powerup.id}`}
                  padding="sm"
                  radius="xl"
                  gap={vs(spacing.sm)}
                  onPress={powerup.route ? () => handleOpen(powerup) : undefined}
                  accessibilityLabel={t(powerup.name)}
                  style={styles.tile}
                >
                  <IconBubble
                    size={TILE_BUBBLE_SIZE}
                    shape="rounded"
                    tone="accent"
                    icon={powerup.icon}
                    iconWeight="bold"
                  />
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {t(powerup.name)}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            emptyState('installed')
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel variant="caps">{t('powerups.sections.featured')}</SectionLabel>
          {featured.length > 0
            ? featured.map((powerup) => (
                <Card
                  key={powerup.id}
                  testID={`powerups-featured-${powerup.id}`}
                  tone="ink"
                  padding="lg"
                  gap={vs(spacing.md)}
                >
                  <View style={styles.featuredTop}>
                    <IconBubble
                      size={FEATURED_BUBBLE_SIZE}
                      shape="rounded"
                      tone="accent"
                      icon={powerup.icon}
                      iconWeight="bold"
                    />
                    <View style={styles.badges}>
                      <PowerupBadge tier="featured" />
                      <PowerupBadge tier={powerup.tier} />
                    </View>
                  </View>
                  <View style={styles.featuredText}>
                    <Text style={styles.featuredTitle}>{t(powerup.name)}</Text>
                    <Text style={styles.description}>{t(powerup.description)}</Text>
                  </View>
                </Card>
              ))
            : emptyState('featured')}
        </View>

        {(['official', 'community'] as const).map((tier) => {
          const rows = tier === 'official' ? official : community;
          return (
            <View key={tier} style={styles.section}>
              <SectionLabel variant="caps">{t(`powerups.sections.${tier}`)}</SectionLabel>
              {rows.length > 0
                ? rows.map((powerup) => (
                    <ListRow
                      key={powerup.id}
                      testID={`powerups-row-${powerup.id}`}
                      padding="lg"
                      leading={
                        <IconBubble
                          size={ROW_BUBBLE_SIZE}
                          shape="rounded"
                          tone="accent-tint"
                          icon={powerup.icon}
                          iconWeight="bold"
                        />
                      }
                      title={t(powerup.name)}
                      subtitle={t(powerup.description)}
                      trailing={<PowerupBadge tier={powerup.tier} />}
                    />
                  ))
                : emptyState(tier)}
            </View>
          );
        })}
      </ScrollView>

      {/* The same control that opened the screen, in the same spot, turned. */}
      <PowerupsFab open onPress={() => router.back()} bottomOffset={floatingBottomOffset} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(spacing.screenGutter),
    gap: vs(spacing.xl),
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    paddingHorizontal: s(spacing.lg),
    height: vs(44),
    borderRadius: borderRadius.full,
    backgroundColor: semantic.surface.raised,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.mono),
    color: semantic.text.primary,
  },
  section: {
    gap: vs(spacing.md),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: s(spacing.md),
    rowGap: vs(spacing.md),
  },
  // Three to a row: 30% each leaves the two 12pt gutters their room, and
  // nothing grows, so a lone tile stays tile-sized instead of stretching.
  tile: {
    flexBasis: '30%',
    flexGrow: 0,
    alignItems: 'center',
  },
  tileLabel: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.primary,
    textAlign: 'center',
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(spacing.md),
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  featuredText: {
    gap: vs(spacing.xs),
  },
  featuredTitle: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.heading),
    lineHeight: s(fontSize.heading) * lineHeight.snug,
    color: semantic.text.primary,
  },
  description: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.secondary,
  },
  empty: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.tertiary,
  },
});
