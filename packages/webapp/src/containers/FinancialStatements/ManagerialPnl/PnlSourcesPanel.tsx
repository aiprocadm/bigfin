import React from 'react';
import intl from 'react-intl-universal';
import { useQueryClient } from 'react-query';

import { Checkbox } from '@/components/ui/checkbox';
import { useSaveSettings } from '@/hooks/query/settings';
import t from '@/hooks/query/types';

/** Источники управленческого ОПиУ (FT-012 ТЗ-3) — в порядке ТЗ. */
export const PNL_SOURCE_KEYS = [
  'operations',
  'deals',
  'payroll',
  'credits',
  'fixed_assets',
  'taxes',
] as const;

/**
 * Эти модули в журнал проводок не пишут: зарплата создаёт плановые платежи,
 * налоги — строки документов. Тумблер у них ничего бы не отключал, поэтому
 * он недоступен и подписан честно, а не притворяется рабочим.
 */
export const PNL_SOURCES_WITHOUT_LEDGER = ['payroll', 'taxes'];

/**
 * «Откуда берутся данные» управленческого ОПиУ (FT-012 ТЗ-3). Настройка
 * организации: выключенный модуль перестаёт питать отчёт, проводки при
 * этом не удаляются.
 */
export function PnlSourcesPanel({ sources }: { sources?: Record<string, boolean> }) {
  const [open, setOpen] = React.useState(false);
  const client = useQueryClient();
  const { mutateAsync: save, isLoading } = useSaveSettings();

  const change = async (key: string, value: boolean) => {
    await save({ options: [{ group: 'pnl_sources', key, value }] });
    client.invalidateQueries(t.FINANCIAL_REPORT);
  };

  const offCount = PNL_SOURCE_KEYS.filter(
    (key) => !PNL_SOURCES_WITHOUT_LEDGER.includes(key) && sources?.[key] === false,
  ).length;

  return (
    <div className="rounded-default border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm"
      >
        <span className="font-medium">{intl.get('managerial_pnl.sources.title')}</span>
        <span className="text-text-secondary">
          {offCount > 0
            ? intl.get('managerial_pnl.sources.off_count', { count: offCount })
            : intl.get('managerial_pnl.sources.all_on')}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
          <p className="text-xs text-text-secondary">
            {intl.get('managerial_pnl.sources.hint')}
          </p>
          {PNL_SOURCE_KEYS.map((key) => {
            const noLedger = PNL_SOURCES_WITHOUT_LEDGER.includes(key);
            return (
              <label key={key} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={noLedger ? true : sources?.[key] !== false}
                  disabled={noLedger || isLoading}
                  onCheckedChange={(checked: boolean) => change(key, Boolean(checked))}
                />
                <span>
                  {intl.get(`managerial_pnl.sources.${key}`)}
                  {noLedger && (
                    <span className="block text-xs text-text-muted">
                      {intl.get('managerial_pnl.sources.no_ledger')}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
