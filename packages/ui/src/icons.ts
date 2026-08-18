/**
 * The product's icon set for the DOM surfaces (web + extension).
 *
 * One icon name, one import. Every DOM component pulls its glyphs from here
 * rather than from an icon vendor directly, so the set stays small, auditable,
 * and swappable. Mobile keeps its own module against `phosphor-react-native` —
 * same drawings, same names, a different renderer.
 *
 * Rules (DESIGN.md §Iconography):
 * - Weight is `regular`, which is Phosphor's default, so it is never passed.
 *   `fill` is allowed in exactly two places: the active tab item and the
 *   success checkmark. `duotone` is never used.
 * - Size comes from `iconSize` below. 16 is the floor — a thinner box loses
 *   the stroke. Sizes above the ramp are for illustrative empty-state glyphs,
 *   not for UI chrome.
 * - Color comes from a text token (`colors.text.*`), never a literal, and
 *   never a color the icon owns: decorative reads `text.tertiary`, actionable
 *   `text.primary`, destructive `danger-500` (`semantic.status.danger`).
 *
 * Imports are deep paths rather than the package root: the root module pulls
 * all ~1,500 icons through the bundler, which costs both dev transpile time
 * and, under a misconfigured build, bundle size the extension cannot spend.
 *
 * Known exception: `components/DAppApproval` and `components/PendingActivityBanner`
 * still import `@mui/icons-material` directly. They are owned by concurrent work
 * and were left alone on purpose; that dependency stays in this package's
 * manifest until they move too, at which point it can be dropped here as it
 * already was from `apps/web` and `apps/extension`.
 */

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { IconContext } from '@phosphor-icons/react/dist/lib/context';

/** Icon size ramp. Nothing smaller than `sm`. */
export const iconSize = {
  /** 16px - inline with text, dense rows, badges */
  sm: 16,
  /** 20px - the default for row and control affordances */
  md: 20,
  /** 24px - headers, primary actions, tab bar */
  lg: 24,
  /** 28px - section markers and the largest UI glyph */
  xl: 28,
} as const;

export type IconSizeToken = keyof typeof iconSize;

export { AddressBookIcon } from '@phosphor-icons/react/dist/csr/AddressBook';
export { ArrowDownIcon } from '@phosphor-icons/react/dist/csr/ArrowDown';
export { ArrowElbowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowElbowUpRight';
export { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
export { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
export { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
export { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp';
export { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
export { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
export { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/csr/ArrowsLeftRight';
export { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen';
export { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
export { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
export { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
export { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
export { ChartBarIcon } from '@phosphor-icons/react/dist/csr/ChartBar';
export { ChartLineIcon } from '@phosphor-icons/react/dist/csr/ChartLine';
export { ChartLineUpIcon } from '@phosphor-icons/react/dist/csr/ChartLineUp';
export { ChartPieIcon } from '@phosphor-icons/react/dist/csr/ChartPie';
export { ChatsCircleIcon } from '@phosphor-icons/react/dist/csr/ChatsCircle';
export { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
export { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
export { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
export { ClockCountdownIcon } from '@phosphor-icons/react/dist/csr/ClockCountdown';
export { CloudIcon } from '@phosphor-icons/react/dist/csr/Cloud';
export { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
export { CompassIcon } from '@phosphor-icons/react/dist/csr/Compass';
export { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
export { CreditCardIcon } from '@phosphor-icons/react/dist/csr/CreditCard';
export { CubeIcon } from '@phosphor-icons/react/dist/csr/Cube';
export { CurrencyCircleDollarIcon } from '@phosphor-icons/react/dist/csr/CurrencyCircleDollar';
export { CurrencyDollarIcon } from '@phosphor-icons/react/dist/csr/CurrencyDollar';
export { DiamondIcon } from '@phosphor-icons/react/dist/csr/Diamond';
export { DropIcon } from '@phosphor-icons/react/dist/csr/Drop';
export { EnvelopeIcon } from '@phosphor-icons/react/dist/csr/Envelope';
export { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
export { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash';
export { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
export { FingerprintIcon } from '@phosphor-icons/react/dist/csr/Fingerprint';
export { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
export { GameControllerIcon } from '@phosphor-icons/react/dist/csr/GameController';
export { GearIcon } from '@phosphor-icons/react/dist/csr/Gear';
export { GithubLogoIcon } from '@phosphor-icons/react/dist/csr/GithubLogo';
export { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe';
export { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
export { HandPalmIcon } from '@phosphor-icons/react/dist/csr/HandPalm';
export { HeartIcon } from '@phosphor-icons/react/dist/csr/Heart';
export { ImageIcon } from '@phosphor-icons/react/dist/csr/Image';
export { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
export { KeyIcon } from '@phosphor-icons/react/dist/csr/Key';
export { LinkIcon } from '@phosphor-icons/react/dist/csr/Link';
export { ListIcon } from '@phosphor-icons/react/dist/csr/List';
export { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
export { LockOpenIcon } from '@phosphor-icons/react/dist/csr/LockOpen';
export { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
export { MedalIcon } from '@phosphor-icons/react/dist/csr/Medal';
export { MinusIcon } from '@phosphor-icons/react/dist/csr/Minus';
export { MoneyIcon } from '@phosphor-icons/react/dist/csr/Money';
export { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
export { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree';
export { PenNibIcon } from '@phosphor-icons/react/dist/csr/PenNib';
export { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
export { PiggyBankIcon } from '@phosphor-icons/react/dist/csr/PiggyBank';
export { PlugsConnectedIcon } from '@phosphor-icons/react/dist/csr/PlugsConnected';
export { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
export { PlusCircleIcon } from '@phosphor-icons/react/dist/csr/PlusCircle';
export { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
export { QrCodeIcon } from '@phosphor-icons/react/dist/csr/QrCode';
export { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
export { ReceiptIcon } from '@phosphor-icons/react/dist/csr/Receipt';
export { RocketLaunchIcon } from '@phosphor-icons/react/dist/csr/RocketLaunch';
export { ScanIcon } from '@phosphor-icons/react/dist/csr/Scan';
export { SealCheckIcon } from '@phosphor-icons/react/dist/csr/SealCheck';
export { ShareNetworkIcon } from '@phosphor-icons/react/dist/csr/ShareNetwork';
export { ShieldIcon } from '@phosphor-icons/react/dist/csr/Shield';
export { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
export { SquaresFourIcon } from '@phosphor-icons/react/dist/csr/SquaresFour';
export { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
export { StarIcon } from '@phosphor-icons/react/dist/csr/Star';
export { SwapIcon } from '@phosphor-icons/react/dist/csr/Swap';
export { TagIcon } from '@phosphor-icons/react/dist/csr/Tag';
export { TextTIcon } from '@phosphor-icons/react/dist/csr/TextT';
export { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
export { TrashSimpleIcon } from '@phosphor-icons/react/dist/csr/TrashSimple';
export { TreeStructureIcon } from '@phosphor-icons/react/dist/csr/TreeStructure';
export { TrendDownIcon } from '@phosphor-icons/react/dist/csr/TrendDown';
export { TrendUpIcon } from '@phosphor-icons/react/dist/csr/TrendUp';
export { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
export { UserIcon } from '@phosphor-icons/react/dist/csr/User';
export { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
export { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
export { VaultIcon } from '@phosphor-icons/react/dist/csr/Vault';
export { WalletIcon } from '@phosphor-icons/react/dist/csr/Wallet';
export { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
export { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
export { XIcon } from '@phosphor-icons/react/dist/csr/X';
export { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
export { XLogoIcon } from '@phosphor-icons/react/dist/csr/XLogo';

export type { Icon as IconComponent, IconProps } from '@phosphor-icons/react/dist/lib/types';

/**
 * Default weight and size for every glyph in the tree beneath it.
 *
 * Phosphor sizes an icon at `1em` unless told otherwise, which would let a
 * dense row shrink a glyph below the 16px floor. Mount this once per app root
 * so a bare `<XIcon />` lands on the ramp; a call site that needs another step
 * of the ramp still passes `size` itself.
 */
export function IconDefaults({ children }: { children: ReactNode }) {
  return createElement(IconContext.Provider, { value: ICON_DEFAULTS }, children);
}

const ICON_DEFAULTS = { size: iconSize.lg, weight: 'regular' } as const;
