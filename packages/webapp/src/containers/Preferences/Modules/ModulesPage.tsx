import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import {
  Banknote,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Coins,
  Contact,
  CreditCard,
  Download,
  Gauge,
  Handshake,
  Landmark,
  type LucideIcon,
  ListTree,
  Package,
  Percent,
  Printer,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Split,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';

import { AppToaster } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useFeatureCan } from '@/hooks/state/feature';
import { useTurnOnFeature, useTurnOffFeature } from '@/hooks/query/features';
import { compose } from '@/utils';

const MODULE_GROUPS: { group: string; features: string[] }[] = [
  { group: 'planning', features: ['payment_calendar', 'budgets', 'financial_model'] },
  {
    group: 'accounting',
    features: [
      'mgmt_articles', 'deals', 'cost_allocation', 'debts', 'payment_requests',
      'dividends', 'credits', 'fixed_assets', 'payroll', 'vat_analysis',
      'financial_ratios', 'data_quality', 'ru_print_forms',
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

const MODULE_ICONS: Record<string, LucideIcon> = {
  payment_calendar: CalendarClock,
  budgets: Wallet,
  financial_model: TrendingUp,
  mgmt_articles: ListTree,
  deals: Handshake,
  cost_allocation: Split,
  debts: Scale,
  payment_requests: ClipboardCheck,
  dividends: Coins,
  credits: Banknote,
  fixed_assets: Boxes,
  payroll: Users,
  vat_analysis: Percent,
  ru_print_forms: Printer,
  financial_ratios: Gauge,
  data_quality: ShieldCheck,
  bank_api_sync: Landmark,
  acquiring: CreditCard,
  zenmoney_import: Download,
  onec_export: Upload,
  moysklad: Package,
  marketplaces: ShoppingCart,
  crm_integration: Contact,
  branches: Building2,
  warehouses: Warehouse,
  notifications: Bell,
};

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
      .then(() =>
        AppToaster.show({
          message: intl.get('preferences.modules.saved'),
          intent: Intent.SUCCESS,
        }),
      )
      .catch(() =>
        AppToaster.show({
          message: intl.get('preferences.modules.save_failed'),
          intent: Intent.DANGER,
        }),
      );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-text-secondary">
          {intl.get('preferences.modules.description')}
        </p>
        <p className="text-sm text-text-muted">
          {intl.get('preferences.modules.note_interface_mode')}
        </p>
      </div>

      {MODULE_GROUPS.map(({ group, features }) => {
        const enabled = features.filter((feature) => featureCan(feature)).length;
        return (
          <Card key={group}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                {intl.get(`modules.group.${group}`)}
              </CardTitle>
              <span className="text-sm font-normal text-text-secondary">
                {enabled} / {features.length}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {features.map((feature, index) => {
                const Icon = MODULE_ICONS[feature];
                return (
                  <div
                    key={feature}
                    className={[
                      'flex items-center gap-4 py-3',
                      index > 0 ? 'border-t border-border' : '',
                    ].join(' ')}
                  >
                    {Icon ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-secondary">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text-primary">
                        {intl.get(`modules.${feature}.label`)}
                      </div>
                      <div className="text-sm text-text-secondary">
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
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default compose(withDashboardActions)(ModulesPage);
