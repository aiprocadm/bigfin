import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Intent, Tag } from '@blueprintjs/core';

const applyToTypeAccessor = (rule: any) => {
  // Пусто — правило для поступлений и списаний (FT-030 ТЗ-3).
  if (!rule.apply_if_transaction_type) {
    return <Tag round>{intl.get('banking.rules.type.both')}</Tag>;
  }
  return rule.apply_if_transaction_type === 'deposit' ? (
    <Tag round intent={Intent.SUCCESS}>
      {intl.get('banking.rules.type.deposit')}
    </Tag>
  ) : (
    <Tag round intent={Intent.DANGER}>
      {intl.get('banking.rules.type.withdrawal')}
    </Tag>
  );
};

/** Что делает правило: заполнить поля, разбить, перевод (FT-030…FT-032). */
const ruleTypeAccessor = (rule: any) => (
  <Tag minimal>{intl.get(`banking.rules.rule_type.${rule.rule_type || 'assign'}`)}</Tag>
);

const conditionsAccessor = (rule: any) => (
  <span style={{ fontSize: 12 }}>
    {rule.conditions_formatted}
  </span>
);

const applyToAccessor = (rule: any) => (
  <Tag intent={Intent.NONE} minimal>
    {rule.assign_account_name}
  </Tag>
);

export const useBankRulesTableColumns = () => {
  return useMemo(
    () => [
      {
        Header: intl.get('banking.rules.col.transaction_type'),
        accessor: applyToTypeAccessor,
      },
      {
        Header: intl.get('banking.rules.col.rule_name'),
        accessor: 'name',
      },
      {
        Header: intl.get('banking.rules.field.rule_type'),
        accessor: ruleTypeAccessor,
      },
      {
        Header: intl.get('banking.rules.col.categorize_as'),
        accessor: 'assign_category_formatted',
      },
      {
        Header: intl.get('banking.rules.col.assign_account'),
        accessor: applyToAccessor,
      },
      {
        Header: intl.get('banking.rules.col.conditions'),
        accessor: conditionsAccessor,
      },
    ],
    [],
  );
};
