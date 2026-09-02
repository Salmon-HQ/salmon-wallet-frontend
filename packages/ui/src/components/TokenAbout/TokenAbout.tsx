/**
 * TokenAbout — the "About" `Card`: description, contract address copy row,
 * website link, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/TokenDetail/AboutCard.tsx`,
 * on the same `TokenAboutPropsBase`. Copy feedback is the shared
 * `useCopyFeedback` hold, drawn by `CopyTick` — the same object the wallet
 * header copies with. The contract row has no data dependency of its own (the
 * mint is always known), so the card renders for a token CoinGecko has
 * nothing to say about; only a card with nothing at all in it renders nothing.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  useCopyFeedback,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowSquareOutIcon, CheckIcon, CopyIcon, GlobeIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { CopyTick } from '../CopyTick';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SkeletonRow } from '../SkeletonRow';
import type { TokenAboutProps } from './types';

export function TokenAbout({
  description,
  contractAddress,
  contractAddressShort,
  website,
  loading = false,
  testID = 'token-detail-about',
  style,
  className,
}: TokenAboutProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const { copied, trigger: showCopied } = useCopyFeedback();

  const handleCopyAddress = useCallback(async () => {
    if (!contractAddress) return;
    try {
      await navigator.clipboard.writeText(contractAddress);
      showCopied();
    } catch (error) {
      console.warn('[TokenAbout] Failed to copy contract address:', error);
    }
  }, [contractAddress, showCopied]);

  const handleOpenWebsite = useCallback(() => {
    if (!website) return;
    window.open(website, '_blank', 'noopener,noreferrer');
  }, [website]);

  if (loading) {
    return (
      <SkeletonRow
        testID={testID}
        lines={2}
        count={2}
        accessibilityLabel={t('token.info.about', 'About')}
        style={style}
        className={className}
      />
    );
  }

  if (!description && !contractAddress && !website) return null;

  return (
    <Card padding="lg" gap={spacing.md} testID={testID} style={style} className={className}>
      {description && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <span style={titleStyle(semantic)}>{t('token.info.about', 'About')}</span>
          <span style={descriptionStyle(semantic)}>{description}</span>
        </div>
      )}

      {contractAddress && (
        <ListRow
          testID="token-detail-contract-address"
          onPress={handleCopyAddress}
          accessibilityLabel={
            copied
              ? t('actions.copied')
              : t('accessibility.copy_contract_address', 'Copy contract address')
          }
          leading={<IconBubble size={36} tone="surface" icon={CopyIcon} iconSize={iconSize.sm} />}
          title={t('token.info.contractAddress', 'Contract Address')}
          subtitle={contractAddressShort ?? contractAddress}
          trailing={
            <CopyTick
              copied={copied}
              copy={null}
              tick={<CheckIcon size={iconSize.sm} color={semantic.status.success} />}
            />
          }
        />
      )}

      {website && (
        <ListRow
          testID="token-detail-website"
          onPress={handleOpenWebsite}
          accessibilityRole="link"
          accessibilityLabel={t('accessibility.open_website', 'Open website: {{url}}', {
            url: website,
          })}
          leading={<IconBubble size={36} tone="surface" icon={GlobeIcon} iconSize={iconSize.sm} />}
          title={t('token.info.visitWebsite', 'Visit Website')}
          trailing={<ArrowSquareOutIcon size={iconSize.sm} color={semantic.text.secondary} />}
        />
      )}
    </Card>
  );
}

const titleStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.bodyLg,
  lineHeight: `${fontSize.bodyLg * lineHeight.snug}px`,
  color: t.text.primary,
});

const descriptionStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.relaxed}px`,
  color: t.text.secondary,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});
