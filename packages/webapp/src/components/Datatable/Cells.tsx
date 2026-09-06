import React from 'react';

export function CellTextSpan({ cell: { value } }: any) {
  return (<span className="cell-text">{ value }</span>)
}
