import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
    <Card>
      <CardContent className="max-w-2xl p-6">
        <p className="text-sm text-text-primary">
          {intl.get('preferences.modules.description')}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {intl.get('preferences.modules.note_interface_mode')}
        </p>

        <div className="mt-6 flex flex-col gap-8">
          {MODULE_GROUPS.map(({ group, features }) => (
            <div key={group} className="flex flex-col gap-1">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">
                {intl.get(`modules.group.${group}`)}
              </h3>
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center justify-between gap-4 border-t border-border py-3 first-of-type:border-t-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary">
                      {intl.get(`modules.${feature}.label`)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {intl.get(`modules.${feature}.desc`)}
                    </div>
                  </div>
                  <Switch
                    checked={featureCan(feature)}
                    disabled={busy}
                    onCheckedChange={(next) => handleToggle(feature, next)}
                    aria-label={intl.get(`modules.${feature}.label`)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default compose(withDashboardActions)(ModulesPage);
