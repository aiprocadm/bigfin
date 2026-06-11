// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounts } from '@/hooks/query';
import {
  useCreateDividendPayout,
  useDeleteDividendPayout,
  useDividendPayouts,
  useDividendsSummary,
} from '@/hooks/query/dividends';

const CASH_ACCOUNT_TYPES = ['cash', 'bank'];

const fmt = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const fmtDate = (d: string) => {
  try {
    return new Intl.DateTimeFormat('ru-RU').format(new Date(d));
  } catch {
    return d;
  }
};

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

export default function DividendsPage() {
  const { featureCan } = useFeatureCan();

  const { data: summary } = useDividendsSummary({});
  const { data: payouts } = useDividendPayouts({});
  const { data: accounts } = useAccounts({}, {});
  const createPayout = useCreateDividendPayout({});
  const deletePayout = useDeleteDividendPayout({});

  const [amount, setAmount] = React.useState<string>('');
  const [date, setDate] = React.useState<string>(today());
  const [accountId, setAccountId] = React.useState<string>('');
  const [note, setNote] = React.useState<string>('');

  if (!featureCan('dividends')) return null;

  const cashAccounts: any[] = (accounts ?? []).filter((a: any) =>
    CASH_ACCOUNT_TYPES.includes(a.account_type ?? a.accountType),
  );

  const amountNum = parseFloat(amount);
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const safe = Math.max(summary?.safe ?? 0, 0);
  const exceedsSafe = hasAmount && amountNum > safe;
  const canSubmit = hasAmount && Boolean(date) && Boolean(accountId);

  const payoutRows: any[] = payouts ?? [];

  const handleSubmit = async () => {
    try {
      await createPayout.mutateAsync({
        date,
        amount: amountNum,
        paymentAccountId: Number(accountId),
        note: note.trim() || undefined,
      });
      toast.success(intl.get('dividends.payout.created'));
      setAmount('');
      setNote('');
      setDate(today());
    } catch {
      toast.error(intl.get('dividends.payout.create_error'));
    }
  };

  const handleDelete = async (payout: any) => {
    if (!window.confirm(intl.get('dividends.payout.delete_confirm'))) return;
    try {
      await deletePayout.mutateAsync(payout.id);
      toast.success(intl.get('dividends.payout.deleted'));
    } catch {
      toast.error(intl.get('dividends.payout.delete_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('dividends.page_title')}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-muted-foreground text-sm">
            {intl.get('dividends.card.available')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.available)}
          </span>
          <span className="text-muted-foreground text-xs">
            {intl.get('dividends.card.available_hint')}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-muted-foreground text-sm">
            {intl.get('dividends.card.safe')}
          </span>
          <span className="text-2xl font-semibold">{fmt(safe)}</span>
          <span className="text-muted-foreground text-xs">
            {intl.get('dividends.card.safe_hint', {
              amount: fmt(summary?.unpaidBills),
            })}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-muted-foreground text-sm">
            {intl.get('dividends.card.paid_out')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.totalPaidOut)}
          </span>
          <span className="text-muted-foreground text-xs">
            {intl.get('dividends.card.paid_out_hint', {
              amount: fmt(summary?.netProfit),
            })}
          </span>
        </div>
      </div>

      {/* New payout form */}
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-sm font-semibold">
          {intl.get('dividends.form.title')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              {intl.get('dividends.form.amount')}
            </label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={intl.get('dividends.form.amount_placeholder')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              {intl.get('dividends.form.date')}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              {intl.get('dividends.form.account')}
            </label>
            <select
              className={selectClassName}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">
                {intl.get('dividends.form.account_placeholder')}
              </option>
              {cashAccounts.map((a: any) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              {intl.get('dividends.form.note')}
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={intl.get('dividends.form.note_placeholder')}
            />
          </div>
        </div>

        {exceedsSafe && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            {intl.get('dividends.form.exceeds_safe_warning', {
              safe: fmt(safe),
            })}
          </div>
        )}

        <div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createPayout.isLoading}
          >
            {intl.get('dividends.form.submit')}
          </Button>
        </div>
      </div>

      {/* Payouts history */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">
          {intl.get('dividends.history.title')}
        </h2>
        <div className="flex flex-col divide-y rounded-md border">
          {payoutRows.length === 0 && (
            <div className="text-muted-foreground p-4 text-sm">
              {intl.get('dividends.history.empty')}
            </div>
          )}
          {payoutRows.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{fmt(p.amount)}</span>
                <span className="text-muted-foreground text-xs">
                  {fmtDate(p.date)}
                  {p.paymentAccountName ? ` · ${p.paymentAccountName}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {p.note && (
                  <span className="text-muted-foreground max-w-[320px] truncate text-xs">
                    {p.note}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(p)}
                  disabled={deletePayout.isLoading}
                >
                  {intl.get('dividends.history.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
