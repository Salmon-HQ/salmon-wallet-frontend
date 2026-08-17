/**
 * The semantic icon surface for React DOM (web + extension).
 *
 * `Icon` resolves a platform-neutral `IconName` from `@salmon/shared` to a
 * Phosphor glyph, so a screen names what it means and each platform draws it.
 * The glyphs themselves live in `../../icons` — the one place this package
 * talks to an icon vendor.
 *
 * The blockchain marks below stay hand-drawn: they are brand assets, not
 * interface icons, and no icon set carries them.
 */
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { getIconSize, colors } from '@salmon/shared';
import type { IconName } from '@salmon/shared';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowUpIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChartLineIcon,
  CheckIcon,
  CheckCircleIcon,
  CloudIcon,
  CopyIcon,
  CreditCardIcon,
  DiamondIcon,
  DotsThreeIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerprintIcon,
  GameControllerIcon,
  GearIcon,
  HeartIcon,
  ImageIcon,
  InfoIcon,
  KeyIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoneyIcon,
  PlusIcon,
  PulseIcon,
  QrCodeIcon,
  ScanIcon,
  ShieldIcon,
  StackIcon,
  StarIcon,
  SwapIcon,
  TagIcon,
  TrendDownIcon,
  TrendUpIcon,
  UsersIcon,
  WalletIcon,
  WarningIcon,
  WarningCircleIcon,
  XIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import type { UnifiedIconProps } from './types';

// ============================================================================
// Legacy named exports
//
// These predate the Phosphor consolidation and are part of this package's
// public surface, so they stay — now as aliases onto the shared set rather
// than as a second, hand-inlined icon family.
// ============================================================================

export {
  LockIcon,
  EyeIcon,
  EyeSlashIcon as EyeOffIcon,
  ArrowsClockwiseIcon as RefreshIcon,
  ArrowUpIcon as SendIcon,
  ArrowDownIcon as ReceiveIcon,
  GearIcon as SettingsIcon,
  CopyIcon,
  CaretRightIcon as ChevronRightIcon,
  CaretDownIcon as ChevronDownIcon,
  PulseIcon as ActivityIcon,
  WalletIcon,
  XIcon as CloseIcon,
};

// ============================================================================
// Semantic name → glyph
// ============================================================================

const ICON_COMPONENTS: Record<IconName, IconComponent> = {
  // Navigation
  'chevron-down': CaretDownIcon,
  'chevron-up': CaretUpIcon,
  'chevron-right': CaretRightIcon,
  'chevron-left': CaretLeftIcon,
  close: XIcon,
  back: ArrowLeftIcon,
  // Actions
  send: ArrowUpIcon,
  receive: ArrowDownIcon,
  copy: CopyIcon,
  refresh: ArrowsClockwiseIcon,
  settings: GearIcon,
  'qr-code': QrCodeIcon,
  scan: ScanIcon,
  // Visibility
  eye: EyeIcon,
  'eye-off': EyeSlashIcon,
  // Security
  lock: LockIcon,
  unlock: LockOpenIcon,
  shield: ShieldIcon,
  key: KeyIcon,
  fingerprint: FingerprintIcon,
  // Wallet
  wallet: WalletIcon,
  activity: PulseIcon,
  swap: SwapIcon,
  // Status
  checkmark: CheckIcon,
  'checkmark-circle': CheckCircleIcon,
  alert: WarningIcon,
  'alert-circle': WarningCircleIcon,
  info: InfoIcon,
  'info-circle': InfoIcon,
  // Token features
  diamond: DiamondIcon,
  people: UsersIcon,
  layers: StackIcon,
  image: ImageIcon,
  'game-controller': GameControllerIcon,
  analytics: ChartLineIcon,
  'trending-up': TrendUpIcon,
  'trending-down': TrendDownIcon,
  cash: MoneyIcon,
  card: CreditCardIcon,
  cloud: CloudIcon,
  star: StarIcon,
  heart: HeartIcon,
  tag: TagIcon,
  // Misc
  add: PlusIcon,
  remove: MinusIcon,
  search: MagnifyingGlassIcon,
  menu: ListIcon,
  more: DotsThreeIcon,
  link: LinkIcon,
  'external-link': ArrowSquareOutIcon,
};

/**
 * Unified Icon component for React DOM (web + extension).
 *
 * Weight stays at Phosphor's `regular`; a caller that needs `fill` reaches for
 * the glyph directly, and only for the two cases the design system allows.
 * Sizes below the 16px floor are lifted to it — a thinner box loses the stroke.
 *
 * @example
 * ```tsx
 * <Icon name="send" size="md" color={colors.text.primary} />
 * <Icon name="settings" size={24} />
 * <Icon name="eye" />
 * ```
 */
export function Icon({
  name,
  size = 'md',
  color = colors.text.primary,
  className,
  style,
}: UnifiedIconProps) {
  const IconGlyph = ICON_COMPONENTS[name];

  return (
    <IconGlyph
      className={className}
      style={style}
      size={Math.max(iconSize.sm, getIconSize(size))}
      color={color}
    />
  );
}

// ============================================================================
// Blockchain marks — brand assets, not interface icons
// ============================================================================

/**
 * Solana blockchain icon
 */
export function SolanaSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="24 15 43 57">
      <path d="M66.7067 54.4609L59.6202 62.1088C59.4661 62.2749 59.2797 62.4074 59.0726 62.4979C58.8655 62.5885 58.642 62.6351 58.4163 62.635H24.8227C24.6624 62.635 24.5056 62.5878 24.3716 62.4994C24.2375 62.411 24.1321 62.285 24.0682 62.1371C24.0043 61.9892 23.9847 61.8257 24.0119 61.6667C24.0391 61.5077 24.1118 61.3602 24.2212 61.2423L31.3131 53.5944C31.4667 53.4287 31.6525 53.2965 31.8589 53.206C32.0654 53.1155 32.2881 53.0686 32.5133 53.0682H66.105C66.2653 53.0682 66.4221 53.1154 66.5563 53.2038C66.6901 53.2923 66.7955 53.4182 66.8597 53.5661C66.9235 53.7141 66.943 53.8775 66.9158 54.0365C66.8886 54.1955 66.816 54.343 66.7067 54.4609ZM59.6202 39.0603C59.4661 38.8941 59.2797 38.7617 59.0726 38.6712C58.8655 38.5807 58.642 38.534 58.4163 38.5341H24.8227C24.6624 38.5341 24.5056 38.5812 24.3716 38.6697C24.2375 38.7582 24.1321 38.8841 24.0682 39.032C24.0043 39.18 23.9847 39.3434 24.0119 39.5024C24.0391 39.6614 24.1118 39.8089 24.2212 39.9268L31.3131 47.5747C31.4667 47.7404 31.6525 47.8726 31.8589 47.9631C32.0654 48.0536 32.2881 48.1005 32.5133 48.1009H66.105C66.2653 48.1009 66.4221 48.0537 66.5563 47.9653C66.6901 47.8768 66.7955 47.7509 66.8597 47.603C66.9235 47.455 66.943 47.2915 66.9158 47.1326C66.8886 46.9736 66.816 46.8261 66.7067 46.7082L59.6202 39.0603ZM24.8227 33.5668H58.4163C58.642 33.5669 58.8655 33.5202 59.0726 33.4297C59.2797 33.3392 59.4661 33.2067 59.6202 33.0406L66.7067 25.3927C66.816 25.2748 66.8886 25.1273 66.9158 24.9683C66.943 24.8093 66.9235 24.6458 66.8597 24.4979C66.7955 24.35 66.6901 24.224 66.5563 24.1356C66.4221 24.0471 66.2653 24 66.105 24H32.5133C32.2881 24.0004 32.0654 24.0473 31.8589 24.1378C31.6525 24.2283 31.4667 24.3605 31.3131 24.5262L24.223 32.1741C24.1138 32.2919 24.0411 32.4392 24.0138 32.598C23.9866 32.7568 24.006 32.9202 24.0696 33.068C24.1333 33.2159 24.2385 33.3418 24.3722 33.4304C24.506 33.519 24.6626 33.5664 24.8227 33.5668Z" />
    </SvgIcon>
  );
}

/**
 * Bitcoin blockchain icon
 */
export function BitcoinSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 43 57">
      <path d="M42.8178 22.8422C43.7111 16.8719 39.1648 13.6624 32.9484 11.5214L34.9649 3.43384L30.0415 2.20697L28.0783 10.0814C26.7839 9.75887 25.4545 9.45463 24.1336 9.15317L26.1108 1.22687L21.1901 0L19.1722 8.08471C18.1009 7.84073 17.0491 7.5996 16.0283 7.34581L16.0339 7.32057L9.24397 5.62536L7.93424 10.8834C7.93424 10.8834 11.5872 11.7205 11.5101 11.7723C13.5042 12.2701 13.8645 13.5895 13.8042 14.6355L11.5073 23.8489C11.6447 23.884 11.8228 23.9345 12.0191 24.013C11.8551 23.9723 11.6798 23.9275 11.4989 23.884L8.27916 36.7907C8.03516 37.3964 7.41678 38.305 6.02289 37.96C6.07197 38.0315 2.44422 37.0669 2.44422 37.0669L0 42.7021L6.40711 44.2991C7.59906 44.5977 8.76716 44.9104 9.91705 45.2049L7.87955 53.3849L12.7974 54.6118L14.8153 46.5187C16.1587 46.8832 17.4628 47.2198 18.7389 47.5367L16.7281 55.5919L21.6515 56.8188L23.689 48.6542C32.0846 50.2428 38.3978 49.602 41.0551 42.0094C43.1964 35.8961 40.9485 32.3697 36.5313 30.0702C39.7482 29.3285 42.1713 27.2127 42.8178 22.8422ZM31.5686 38.6149C30.0471 44.7282 19.7528 41.4233 16.4153 40.5947L19.119 29.7575C22.4564 30.5904 33.1588 32.2393 31.5686 38.6149ZM33.0914 22.7539C31.7032 28.3147 23.1351 25.4894 20.3558 24.7968L22.807 14.9678C25.5864 15.6605 34.5372 16.9532 33.0914 22.7539Z" />
    </SvgIcon>
  );
}

/**
 * Ethereum blockchain icon
 */
export function EthereumSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 34 54">
      <path d="M16.9969 0L16.6255 1.2306V36.9366L16.9969 37.2981L33.9895 27.501L16.9969 0Z" />
      <path d="M16.993 0L0 27.501L16.993 37.2981V19.9674V0Z" opacity={0.6} />
      <path d="M16.9969 40.436L16.7876 40.685V53.404L16.9969 54.0001L33.9999 30.644L16.9969 40.436Z" />
      <path d="M16.993 54.0001V40.436L0 30.644L16.993 54.0001Z" opacity={0.6} />
      <path d="M16.9907 37.2975L33.9833 27.5005L16.9907 19.9668V37.2975Z" opacity={0.2} />
      <path d="M0 27.5005L16.993 37.2975V19.9668L0 27.5005Z" opacity={0.6} />
    </SvgIcon>
  );
}
