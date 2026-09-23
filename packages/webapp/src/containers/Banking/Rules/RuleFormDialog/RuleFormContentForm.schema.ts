import intl from 'react-intl-universal';
import * as Yup from 'yup';

import { MAX_RULE_CONDITIONS } from './_utils';

/** Пустая строка поля — «нет значения», а не ноль. */
const emptyToNull = (value: unknown, original: unknown) => (original === '' ? null : value);

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
// Лейблы — те же ключи, которыми подписаны поля формы (RuleFormContentForm),
// чтобы текст ошибки совпадал с подписью поля.
//
// УСЛОВИЯ «when» — В ВИДЕ ГОТОВЫХ СХЕМ, а не функций: в проекте yup 0.28,
// функцию в `then` он не понимает.
export const getCreateRuleFormSchema = () =>
  Yup.object().shape({
    name: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.rule_name')),
    ruleType: Yup.string().oneOf(['assign', 'split', 'transfer', 'deal']).required(),
    // Счёт обязателен только у перевода: остальные правила бывают «для
    // любого счёта» (FT-030 ТЗ-3).
    applyIfAccountId: Yup.mixed().when('ruleType', {
      is: 'transfer',
      then: Yup.number()
        .transform(emptyToNull)
        .nullable()
        .required()
        .label(intl.get('banking.rules.field.apply_to_account')),
      otherwise: Yup.mixed().nullable(),
    }),
    // Пусто — «поступления и списания».
    applyIfTransactionType: Yup.string()
      .nullable()
      .label(intl.get('banking.rules.field.apply_to_transactions')),
    conditionsType: Yup.string()
      .required()
      .label(intl.get('banking.rules.field.categorize_when')),
    assignCategory: Yup.string().nullable().label(intl.get('transaction_type')),
    assignAccountId: Yup.mixed().when('ruleType', {
      is: (type: string) => type === 'assign' || type === 'deal',
      then: Yup.string()
        .required()
        .label(intl.get('banking.rules.field.account_category')),
      otherwise: Yup.mixed().nullable(),
    }),
    transferToAccountId: Yup.mixed().when('ruleType', {
      is: 'transfer',
      then: Yup.string()
        .required()
        .label(intl.get('banking.rules.field.transfer_to_account')),
      otherwise: Yup.mixed().nullable(),
    }),
    // Сделка (FT-033): сделка или этап обязательны, и правило — отдельно
    // для поступлений и для списаний.
    assignDealStageId: Yup.mixed().when(['ruleType', 'assignDealId'], {
      is: (type: string, deal: any) => type === 'deal' && !deal,
      then: Yup.string()
        .required(intl.get('banking.rules.deal.required'))
        .label(intl.get('banking.rules.field.assign_deal')),
      otherwise: Yup.mixed().nullable(),
    }),
    applyIfTransactionTypeForDeal: Yup.mixed().test(
      'deal-direction',
      intl.get('banking.rules.deal.direction_required'),
      function () {
        const { ruleType, applyIfTransactionType } = this.parent as any;
        return ruleType !== 'deal' || Boolean(applyIfTransactionType);
      },
    ),
    // Доли разбиения (FT-031): от двух строк, у каждой статья, в сумме 100 %.
    splits: Yup.mixed().when('ruleType', {
      is: 'split',
      then: Yup.array()
        .of(
          Yup.object().shape({
            articleId: Yup.string()
              .required()
              .label(intl.get('banking.rules.split.article')),
            sharePercent: Yup.number()
              .transform((value, original) => (original === '' ? undefined : value))
              .moreThan(0)
              .max(100)
              .required()
              .label(intl.get('banking.rules.split.share')),
          }),
        )
        .min(2)
        .test(
          'shares-100',
          intl.get('banking.rules.split.must_be_100'),
          (lines: any[] | null | undefined) =>
            Math.abs(
              (lines ?? []).reduce(
                (sum: number, line: any) => sum + (Number(line?.sharePercent) || 0),
                0,
              ) - 100,
            ) < 0.00005,
        ),
      otherwise: Yup.mixed().nullable(),
    }),
    conditions: Yup.array()
      .max(MAX_RULE_CONDITIONS)
      .of(
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
