// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { useCredits, useCreditsSummary } from '@/hooks/query/credits';
import { CreditCreateDialog } from './CreditCreateDialog';
import { CreditDetailCard } from './CreditDetailCard';

const fmt = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('ru-RU').format(new Date(d));
  } catch {
    return d;
  }
};

export default function CreditsPage() {
  const { featureCan } = useFeatureCan();
  const [showCreate, setShowCreate] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const { data: summary } = useCreditsSummary({});
  const { data: credits } = useCredits({}, {});

  if (!featureCan('credits')) return null;

  const creditRows: any[] = credits ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('credits.page.title')}
        </h1>
        <Button onClick={() => setShowCreate(true)}>
          {intl.get('credits.action.new')}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-sm text-muted-foreground">
            {intl.get('credits.summary.outstanding')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.totalOutstanding)}
          </span>
        </div>
        {summary?.nextPaymentDate && (
          <div className="flex flex-col gap-1 rounded-md border p-4">
            <span className="text-sm text-muted-foreground">
              {intl.get('credits.summary.next_payment')}
            </span>
            <span className="text-2xl font-semibold">
              {fmt(summary.nextPaymentAmount)}
            </span>
            <span className="text-xs text-muted-foreground">
              {fmtDate(summary.nextPaymentDate)}
            </span>
          </div>
        )}
      </div>

      {/* Create dialog (inline) */}
      {showCreate && (
        <CreditCreateDialog
          onDone={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Credits table */}
      <div className="overflow-x-auto rounded-md border">
        {creditRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {intl.get('credits.empty')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">
                  {intl.get('credits.col.name')}
                </th>
                <th className="px-4 py-3">
                  {intl.get('credits.col.lender')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('credits.col.principal')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('credits.col.rate')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('credits.col.term')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('credits.col.outstanding')}
                </th>
                <th className="px-4 py-3">
                  {intl.get('credits.col.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditRows.map((credit: any) => (
                <tr
                  key={credit.id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() =>
                    setSelectedId(
                      selectedId === credit.id ? null : credit.id,
                    )
                  }
                >
                  <td className="px-4 py-3 font-medium">{credit.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {credit.lender ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(credit.principalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {credit.annualInterestRate} %
                  </td>
                  <td className="px-4 py-3 text-right">
                    {credit.termMonths}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(credit.outstandingPrincipal)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        credit.status === 'closed'
                          ? 'text-muted-foreground'
                          : 'text-green-700'
                      }
                    >
                      {intl.get(
                        credit.status === 'closed'
                          ? 'credits.status.closed'
                          : 'credits.status.active',
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail card (expandable below table) */}
      {selectedId !== null && (
        <CreditDetailCard
          creditId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
