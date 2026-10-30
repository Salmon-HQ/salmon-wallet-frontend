/**
 * DagonScreen — the Dagon Powerup on React Native (spec 043), mobile only.
 * In FR-020's order: the devnet notice, always; a balances card per mock
 * token with its Reveal; the actions; the "In progress" card. On a first
 * visit only Activate. Every value arrives composed from the shared hook;
 * core draws the confirmation, the wait and the receipt.
 */
import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { s, spacing, vs } from '@salmon/shared';
import { useDagonScreenLogic } from '@salmon/shared/powerups';

import { PrimaryButton, SecondaryButton } from '../Button';
import { FactsCard } from '../FactsCard';
import { Pill } from '../Pill';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import { DagonActionSheet } from './DagonActionSheet';
import type { DagonScreenProps } from './types';

export function DagonScreen({
  style,
  sheetHeight,
  testID = 'dagon-screen',
  ...logicParams
}: DagonScreenProps) {
  const logic = useDagonScreenLogic(logicParams);
  const { progress } = logic;

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

          {logic.cards.map((card) => (
            <View key={card.side} style={styles.group} testID={`dagon-card-${card.side}`}>
              <FactsCard title={card.title} rows={card.rows} />
              <SecondaryButton
                testID={`dagon-reveal-${card.side}`}
                onPress={() => void card.reveal.onPress()}
                disabled={card.reveal.disabled}
              >
                {card.reveal.label}
              </SecondaryButton>
            </View>
          ))}

          {logic.actions.length > 0 && (
            <View style={styles.group} testID="dagon-actions">
              {logic.actions.map((action, index) => {
                const Button = index === 0 ? PrimaryButton : SecondaryButton;
                return (
                  <Button
                    key={action.key}
                    testID={`dagon-action-${action.key}`}
                    onPress={() => void action.onPress()}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </View>
          )}

          {logic.faucet && (
            <SecondaryButton
              testID="dagon-faucet"
              onPress={() => void Linking.openURL(logic.faucet!.url)}
            >
              {logic.faucet.label}
            </SecondaryButton>
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

const styles = StyleSheet.create({
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
});

export default DagonScreen;
