// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Tag, Classes } from '@blueprintjs/core';
import { Align } from '@/constants';
import clsx from 'classnames';

const codeAccessor = (taxRate) => {
  return (
    <Tag minimal={true} round={false} intent={Intent.NONE} interactive={true}>
      {taxRate.code}
    </Tag>
  );
};

const statusAccessor = (taxRate) => {
  return taxRate.active ? (
    <Tag round={false} intent={Intent.SUCCESS}>
      {intl.get('active')}
    </Tag>
  ) : (
    <Tag round={false} intent={Intent.NONE}>
      {intl.get('inactive')}
    </Tag>
  );
};

const nameAccessor = (taxRate) => {
  return (
    <>
      <span>{taxRate.name}</span>
      {!!taxRate.is_compound && (
        <span className={clsx(Classes.TEXT_MUTED)}>
          {intl.get('tax_rates.label.compound_tax')}
        </span>
      )}
    </>
  );
};

const DescriptionAccessor = (taxRate) => {
  return (
    <span className={clsx(Classes.TEXT_MUTED)}>{taxRate.description}</span>
  );
};

/**
 * Retrieves the tax rates table columns.
 */
export const useTaxRatesTableColumns = () => {
  return [
    {
      Header: intl.get('tax_rates.label.name'),
      accessor: nameAccessor,
      width: 60,
    },
    {
      Header: intl.get('code'),
      accessor: codeAccessor,
      width: 40,
    },
    {
      Header: intl.get('tax_rates.label.rate'),
      accessor: 'rate_formatted',
      align: Align.Right,
      width: 30,
    },
    {
      Header: intl.get('description'),
      accessor: DescriptionAccessor,
      width: 100,
    },
    {
      Header: intl.get('status'),
      accessor: statusAccessor,
      width: 30,
      align: Align.Right,
    },
  ];
};

