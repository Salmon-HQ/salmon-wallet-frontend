/**
 * The product's icon set for mobile.
 *
 * One icon name, one import. Every mobile component pulls its glyphs from
 * here rather than from an icon vendor directly, so the set stays small,
 * auditable, and swappable. This module mirrors `packages/ui/src/icons.ts` —
 * same drawings, same names, a different renderer (`phosphor-react-native`,
 * riding `react-native-svg`).
 *
 * Rules (DESIGN.md §Iconography):
 * - Weight is `regular`, which is Phosphor's default, so it is never passed —
 *   with one exception: a glyph inside a flesh-textured salmon CTA carries
 *   `weight="bold"`, matching the CTA's bold label.
 *   `fill` is allowed in exactly two places: the active tab item and the
 *   success checkmark. `duotone` is never used.
 * - Size comes from `iconSize` below (or `componentSizes` for legacy steps).
 *   16 is the floor — a thinner box loses the stroke.
 * - Color comes from a text token (`semantic.text.*`), never a literal:
 *   decorative reads `text.tertiary`, actionable `text.primary`, destructive
 *   `danger-500` (`semantic.status.danger`).
 *
 * Imports are deep paths rather than the package root: the root module pulls
 * all ~1,500 icons through Metro, which costs dev transpile time.
 */

/** Icon size ramp, mirroring `packages/ui/src/icons.ts`. Nothing smaller than `sm`. */
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

export { AddressBookIcon } from 'phosphor-react-native/src/icons/AddressBook';
export { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown';
export { ArrowDownLeftIcon } from 'phosphor-react-native/src/icons/ArrowDownLeft';
export { ArrowElbowUpRightIcon } from 'phosphor-react-native/src/icons/ArrowElbowUpRight';
export { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
export { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
export { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp';
export { ArrowUpRightIcon } from 'phosphor-react-native/src/icons/ArrowUpRight';
export { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
export { ArrowsLeftRightIcon } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
export { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
export { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
export { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
export { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
export { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
export { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
export { ChartLineIcon } from 'phosphor-react-native/src/icons/ChartLine';
export { ChartPieIcon } from 'phosphor-react-native/src/icons/ChartPie';
export { ChatsCircleIcon } from 'phosphor-react-native/src/icons/ChatsCircle';
export { CheckIcon } from 'phosphor-react-native/src/icons/Check';
export { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
export { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
export { CircleHalfIcon } from 'phosphor-react-native/src/icons/CircleHalf';
export { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
export { CloudIcon } from 'phosphor-react-native/src/icons/Cloud';
export { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
export { CodeIcon } from 'phosphor-react-native/src/icons/Code';
export { CopyIcon } from 'phosphor-react-native/src/icons/Copy';
export { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
export { CubeIcon } from 'phosphor-react-native/src/icons/Cube';
export { CurrencyCircleDollarIcon } from 'phosphor-react-native/src/icons/CurrencyCircleDollar';
export { CurrencyDollarIcon } from 'phosphor-react-native/src/icons/CurrencyDollar';
export { DiamondIcon } from 'phosphor-react-native/src/icons/Diamond';
export { DotsSixVerticalIcon } from 'phosphor-react-native/src/icons/DotsSixVertical';
export { DropIcon } from 'phosphor-react-native/src/icons/Drop';
export { EnvelopeIcon } from 'phosphor-react-native/src/icons/Envelope';
export { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
export { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
export { FileIcon } from 'phosphor-react-native/src/icons/File';
export { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
export { FingerprintIcon } from 'phosphor-react-native/src/icons/Fingerprint';
export { FireIcon } from 'phosphor-react-native/src/icons/Fire';
export { GameControllerIcon } from 'phosphor-react-native/src/icons/GameController';
export { GithubLogoIcon } from 'phosphor-react-native/src/icons/GithubLogo';
export { GlobeIcon } from 'phosphor-react-native/src/icons/Globe';
export { GraduationCapIcon } from 'phosphor-react-native/src/icons/GraduationCap';
export { HandPalmIcon } from 'phosphor-react-native/src/icons/HandPalm';
export { ImageIcon } from 'phosphor-react-native/src/icons/Image';
export { InfoIcon } from 'phosphor-react-native/src/icons/Info';
export { KeyIcon } from 'phosphor-react-native/src/icons/Key';
export { LightningIcon } from 'phosphor-react-native/src/icons/Lightning';
export { LinkIcon } from 'phosphor-react-native/src/icons/Link';
export { LockIcon } from 'phosphor-react-native/src/icons/Lock';
export { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
export { MedalIcon } from 'phosphor-react-native/src/icons/Medal';
export { MoneyIcon } from 'phosphor-react-native/src/icons/Money';
export { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
export { SunIcon } from 'phosphor-react-native/src/icons/Sun';
export { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
export { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
export { PlusCircleIcon } from 'phosphor-react-native/src/icons/PlusCircle';
export { PulseIcon } from 'phosphor-react-native/src/icons/Pulse';
export { QrCodeIcon } from 'phosphor-react-native/src/icons/QrCode';
export { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
export { RocketLaunchIcon } from 'phosphor-react-native/src/icons/RocketLaunch';
export { ScanIcon } from 'phosphor-react-native/src/icons/Scan';
export { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
export { ShieldIcon } from 'phosphor-react-native/src/icons/Shield';
export { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
export { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
export { SlidersIcon } from 'phosphor-react-native/src/icons/Sliders';
export { SmileyIcon } from 'phosphor-react-native/src/icons/Smiley';
export { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
export { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
export { StackIcon } from 'phosphor-react-native/src/icons/Stack';
export { StorefrontIcon } from 'phosphor-react-native/src/icons/Storefront';
export { TagIcon } from 'phosphor-react-native/src/icons/Tag';
export { TextTIcon } from 'phosphor-react-native/src/icons/TextT';
export { TranslateIcon } from 'phosphor-react-native/src/icons/Translate';
export { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
export { TreeStructureIcon } from 'phosphor-react-native/src/icons/TreeStructure';
export { TrendUpIcon } from 'phosphor-react-native/src/icons/TrendUp';
export { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
export { UserIcon } from 'phosphor-react-native/src/icons/User';
export { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
export { UsersIcon } from 'phosphor-react-native/src/icons/Users';
export { WalletIcon } from 'phosphor-react-native/src/icons/Wallet';
export { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
export { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
export { WrenchIcon } from 'phosphor-react-native/src/icons/Wrench';
export { XIcon } from 'phosphor-react-native/src/icons/X';
export { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
export { XLogoIcon } from 'phosphor-react-native/src/icons/XLogo';

export type { Icon as IconComponent, IconProps } from 'phosphor-react-native';
