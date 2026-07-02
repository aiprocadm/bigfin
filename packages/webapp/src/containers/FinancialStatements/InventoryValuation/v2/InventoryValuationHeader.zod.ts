import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы настройки отчёта «Оценка запасов» (замена Yup-схемы из utils.tsx).
 * Имена полей 1:1 с легаси-формой (данные и query не меняем).
 * Фабрика, чтобы intl.get вызывался после инициализации локали.
 */
export const getInventoryValuationHeaderSchema = () =>
  z.object({
    asDate: z.date({
      required_error: intl.get('as_date'),
      invalid_type_error: intl.get('as_date'),
    }),
    filterByOption: z.string(),

    // Из URL идентификаторы могут прийти строками — не приводим.
    itemsIds: z.array(z.union([z.number(), z.string()])),
    branchesIds: z.array(z.union([z.number(), z.string()])),
    warehousesIds: z.array(z.union([z.number(), z.string()])),
  });

export type InventoryValuationHeaderFormValues = z.infer<
  ReturnType<typeof getInventoryValuationHeaderSchema>
>;
