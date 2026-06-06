// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDealProfitability } from '@/hooks/query/deals';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

export function DealProfitability({ deal }: { deal: any }) {
  const { data } = useDealProfitability(deal?.id, {}, {});
  const p: any = data ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{deal?.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span>{intl.get('deals.profitability.revenue')}</span>
          <span>{fmt(p.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span>{intl.get('deals.profitability.costs')}</span>
          <span>{fmt(p.costs)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{intl.get('deals.profitability.profit')}</span>
          <span>
            {fmt(p.profit)} · {pct(p.margin)}
          </span>
        </div>
        {deal?.costEstimate != null && (
          <div className="text-muted-foreground flex justify-between">
            <span>{intl.get('deals.profitability.budget_vs_actual')}</span>
            <span>
              {fmt(deal.costEstimate)} → {fmt(p.costs)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
