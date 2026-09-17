import React from 'react';
import { Classes } from '@blueprintjs/core';
import { FSelect } from '../Forms';
import { getConditionTypeCompatators } from './utils';

export default function DynamicFilterCompatatorField({
  dataType,
  ...restProps
}: any) {
  const options = getConditionTypeCompatators(dataType);

  return (
    <FSelect
      textAccessor={'label'}
      valueAccessor={'value'}
      items={options}
      className={Classes.FILL}
      filterable={false}
      popoverProps={{
        minimal: true,
        captureDismiss: true,
      }}
      {...restProps}
    />
  );
}
