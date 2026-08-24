import { useMemo } from 'react';
import { useFormikContext } from 'formik';
import { SelectOptionProps } from '@blueprintjs-formik/select';
import { useCreditNoteSendMailBoot } from './CreditNoteSendMailBoot';
import { CreditNoteSendMailFormValues } from './_types';
import {
  formatMailMessage,
  transformEmailArgs,
  transformFormatArgsToOptions,
} from '../../Estimates/SendMailViewDrawer/hooks';

/**
 * Аргументы подстановки письма кредит-ноты.
 * @returns {Record<string, string>}
 */
export const useSendCreditNoteMailFormatArgs = (): Record<string, string> => {
  const { creditNoteMailState } = useCreditNoteSendMailBoot();

  return useMemo(() => {
    return transformEmailArgs(creditNoteMailState?.formatArgs || {});
  }, [creditNoteMailState]);
};

/**
 * Тема письма с подставленными значениями.
 * @returns {string}
 */
export const useSendCreditNoteMailSubject = (): string => {
  const { values } = useFormikContext<CreditNoteSendMailFormValues>();
  const formatArgs = useSendCreditNoteMailFormatArgs();

  return formatMailMessage(values?.subject, formatArgs);
};

/**
 * Список переменных подстановки для редактора письма.
 * @returns {Array<SelectOptionProps>}
 */
export const useSendCreditNoteFormatArgsOptions =
  (): Array<SelectOptionProps> => {
    const formatArgs = useSendCreditNoteMailFormatArgs();

    return transformFormatArgsToOptions(formatArgs);
  };

/**
 * Тело письма с подставленными значениями.
 * @returns {string}
 */
export const useSendCreditNoteMailMessage = (): string => {
  const { values } = useFormikContext<CreditNoteSendMailFormValues>();
  const formatArgs = useSendCreditNoteMailFormatArgs();

  return formatMailMessage(values?.message, formatArgs);
};
