import React from 'react';
import type {
  FastFieldShouldUpdateProps,
  ServiceError,
} from '@/utils/formTypes';

/** Строка расхода в форме: у неё читают сумму и счёт затрат. */
interface ExpenseEntry {
  amount?: number | string;
  expense_account_id?: number | string;
  [key: string]: any;
}
import * as R from 'ramda';
import intl from 'react-intl-universal';
import moment from 'moment';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';
import { useFormikContext } from 'formik';
import { first, sumBy } from 'lodash';
import { useExpenseFormContext } from './ExpenseFormPageProvider';

import {
  defaultFastFieldShouldUpdate,
  transformToForm,
  repeatValue,
  ensureEntriesHasEmptyLine,
  orderingLinesIndexes,
  formattedAmount,
} from '@/utils';
import { useCurrentOrganization } from '@/hooks/state';
import {
  transformAttachmentsToForm,
  transformAttachmentsToRequest,
} from '@/containers/Attachments/utils';

const ERROR = {
  EXPENSE_ALREADY_PUBLISHED: 'EXPENSE.ALREADY.PUBLISHED',
  ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED:
    'ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED',
};

export const MIN_LINES_NUMBER = 1;

export const defaultExpenseEntry = {
  amount: '',
  expense_account_id: '',
  description: '',
  landed_cost: 0,
  project_id: '',
};

export const defaultExpense = {
  payment_account_id: '',
  beneficiary: '',
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  description: '',
  reference_no: '',
  currency_code: '',
  publish: '',
  branch_id: '',
  exchange_rate: 1,
  categories: [...repeatValue(defaultExpenseEntry, MIN_LINES_NUMBER)],
  attachments: [],
};

/**
 * Transform API errors in toasts messages.
 *
 * Раньше показ уведомления заворачивали в `setErrors` Formik: тот ждёт набор
 * ошибок полей, а получал ключ показанного уведомления. Уведомление всё равно
 * показывалось, а в ошибки формы попадала строка вместо объекта — висело в
 * заделе с карты v81 (Д11 карты v85). Второе сообщение было служебным кодом
 * вместо слов.
 */
export const transformErrors = (errors: ServiceError[]) => {
  const hasError = (errorType: string) => errors.some((e) => e.type === errorType);

  if (hasError(ERROR.EXPENSE_ALREADY_PUBLISHED)) {
    AppToaster.show({
      message: intl.get('the_expense_is_already_published'),
    });
  }
  if (hasError(ERROR.ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED)) {
    AppToaster.show({
      intent: Intent.DANGER,
      message: intl.get('expense.error.entries_allocated_cost_could_not_deleted'),
    });
  }
};

/**
 * Transformes the expense to form initial values in edit mode.
 */
export const transformToEditForm = (
  expense: any,
  defaultExpense: any,
  linesNumber = 4,
) => {
  const expenseEntry = defaultExpense.categories[0];
  const initialEntries = [
    ...expense.categories.map((category: any) => ({
      ...transformToForm(category, expenseEntry),
    })),
    ...repeatValue(
      expenseEntry,
      Math.max(linesNumber - expense.categories.length, 0),
    ),
  ];
  const categories = R.compose(
    ensureEntriesHasEmptyLine(MIN_LINES_NUMBER, expenseEntry),
  )(initialEntries);

  const attachments = transformAttachmentsToForm(expense);

  return {
    ...transformToForm(expense, defaultExpense),
    categories,
    attachments,
  };
};

/**
 * Detarmine cusotmers fast-field should update.
 */
export const customersFieldShouldUpdate = (
  newProps: FastFieldShouldUpdateProps & { shouldUpdateDeps: { items: any } },
  oldProps: FastFieldShouldUpdateProps & { shouldUpdateDeps: { items: any } },
) => {
  return (
    newProps.shouldUpdateDeps.items !== oldProps.shouldUpdateDeps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Detarmine accounts fast-field should update.
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
 * Filter expense entries that has no amount or expense account.
 */
export const filterNonZeroEntries = (categories: ExpenseEntry[]) => {
  return categories.filter(
    (category) => category.amount && category.expense_account_id,
  );
};

/**
 * Transformes the form values to request body.
 */
export const transformFormValuesToRequest = (values: any) => {
  const categories = filterNonZeroEntries(values.categories);
  const attachments = transformAttachmentsToRequest(values);

  return {
    ...values,
    categories: R.compose(orderingLinesIndexes)(categories),
    attachments,
  };
};

export const useSetPrimaryBranchToForm = () => {
  const { setFieldValue } = useFormikContext<any>();
  const { branches, isBranchesSuccess, isNewMode } = useExpenseFormContext();

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
 * Retrieves the expense subtotal.
 * @returns {number}
 */
export const useExpenseSubtotal = () => {
  const {
    values: { categories },
  } = useFormikContext<any>();

  // Calculates the expense entries amount.
  return React.useMemo(() => sumBy(categories, 'amount'), [categories]);
};

/**
 * Retrieves the expense subtotal formatted.
 * @returns {string}
 */
export const useExpenseSubtotalFormatted = () => {
  const subtotal = useExpenseSubtotal();
  const {
    values: { currency_code },
  } = useFormikContext<any>();

  return formattedAmount(subtotal, currency_code);
};

/**
 * Retrieves the expense total.
 * @returns {number}
 */
export const useExpenseTotal = () => {
  const subtotal = useExpenseSubtotal();

  return subtotal;
};

/**
 * Retrieves the expense total formatted.
 * @returns {string}
 */
export const useExpenseTotalFormatted = () => {
  const total = useExpenseTotal();
  const {
    values: { currency_code },
  } = useFormikContext<any>();

  return formattedAmount(total, currency_code);
};

/**
 * Detarmines whether the expenses has foreign .
 * @returns {boolean}
 */
export const useExpensesIsForeign = () => {
  const { values } = useFormikContext<any>();
  const currentOrganization = useCurrentOrganization();

  const isForeignExpenses = React.useMemo(
    () => values.currency_code !== currentOrganization.base_currency,
    [values.currency_code, currentOrganization.base_currency],
  );
  return isForeignExpenses;
};
