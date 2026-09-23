import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема настроек бухгалтерии (Accountant). Id счетов в форме держим
 * строками (пустая строка — счёт не выбран); в числа конвертируем при
 * сохранении.
 */
export const accountantSchema = z.object({
  organization: z.object({
    accountingBasis: z
      .string({ required_error: intl.get('accounting_basis_') })
      .min(1, intl.get('accounting_basis_')),
    // Календарь организации (FT-006b ТЗ-3): 1 — понедельник … 7 — воскресенье.
    weekStartDay: z.enum(['1', '2', '3', '4', '5', '6', '7']).default('1'),
    highlightWeekends: z.boolean().default(true),
    showWeekdays: z.boolean().default(false),
  }),
  accounts: z.object({
    accountCodeRequired: z.boolean().default(false),
    accountCodeUnique: z.boolean().default(false),
  }),
  paymentReceives: z.object({
    preferredDepositAccount: z.string().optional().default(''),
    preferredAdvanceDeposit: z.string().optional().default(''),
  }),
  billPayments: z.object({
    withdrawalAccount: z.string().optional().default(''),
  }),
});

export type AccountantFormValues = z.infer<typeof accountantSchema>;
