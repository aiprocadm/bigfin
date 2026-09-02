import React from 'react';
import intl from 'react-intl-universal';

import { FSelect } from '../Forms';

/**
 *
 * @param {*} query
 * @param {*} currency
 * @param {*} _index
 * @param {*} exactMatch
 * @returns
 */
const currencyItemPredicate = (query: any, currency: any, _index: any, exactMatch: any) => {
  const normalizedTitle = currency.currency_code.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return (
      `${currency.currency_code}. ${normalizedTitle}`.indexOf(
        normalizedQuery,
      ) >= 0
    );
  }
};

/**
 *
 * @param {*} currencies
 * @returns
 */
export function CurrencySelect({ currencies, ...rest }: any) {
  return (
    <FSelect
      itemPredicate={currencyItemPredicate}
      valueAccessor={'currency_code'}
      textAccessor={'currency_name'}
      labelAccessor={'currency_code'}
      {...rest}
      items={currencies}
      placeholder={intl.get('select_currency_code')}
    />
  );
}
