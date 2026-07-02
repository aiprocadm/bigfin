import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы настройки отчёта «Сальдо по клиентам» (замена Yup-схемы
 * из utils.tsx). Имена полей 1:1 с легаси-формой, включая snake_case
 * percentage_column (данные и query не меняем).
 * Фабрика, чтобы intl.get вызывался после инициализации локали.
 */
export const getCustomersBalanceSummaryHeaderSchema = () =>
  z.object({
    asDate: z.date({
      required_error: intl.get('as_date'),
      invalid_type_error: intl.get('as_date'),
    }),
    percentage_column: z.boolean(),
    filterByOption: z.string(),

    // Из URL идентификаторы могут прийти строками — не приводим.
    customersIds: z.array(z.union([z.number(), z.string()])),
  });

export type CustomersBalanceSummaryHeaderFormValues = z.infer<
  ReturnType<typeof getCustomersBalanceSummaryHeaderSchema>
>;
