---
name: make-migration
description: Creates a new Knex migration in the correct schema (system OR tenant) for Bigfin's PostgreSQL database. Use when user asks to add a database migration, modify a table, add a column, or change schema. Walks user through the system vs tenant choice with examples. Trigger phrases - "add migration", "новая миграция", "create table", "modify schema", "knex migrate".
---

# make-migration

Creates a Knex migration in the correct schema location and provides safe rollback instructions.

## Critical context: system vs tenant schemas

Bigfin uses **two separate schemas** with separate migration directories. Mixing them up is a top source of bugs.

| Schema | Path | What goes here |
|--------|------|----------------|
| **system** | `bigcapital/packages/server/src/database/system/migrations/` | Cross-tenant data: `tenants_metadata`, `subscriptions`, `users` (auth), system settings |
| **tenant** | `bigcapital/packages/server/src/database/tenant/migrations/` | Per-organization data: `accounts`, `transactions`, `invoices`, `contacts` |

**Rule of thumb**:
- If the data is SHARED across all organizations (auth, billing, tenant registry) → **system**
- If the data is OWNED by one organization (their books, invoices, customers) → **tenant**
- `tenants_metadata` table is in the **system** schema (per project memory).

## Workflow

1. **Ask the user** (use AskUserQuestion):
   - What does the migration do? (e.g., "add column X to table Y")
   - **System or tenant?** Present both options with examples. If unclear, ask: "Is this data per-organization or shared across all organizations?"

2. **Show example existing migrations** in the chosen schema directory to align with conventions (column naming: snake_case; timestamps; FK style).

3. **Run the right CLI command** from `bigcapital/`:
   ```bash
   # System:
   pnpm run system:migrate:make -- --name=add_column_x_to_y

   # Tenant:
   pnpm run tenants:migrate:make -- --name=add_column_x_to_y
   ```

4. **Open the generated file** and write the `up` and `down` functions. **Both** required — a migration without working `down` is a real risk.

5. **Test locally** (when backend is up):
   ```bash
   # Apply:
   pnpm run system:migrate:latest         # or tenants:migrate:latest

   # Verify shape with psql or knex CLI

   # Rollback once to test down() works:
   pnpm run system:migrate:rollback       # or tenants:migrate:rollback

   # Re-apply:
   pnpm run system:migrate:latest
   ```

## Anti-patterns to avoid

- Do NOT create a migration that lacks a working `down` function.
- Do NOT use raw SQL for `up` without using `knex.raw` cross-platform-safely (Bigfin supports PostgreSQL).
- Do NOT drop columns without checking if any tenant migration depends on them.
- Do NOT alter `tenants_metadata` in a tenant migration — it lives in the system schema.

## Rollback (after applying)

```bash
# Roll back the most recent batch:
pnpm run system:migrate:rollback    # or tenants:migrate:rollback

# Then delete the migration file (it's safe — knex won't try to re-run it).
```

If the backend isn't running locally (per founder's setup memory), defer testing until docker compose is wired up — but DO still write `down` correctly.
