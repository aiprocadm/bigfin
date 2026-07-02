import { z } from 'zod';

/** Схема настроек возвратов (Credit Notes). Оба поля необязательные. */
export const creditNotesSchema = z.object({
  customerNotes: z.string().optional().default(''),
  termsConditions: z.string().optional().default(''),
});

export type CreditNotesFormValues = z.infer<typeof creditNotesSchema>;
