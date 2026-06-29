import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { Switch, Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useFeatureCan } from '@/hooks/state/feature';
import { useTurnOnFeature, useTurnOffFeature } from '@/hooks/query/features';
import { compose } from '@/utils';

const MODULE_GROUPS = [
  { group: 'planning', features: ['payment_calendar', 'budgets', 'financial_model'] },
  {
    group: 'accounting',
    features: [
      'mgmt_articles', 'deals', 'cost_allocation', 'debts', 'payment_requests',
      'dividends', 'credits', 'fixed_assets', 'payroll', 'vat_analysis',
      'financial_ratios', 'data_quality',
    ],
  },
  {
    group: 'integrations',
    features: [
      'bank_api_sync', 'acquiring', 'zenmoney_import', 'onec_export',
      'moysklad', 'marketplaces', 'crm_integration',
    ],
  },
  { group: 'structure', features: ['branches', 'warehouses'] },
  { group: 'other', features: ['notifications'] },
];

interface ModulesPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

function ModulesPage({ changePreferencesPageTitle }: ModulesPageProps) {
  const { featureCan } = useFeatureCan();
  const { mutateAsync: turnOn, isLoading: turningOn } = useTurnOnFeature();
  const { mutateAsync: turnOff, isLoading: turningOff } = useTurnOffFeature();
  const busy = turningOn || turningOff;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.modules.title'));
  }, [changePreferencesPageTitle]);

  const handleToggle = (feature: string, nextEnabled: boolean) => {
    const action = nextEnabled ? turnOn : turnOff;
    action(feature)
      .then(() => {
        AppToaster.show({
          message: intl.get('preferences.modules.saved'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('preferences.modules.save_failed'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p>{intl.get('preferences.modules.description')}</p>
      <p style={{ color: '#5c7080' }}>
        {intl.get('preferences.modules.note_interface_mode')}
      </p>

      {MODULE_GROUPS.map(({ group, features }) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <h4>{intl.get(`modules.group.${group}`)}</h4>
          {features.map((feature) => (
            <Switch
              key={feature}
              checked={featureCan(feature)}
              disabled={busy}
              labelElement={
                <span>
                  <strong>{intl.get(`modules.${feature}.label`)}</strong>
                  <span style={{ display: 'block', color: '#5c7080', fontSize: 12 }}>
                    {intl.get(`modules.${feature}.desc`)}
                  </span>
                </span>
              }
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                handleToggle(feature, e.currentTarget.checked)
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default compose(withDashboardActions)(ModulesPage);
