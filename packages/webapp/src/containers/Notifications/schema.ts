// © 2026 Bigfin
import { z } from 'zod';

export const notificationPreferenceItemSchema = z.object({
  eventType: z.string(),
  enabled: z.boolean().default(false),
  channels: z.array(z.string()).default(['email']),
  horizonDays: z.coerce.number().int().min(1).optional(),
  minBalance: z.coerce.number().min(0).optional(),
});

export const notificationsSettingsSchema = z.object({
  cashGap: notificationPreferenceItemSchema,
  lowBalance: notificationPreferenceItemSchema,
  overdue: notificationPreferenceItemSchema,
  recipientEmail: z.string().email().or(z.literal('')).optional(),
  cooldownHours: z.coerce.number().int().min(1).default(24),
});

export type NotificationsSettingsFormValues = z.infer<typeof notificationsSettingsSchema>;
