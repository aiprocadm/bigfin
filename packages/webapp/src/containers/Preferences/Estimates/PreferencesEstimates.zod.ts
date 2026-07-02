import { z } from 'zod';

/** Схема настроек смет (Estimates). Оба поля необязательные. */
export const estimatesSchema = z.object({
  customerNotes: z.string().optional().default(''),
  termsConditions: z.string().optional().default(''),
});

export type EstimatesFormValues = z.infer<typeof estimatesSchema>;
