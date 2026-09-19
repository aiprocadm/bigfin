// © 2026 Bigfin
import intl from 'react-intl-universal';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { MarketplaceSummary } from '@/hooks/query/marketplaces';

// Сумму печатает общая утилита продукта: она знает валюту организации и
// показывает рубль так, как принято — «45 000,00 ₽». Раньше здесь стоял
// свой Intl.NumberFormat без знака валюты, и число висело без подписи
// (Р1 карты v26).
const money = (v: number): string => formatOrganizationMoney(v);

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-control border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

/** ⑱ Плитки финансовой сводки — одинаковые для всех маркетплейсов. */
export function SummaryCards({ summary }: { summary: MarketplaceSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Card
        title={intl.get('marketplaces.summary.revenue')}
        value={money(summary.revenue)}
      />
      <Card
        title={intl.get('marketplaces.summary.to_pay')}
        value={money(summary.toPay)}
      />
      <Card
        title={intl.get('marketplaces.summary.deductions')}
        value={money(summary.deductions)}
      />
      <Card
        title={intl.get('marketplaces.summary.logistics')}
        value={money(summary.logistics)}
      />
      <Card
        title={intl.get('marketplaces.summary.penalties')}
        value={money(summary.penalties)}
      />
      <Card
        title={intl.get('marketplaces.summary.storage')}
        value={money(summary.storage)}
      />
    </div>
  );
}
