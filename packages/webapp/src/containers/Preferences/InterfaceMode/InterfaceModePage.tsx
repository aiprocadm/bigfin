import { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useUpdateOrganization } from '@/hooks/query/organization';
import { INTERFACE_MODE } from '@/constants/interfaceMode';
import { compose } from '@/utils';

interface InterfaceModePageProps {
  changePreferencesPageTitle: (title: string) => void;
}

function InterfaceModePage({
  changePreferencesPageTitle,
}: InterfaceModePageProps) {
  // Легаси-хук без типов — уточняем форму организации локально.
  const organization = useCurrentOrganization() as {
    metadata?: { interfaceMode?: string };
  };
  const { mutateAsync: updateOrganization, isLoading } =
    useUpdateOrganization();

  const currentMode =
    organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
  const [mode, setMode] = useState<string>(currentMode);

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

  const MODES = [
    { value: INTERFACE_MODE.Business, label: intl.get('interface_mode.business') },
    {
      value: INTERFACE_MODE.Accountant,
      label: intl.get('interface_mode.accountant'),
    },
  ];

  return (
    <Card>
      <CardContent className="max-w-xl p-6">
        <p className="text-sm text-text-secondary">
          {intl.get('interface_mode.description')}
        </p>

        {/* Сегмент-контрол: два взаимоисключающих режима. */}
        <div
          role="radiogroup"
          aria-label={intl.get('interface_mode.title')}
          className="mt-4 inline-flex gap-0.5 rounded-default bg-surface-elevated p-1"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                'rounded-control px-5 py-2 text-sm font-medium transition-colors',
                mode === m.value
                  ? 'bg-surface font-semibold text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <Button
            onClick={handleSave}
            disabled={isLoading || mode === currentMode}
          >
            {intl.get('interface_mode.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default compose(withDashboardActions)(InterfaceModePage);
