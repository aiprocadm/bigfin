// @ts-nocheck
import intl from 'react-intl-universal';
import * as Yup from 'yup';

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
// Лейблы — те же ключи, которыми подписаны поля формы (RuleFormContentForm),
// чтобы текст ошибки совпадал с подписью поля.
export const getCreateRuleFormSchema = () =>
  Yup.object().shape({
    name: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.rule_name')),
    applyIfAccountId: Yup.number()
      .required()
      .label(intl.get('banking.rules.field.apply_to_account')),
    applyIfTransactionType: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.apply_to_transactions')),
    conditionsType: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.categorize_when')),
    assignCategory: Yup.string()
      .required()
      .label(intl.get('transaction_type')),
    assignAccountId: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.account_category')),
    conditions: Yup.array().of(
      Yup.object().shape({
        value: Yup.string().required().label(intl.get('value')),
        comparator: Yup.string()
          .required()
          .label(intl.get('banking.rules.condition.condition')),
        field: Yup.string()
          .required()
          .label(intl.get('banking.rules.condition.field')),
      }),
    ),
  });
