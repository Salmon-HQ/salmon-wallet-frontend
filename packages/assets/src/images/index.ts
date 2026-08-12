/**
 * Image assets for Salmon Wallet
 */

// Branding & App Identity
import AppIcon from './AppIcon.png';
import AppTitle from './AppTitle.png';
import Logo from './Logo.png';
import RedAppIcon from './RedAppIcon.png';

// Bool Splash Logo (React Native auto-selects @2x/@3x/@4x based on screen density)
import BoolSplashLogo from './BoolSplashLogo.png';

// Store badges
import AppStore from './appstore.png';
import PlayStore from './playstore.png';

// Toggle & UI Controls
import PaginationOff from './PaginationOff.png';
import PaginationOn from './PaginationOn.png';
import ToggleOff from './ToggleOff.png';
import ToggleOn from './ToggleOn.png';

// Backgrounds & Masks
import Avatar from './Avatar.png';
import BackgroundTexture from './background-texture.png';
import Blacklisted from './Blacklisted.jpeg';
import DividerM from './DividerM.png';
import WhitelistBackground from './WhitelistBackground.png';

// Image Masks - Large
import ImageMaskLGAccentPrimary from './ImageMaskLGAccentPrimary.png';
import ImageMaskLGCards from './ImageMaskLGCards.png';

// Image Masks - Extra Large
import ImageMaskXLAccentPrimary from './ImageMaskXLAccentPrimary.png';
import ImageMaskXLCards from './ImageMaskXLCards.png';

// Image Masks - Extra Extra Large
import ImageMaskXXLAccentPrimary from './ImageMaskXXLAccentPrimary.png';
import ImageMaskXXLCards from './ImageMaskXXLCards.png';

// Blockchain Icons
import IconBitcoinVector from './IconBitcoinVector.png';
import IconEclipseVector from './IconEclipseVector.png';
import IconEthereumVector from './IconEthereumVector.png';
import IconNear from './IconNear.png';
import IconNearVector from './IconNearVector.png';
import IconSolana from './IconSolana.png';
import IconSolanaVector from './IconSolanaVector.png';

export {
  AppIcon,
  AppStore,
  AppTitle,
  Avatar,
  BackgroundTexture,
  Blacklisted,
  BoolSplashLogo,
  DividerM,
  IconBitcoinVector,
  IconEclipseVector,
  IconEthereumVector,
  IconNear,
  IconNearVector,
  IconSolana,
  IconSolanaVector,
  ImageMaskLGAccentPrimary,
  ImageMaskLGCards,
  ImageMaskXLAccentPrimary,
  ImageMaskXLCards,
  ImageMaskXXLAccentPrimary,
  ImageMaskXXLCards,
  Logo,
  PaginationOff,
  PaginationOn,
  PlayStore,
  RedAppIcon,
  ToggleOff,
  ToggleOn,
  WhitelistBackground,
};

export const Images = {
  Branding: {
    AppIcon,
    RedAppIcon,
    AppTitle,
    Logo,
    BoolSplashLogo,
    AppStore,
    PlayStore,
  },

  Masks: {
    WhitelistBackground,
    Blacklisted,
    Avatar,
    DividerM,
    ImageMaskLGAccentPrimary,
    ImageMaskLGCards,
    ImageMaskXLAccentPrimary,
    ImageMaskXLCards,
    ImageMaskXXLAccentPrimary,
    ImageMaskXXLCards,
  },

  UI: {
    PaginationOff,
    PaginationOn,
    ToggleOff,
    ToggleOn,
  },

  Backgrounds: {
    BackgroundTexture,
  },

  Blockchain: {
    IconBitcoinVector,
    IconEclipseVector,
    IconEthereumVector,
    IconNear,
    IconNearVector,
    IconSolana,
    IconSolanaVector,
  },
} as const;
