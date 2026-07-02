import moment from 'moment';
import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы настройки журнала проводок (замена Yup-схемы из JournalHeader).
 * Имена полей 1:1 с легаси-формой (данные и query не меняем).
 * Фабрика, чтобы intl.get вызывался после инициализации локали.
 */
export const getJournalHeaderSchema = () =>
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

export type JournalHeaderFormValues = z.infer<
  ReturnType<typeof getJournalHeaderSchema>
>;
