import React, { useState, useEffect } from 'react';

export const DivFieldCell = ({ cell: { value: initialValue } }: any) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return <div>${value}</div>;
};
export const EmptyDiv = ({ cell: { value: initialValue } }: any) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return <div>{value}</div>;
};
