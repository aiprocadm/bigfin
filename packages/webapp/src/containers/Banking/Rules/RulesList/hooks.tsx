// @ts-nocheck
import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Intent, Tag } from '@blueprintjs/core';

const applyToTypeAccessor = (rule) => {
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

const conditionsAccessor = (rule) => (
  <span style={{ fontSize: 12 }}>
    {rule.conditions_formatted}
  </span>
);

const applyToAccessor = (rule) => (
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
