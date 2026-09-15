---
name: i18n-authoring
description: "Add, update, remove, or audit user-facing translations in the Salmon Wallet monorepo. Use this skill when a task introduces visible copy, changes existing text, creates new translation keys, removes obsolete ones, or audits hardcoded user-facing strings. This skill should trigger even when the user does not mention translations explicitly, because any user-visible text change needs i18n handling."
---

Every user-facing string in Salmon Wallet must exist in both English and Spanish translation files, with the same structure in both places.

## Workflow

1. Identify every user-facing string introduced or touched by the change.
2. Read [references/i18n-patterns.md](references/i18n-patterns.md).
3. Search existing translation keys before creating new ones.
4. Choose the right namespace and key path.
5. Update `en/translation.json` and `es/translation.json` together.
6. Replace hardcoded strings in code with `t('key.path')`.
7. Verify interpolation variables and rendered copy.

## Clarification gate

Ask 1-3 focused questions if any of these are unclear:

- What's the Spanish translation for this string? (Don't guess — ask the developer or leave a clear TODO.)
- Does a similar translation key already exist that could be reused?
- Is this string truly user-facing, or is it a log message / error code that doesn't need translation?
- Should this key live under an existing namespace (e.g., `settings`, `send`, `transactions`) or does it need a new top-level section?
- Is the text temporary debug copy that should not ship?

If you're unsure about the correct Spanish translation, ask. Bad translations are worse than no translation.

## Rules

- Both `en/translation.json` and `es/translation.json` must be updated together — never one without the other.
- Follow the existing key naming conventions (camelCase keys, dot-separated paths).
- Reuse existing keys when the same string already exists.
- Never hardcode user-facing strings in components — always use `t()`.
- Interpolation uses `{{variable}}` syntax (i18next standard).
- Plural forms use `_one` / `_other` suffixes when needed.
- Avoid introducing new top-level namespaces unless the existing structure truly does not fit.

## Audit mode

When asked to audit translations, check for:

- Hardcoded user-facing strings in components (should use `t()`)
- Keys present in `en/translation.json` but missing from `es/translation.json` (or vice versa)
- Duplicate keys with slightly different names that mean the same thing
- Keys that exist in translation files but are never referenced in code (orphaned keys)
- Inconsistent key naming (snake_case vs camelCase in the same namespace)
- Missing interpolation variables (key uses `{{var}}` but code doesn't pass it)

Report findings grouped by severity: missing translations first, then hardcoded strings, then cleanup items.

## What this skill should produce

- Translation keys added to both language files in sync.
- Correct key path following existing conventions.
- Code using `t('key.path')` instead of hardcoded strings.
- An audit report when asked to review translation coverage or consistency.
- Questions first when the Spanish translation or key placement is unclear.
