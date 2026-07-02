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
