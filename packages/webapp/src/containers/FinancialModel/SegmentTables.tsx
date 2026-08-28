// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import {
  SegmentRow,
  ProductMarginItem,
} from '@/hooks/query/financialModel';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatOrganizationNumber } from '@/utils/organizationNumber';

const fmtMoney = (n: number | null | undefined) =>
  formatOrganizationMoney(n ?? 0);
const fmtPct = (frac: number | null | undefined) =>
  `${formatOrganizationNumber(Math.round((frac ?? 0) * 1000) / 10)}%`;

function TableShell({
  title,
  head,
  children,
  empty,
}: {
  title: string;
  head: React.ReactNode;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {empty ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {intl.get('financial_model.segment.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">{head}</tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = 'px-2 py-1 font-normal';
const td = 'px-2 py-1';
const tdNum = 'px-2 py-1 text-right tabular-nums';

/** Таблица разреза «сделка/менеджер/направление» (выручка/затраты/прибыль/маржа). */
export function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: SegmentRow[];
}) {
  return (
    <TableShell
      title={title}
      empty={rows.length === 0}
      head={
        <>
          <th className={th}>{intl.get('financial_model.col.name')}</th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.revenue')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.costs')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.profit')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.margin')}
          </th>
        </>
      }
    >
      {rows.map((r) => (
        <tr key={r.id} className="border-b last:border-0">
          <td className={td}>{r.name}</td>
          <td className={tdNum}>{fmtMoney(r.revenue)}</td>
          <td className={tdNum}>{fmtMoney(r.costs)}</td>
          <td className={tdNum}>{fmtMoney(r.profit)}</td>
          <td className={tdNum}>{fmtPct(r.margin)}</td>
        </tr>
      ))}
    </TableShell>
  );
}

/** Таблица разреза «по продукту» (выручка/себестоимость/валовая маржа/маржа%). */
export function ProductTable({
  title,
  rows,
}: {
  title: string;
  rows: ProductMarginItem[];
}) {
  return (
    <TableShell
      title={title}
      empty={rows.length === 0}
      head={
        <>
          <th className={th}>{intl.get('financial_model.col.name')}</th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.revenue')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.cost_of_goods')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.gross_margin')}
          </th>
          <th className={`${th} text-right`}>
            {intl.get('financial_model.col.margin')}
          </th>
        </>
      }
    >
      {rows.map((r) => (
        <tr key={r.itemId} className="border-b last:border-0">
          <td className={td}>{r.name}</td>
          <td className={tdNum}>{fmtMoney(r.revenue)}</td>
          <td className={tdNum}>{fmtMoney(r.cost)}</td>
          <td className={tdNum}>{fmtMoney(r.grossMargin)}</td>
          <td className={tdNum}>{fmtPct(r.margin)}</td>
        </tr>
      ))}
    </TableShell>
  );
}
