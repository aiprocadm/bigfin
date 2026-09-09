import moment from 'moment';
import { useMemo } from 'react';
import * as Yup from 'yup';
import { castArray } from 'lodash';
import { useAppQueryString } from '@/hooks';
import { transformToForm } from '@/utils';

export const getDefaultVendorsBalanceQuery = () => {
  return {
    // Настройка вида чисел: экран её пишет в адрес, а разбор берёт только
    // ключи из набора по умолчанию — без этой строки настройка терялась на
    // первом же обновлении (Д3 карты v83).
    numberFormat: {},
    asDate: moment().endOf('day').format('YYYY-MM-DD'),
    filterByOption: 'with-transactions',
    vendorsIds: [],
  };
};

export const getVendorsBalanceQuerySchema = () => {
  return Yup.object().shape({
    asDate: Yup.date().required().label('asDate'),
  });
};

export const parseVendorsBalanceSummaryQuery = (locationQuery: any) => {
  const defaultQuery = getDefaultVendorsBalanceQuery();

  const transformed = {
    ...defaultQuery,
    ...transformToForm(locationQuery, defaultQuery),
  };
  return {
    ...transformed,
    vendorsIds: castArray(transformed.vendorsIds),
  };
};

export const useVendorsBalanceSummaryQuery = () => {
  const [locationQuery, setLocationQuery] = useAppQueryString();

  const query = useMemo(
    () => parseVendorsBalanceSummaryQuery(locationQuery),
    [locationQuery],
  );
  return { query, locationQuery, setLocationQuery };
};
