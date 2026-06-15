// © 2026 Bigfin
/**
 * Resolves the email address of the notification recipient.
 *
 * Priority:
 * 1. Explicit `recipientEmail` stored in tenant notification settings.
 * 2. Falls back to `null` — the caller skips email delivery and logs a warning.
 *
 * NOTE (follow-up ㉒-2): Owner-email auto-lookup via system `user_tenants` + `users`
 * tables was deferred because the processor runs in a BullMQ worker context where no
 * authenticated user is present. Resolving the owner would require injecting
 * `SystemKnexConnection` + `UserTenant` + `SystemUser` system models into the processor
 * and querying `user_tenants WHERE role='owner'` → `users.email`.  That path compiles
 * cleanly but adds non-trivial system-DB coupling for a first iteration.
 * For ㉒-1 the operator simply sets `recipientEmail` in notification settings.
 */
export function resolveRecipient(recipientEmail: string | null): string | null {
  return recipientEmail ?? null;
}
