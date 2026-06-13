// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCredit, useDeleteCredit, useMarkCreditInstallmentPaid } from '@/hooks/query/credits';

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

interface Props {
  creditId: number;
  onClose: () => void;
}

export function CreditDetailCard({ creditId, onClose }: Props) {
  const { data: credit, isLoading } = useCredit(creditId, {});
  const deleteMutation = useDeleteCredit({});
  const markPaidMutation = useMarkCreditInstallmentPaid({});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {intl.get('credits.loading')}
        </CardContent>
      </Card>
    );
  }

  if (!credit) return null;

  const installments: any[] = credit.installments ?? [];

  // Find earliest planned installment
  const nextInstallment = installments.find(
    (i: any) => (i.status ?? '').toLowerCase() === 'planned',
  );

  const handleDelete = async () => {
    if (!window.confirm(intl.get('credits.action.delete'))) return;
    try {
      await deleteMutation.mutateAsync(creditId);
      toast.success(intl.get('credits.toast.deleted'));
      onClose();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  const handleMarkPaid = async (installmentId: number) => {
    try {
      await markPaidMutation.mutateAsync([creditId, installmentId]);
      toast.success(intl.get('credits.toast.paid'));
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{credit.name}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isLoading}
            >
              {intl.get('credits.action.delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Credit params */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {credit.lender && (
            <div>
              <div className="text-muted-foreground">
                {intl.get('credits.col.lender')}
              </div>
              <div className="font-medium">{credit.lender}</div>
            </div>
          )}
          <div>
            <div className="text-muted-foreground">
              {intl.get('credits.col.principal')}
            </div>
            <div className="font-medium">{fmt(credit.principalAmount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('credits.col.rate')}
            </div>
            <div className="font-medium">{credit.annualInterestRate} %</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('credits.col.term')}
            </div>
            <div className="font-medium">{credit.termMonths}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('credits.field.start_date')}
            </div>
            <div className="font-medium">{fmtDate(credit.startDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('credits.field.schedule_type')}
            </div>
            <div className="font-medium">
              {intl.get(
                credit.scheduleType === 'annuity'
                  ? 'credits.schedule.annuity'
                  : 'credits.schedule.differentiated',
              )}
            </div>
          </div>
        </div>

        {/* Schedule table */}
        {installments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">
                    {intl.get('credits.schedule.col.seq')}
                  </th>
                  <th className="pb-2 pr-3">
                    {intl.get('credits.schedule.col.due')}
                  </th>
                  <th className="pb-2 pr-3 text-right">
                    {intl.get('credits.schedule.col.payment')}
                  </th>
                  <th className="pb-2 pr-3 text-right">
                    {intl.get('credits.schedule.col.principal')}
                  </th>
                  <th className="pb-2 pr-3 text-right">
                    {intl.get('credits.schedule.col.interest')}
                  </th>
                  <th className="pb-2 pr-3 text-right">
                    {intl.get('credits.schedule.col.balance')}
                  </th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {installments.map((inst: any, idx: number) => {
                  const isPaid =
                    (inst.status ?? '').toLowerCase() === 'paid' ||
                    !!inst.paidAt;
                  const isNext =
                    nextInstallment && inst.id === nextInstallment.id;

                  return (
                    <tr
                      key={inst.id ?? idx}
                      className={isPaid ? 'opacity-50' : ''}
                    >
                      <td className="py-2 pr-3 text-muted-foreground">
                        {inst.seqNo ?? idx + 1}
                      </td>
                      <td className="py-2 pr-3">{fmtDate(inst.dueDate)}</td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(inst.amount ?? inst.paymentAmount)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(inst.principalAmount)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(inst.interestAmount)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(inst.remainingBalance)}
                      </td>
                      <td className="py-2 text-right">
                        {isPaid ? (
                          <span className="text-xs text-muted-foreground">
                            {intl.get('credits.installment.paid')}
                          </span>
                        ) : isNext ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkPaid(inst.id)}
                            disabled={markPaidMutation.isLoading}
                          >
                            {intl.get('credits.action.mark_paid')}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
