import intl from 'react-intl-universal';
import { camelCase, get, upperFirst } from 'lodash';
import { MoneyCategoryPerCreditAccountRootType } from '@/constants/cashflowOptions';

export const initialValues = {
  name: '',
  order: 0,
  applyIfAccountId: '',
  applyIfTransactionType: 'deposit',
  conditionsType: 'and',
  conditions: [
    {
      field: 'description',
      comparator: 'contains',
      value: '',
    },
  ],
  assignCategory: '',
  assignAccountId: '',
};

export interface RuleFormValues {
  name: string;
  order: number;
  applyIfAccountId: string;
  applyIfTransactionType: string;
  conditionsType: string;
  conditions: Array<{
    field: string;
    comparator: string;
    value: string;
  }>;
  assignCategory: string;
  assignAccountId: string;
}

// Списки строятся при вызове: словарь к моменту импорта модуля ещё не загружен.
export const getTransactionTypeOptions = () => [
  { value: 'deposit', text: intl.get('banking.rules.type.deposit') },
  { value: 'withdrawal', text: intl.get('banking.rules.type.withdrawal') },
];
export const getFields = () => [
  { value: 'description', text: intl.get('description') },
  { value: 'amount', text: intl.get('amount') },
  { value: 'payee', text: intl.get('payee') },
];

export const getTextFieldConditions = () => [
  { value: 'contains', text: intl.get('banking.rules.comparator.contains') },
  { value: 'equals', text: intl.get('banking.rules.comparator.equals') },
  {
    value: 'not_contains',
    text: intl.get('banking.rules.comparator.not_contains'),
  },
];
export const getNumberFieldConditions = () => [
  { value: 'equal', text: intl.get('banking.rules.comparator.equal') },
  { value: 'bigger', text: intl.get('banking.rules.comparator.bigger') },
  {
    value: 'bigger_or_equal',
    text: intl.get('banking.rules.comparator.bigger_or_equal'),
  },
  { value: 'smaller', text: intl.get('banking.rules.comparator.smaller') },
  {
    value: 'smaller_or_equal',
    text: intl.get('banking.rules.comparator.smaller_or_equal'),
  },
];

export const getFieldCondition = () => [
  ...getTextFieldConditions(),
  ...getNumberFieldConditions(),
];

export const getAssignTransactionTypeOptions = () => [
  { value: 'expense', text: intl.get('expense') },
];

export const getAccountRootFromMoneyCategory = (category: string): string[] => {
  const _category = upperFirst(camelCase(category));

  return get(MoneyCategoryPerCreditAccountRootType, _category) || [];
};

export const getFieldConditionsByFieldKey = (fieldKey?: string) => {
  switch (fieldKey) {
    case 'amount':
      return getNumberFieldConditions();
    default:
      return getTextFieldConditions();
  }
};

export const getDefaultFieldConditionByFieldKey = (fieldKey?: string) => {
  switch (fieldKey) {
    case 'amount':
      return 'bigger_or_equal';
    default:
      return 'contains';
  }
};
