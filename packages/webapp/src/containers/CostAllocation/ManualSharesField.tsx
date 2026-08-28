// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeals } from '@/hooks/query/deals';
import { MoneyField } from '@/components/ui/money-field';

interface DealRow {
  id: number;
  name: string;
}

interface ManualSharesFieldProps {
  /** Доли: номер сделки → вес. */
  value: Record<string, number>;
  onChange: (shares: Record<string, number>) => void;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

/** Пара «сделка → вес» с собственным ключом, чтобы строки не прыгали. */
interface ShareRow {
  key: number;
  dealId: string;
  weight: string;
}

const toRows = (shares: Record<string, number>): ShareRow[] =>
  Object.entries(shares ?? {}).map(([dealId, weight], index) => ({
    key: index,
    dealId,
    weight: String(weight),
  }));

const toShares = (rows: ShareRow[]): Record<string, number> => {
  const shares: Record<string, number> = {};

  for (const row of rows) {
    const weight = Number(row.weight);
    // Недописанная строка (сделка не выбрана или вес пустой) в правило не
    // попадает: человек может добавить строку и заполнить её позже.
    if (!row.dealId || row.weight.trim() === '' || Number.isNaN(weight)) continue;
    shares[row.dealId] = weight;
  }
  return shares;
};

/**
 * П3 карты v36. Ручные доли строками.
 *
 * Раньше доли вводились JSON-ом в моноширинное поле: `{"12": 1, "15": 3}`,
 * где 12 и 15 — внутренние номера сделок, которых в интерфейсе нет. Теперь
 * сделка выбирается по названию, вес вводится числом, а рядом видно, во
 * что этот вес превращается — долю в процентах.
 */
export function ManualSharesField({ value, onChange }: ManualSharesFieldProps) {
  const { data: deals } = useDeals();
  const [rows, setRows] = React.useState<ShareRow[]>(() => toRows(value));
  const nextKey = React.useRef(rows.length);

  const dealRows = React.useMemo<DealRow[]>(
    () => ((deals ?? []) as DealRow[]).filter((deal) => deal && deal.id != null),
    [deals],
  );

  const update = (next: ShareRow[]) => {
    setRows(next);
    onChange(toShares(next));
  };

  const total = rows.reduce((sum, row) => {
    const weight = Number(row.weight);
    return sum + (row.dealId && !Number.isNaN(weight) ? weight : 0);
  }, 0);

  /** Во что превращается вес: доля от суммы всех весов. */
  const percent = (row: ShareRow): string => {
    const weight = Number(row.weight);
    if (!row.dealId || Number.isNaN(weight) || total <= 0) return '';
    return `${Math.round((weight / total) * 1000) / 10} %`;
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {intl.get('cost_allocation.manual_shares.empty')}
        </p>
      )}

      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-wrap items-center gap-2">
          <select
            className={`${selectClassName} max-w-xs flex-1`}
            aria-label={intl.get('cost_allocation.manual_shares.deal')}
            value={row.dealId}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, dealId: event.target.value };
              update(next);
            }}
          >
            <option value="">
              {intl.get('cost_allocation.manual_shares.select_deal')}
            </option>
            {dealRows.map((deal) => (
              <option key={deal.id} value={String(deal.id)}>
                {deal.name}
              </option>
            ))}
          </select>

          <MoneyField
            className="w-24"
            aria-label={intl.get('cost_allocation.manual_shares.weight')}
            value={row.weight}
            onChange={(value) => {
              const next = [...rows];
              next[index] = {
                ...row,
                weight: value === undefined ? '' : String(value),
              };
              update(next);
            }}
          />

          <span className="text-muted-foreground w-16 text-sm">
            {percent(row)}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={intl.get('cost_allocation.manual_shares.remove')}
            onClick={() => update(rows.filter((_, i) => i !== index))}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            nextKey.current += 1;
            update([
              ...rows,
              { key: nextKey.current, dealId: '', weight: '' },
            ]);
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('cost_allocation.manual_shares.add')}
        </Button>
      </div>
    </div>
  );
}
