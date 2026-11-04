/**
 * DagonScreen — the Dagon Powerup on React Native (spec 043), mobile only,
 * shown as the "Private Balance" tab. Laid out after Dagon's own wallet page
 * (dagon.so/wallet) in Salmon's components: the devnet notice, always; how many
 * private balances are sealed; the actions; the public mock tokens; one row per
 * private balance with its Reveal; the "In progress" card. On a first visit
 * only Activate. Every value arrives composed from the shared hook; core draws
 * the confirmation, the wait and the receipt.
 */
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';
import { useDagonScreenLogic } from '@salmon/shared/powerups';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  ArrowsLeftRightIcon,
  LockIcon,
  iconSize,
} from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { Card } from '../Card';
import { FactsCard } from '../FactsCard';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { Pill } from '../Pill';
import { SectionLabel } from '../SectionLabel';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import { DagonActionSheet } from './DagonActionSheet';
import type { DagonScreenProps } from './types';

const GLYPH = { USDC: '$', DOGE: 'Ð' } as const;

const ACTION_ICON = {
  hide: ArrowDownIcon,
  send: ArrowUpRightIcon,
  swap: ArrowsLeftRightIcon,
  withdraw: ArrowUpIcon,
  continueWithdraw: ArrowUpIcon,
} as const;

export function DagonScreen({
  style,
  sheetHeight,
  testID = 'dagon-screen',
  ...logicParams
}: DagonScreenProps) {
  const logic = useDagonScreenLogic(logicParams);
  const { progress } = logic;
  const styles = useThemedStyles(stylesFor);
  const { text, accent } = useSemantic();

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      <WarningNotice tone="warning" title={logic.notice.title} testID="dagon-notice">
        {logic.notice.body}
      </WarningNotice>

      {logic.status === 'loading' && <SkeletonRow count={2} lines={2} testID="dagon-loading" />}

      {logic.status === 'unavailable' && (
        <StateBlock
          tone="error"
          testID="dagon-unavailable"
          title={logic.unavailable.title}
          body={logic.unavailable.body}
          onRetry={logic.unavailable.onRetry}
          retryLabel={logic.unavailable.retryLabel}
        />
      )}

      {logic.status === 'ready' && (
        <>
          {logic.error && <WarningNotice tone="error" title={logic.error} testID="dagon-error" />}

          {logic.activate && (
            <View style={styles.group}>
              <WarningNotice tone="info" title={logic.activate.body} testID="dagon-activate-info" />
              <PrimaryButton
                testID="dagon-activate"
                onPress={() => void logic.activate?.onPress()}
                loading={logic.activate.loading}
                disabled={logic.activate.loading}
              >
                {logic.activate.label}
              </PrimaryButton>
            </View>
          )}

          {logic.summary && (
            <View style={styles.inline} testID="dagon-summary">
              <LockIcon size={iconSize.sm} color={text.secondary} />
              <Text style={styles.caption}>{logic.summary}</Text>
            </View>
          )}

          {logic.actions.length > 0 && (
            <View style={styles.actions} testID="dagon-actions">
              {logic.actions.map((action) => {
                const Glyph = ACTION_ICON[action.key];
                return (
                  <Card
                    key={action.key}
                    testID={`dagon-action-${action.key}`}
                    onPress={() => void action.onPress()}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    padding="md"
                    radius="xl"
                    style={styles.action}
                  >
                    <Glyph size={iconSize.lg} color={accent.ink} />
                    <Text style={styles.actionLabel} numberOfLines={1} adjustsFontSizeToFit>
                      {action.label}
                    </Text>
                  </Card>
                );
              })}
            </View>
          )}

          {logic.faucet && (
            <SecondaryButton
              testID="dagon-faucet"
              onPress={() => void Linking.openURL(logic.faucet!.url).catch(() => undefined)}
            >
              {logic.faucet.label}
            </SecondaryButton>
          )}

          {logic.cards.length > 0 && (
            <View style={styles.group}>
              <SectionLabel variant="caps">{logic.sections.public}</SectionLabel>
              {logic.cards.map((card) => (
                <ListRow
                  key={card.side}
                  testID={`dagon-public-${card.side}`}
                  leading={
                    <IconBubble size={40} tone="surface">
                      <Text style={styles.glyph}>{GLYPH[card.side]}</Text>
                    </IconBubble>
                  }
                  title={card.title}
                  subtitle={card.name}
                  trailing={<Text style={styles.amount}>{card.publicBalance}</Text>}
                />
              ))}
            </View>
          )}

          {logic.cards.length > 0 && (
            <View style={styles.group}>
              <View style={styles.inline}>
                <LockIcon size={iconSize.sm} color={accent.ink} />
                <SectionLabel variant="caps" style={styles.privateLabel}>
                  {logic.sections.private}
                </SectionLabel>
              </View>
              {logic.cards.map((card) => (
                <View key={card.side} style={styles.group} testID={`dagon-card-${card.side}`}>
                  <ListRow
                    leading={
                      <IconBubble size={40} tone="accent-tint">
                        <Text style={[styles.glyph, styles.accentText]}>{GLYPH[card.side]}</Text>
                      </IconBubble>
                    }
                    title={card.title}
                    subtitle={
                      card.detail?.tone === 'secondary'
                        ? `${card.privateName} · ${card.detail.text}`
                        : card.privateName
                    }
                    trailing={
                      <View style={styles.inline}>
                        <View style={styles.sealedColumn}>
                          {card.handle && (
                            <Text style={styles.handle} numberOfLines={1}>
                              {card.handle}
                            </Text>
                          )}
                          <Text style={card.hidden.sealed ? styles.caption : styles.amount}>
                            {card.hidden.value}
                          </Text>
                        </View>
                        <TextButton
                          testID={`dagon-reveal-${card.side}`}
                          onPress={() => void card.reveal.onPress()}
                          disabled={card.reveal.disabled}
                        >
                          {card.reveal.label}
                        </TextButton>
                      </View>
                    }
                  />
                  {card.detail?.tone === 'danger' && (
                    <WarningNotice tone="error" title={card.detail.text} />
                  )}
                </View>
              ))}
              <Text style={styles.caption}>{logic.sections.footer}</Text>
            </View>
          )}

          {(logic.cards.length > 0 || progress.items.length > 0) && (
            <FactsCard
              testID="dagon-progress"
              title={progress.title}
              rows={
                progress.items.length > 0
                  ? progress.items.flatMap((item) => [
                      {
                        key: item.id,
                        label: item.title,
                        value: <Pill label={item.stateLabel} tone={item.tone} dot />,
                      },
                      ...(item.hint
                        ? [{ key: `${item.id}-hint`, label: item.hint, value: '' }]
                        : []),
                    ])
                  : [{ key: 'empty', label: progress.empty, value: '' }]
              }
            />
          )}
        </>
      )}

      <DagonActionSheet sheet={logic.sheet} height={sheetHeight} />
    </ScrollView>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: s(spacing.headerPadding),
      paddingBottom: vs(spacing.xl),
      gap: vs(spacing.screenGutter),
    },
    group: {
      gap: vs(spacing.md),
    },
    inline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    actions: {
      flexDirection: 'row',
      gap: s(spacing.sm),
    },
    action: {
      flex: 1,
      alignItems: 'center',
      gap: vs(spacing.sm),
    },
    actionLabel: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.body),
      color: t.text.primary,
    },
    privateLabel: {
      color: t.accent.ink,
    },
    accentText: {
      color: t.accent.ink,
    },
    handle: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.body),
      color: t.accent.ink,
    },
    sealedColumn: {
      alignItems: 'flex-end',
      gap: vs(spacing.xxs),
    },
    caption: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
    glyph: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      color: t.text.primary,
    },
    amount: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      color: t.text.primary,
    },
  });

export default DagonScreen;
