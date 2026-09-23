import intl from 'react-intl-universal';
import { camelCase, get, upperFirst } from 'lodash';
import { MoneyCategoryPerCreditAccountRootType } from '@/constants/cashflowOptions';

/** Строка разбиения в форме: пустые поля — пустые строки, как у Formik. */
export interface RuleSplitFormLine {
  sharePercent: string | number;
  articleId: string | number;
  projectId: string | number;
}

const emptySplit = (): RuleSplitFormLine => ({ sharePercent: '', articleId: '', projectId: '' });

export const initialValues = {
  name: '',
  order: 0,
  // Тип правила (FT-030…FT-032 ТЗ-3): заполнить поля, разбить, перевод.
  ruleType: 'assign',
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
  assignProjectId: '',
  assignContactId: '',
  transferToAccountId: '',
  // Сделка и этап (FT-033 ТЗ-3).
  assignDealId: '',
  assignDealStageId: '',
  // Метка операции (FT-025 ТЗ-3) — у правила любого вида.
  assignTag: '',
  splits: [emptySplit(), emptySplit()],
};

export interface RuleFormValues {
  name: string;
  order: number;
  ruleType: string;
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
  assignProjectId: string | number;
  assignContactId: string | number;
  transferToAccountId: string | number;
  assignDealId: string | number;
  assignDealStageId: string | number;
  assignTag?: string;
  splits: RuleSplitFormLine[];
}

export const newSplitLine = emptySplit;

/** Не больше стольких условий — как на сервере (FT-030). */
export const MAX_RULE_CONDITIONS = 50;

export const RULE_TYPES = ['assign', 'split', 'transfer', 'deal'] as const;

/** Условия правила «сделка» по ТЗ — описание и контрагент (FT-033). */
export const DEAL_CONDITION_FIELDS = ['description', 'payee'];

export const getRuleTypeOptions = () =>
  RULE_TYPES.map((value) => ({ value, text: intl.get(`banking.rules.rule_type.${value}`) }));

/** Сумма долей разбиения — для подсказки «осталось N %». */
export const splitSharesTotal = (splits: RuleSplitFormLine[] = []) =>
  Math.round(splits.reduce((sum, line) => sum + (Number(line.sharePercent) || 0), 0) * 10000) /
  10000;

const idOrNull = (value: unknown) => {
  const n = Number(value);
  return value === '' || value == null || !Number.isFinite(n) || n <= 0 ? null : n;
};

/**
 * Значения формы → запрос. Пустые поля — `null`, а не пустая строка: сервер
 * принимает числа, и «''» не прошло бы проверку. Поля чужого типа не
 * отправляются вовсе — сервер их всё равно обнулит.
 */
export function toBankRulePayload(values: RuleFormValues) {
  const ruleType = values.ruleType || 'assign';
  return {
    name: values.name,
    order: Number(values.order) || 0,
    ruleType,
    applyIfAccountId: idOrNull(values.applyIfAccountId),
    // Пусто — «поступления и списания».
    applyIfTransactionType: values.applyIfTransactionType || null,
    conditionsType: values.conditionsType,
    conditions: values.conditions,
    // Метка (FT-025 ТЗ-3) — у правила любого вида; пусто — без метки.
    assignTag: (values.assignTag ?? '').trim() || null,
    ...(ruleType === 'assign'
      ? {
          assignCategory: values.assignCategory || undefined,
          assignAccountId: idOrNull(values.assignAccountId),
          assignProjectId: idOrNull(values.assignProjectId),
          assignContactId: idOrNull(values.assignContactId),
        }
      : {}),
    ...(ruleType === 'split'
      ? {
          splits: values.splits.map((line) => ({
            sharePercent: Number(line.sharePercent),
            articleId: idOrNull(line.articleId),
            projectId: idOrNull(line.projectId),
          })),
        }
      : {}),
    ...(ruleType === 'transfer' ? { transferToAccountId: idOrNull(values.transferToAccountId) } : {}),
    ...(ruleType === 'deal'
      ? {
          assignCategory: values.assignCategory || undefined,
          assignAccountId: idOrNull(values.assignAccountId),
          assignContactId: idOrNull(values.assignContactId),
          assignDealId: idOrNull(values.assignDealId),
          assignDealStageId: idOrNull(values.assignDealStageId),
        }
      : {}),
  };
}

/** Черновик для проверки конфликта (FT-035): только охват правила. */
export function toConflictDraft(values: RuleFormValues, id?: number | null) {
  const payload = toBankRulePayload(values);
  return {
    ...(id ? { id } : {}),
    order: payload.order,
    applyIfAccountId: payload.applyIfAccountId,
    applyIfTransactionType: payload.applyIfTransactionType,
    conditionsType: payload.conditionsType,
    conditions: payload.conditions,
  };
}

// Списки строятся при вызове: словарь к моменту импорта модуля ещё не загружен.
export const getTransactionTypeOptions = () => [
  { value: 'deposit', text: intl.get('banking.rules.type.deposit') },
  { value: 'withdrawal', text: intl.get('banking.rules.type.withdrawal') },
  // «Оба» (FT-030): правило срабатывает и на поступление, и на списание.
  { value: '', text: intl.get('banking.rules.type.both') },
];
export const getFields = () => [
  { value: 'description', text: intl.get('description') },
  { value: 'amount', text: intl.get('amount') },
  { value: 'payee', text: intl.get('payee') },
];

export const getTextFieldConditions = () => [
  { value: 'contains', text: intl.get('banking.rules.comparator.contains') },
  {
    value: 'not_contains',
    text: intl.get('banking.rules.comparator.not_contains'),
  },
  { value: 'equals', text: intl.get('banking.rules.comparator.equals') },
  { value: 'not_equals', text: intl.get('banking.rules.comparator.not_equals') },
  { value: 'starts_with', text: intl.get('banking.rules.comparator.starts_with') },
  { value: 'in_list', text: intl.get('banking.rules.comparator.in_list') },
];
export const getNumberFieldConditions = () => [
  { value: 'equals', text: intl.get('banking.rules.comparator.equal') },
  { value: 'not_equals', text: intl.get('banking.rules.comparator.not_equals') },
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
  { value: 'in_list', text: intl.get('banking.rules.comparator.in_list') },
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
