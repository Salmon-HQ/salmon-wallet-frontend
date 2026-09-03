/**
 * ReceiveSheet — the wallet's receive address as a code, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ReceiveSheet/ReceiveSheet.tsx`:
 * a sheet on the thermocline holding the chain badge over the code, the
 * environment under it off mainnet, the wrong-network warning and the one
 * control that hands the address over — the copy button on the salmon fill.
 * The written address is gone from the sheet; the code is the address.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  componentSizes,
  copyToClipboard,
  fontFamily,
  fontSize,
  fontWeight,
  getChainDisplayName,
  letterSpacing,
  spacing,
  useCopyFeedback,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { BrandMark } from '../BrandMark';
import { CopyTick } from '../CopyTick';
import { FleshBackground } from '../FleshBackground';
import { QRCode } from '../QRCode';
import { WarningNotice } from '../WarningNotice';
import type { ReceiveSheetProps } from './types';

// Brand mark inside the QR: the knockout (quiet zone behind the mark) covers
// 24% of the code's width — under the ~30% of modules a level-H code can lose
// and still scan — and the mark sits inside it with breathing room.
const QR_LOGO_KNOCKOUT_RATIO = 0.24;
const QR_LOGO_MARK_RATIO = 0.66; // of the knockout, so the mark never touches modules

export function ReceiveSheet({
  visible,
  onClose,
  address,
  blockchain,
  networkLabel,
  onCopy,
  className,
  style,
}: ReceiveSheetProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const { copied, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const contentRef = useRef<HTMLDivElement>(null);
  const [qrSize, setQrSize] = useState<number>(componentSizes.qrCodeSize);
  const qrLogoKnockoutSize = Math.round(qrSize * QR_LOGO_KNOCKOUT_RATIO);

  // A deposit made on the wrong chain is gone for good, so the chain is named
  // twice: an opaque badge with a label and a warning that says what "wrong
  // network" costs.
  const chainName = getChainDisplayName(blockchain);

  useEffect(() => {
    if (!visible) resetCopied();
  }, [visible, resetCopied]);

  // The code fills the sheet's width minus the padding and its own border —
  // measured, because the panel is user-resizable.
  useEffect(() => {
    if (!visible || !contentRef.current) return undefined;
    const element = contentRef.current;
    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setQrSize(Math.floor(width - componentSizes.qrBorderWidth * 2));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  const handleCopy = useCallback(async () => {
    try {
      const succeeded = onCopy ? await onCopy() : await copyToClipboard(address);
      if (succeeded) showCopied();
    } catch {
      // Copy failed — keep showing the copy icon so the feedback stays honest.
    }
  }, [onCopy, address, showCopied]);

  const badgeStyle: React.CSSProperties = {
    backgroundColor: semantic.surface.raised,
    // A text chip takes the chip step, not a pill.
    borderRadius: borderRadius.r1,
    border: `1px solid ${semantic.border.raised}`,
    padding: `${spacing.xs}px ${spacing.md}px`,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.caption,
    letterSpacing: letterSpacing.label,
    color: semantic.text.primary,
  };

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{t('token.receive.title')}</SheetTitle>}
      testID="receive-sheet-container"
      className={className}
      style={{ maxHeight: '92vh', overflow: 'hidden', ...style }}
    >
      <div
        ref={contentRef}
        data-testid="receive-sheet"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: spacing['2xl'],
          gap: componentSizes.receiveContentGap,
        }}
      >
        {/* The badge labels the QR, not the sheet, so the two travel as one
            group: a tight gap inside it, the content gap outside it. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.headerPadding,
          }}
        >
          <span data-testid="receive-chain-badge" style={badgeStyle}>
            {t('token.send.blockchainAddress', { blockchain: chainName })}
          </span>

          <div
            data-testid="receive-qr-code"
            style={{
              position: 'relative',
              borderRadius: borderRadius.xl,
              border: `${componentSizes.qrBorderWidth}px solid ${semantic.text.primary}`,
              overflow: 'hidden',
              display: 'inline-flex',
              lineHeight: 0,
            }}
          >
            {/* The QR is data, not an accent: neutral inks maximise module
                contrast for a scanner. */}
            <QRCode
              value={address}
              size={qrSize}
              backgroundColor={semantic.text.primary}
              color={semantic.depth.abyss}
              // The centered mark hides modules, so the code carries level-H
              // redundancy — a wallet QR must stay scannable before it looks good.
              ecLevel="H"
            />
            {/* The salmon mark, centered on its own knockout so no module
                collides with it. Same inks as the code. */}
            <div
              data-testid="receive-qr-logo"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: qrLogoKnockoutSize,
                height: qrLogoKnockoutSize,
                borderRadius: qrLogoKnockoutSize / 4,
                backgroundColor: semantic.text.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <BrandMark
                size={Math.round(qrLogoKnockoutSize * QR_LOGO_MARK_RATIO)}
                color={semantic.depth.abyss}
              />
            </div>
          </div>
        </div>

        {/* Off mainnet the environment is named under the code: a deposit made
            to a test address is not money (spec 026 D6). */}
        {!!networkLabel && (
          <span
            data-testid="receive-network-label"
            style={{
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.caption,
              letterSpacing: letterSpacing.label,
              color: semantic.text.tertiary,
              textAlign: 'center',
            }}
          >
            {networkLabel}
          </span>
        )}

        {/* Wrong-network deposits are unrecoverable, so say so here. */}
        <WarningNotice
          tone="warning"
          title={t('token.receive.networkOnlyTitle', { chain: chainName })}
        >
          {t('token.receive.networkOnlyBody', { chain: chainName })}
        </WarningNotice>

        {/* The one path to the address string: the copied state is announced,
            not only painted. */}
        <button
          type="button"
          data-testid="receive-copy-button"
          onClick={() => void handleCopy()}
          aria-label={copied ? t('actions.copied') : t('token.receive.copyAddress')}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            overflow: 'hidden',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: semantic.accent.fill,
            borderRadius: borderRadius.lg,
            minWidth: componentSizes.copyButtonWidth,
            maxWidth: '100%',
            minHeight: componentSizes.buttonHeightCompact,
            padding: `${spacing.xs}px ${spacing.lg}px`,
          }}
        >
          {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
              fill. */}
          <FleshBackground />
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <CopyTick
              copied={copied}
              copy={<CopyIcon weight="bold" size={iconSize.md} color={semantic.accent.onFill} />}
              tick={<CheckIcon weight="bold" size={iconSize.md} color={semantic.accent.onFill} />}
            />
            <span
              aria-live="polite"
              style={{
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.bodyLg,
                color: semantic.accent.onFill,
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? t('token.receive.copied') : t('token.receive.copyAddress')}
            </span>
          </span>
        </button>
      </div>
    </BottomSheetContainer>
  );
}
