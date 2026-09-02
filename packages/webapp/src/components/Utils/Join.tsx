import React from 'react';

export function Join({ items, sep }: any) {
  return items.length > 0
    ? items.reduce((result: any, item: any) => (
        <>
          {result}
          {sep}
          {item}
        </>
      ))
    : null;
}
