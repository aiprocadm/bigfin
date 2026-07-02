import type { Meta, StoryObj } from '@storybook/react';
import { ReportSheet, ReportTable } from './report-table';
import type { ReportTableColumn, ReportTableRow } from './report-table';

const meta: Meta<typeof ReportTable> = {
  title: 'UI/ReportTable',
  component: ReportTable,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

const columns: ReportTableColumn[] = [
  { key: 'name', label: 'Статья' },
  { key: 'total', label: 'Сумма', align: 'right' },
];

/**
 * Демо-данные в формате сервера FinancialStatements:
 * row = { id?, cells: [{key, value}], row_types, children? }.
 * Структура как у ОПиУ: Выручка (группа) → подстатьи, Себестоимость,
 * Валовая прибыль (TOTAL), Расходы, Чистая прибыль (финальная строка).
 */
const rows: ReportTableRow[] = [
  {
    id: 'income',
    row_types: ['ACCOUNTS'],
    cells: [
      { key: 'name', value: 'Выручка' },
      { key: 'total', value: '1 250 000,00 ₽' },
    ],
    children: [
      {
        id: 'income-services',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Услуги' },
          { key: 'total', value: '830 000,00 ₽' },
        ],
      },
      {
        id: 'income-goods',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Продажа товаров' },
          { key: 'total', value: '420 000,00 ₽' },
        ],
        children: [
          {
            id: 'income-goods-retail',
            row_types: ['ACCOUNT'],
            cells: [
              { key: 'name', value: 'Розница' },
              { key: 'total', value: '300 000,00 ₽' },
            ],
          },
          {
            id: 'income-goods-wholesale',
            row_types: ['ACCOUNT'],
            cells: [
              { key: 'name', value: 'Опт' },
              { key: 'total', value: '120 000,00 ₽' },
            ],
          },
        ],
      },
      {
        id: 'income-total',
        row_types: ['TOTAL'],
        cells: [
          { key: 'name', value: 'Итого выручка' },
          { key: 'total', value: '1 250 000,00 ₽' },
        ],
      },
    ],
  },
  {
    id: 'cogs',
    row_types: ['ACCOUNTS'],
    cells: [
      { key: 'name', value: 'Себестоимость' },
      { key: 'total', value: '-540 000,00 ₽' },
    ],
    children: [
      {
        id: 'cogs-materials',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Материалы' },
          { key: 'total', value: '-390 000,00 ₽' },
        ],
      },
      {
        id: 'cogs-delivery',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Доставка' },
          { key: 'total', value: '-150 000,00 ₽' },
        ],
      },
      {
        id: 'cogs-total',
        row_types: ['TOTAL'],
        cells: [
          { key: 'name', value: 'Итого себестоимость' },
          { key: 'total', value: '-540 000,00 ₽' },
        ],
      },
    ],
  },
  {
    id: 'gross-profit',
    row_types: ['TOTAL'],
    cells: [
      { key: 'name', value: 'Валовая прибыль' },
      { key: 'total', value: '710 000,00 ₽' },
    ],
  },
  {
    id: 'expenses',
    row_types: ['ACCOUNTS'],
    cells: [
      { key: 'name', value: 'Операционные расходы' },
      { key: 'total', value: '-310 000,00 ₽' },
    ],
    children: [
      {
        id: 'expenses-rent',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Аренда' },
          { key: 'total', value: '-120 000,00 ₽' },
        ],
      },
      {
        id: 'expenses-salary',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Зарплата' },
          { key: 'total', value: '-190 000,00 ₽' },
        ],
      },
      {
        id: 'expenses-total',
        row_types: ['TOTAL'],
        cells: [
          { key: 'name', value: 'Итого расходы' },
          { key: 'total', value: '-310 000,00 ₽' },
        ],
      },
    ],
  },
  {
    id: 'net-income',
    row_types: ['TOTAL'],
    cells: [
      { key: 'name', value: 'Чистая прибыль' },
      { key: 'total', value: '400 000,00 ₽' },
    ],
  },
];

export const ProfitLossExample: StoryObj<typeof ReportTable> = {
  render: () => (
    <ReportSheet
      companyName="ООО «Ромашка»"
      sheetType="Сколько бизнес заработал после всех расходов"
      dateText="За январь — март 2026"
      basis="accrual"
    >
      <ReportTable columns={columns} rows={rows} />
    </ReportSheet>
  ),
};

const periodColumns: ReportTableColumn[] = [
  { key: 'name', label: 'Статья' },
  { key: 'date-range-1', label: 'Январь', align: 'right', cellIndex: 1 },
  { key: 'date-range-2', label: 'Февраль', align: 'right', cellIndex: 2 },
  { key: 'total', label: 'Итого', align: 'right', cellIndex: 3 },
];

const periodRows: ReportTableRow[] = [
  {
    id: 'income',
    row_types: ['ACCOUNTS'],
    cells: [
      { key: 'name', value: 'Выручка' },
      { key: 'date-range-1', value: '600 000,00 ₽' },
      { key: 'date-range-2', value: '650 000,00 ₽' },
      { key: 'total', value: '1 250 000,00 ₽' },
    ],
    children: [
      {
        id: 'income-services',
        row_types: ['ACCOUNT'],
        cells: [
          { key: 'name', value: 'Услуги' },
          { key: 'date-range-1', value: '400 000,00 ₽' },
          { key: 'date-range-2', value: '430 000,00 ₽' },
          { key: 'total', value: '830 000,00 ₽' },
        ],
      },
      {
        id: 'income-total',
        row_types: ['TOTAL'],
        cells: [
          { key: 'name', value: 'Итого выручка' },
          { key: 'date-range-1', value: '600 000,00 ₽' },
          { key: 'date-range-2', value: '650 000,00 ₽' },
          { key: 'total', value: '1 250 000,00 ₽' },
        ],
      },
    ],
  },
  {
    id: 'net-income',
    row_types: ['TOTAL'],
    cells: [
      { key: 'name', value: 'Чистая прибыль' },
      { key: 'date-range-1', value: '180 000,00 ₽' },
      { key: 'date-range-2', value: '-40 000,00 ₽' },
      { key: 'total', value: '140 000,00 ₽' },
    ],
  },
];

export const DatePeriodsExample: StoryObj<typeof ReportTable> = {
  render: () => (
    <ReportSheet
      companyName="ООО «Ромашка»"
      sheetType="Сколько бизнес заработал после всех расходов"
      dateText="Январь — февраль 2026, по месяцам"
      basis="cash"
    >
      <ReportTable columns={periodColumns} rows={periodRows} />
    </ReportSheet>
  ),
};
