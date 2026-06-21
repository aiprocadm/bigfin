---
name: i18n-add-string
description: Adds a new translation string to Bigfin's lang files. Use when user wants to add a new UI text in English and propagate it to ru (and optionally ar/es/sv). Wraps the en/ru/index.json editing workflow and runs lang-check.js for verification. Trigger phrases - "add translation", "add lang string", "добавь перевод", "новая строка перевода", "i18n key".
---

# i18n-add-string

Adds a new translation key to Bigfin's lang files following the project's conventions.

## When to use

User asks to add a new UI string, label, error message, or button text that will appear in the webapp. They typically know the English wording but want it consistent across languages.

## Project context

- **Lang files** live at `bigcapital/packages/webapp/src/lang/{en,ru,ar,es,sv}/index.json`.
- **Active languages** (in SUPPORTED_LOCALES): only `en` and `ar`. Other folders exist but are not user-facing yet. RU is being actively built up for the founder's own product use.
- **Validator**: `bigcapital/packages/webapp/scripts/lang-check.js` compares en vs ru and exits 1 on missing keys.
- **Russian style rules**:
  - Natural Russian for entrepreneurs without accounting education — no calques ("аккаунтинг" → use "учёт").
  - Standard accounting Russian: "журнал", "проводка", "контрагент", "счёт", "оборот".
  - NO mentions of "BigCapital" anywhere (Bigfin is a standalone product).

## Workflow

1. **Ask the user** (use AskUserQuestion when ambiguous):
   - The English string (e.g., `"Welcome to your dashboard"`).
   - The JSON key path (e.g., `dashboard.welcome.title`). Read a chunk of `en/index.json` around similar keys first to suggest the right location.
   - Russian translation (offer a draft based on style rules, ask user to approve/refine).
   - Whether to also fill `ar/es/sv` (default: skip, leave for later).

2. **Show the file before editing**. Read the relevant section of `en/index.json` and `ru/index.json` so the user sees structure.

3. **Edit `en/index.json`** — add the English string at the right key path.

4. **Edit `ru/index.json`** — add the same key path with the Russian translation.

5. **Run validator**: `node bigcapital/packages/webapp/scripts/lang-check.js`. If the PostToolUse hook is registered, it runs automatically after each Edit — mention this to the user.

6. **Summarise**:
   - Key added: `<path>`
   - en: `<English>`
   - ru: `<Russian>`
   - Validator: passed / failures listed
   - Rollback: list the two edits the user can undo with git.

## Anti-patterns to avoid

- Do NOT delete or rename existing keys without explicit permission (founder's rule #5).
- Do NOT introduce a new top-level section unless the user explicitly asks — keep keys under existing sections when reasonable.
- Do NOT leave "BigCapital" in source. If you see it, flag to user as a separate concern.
- Do NOT machine-translate technical accounting terms — propose, ask, confirm.

## Verification commands

```bash
# From bigcapital/ directory:
node packages/webapp/scripts/lang-check.js
```

## Rollback

Two files changed: `en/index.json`, `ru/index.json`. Either:
- `git -C bigcapital checkout -- packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json`
- Or use the editor's undo (Ctrl+Z) within the chat session.
