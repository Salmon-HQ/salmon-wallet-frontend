/**
 * WalletHeader — the wallet's top row: thumb, account name, address, copy,
 * gear, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/WalletHeader/WalletHeader.tsx`
 * and the anatomy is the same: an `IconBubble` thumb carrying the account's own
 * avatar (the salmon mark when it has none), the name over the short address,
 * the environment chip beside the address off mainnet, the copy affordance with
 * its tick, and the gear circle at the other end. Both ends of the row are the
 * same object at the same size — a rounded square on the left made them read as
 * two different kinds of control.
 *
 * It is a header and nothing more: it sits on the same plane as the balance
 * below it, in flow, and never lifts, slides or reveals a panel from behind
 * itself. Nothing scrolls behind it, so it needs no band and no mask.
 *
 * The account text speaks the verb at chrome scale (DESIGN.md, "Chrome speaks
 * the verb at chrome scale") when the address changes — half the travel,
 * shorter clock, because this is chrome, not content — and `SinkFloat` is the
 * DOM expression of that. The copy button stays mounted through it: remounting
 * would reset the tick mid-hold.
 *
 * `onRefreshPress` has no mobile twin. It is the extension/web refresh
 * affordance and paints only when a host supplies it; the redesigned Home does
 * not, because the token list owns its own refresh.
 */
import React, { useCallback, useState } from 'react';
import {
  CHROME_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  getNetworkLabel,
  getShortAddress,
  letterSpacing,
  motionMs,
  spacing,
  useCopyFeedback,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowsClockwiseIcon, CheckIcon, CopyIcon, GearIcon } from '../../icons';
import { BrandMark } from '../BrandMark';
import { Chip } from '../Chip';
import { CopyTick } from '../CopyTick';
import { IconBubble } from '../IconBubble';
import { SinkFloat } from '../SinkFloat';
import type { WalletHeaderProps } from './types';

/** Left thumb — the account's own face, a 38px circle; opens the switcher. */
const WALLET_THUMB_SIZE = componentSizes.walletHeaderRowHeight;
/** Right control (settings) — a 36px circle. */
const SETTINGS_BUTTON_SIZE = 36;
/** The salmon mark standing in for a missing avatar, and the gear glyph. */
const GLYPH_SIZE = 18;

/** The verb at chrome scale: half the depth, half the travel, shorter clock. */
const accountLineVerb = {
  distance: SINK_FLOAT_TRAVEL / 2,
  scale: CHROME_SCALE,
  floatMs: motionMs.drift,
  sinkMs: motionMs.ebb,
  holdMs: motionMs.ebb + SINK_FLOAT_STAGGER_MS,
} as const;

export function WalletHeader({
  accountName,
  address,
  networkId,
  onCopyAddress,
  onSettingsPress,
  onWalletPress,
  onRefreshPress,
  refreshing = false,
  developerMode = false,
  avatarUrl,
  style,
  className,
}: WalletHeaderProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [imgError, setImgError] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();

  const handleCopyPress = useCallback(() => {
    onCopyAddress?.();
    showCopied();
  }, [onCopyAddress, showCopied]);

  const truncatedAddress = getShortAddress(address, developerMode ? 8 : 4) ?? address;
  const networkLabel = getNetworkLabel(networkId ?? 'solana-mainnet');

  return (
    <div
      data-testid="wallet-header-bar"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: componentSizes.walletHeaderRowHeight,
        // The redesign's one gutter: the thumb's left edge and the balance's
        // left edge below it are the same line.
        paddingLeft: spacing.screenGutter,
        paddingRight: spacing.screenGutter,
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.base,
        }}
      >
        {/* The wallet thumb is the account's own picture: the identity the user
            recognises sits where the identity switcher is. A generic wallet
            glyph said nothing about *which* wallet is open. */}
        <IconBubble
          testID="wallet-header-account-switcher"
          size={WALLET_THUMB_SIZE}
          shape="circle"
          tone="ink"
          onPress={onWalletPress}
          accessibilityLabel={t('accessibility.switch_wallet')}
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: borderRadius.full,
              }}
            />
          ) : (
            <BrandMark size={GLYPH_SIZE} />
          )}
        </IconBubble>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          {/* Only the text travels — the copy button and its feedback state
              stay mounted. Keyed on the address, so a chain switch and an
              account switch ride the same gesture. */}
          <SinkFloat
            transitionKey={address}
            distance={accountLineVerb.distance}
            scale={accountLineVerb.scale}
            floatMs={accountLineVerb.floatMs}
            sinkMs={accountLineVerb.sinkMs}
            holdMs={accountLineVerb.holdMs}
            style={{ flex: 1, minWidth: 0 }}
          >
            {/* Two lines: the name the user gave the wallet, and the short
                address under it. Both are the same affordance as the thumb
                beside them — they open the account switcher. Only the avatar
                was tappable once, which left the obvious target inert. */}
            <button
              type="button"
              data-testid="wallet-header-account-name"
              onClick={onWalletPress}
              aria-label={t('accessibility.switch_wallet')}
              style={{
                display: 'block',
                width: '100%',
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: onWalletPress ? 'pointer' : 'default',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.body,
                  color: semantic.text.primary,
                  letterSpacing: letterSpacing.normal,
                  lineHeight: '18px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {accountName}
              </span>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: fontFamily.sans,
                    fontWeight: fontWeight.medium,
                    fontSize: fontSize.caption,
                    // The muted address: no salmon in the header, and the name
                    // is the line that has to carry.
                    color: semantic.text.tertiary,
                    letterSpacing: letterSpacing.label,
                    lineHeight: '15px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truncatedAddress}
                </span>
                {networkLabel && (
                  <Chip
                    testID="wallet-header-network-chip"
                    size="sm"
                    variant="outline"
                    label={networkLabel}
                  />
                )}
              </span>
            </button>
          </SinkFloat>

          <button
            type="button"
            data-testid="wallet-header-copy-address"
            onClick={handleCopyPress}
            aria-label={
              copied
                ? t('actions.copied')
                : t('accessibility.copy_address', { address: truncatedAddress })
            }
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              padding: spacing.xs,
              cursor: 'pointer',
              display: 'inline-flex',
            }}
          >
            <CopyTick
              copied={copied}
              copy={<CopyIcon size={GLYPH_SIZE} color={semantic.text.secondary} />}
              tick={<CheckIcon size={GLYPH_SIZE} color={semantic.status.success} />}
            />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
        {onRefreshPress && (
          <IconBubble
            testID="wallet-header-refresh-button"
            size={SETTINGS_BUTTON_SIZE}
            tone="ink"
            icon={ArrowsClockwiseIcon}
            iconSize={GLYPH_SIZE}
            onPress={onRefreshPress}
            disabled={refreshing}
            accessibilityLabel={t('accessibility.refresh_balance', 'Refresh balance')}
          />
        )}
        {/* The gear reads as what it does; the avatar it replaced read as an
            identity and pointed at the wrong screen. */}
        <IconBubble
          testID="wallet-header-settings-button"
          size={SETTINGS_BUTTON_SIZE}
          tone="ink"
          icon={GearIcon}
          iconSize={GLYPH_SIZE}
          onPress={onSettingsPress}
          accessibilityLabel={t('accessibility.open_settings')}
        />
      </div>
    </div>
  );
}
