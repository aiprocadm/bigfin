import React from 'react';
import intl from 'react-intl-universal';
import { includes } from 'lodash';
import { Callout, Intent } from '@blueprintjs/core';

export const UserFormCalloutAlerts = ({ calloutCodes }: any) => {
  // Возвращаем элемент, а не список: React считает компонентом только то,
  // что возвращает элемент или `null` (Д2 карты v66).
  return (
    <>
      {includes(calloutCodes, 200) && (
        <Callout icon={null} intent={Intent.DANGER}>
          {intl.get('roles.error.you_cannot_change_your_own_role')}
        </Callout>
      )}
    </>
  );
};
