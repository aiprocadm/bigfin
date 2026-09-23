// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBudgetAutofill, useBudgetCashPlan, useEditBudget } from '@/hooks/query/budgets';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { cn } from '@/lib/cn';
import type { Budget } from './mapBudget';

const money = (value: number | null | undefined) => (value == null ? '—' : formatOrganizationMoney(value));
const errorText = (error: any, key: string) => error?.response?.data?.errors?.[0]?.message ?? intl.get(key);

/**
 * «Заполнить по прошлому году» (FT-054 ТЗ-3): факт × коэффициент, до
 * рубля. Сначала предпросмотр — чистый лист перестаёт пугать, но и чужие
 * числа молча не ложатся в бюджет.
 */
export function BudgetAutofillButton({ budget, scenario }: { budget: Budget; scenario: string }) {
  const [open, setOpen] = React.useState(false);
  const [sourceYear, setSourceYear] = React.useState(String((budget.fiscalYear ?? moment().year()) - 1));
  const [coefficient, setCoefficient] = React.useState('0');
  const [preview, setPreview] = React.useState<any>(null);
  const { preview: previewMutation, apply } = useBudgetAutofill();
  const body = () => ({ sourceYear: Number(sourceYear), coefficientPercent: Number(coefficient.replace(',', '.')) || 0, scenario });

  const lines: any[] = preview?.lines ?? [];
  const total = lines.reduce((sum, line) => sum + Number(line.planned_amount ?? line.plannedAmount ?? 0), 0);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {intl.get('budgets.autofill.open')}
      </Button>
      {open && (
        <Dialog open onOpenChange={(value) => !value && setOpen(false)}>
          <DialogContent aria-describedby={undefined} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{intl.get('budgets.autofill.title')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                {intl.get('budgets.autofill.source_year')}
                <Input inputMode="numeric" value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                {intl.get('budgets.autofill.coefficient')}
                <Input inputMode="decimal" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} />
              </label>
              {preview && (
                <p>
                  {intl.get('budgets.autofill.preview', { count: lines.length, amount: money(total) })}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                disabled={previewMutation.isLoading}
                onClick={() =>
                  previewMutation
                    .mutateAsync({ id: budget.id, body: body() })
                    .then(setPreview)
                    .catch((error) => toast.error(errorText(error, 'budgets.autofill.failed')))
                }
              >
                {intl.get('budgets.autofill.show')}
              </Button>
              <Button
                disabled={!preview || lines.length === 0 || apply.isLoading}
                onClick={() =>
                  apply
                    .mutateAsync({ id: budget.id, body: body() })
                    .then(() => {
                      toast.success(intl.get('budgets.autofill.done'));
                      setOpen(false);
                      setPreview(null);
                    })
                    .catch((error) => toast.error(errorText(error, 'budgets.autofill.failed')))
                }
              >
                {intl.get('budgets.autofill.apply')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** «Освоено X из Y» (FT-055 ТЗ-3): цвет — по порогу 80 % и 100 %. */
export function BudgetUsageWidget({ usage }: { usage: any }) {
  if (!usage || usage.level === 'none') return null;
  const percent = Number(usage.percent ?? 0);
  const tone = usage.level === 'over' ? 'bg-danger' : usage.level === 'warning' ? 'bg-warning' : 'bg-success';
  return (
    <div className="flex flex-col gap-1 rounded-control border border-border p-3 text-sm">
      <span>
        {intl.get('budgets.usage.label', { fact: money(usage.fact), plan: money(usage.plan) })}{' '}
        <span className="tabular-nums text-text-secondary">({String(percent).replace('.', ',')} %)</span>
      </span>
      <div className="h-2 w-full rounded-full bg-surface-elevated" aria-hidden>
        <div className={cn('h-2 rounded-full', tone)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {usage.level !== 'ok' && (
        <span className={usage.level === 'over' ? 'text-danger' : 'text-warning'}>
          {intl.get(`budgets.usage.${usage.level}`)}
        </span>
      )}
    </div>
  );
}

/**
 * Денежный план по месяцам (FT-056 ТЗ-3): «денег на начало (план)» — от
 * факта прошлого месяца или от плана («если план сбудется»). Переключатель
 * меняет только плановые строки; факт остаётся фактом.
 */
export function BudgetCashPlan({ budget, scenario }: { budget: Budget; scenario: string }) {
  const [anchor, setAnchor] = React.useState<'fact' | 'plan'>((budget.planAnchor as any) === 'plan' ? 'plan' : 'fact');
  const { data } = useBudgetCashPlan(budget.id, { scenario, anchor });
  const { mutateAsync: editBudget } = useEditBudget();
  const months: any[] = data?.months ?? [];

  const choose = async (value: 'fact' | 'plan') => {
    setAnchor(value);
    try {
      // Выбор запоминается бюджетом: в следующий раз план посчитается так же.
      await editBudget([
        budget.id,
        {
          name: budget.name,
          type: budget.type,
          fiscalYear: budget.fiscalYear,
          activeScenario: budget.activeScenario,
          planAnchor: value,
        },
      ] as any);
    } catch (error) {
      toast.error(errorText(error, 'budgets.cash_plan.save_failed'));
    }
  };

  const rows: Array<{ key: string; pick: (m: any) => number | null }> = [
    { key: 'opening_plan', pick: (m) => m.opening_plan ?? m.openingPlan },
    { key: 'plan_net', pick: (m) => m.plan_net ?? m.planNet },
    { key: 'closing_plan', pick: (m) => m.closing_plan ?? m.closingPlan },
    { key: 'fact_closing', pick: (m) => m.fact_closing ?? m.factClosing },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-secondary">{intl.get('budgets.cash_plan.anchor')}</span>
        {(['fact', 'plan'] as const).map((value) => (
          <Button key={value} size="sm" variant={anchor === value ? 'primary' : 'ghost'} onClick={() => choose(value)}>
            {intl.get(`budgets.cash_plan.anchor_${value}`)}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-control border border-border">
        <table className="min-w-full text-sm tabular-nums">
          <thead className="bg-surface-elevated">
            <tr>
              <th className="sticky left-0 bg-surface-elevated px-3 py-2 text-left" />
              {months.map((month) => (
                <th key={month.period} className="px-3 py-2 text-right font-normal">
                  {moment(month.period).format('MMM')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="sticky left-0 bg-surface px-3 py-1.5">{intl.get(`budgets.cash_plan.${row.key}`)}</td>
                {months.map((month) => {
                  const value = row.pick(month);
                  return (
                    <td
                      key={month.period}
                      className={cn(
                        'px-3 py-1.5 text-right money',
                        row.key === 'closing_plan' && Number(value) < 0 && 'bg-red-50 text-red-700',
                      )}
                    >
                      {money(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
