import React from 'react';

export const FlagIcon = ({ currencyCode, className }: any) => {
  const source = `/icons/currency-flags/${currencyCode}.svg`;

  return <img alt="flag" src={source} className={className} />;
};
