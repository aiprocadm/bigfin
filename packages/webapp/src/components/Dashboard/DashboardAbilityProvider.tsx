import React from 'react';
import { createMongoAbility } from '@casl/ability';
import { createContextualCan } from '@casl/react';

import { useDashboardMetaBoot } from './DashboardBoot';

export const AbilityContext = React.createContext<any>(undefined);
export const Can = createContextualCan(AbilityContext.Consumer);

/**
 * Dashboard ability provider.
 */
export function DashboardAbilityProvider({ children }: any) {
  const {
    meta: { abilities },
  } = useDashboardMetaBoot();

  // Ability instance.
  const ability = createMongoAbility(abilities);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
