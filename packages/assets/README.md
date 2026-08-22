# @salmon/assets

Centralized asset package for Salmon Wallet. Provides shared fonts, images, and other static resources across the monorepo.

## Installation

This package is part of the Salmon Wallet monorepo and is automatically available to other packages via workspace dependencies.

```json
{
  "dependencies": {
    "@salmon/assets": "workspace:*"
  }
}
```

## Usage

### Importing All Assets

```typescript
import { DMSansBold, IconHome, Images } from '@salmon/assets';
```

### Importing Specific Categories

```typescript
// Fonts only
import { DMSansBold, DMSansMedium, Fonts } from '@salmon/assets/fonts';

// Images only
import { IconHome, IconWallet, Images } from '@salmon/assets/images';
```

### Using Fonts

```typescript
import { DMSansBold, DMSansMedium, DMSansRegular, GeistMonoRegular } from '@salmon/assets';

// Or use the Fonts object
import { Fonts } from '@salmon/assets';

const fontFamily = Fonts.DMSans.Bold;
```

### Using Images

Individual exports:

```typescript
import { IconHome, IconWallet, AppLogo } from '@salmon/assets';
```

Organized by category:

```typescript
import { Images } from '@salmon/assets';

const homeIcon = Images.Navigation.IconHome;
const successIcon = Images.Status.IconSuccess;
const maskImage = Images.Masks.ImageMaskLGCards;
```

## Image Categories

Assets are organized into the following categories:

- **Branding**: App icons, logos, splash screens, store badges
- **Navigation**: Bottom navigation icons, main menu items
- **Actions**: Action buttons (add, delete, edit, search, etc.)
- **Direction**: Arrows, chevrons, expand/collapse icons
- **Transactions**: Transaction type icons, status indicators
- **Status**: Success, error, warning, info icons
- **Interaction**: User interaction indicators
- **Balance**: Balance and trend indicators
- **Settings**: Settings and profile related icons
- **Security**: Lock, visibility toggle icons
- **Controls**: Toggles, pagination, UI controls
- **Networks**: Blockchain network logos (Bitcoin, Ethereum, Solana, etc.)
- **Features**: Feature-specific icons (bridge, swap, etc.)
- **External**: Third-party service logos
- **Masks**: Background masks and decorative images
- **Utility**: Loading spinners, utility icons

## Fonts Included

- **DM Sans**: Primary interface font family (modified — digit advances equalised; see `src/fonts/DMSans-README.md`)
  - Regular (400)
  - Medium (500)
  - SemiBold (600)
  - Bold (700)

- **Geist Mono**: Monospace font for addresses, hashes, keys, and seed phrases
  - Regular (400)

## File Structure

```
packages/assets/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts          # Main entry point
│   ├── fonts/
│   │   ├── index.ts      # Font exports
│   │   └── *.ttf         # Font files
│   └── images/
│       ├── index.ts      # Image exports (organized by category)
│       └── *.*           # Image files (PNG, SVG, JPEG, GIF)
```

## TypeScript Support

This package includes full TypeScript support with type definitions for all exports.

## License

MIT
