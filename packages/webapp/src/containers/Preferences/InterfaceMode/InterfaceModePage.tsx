// @ts-nocheck
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { RadioGroup, Radio, Button, Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useUpdateOrganization } from '@/hooks/query/organization';
import { INTERFACE_MODE } from '@/constants/interfaceMode';
import { compose } from '@/utils';

function InterfaceModePage({ changePreferencesPageTitle }) {
  const organization = useCurrentOrganization();
  const { mutateAsync: updateOrganization, isLoading } = useUpdateOrganization();

  const currentMode =
    organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
  const [mode, setMode] = useState(currentMode);

  useEffect(() => {
    changePreferencesPageTitle(intl.get('interface_mode.title'));
  }, [changePreferencesPageTitle]);

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const handleSave = () => {
    updateOrganization({ interfaceMode: mode })
      .then(() => {
        AppToaster.show({
          message: intl.get('interface_mode.saved'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('interface_mode.save_failed'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <p>{intl.get('interface_mode.description')}</p>

      <RadioGroup onChange={(e) => setMode(e.currentTarget.value)} selectedValue={mode}>
        <Radio
          label={intl.get('interface_mode.business')}
          value={INTERFACE_MODE.Business}
        />
        <Radio
          label={intl.get('interface_mode.accountant')}
          value={INTERFACE_MODE.Accountant}
        />
      </RadioGroup>

      <Button
        intent={Intent.PRIMARY}
        loading={isLoading}
        disabled={mode === currentMode}
        onClick={handleSave}
      >
        {intl.get('interface_mode.save')}
      </Button>
    </div>
  );
}

export default compose(withDashboardActions)(InterfaceModePage);
