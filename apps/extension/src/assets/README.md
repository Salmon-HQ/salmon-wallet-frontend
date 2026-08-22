# Assets for Salmon Wallet Extension

Static assets for the Salmon Wallet extension.

## Directory Structure

```
apps/extension/
├── public/
│   ├── images/        # Image assets served from the extension root
│   └── fonts/         # Font files (DM Sans / Geist Mono)
└── src/
    └── assets/
        ├── fonts.css  # Font face declarations
        └── README.md  # This file
```

## Using Fonts

Import the fonts CSS file in an entry point (`popup/main.tsx`,
`sidepanel/main.tsx`):

```typescript
import '@/assets/fonts.css';
```

Then reference the family in CSS — or, preferably, use the
`fontFamily` tokens from `@salmon/shared` rather than hardcoding:

```css
body {
  font-family: 'DM Sans', sans-serif;
  font-weight: 400; /* Regular */
}
```

`Geist Mono` is reserved for values the user reads character by character:
addresses, transaction hashes, private keys, and seed phrases.

## Referencing Images

Files in `public/` are copied to the extension root at build time, so they are
addressed by absolute path:

```tsx
<img src="/images/Logo.png" alt="Salmon Wallet" />
```

For a fully-qualified URL (needed from content scripts), use
`chrome.runtime.getURL('images/Logo.png')`.

`images/*` and `fonts/*` are declared in `web_accessible_resources`
(`wxt.config.ts`), so anything added here is reachable from any page. Only add
assets that are meant to be public.
