/**
 * The product's icon set for the DOM surfaces (web + extension).
 *
 * One icon name, one import. Every DOM component pulls its glyphs from here
 * rather than from an icon vendor directly, so the set stays small, auditable,
 * and replaceable. Mobile keeps its own module against `phosphor-react-native` —
 * same drawings, same names, a different renderer.
 *
 * Rules (DESIGN.md §Iconography):
 * - Weight is `regular`, which is Phosphor's default, so it is never passed —
 *   with one exception: a glyph inside a flesh-textured salmon CTA carries
 *   `weight="bold"`, matching the CTA's bold label.
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
 * MUI left this package on 2026-09-02 (spec 028, lot 4 close): no `@mui`
 * package is in the manifest, and no DOM glyph comes from anywhere but here.
 */

import { createElement } from 'react';
import type { PowerupIconName } from '@salmon/shared';
import type { Icon as IconComponent } from '@phosphor-icons/react/dist/lib/types';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/csr/ArrowsLeftRight';
import { ChartPieIcon } from '@phosphor-icons/react/dist/csr/ChartPie';
import { GiftIcon } from '@phosphor-icons/react/dist/csr/Gift';
import { ImageIcon } from '@phosphor-icons/react/dist/csr/Image';
import { LightningIcon } from '@phosphor-icons/react/dist/csr/Lightning';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PercentIcon } from '@phosphor-icons/react/dist/csr/Percent';
import { QrCodeIcon } from '@phosphor-icons/react/dist/csr/QrCode';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TrendDownIcon } from '@phosphor-icons/react/dist/csr/TrendDown';
import { TrendUpIcon } from '@phosphor-icons/react/dist/csr/TrendUp';
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
export { ArrowDownLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowDownLeft';
export { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
export { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
export { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
export { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
export { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/csr/ArrowsLeftRight';
export { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen';
export { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
export { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
export { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
export { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
export { ChartBarIcon } from '@phosphor-icons/react/dist/csr/ChartBar';
export { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
export { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
export { CircleIcon } from '@phosphor-icons/react/dist/csr/Circle';
export { CircleHalfIcon } from '@phosphor-icons/react/dist/csr/CircleHalf';
export { ClipboardIcon } from '@phosphor-icons/react/dist/csr/Clipboard';
export { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
export { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
export { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
export { CubeIcon } from '@phosphor-icons/react/dist/csr/Cube';
export { CurrencyBtcIcon } from '@phosphor-icons/react/dist/csr/CurrencyBtc';
export { EnvelopeIcon } from '@phosphor-icons/react/dist/csr/Envelope';
export { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
export { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash';
export { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
export { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
export { GearIcon } from '@phosphor-icons/react/dist/csr/Gear';
export { GithubLogoIcon } from '@phosphor-icons/react/dist/csr/GithubLogo';
export { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe';
export { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
export { KeyIcon } from '@phosphor-icons/react/dist/csr/Key';
export { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
export { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
export { MinusIcon } from '@phosphor-icons/react/dist/csr/Minus';
export { MoneyIcon } from '@phosphor-icons/react/dist/csr/Money';
export { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
export { DotsSixVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsSixVertical';
export { PenNibIcon } from '@phosphor-icons/react/dist/csr/PenNib';
export { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
export { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
export { PlusCircleIcon } from '@phosphor-icons/react/dist/csr/PlusCircle';
export { QrCodeIcon } from '@phosphor-icons/react/dist/csr/QrCode';
export { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
export { ReceiptIcon } from '@phosphor-icons/react/dist/csr/Receipt';
export { ShareNetworkIcon } from '@phosphor-icons/react/dist/csr/ShareNetwork';
export { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut';
export { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
export { SlidersIcon } from '@phosphor-icons/react/dist/csr/Sliders';
export { SparkleIcon } from '@phosphor-icons/react/dist/csr/Sparkle';
export { SquaresFourIcon } from '@phosphor-icons/react/dist/csr/SquaresFour';
export { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
export { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';
export { TextTIcon } from '@phosphor-icons/react/dist/csr/TextT';
export { TranslateIcon } from '@phosphor-icons/react/dist/csr/Translate';
export { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
export { TreeStructureIcon } from '@phosphor-icons/react/dist/csr/TreeStructure';
export { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
export { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
export { VaultIcon } from '@phosphor-icons/react/dist/csr/Vault';
export { WalletIcon } from '@phosphor-icons/react/dist/csr/Wallet';
export { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
export { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
export { XIcon } from '@phosphor-icons/react/dist/csr/X';
export { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
export { XLogoIcon } from '@phosphor-icons/react/dist/csr/XLogo';

export type { Icon as IconComponent } from '@phosphor-icons/react/dist/lib/types';

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

/**
 * The glyph each Powerup wears, by the name its manifest declares
 * (`PowerupIconName`). Exhaustive by construction: a name added to the shared
 * union fails to compile here until this twin draws it, which is what lets a
 * Powerup ship no art and the catalogue keep no table of Powerup ids.
 */
export const powerupIcons: Record<PowerupIconName, IconComponent> = {
  ArrowsClockwise: ArrowsClockwiseIcon,
  ArrowsLeftRight: ArrowsLeftRightIcon,
  ChartPie: ChartPieIcon,
  Gift: GiftIcon,
  Image: ImageIcon,
  Lightning: LightningIcon,
  PencilSimple: PencilSimpleIcon,
  Percent: PercentIcon,
  QrCode: QrCodeIcon,
  ShieldCheck: ShieldCheckIcon,
  Stack: StackIcon,
  TrendDown: TrendDownIcon,
  TrendUp: TrendUpIcon,
};
