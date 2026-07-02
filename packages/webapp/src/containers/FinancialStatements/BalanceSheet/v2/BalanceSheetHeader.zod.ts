import moment from 'moment';
import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы настройки баланса (замена Yup-схемы из utils.tsx).
 * Имена полей 1:1 с легаси-формой (данные и query не меняем);
 * в отличие от ОПиУ процентные колонки называются percentageOfColumn/Row.
 * Фабрика, чтобы intl.get вызывался после инициализации локали.
 */
export const getBalanceSheetHeaderSchema = () =>
  z
    .object({
      dateRange: z.string(),
      fromDate: z.date({
        required_error: intl.get('from_date'),
        invalid_type_error: intl.get('from_date'),
      }),
      toDate: z.date({
        required_error: intl.get('to_date'),
        invalid_type_error: intl.get('to_date'),
      }),
      displayColumnsType: z.string(),
      filterByOption: z.string(),
      basis: z.string(),

      previousYear: z.boolean(),
      previousYearAmountChange: z.boolean(),
      previousYearPercentageChange: z.boolean(),

      previousPeriod: z.boolean(),
      previousPeriodAmountChange: z.boolean(),
      previousPeriodPercentageChange: z.boolean(),

      percentageOfColumn: z.boolean(),
      percentageOfRow: z.boolean(),

      // Из URL идентификаторы филиалов могут прийти строками — не приводим.
      branchesIds: z.array(z.union([z.number(), z.string()])),
    })
    .refine(
      (values) => !moment(values.toDate).isBefore(values.fromDate, 'day'),
      {
        message: intl.get(
          'financial_header.validation.to_date_before_from_date',
        ),
        path: ['toDate'],
      },
    );

export type BalanceSheetHeaderFormValues = z.infer<
  ReturnType<typeof getBalanceSheetHeaderSchema>
>;
