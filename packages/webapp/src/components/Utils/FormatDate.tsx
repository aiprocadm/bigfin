import React from 'react';
import moment from 'moment';
import intl from 'react-intl-universal';

/**
 * Format the given date.
 */
export function FormatDate({ value, format = 'YYYY MMM DD' }: any) {
  const localizedFormat = intl.get(`date_formats.${format}`);

  // Обёртка нужна не для красоты: компонент обязан вернуть элемент, а
  // `format` даёт строку (Д2 карты v66).
  return <>{moment(value).format(localizedFormat)}</>;
}

/**
 * Format date table cell.
 */
export function FormatDateCell({ value, column: { formatDate } }: any) {
  return <FormatDate value={value} {...formatDate} />;
}
