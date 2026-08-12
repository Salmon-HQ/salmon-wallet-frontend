# Assets for Salmon Wallet Extension

This directory provides centralized access to all static assets used in the Salmon Wallet extension.

## Directory Structure

```
apps/extension/
├── public/
│   ├── images/        # Image assets (icons, logos, etc.)
│   └── fonts/         # Font files (DM Sans family)
└── src/
    └── assets/
        ├── index.ts   # Asset path exports
        ├── fonts.css  # Font face declarations
        └── README.md  # This file
```

## Usage

### Importing Assets in TypeScript/React

```typescript
import { IconWallet, IconNFT, BrandAssets, NavigationIcons } from '@/assets';

// Use individual exports
<img src={IconWallet} alt="Wallet" />

// Use grouped exports
<img src={NavigationIcons.wallet} alt="Wallet" />
<img src={BrandAssets.logo} alt="Salmon Logo" />
```

### Using Fonts

Import the fonts CSS file in your main entry point or component:

```typescript
import '@/assets/fonts.css';
```

Then use the font in your CSS:

```css
body {
  font-family: 'DM Sans', sans-serif;
  font-weight: 400; /* Regular */
}

h1 {
  font-family: 'DM Sans', sans-serif;
  font-weight: 700; /* Bold */
}
```

### Getting Asset URLs Dynamically

If you need to get the full URL for an asset:

```typescript
import { getAssetUrl } from '@/assets';

const iconUrl = getAssetUrl('/images/IconWallet.png');
// Returns: chrome-extension://<extension-id>/images/IconWallet.png
```

## Available Asset Groups

### Navigation Icons

- `IconWallet`, `IconWalletSVG`
- `IconNFT`, `IconNFTSVG`
- `IconSwap`, `IconSwapSVG`
- `IconBalance`, `IconBalanceSVG`
- `IconSettings`, `IconSettingsSVG`

### Transaction Icons

- `IconTransactionSent`
- `IconTransactionReceived`
- `IconTransactionSwap`
- `IconTransactionInteraction`
- `IconTransactionResultSuccess`
- `IconTransactionResultFail`
- `IconTransactionResultWarning`
- `IconTransactionUnknown`

### Brand Assets

- `AppIcon`
- `Logo`
- `AppTitle`
- `IconSalmon`
- `BoolSplashLogo` (includes @2x, @3x, @4x variants)

### Common UI Icons

- `IconCopy`, `IconClose`, `IconAdd`, `IconSearch`
- `IconChevronLeft`, `IconChevronRight`
- `IconExpandMore`, `IconExpandLess`
- `IconArrowBack`, `IconArrowUp`, `IconArrowDown`
- `IconEdit`, `IconDelete`
- `IconInfo`, `IconSuccess`, `IconFailed`
- `IconVisibilityShow`, `IconVisibilityHidden`
- `IconQRCodeScanner`

### Fonts

- `DMSansRegular` (400)
- `DMSansMedium` (500)
- `DMSansBold` (700)

## Configuration

### WXT Config

Assets in the `public/` directory are automatically included in the extension build. The `wxt.config.ts` has been configured to make images and fonts web-accessible:

```typescript
web_accessible_resources: [
  {
    resources: ['images/*', 'fonts/*'],
    matches: ['<all_urls>'],
  },
];
```

### TypeScript Config

Path alias `@/assets` has been added to `tsconfig.json` for easier imports:

```json
{
  "paths": {
    "@/assets": ["./src/assets"]
  }
}
```

## Adding New Assets

1. Add the asset file to the appropriate `public/` subdirectory:
   - Images → `public/images/`
   - Fonts → `public/fonts/`

2. Export the path in `src/assets/index.ts`:

   ```typescript
   export const NewIcon = '/images/NewIcon.png';
   ```

3. Optionally add to a grouped export for better organization:
   ```typescript
   export const CommonIcons = {
     ...
     newIcon: NewIcon,
   } as const;
   ```

## Notes

- All paths use leading slashes (e.g., `/images/icon.png`) to reference public assets
- WXT automatically handles copying files from `public/` to the build output
- Use `getAssetUrl()` when you need the full `chrome-extension://` URL
- SVG versions are available for some icons for better scaling
