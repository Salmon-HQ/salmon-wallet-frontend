# i18n Patterns

## File locations

- English: `packages/shared/src/locales/en/translation.json`
- Spanish: `packages/shared/src/locales/es/translation.json`
- Config & exports: `packages/shared/src/locales/index.ts`

## JSON key structure

Keys are organized by feature namespace, using nested objects:

```json
{
  "tabs": {
    "wallet": "Wallet",
    "collectibles": "Collectibles",
    "settings": "Settings"
  },
  "general": {
    "confirm": "Confirm",
    "close": "Close",
    "back": "Back",
    "error": "Unexpected error"
  },
  "send": {
    "title": "Send",
    "confirmation": {
      "amount": "Amount",
      "fee": "Network Fee"
    }
  }
}
```

## Key naming conventions

- Use camelCase for key names: `"addressValidation"`, not `"address-validation"`
- Group by feature: `send.*`, `settings.*`, `transactions.*`
- Use `general.*` for strings shared across features
- Nest logically but avoid more than 3 levels deep

## Usage in components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return <Text>{t('send.confirmation.amount')}</Text>;
}
```

## Interpolation

Use double curly braces for dynamic values:

```json
{
  "minutesAgo": "{{count}}m ago",
  "name_or_address": "Name or \"{{token}}\" Address"
}
```

```typescript
t('time.minutesAgo', { count: 5 })      // "5m ago"
t('general.name_or_address', { token: 'SOL' })  // 'Name or "SOL" Address'
```

## Fallback text

The codebase uses inline fallbacks with `t()`:

```typescript
t('transactions.detail.failed', 'Failed')
```

The second argument is the fallback if the key is missing. Use this for new keys during development, but ensure both translation files are updated before merging.

## Adding new translations

1. Decide the namespace (existing feature or new top-level section).
2. Add the key to `en/translation.json` with the English string.
3. Add the same key to `es/translation.json` with the Spanish string.
4. Both files must have identical key structure.
5. If unsure about the Spanish translation, ask the developer.

## Common mistakes to avoid

- Adding a key to `en` but forgetting `es` (causes fallback to English silently)
- Creating duplicate keys with slight name variations
- Hardcoding strings in components instead of using `t()`
- Using different nesting structure between `en` and `es`
- Using snake_case for new keys when the convention is camelCase (exception: some legacy keys use snake_case — don't change those, but new keys should use camelCase)

## Available languages and config

From `packages/shared/src/locales/index.ts`:
- `AVAILABLE_LANGUAGES`: `['en', 'es']`
- `DEFAULT_LANGUAGE`: `'en'`
- `LANGUAGE_NAMES`: `{ en: 'English', es: 'Español' }`
- `TranslationKey`: Type-safe key access for dot-notation paths

## Platform-specific i18n initialization

Each app initializes i18n differently but all consume `i18nResources` from `@salmon/shared`:
- Mobile: `expo-localization` for device language detection, AsyncStorage for persistence
- Web: `i18next-browser-languagedetector` for browser language
- Extension: Same as web

You don't need to modify app-level i18n config when adding translation keys — just update the JSON files in `packages/shared/src/locales/`.
