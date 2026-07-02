import { z } from 'zod';

/**
 * Схема настроек товаров (Items). В форме id счетов держим строками
 * (пустая строка — счёт не выбран); в числа конвертируем при сохранении.
 */
export const itemPreferencesSchema = z.object({
  preferred_sell_account: z.string().optional().default(''),
  preferred_cost_account: z.string().optional().default(''),
  preferred_inventory_account: z.string().optional().default(''),
});

export type ItemPreferencesFormValues = z.infer<typeof itemPreferencesSchema>;
