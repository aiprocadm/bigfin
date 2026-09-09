import React from 'react';
import type {
  FastFieldShouldUpdateProps,
  ServiceError,
} from '@/utils/formTypes';

/** Строка оплаты: счёт, по которому платят, и сумма платежа. */
interface PaymentEntry {
  bill_id?: number | string;
  payment_amount?: number | string;
  currency_code?: string;
  [key: string]: any;
}
import moment from 'moment';
import intl from 'react-intl-universal';
import { pick, first, sumBy } from 'lodash';
import { useFormikContext } from 'formik';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { usePaymentMadeFormContext } from './PaymentMadeFormProvider';
import {
  defaultFastFieldShouldUpdate,
  safeSumBy,
  transformToForm,
  orderingLinesIndexes,
  formattedAmount,
} from '@/utils';
import { useCurrentOrganization } from '@/hooks/state';
import { PAYMENT_MADE_ERRORS } from '../constants';
import {
  transformAttachmentsToForm,
  transformAttachmentsToRequest,
} from '@/containers/Attachments/utils';

export const ERRORS = {
  PAYMENT_NUMBER_NOT_UNIQUE: 'PAYMENT.NUMBER.NOT.UNIQUE',
};

// Default payment made entry values.
export const defaultPaymentMadeEntry = {
  bill_id: '',
  payment_amount: '',
  currency_code: '',
  id: null,
  due_amount: null,
  amount: '',
};

// Default initial values of payment made.
export const defaultPaymentMade = {
  amount: '',
  vendor_id: '',
  payment_account_id: '',
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  reference: '',
  payment_number: '',
  statement: '',
  currency_code: '',
  branch_id: '',
  exchange_rate: 1,
  entries: [],
  attachments: [],
};

export const transformToEditForm = (
  paymentMade: any,
  paymentMadeEntries: PaymentEntry[],
) => {
  const attachments = transformAttachmentsToForm(paymentMade);

  return {
    ...transformToForm(paymentMade, defaultPaymentMade),
    entries: [
      ...paymentMadeEntries.map((paymentMadeEntry: PaymentEntry) => ({
        ...transformToForm(paymentMadeEntry, defaultPaymentMadeEntry),
        payment_amount: paymentMadeEntry.payment_amount || '',
      })),
    ],
    attachments,
  };
};

/**
 * Transform the new page entries.
 */
export const transformToNewPageEntries = (entries: PaymentEntry[]) => {
  return entries.map((entry: PaymentEntry) => ({
    ...transformToForm(entry, defaultPaymentMadeEntry),
    payment_amount: '',
    currency_code: entry.currency_code,
  }));
};

/**
 * Detarmines vendors fast field when update.
 */
export const vendorsFieldShouldUpdate = (
  newProps: FastFieldShouldUpdateProps & { shouldUpdateDeps: { items: any } },
  oldProps: FastFieldShouldUpdateProps & { shouldUpdateDeps: { items: any } },
) => {
  return (
    newProps.shouldUpdateDeps.items !== oldProps.shouldUpdateDeps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Detarmines accounts fast field when update.
 */
export const accountsFieldShouldUpdate = (
  newProps: FastFieldShouldUpdateProps,
  oldProps: FastFieldShouldUpdateProps,
) => {
  return (
    newProps.items !== oldProps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Transformes the form values to request body.
 */
export const transformFormToRequest = (form: any) => {
  // Filters entries that have no `bill_id` or `payment_amount`.
  const entries = form.entries
    .filter((item: PaymentEntry) => item.bill_id && item.payment_amount)
    .map((entry: PaymentEntry) => ({
      ...pick(entry, ['payment_amount', 'bill_id']),
    }));

  const attachments = transformAttachmentsToRequest(form);

  return { ...form, entries: orderingLinesIndexes(entries), attachments };
};

export const useSetPrimaryBranchToForm = () => {
  const { setFieldValue } = useFormikContext<any>();
  const { branches, isBranchesSuccess, isNewMode } = usePaymentMadeFormContext();

  React.useEffect(() => {
    if (isBranchesSuccess && isNewMode) {
      const primaryBranch = branches.find((b: { primary?: boolean; id: number }) => b.primary) || first(branches);

      if (primaryBranch) {
        setFieldValue('branch_id', primaryBranch.id);
      }
    }
  }, [isBranchesSuccess, setFieldValue, branches, isNewMode]);
};

/**
 * Transformes the response errors types.
 */
export const transformErrors = (
  errors: ServiceError[],
  { setFieldError }: { setFieldError: (field: string, message: string) => void },
) => {
  const getError = (errorType: string) => errors.find((e) => e.type === errorType);

  if (getError(PAYMENT_MADE_ERRORS.PAYMENT_NUMBER_NOT_UNIQUE)) {
    setFieldError('payment_number', intl.get('payment_number_is_not_unique'));
  }
  if (getError(PAYMENT_MADE_ERRORS.WITHDRAWAL_ACCOUNT_CURRENCY_INVALID)) {
    AppToaster.show({
      message: intl.get(
        'payment_made.error.withdrawal_account_currency_invalid',
      ),
      intent: Intent.DANGER,
    });
  }
};

export const usePaymentMadeTotals = () => {
  const {
    values: { entries, currency_code: currencyCode },
  } = useFormikContext<any>();

  // Retrieves the invoice entries total.
  const total = React.useMemo(
    () => sumBy(entries, 'payment_amount'),
    [entries],
  );

  // Retrieves the formatted total money.
  const formattedTotal = React.useMemo(
    () => formattedAmount(total, currencyCode),
    [total, currencyCode],
  );
  // Retrieves the formatted subtotal.
  const formattedSubtotal = React.useMemo(
    () => formattedAmount(total, currencyCode, { money: false }),
    [total, currencyCode],
  );

  return {
    total,
    formattedTotal,
    formattedSubtotal,
  };
};

export const usePaymentmadeTotalAmount = () => {
  const {
    values: { amount },
  } = useFormikContext<any>();

  return amount;
};

export const usePaymentMadeAppliedAmount = () => {
  const {
    values: { entries },
  } = useFormikContext<any>();

  // Retrieves the invoice entries total.
  return React.useMemo(() => sumBy(entries, 'payment_amount'), [entries]);
};

export const usePaymentMadeExcessAmount = () => {
  const appliedAmount = usePaymentMadeAppliedAmount();
  const totalAmount = usePaymentmadeTotalAmount();

  return Math.abs(totalAmount - appliedAmount);
};

/**
 * Detarmines whether the bill has foreign customer.
 * @returns {boolean}
 */
export const usePaymentMadeIsForeignCustomer = () => {
  const { values } = useFormikContext<any>();
  const currentOrganization = useCurrentOrganization();

  const isForeignCustomer = React.useMemo(
    () => values.currency_code !== currentOrganization.base_currency,
    [values.currency_code, currentOrganization.base_currency],
  );
  return isForeignCustomer;
};

export const getPaymentExcessAmountFromValues = (values: any) => {
  const appliedAmount = sumBy(values.entries, 'payment_amount');
  const totalAmount = values.amount;

  return Math.abs(totalAmount - appliedAmount);
};
