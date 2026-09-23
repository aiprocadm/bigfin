import React from 'react';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { DashboardPageContent } from '@/components';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
import { INTERFACE_MODE } from '@/constants/interfaceMode';
import ProfitLossSheet from '../ProfitLossSheet/ProfitLossSheet';
import ManagerialPnl from './ManagerialPnl';
import { profitLossViewOf, type ProfitLossView } from './profitLossView';

/**
 * «Прибыль (ОПиУ)»: управленческий или бухгалтерский (FT-010 ТЗ-3).
 *
 * Два отчёта отвечают на разные вопросы. Управленческий — «сколько остаётся
 * после каждого слоя расходов» по ярусам статей; бухгалтерский — ОПиУ по
 * плану счетов, как его видит налоговая. По умолчанию человек видит тот,
 * что соответствует его режиму интерфейса; выбор живёт в адресе (`view`).
 */
export default function ProfitLossPage() {
  const location = useLocation();
  const history = useHistory();
  const mode = useInterfaceMode();
  const view = profitLossViewOf(location.search, mode === INTERFACE_MODE.Accountant);

  const setView = (next: ProfitLossView) => {
    const params = new URLSearchParams(location.search);
    params.set('view', next);
    history.replace({ pathname: location.pathname, search: `?${params.toString()}` });
  };

  const toggle = (
    <div
      role="group"
      aria-label={intl.get('managerial_pnl.view.aria')}
      className="flex items-center gap-1"
    >
      {(['managerial', 'accounting'] as const).map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={view === value ? 'primary' : 'ghost'}
          aria-pressed={view === value}
          onClick={() => setView(value)}
        >
          {intl.get(`managerial_pnl.view.${value}`)}
        </Button>
      ))}
    </div>
  );

  if (view === 'accounting') {
    return (
      <>
        <div className="px-6 pt-4">{toggle}</div>
        <ProfitLossSheet />
      </>
    );
  }

  return (
    <DashboardPageContent>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{intl.get('managerial_pnl.title')}</h1>
          {toggle}
        </div>
        <ManagerialPnl />
      </div>
    </DashboardPageContent>
  );
}
