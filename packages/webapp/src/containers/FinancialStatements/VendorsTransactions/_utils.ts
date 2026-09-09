import * as Yup from 'yup';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useMemo } from 'react';
import { transformToForm } from '@/utils';
import { useAppQueryString } from '@/hooks';
import type { QueryStringResult } from '@/hooks/useQueryString';

/**
 * The validation schema of vendors transactions.
 */
export const getVendorTransactionsQuerySchema = () => {
  return Yup.object().shape({
    fromDate: Yup.date().required().label(intl.get('fromDate')),
    toDate: Yup.date()
      .min(Yup.ref('fromDate'))
      .required()
      .label(intl.get('toDate')),
  });
};

/**
 * Retrieves the default query of vendors transactions.
 */
export const getVendorsTransactionsDefaultQuery = () => ({
  // Настройка вида чисел: экран её пишет в адрес, а разбор берёт только ключи
  // из набора по умолчанию — без этой строки настройка терялась на первом же
  // обновлении (Д3 карты v83).
  numberFormat: {},
  fromDate: moment().startOf('month').format('YYYY-MM-DD'),
  toDate: moment().format('YYYY-MM-DD'),
  vendorsIds: [],
});

/**
 * Parses the query of vendors transactions.
 */
const parseVendorsTransactionsQuery = (query: any) => {
  const defaultQuery = getVendorsTransactionsDefaultQuery();
  const transformed = {
    ...defaultQuery,
    ...transformToForm(query, defaultQuery),
  };
  return {
    ...transformed,
    vendorsIds: transformed.vendorsIds ? transformed.vendorsIds : [],
  };
};

/**
 * Retrieves the query of vendors transactions.
 */
export const useVendorsTransactionsQuery = (): QueryStringResult => {
  const [locationQuery, setLocationQuery] = useAppQueryString();

  const query = useMemo(
    () => parseVendorsTransactionsQuery(locationQuery),
    [locationQuery],
  );
  return [query, setLocationQuery];
};
