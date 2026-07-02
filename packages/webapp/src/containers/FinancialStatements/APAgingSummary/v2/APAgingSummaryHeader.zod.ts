import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы настройки отчёта «Кредиторка по срокам» (замена Yup-схемы
 * из common.tsx). Имена полей 1:1 с легаси-формой (данные и query не меняем).
 * Фабрика, чтобы intl.get вызывался после инициализации локали.
 */
export const getAPAgingSummaryHeaderSchema = () => {
  const agingDaysMessage = intl.get(
    'financial_header.validation.aging_before_days',
  );
  const agingPeriodsMessage = intl.get(
    'financial_header.validation.aging_periods',
  );

  return z.object({
    asDate: z.date({
      required_error: intl.get('as_date'),
      invalid_type_error: intl.get('as_date'),
    }),
    // Диапазоны те же, что в легаси Yup-схеме: 1–500 дней, 1–12 периодов.
    agingDaysBefore: z
      .number({
        required_error: agingDaysMessage,
        invalid_type_error: agingDaysMessage,
      })
      .int(agingDaysMessage)
      .min(1, agingDaysMessage)
      .max(500, agingDaysMessage),
    agingPeriods: z
      .number({
        required_error: agingPeriodsMessage,
        invalid_type_error: agingPeriodsMessage,
      })
      .int(agingPeriodsMessage)
      .min(1, agingPeriodsMessage)
      .max(12, agingPeriodsMessage),
    filterByOption: z.string(),

    // Из URL идентификаторы могут прийти строками — не приводим.
    vendorsIds: z.array(z.union([z.number(), z.string()])),
    branchesIds: z.array(z.union([z.number(), z.string()])),
  });
};

export type APAgingSummaryHeaderFormValues = z.infer<
  ReturnType<typeof getAPAgingSummaryHeaderSchema>
>;
