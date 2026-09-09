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
import { DMSansBold, Images } from '@salmon/assets';
```

### Importing Specific Categories

```typescript
// Fonts only
import { DMSansBold, DMSansMedium, Fonts } from '@salmon/assets/fonts';

// Images only
import { Logo, Images } from '@salmon/assets/images';
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
import { Logo, AppIcon, IconSolana } from '@salmon/assets';
```

Organized by category:

```typescript
import { Images } from '@salmon/assets';

const logo = Images.Branding.Logo;
const solanaIcon = Images.Blockchain.IconSolana;
const maskImage = Images.Masks.ImageMaskLGCards;
```

## Image Categories

Assets are organized into the following categories (see `Images` in `src/images/index.ts`):

- **Branding**: App icons, logos, splash screen, store badges
- **Masks**: Background masks and decorative images
- **UI**: Pagination and toggle controls
- **Backgrounds**: Background textures
- **Blockchain**: Network logos (Bitcoin, Ethereum, Solana, Near, Eclipse)

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
│       └── *.*           # Image files (PNG, JPEG, SVG)
```

## TypeScript Support

This package includes full TypeScript support with type definitions for all exports.

## License

Apache-2.0
