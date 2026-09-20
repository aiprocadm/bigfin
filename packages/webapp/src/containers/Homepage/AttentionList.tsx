import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import moment from 'moment';
import { formatDayMonth } from '@/utils/formatDayMonth';

/** Строка блока «Требует внимания», как её отдаёт сервер. */
export interface AttentionItem {
  kind:
    | 'uncategorized'
    | 'cash_gap'
    | 'overdue_receivable'
    | 'pending_payment_requests';
  count?: number;
  amount?: number;
  formattedAmount?: string;
  date?: string;
}

/**
 * Куда ведёт каждая строка. Карточка без действия бесполезна: человек
 * прочитал и не знает, что делать дальше (блок 3 п. 2.2 ТЗ).
 */
const LINKS: Record<AttentionItem['kind'], string> = {
  uncategorized: '/cashflow-accounts/transactions?status=uncategorized',
  cash_gap: '/payment-calendar',
  overdue_receivable: '/financial-reports/receivable-aging-summary',
  pending_payment_requests: '/payment-requests',
};

/** Текст строки: у каждого вида свои подставляемые значения. */
const textOf = (item: AttentionItem): string => {
  switch (item.kind) {
    case 'uncategorized':
      return intl.get('dashboard.attention.uncategorized', {
        count: item.count ?? 0,
      });
    case 'cash_gap':
      return intl.get('dashboard.attention.cash_gap', {
        // БЫЛО `moment(...).format('D MMMM')` и давало «5 October»:
        // глобальная локаль moment не успевала выставиться. Общий
        // помощник спрашивает язык у интерфейса в момент вызова.
        date: formatDayMonth(item.date),
        amount: item.formattedAmount ?? '',
      });
    case 'overdue_receivable':
      return intl.get('dashboard.attention.overdue_receivable', {
        amount: item.formattedAmount ?? '',
      });
    case 'pending_payment_requests':
      return intl.get('dashboard.attention.pending_payment_requests', {
        count: item.count ?? 0,
      });
    default:
      return '';
  }
};

/**
 * «Требует внимания» — карточки-действия (этап 2 ТЗ, блок 3).
 *
 * Показываются только непустые строки: сервер их и отдаёт только такими.
 * Пустой блок не рисуем вовсе — «всё в порядке» лучше сказать молчанием,
 * чем пустой рамкой.
 */
export default function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="rounded-default border border-border bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-medium text-text-primary">
        <AlertTriangle className="h-4 w-4 text-danger" />
        {intl.get('dashboard.attention.title')}
      </h2>

      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.kind}>
            <Link
              to={LINKS[item.kind]}
              className="block py-2 text-sm text-text-primary hover:text-action"
            >
              {textOf(item)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
