// © 2026 Bigfin
import { I18nService } from 'nestjs-i18n';

import { ITableRow } from '../../types/Table.types';
import {
  hasTotalColumn,
  IManagerialReportColumn,
  managerialReportColumns,
  NAME_COLUMN_KEY,
  TOTAL_COLUMN_KEY,
} from '../../common/ManagerialReportColumns';
import { reportValuesByRowKey } from './cashFlowArticlesMatrix';
import { ICashFlowArticlesData } from './CashFlowArticles.types';
import { CashGroupNode } from './groupings/cashGroupNodes';

export interface CashFlowArticlesTableOptions {
  /** Колонка «Итого»; по умолчанию есть. */
  showTotalColumn?: boolean;
  /**
   * Показывать строки, где во всех колонках ноль (FT-005 ТЗ-3). По
   * умолчанию НЕТ: двадцать шесть нулевых статей заслоняют пять настоящих.
   */
  showEmpty?: boolean;
  /**
   * Показывать переводы между своими счетами (FT-006 ТЗ-3). По умолчанию
   * НЕТ: денег у бизнеса они не меняют и на остатки не влияют.
   */
  showTransfers?: boolean;
}

/** Группы и разделы не прячутся никогда, даже пустые: это каркас отчёта. */
const NEVER_HIDDEN_ROW_TYPES = ['SECTION', 'INFLOW', 'OUTFLOW'];

/**
 * Таблица отчёта «Деньги (ДДС по статьям)» — из неё же делаются CSV, XLSX и
 * PDF, поэтому она одна на все форматы: расхождение между тем, что человек
 * видит на экране, и тем, что он выгрузил, — отдельный класс жалоб.
 *
 * ЧИСЛА ОСТАЮТСЯ ЧИСЛАМИ. В XLSX сумма, записанная строкой, не складывается
 * и не сортируется — файл выглядит правильным и бесполезен (приёмка 4
 * FIN-013). Поэтому сюда попадает необработанное число, а не подпись.
 *
 * МАТРИЦА (FT-001, FT-002 ТЗ-3): колонка на каждый период и «Итого»; строки
 * — в выбранной группировке. Строки строятся по «Итого» — в нём есть все
 * строки всех колонок, — а значение в каждой колонке находится по
 * устойчивому ключу строки (`article-7`, `inflow-contact-12`, `net`…).
 */
export class CashFlowArticlesTable {
  /** Значения строк по колонкам: ключ колонки → ключ строки → число. */
  private readonly values: Array<{ key: string; values: Map<string, number> }>;

  constructor(
    private readonly data: ICashFlowArticlesData,
    private readonly i18n: I18nService,
    private readonly options: CashFlowArticlesTableOptions = {},
  ) {
    const periods = data.periods ?? [];

    this.values = periods.map((period) => ({
      key: period.key,
      values: reportValuesByRowKey(period.report),
    }));
    if (hasTotalColumn(periods.length, options.showTotalColumn)) {
      this.values.push({
        key: TOTAL_COLUMN_KEY,
        values: reportValuesByRowKey(data),
      });
    }
  }

  private t(key: string, fallback: string): string {
    try {
      const translated = this.i18n.t(key) as unknown as string;
      return translated && translated !== key ? translated : fallback;
    } catch {
      return fallback;
    }
  }

  public tableColumns(): IManagerialReportColumn[] {
    return managerialReportColumns({
      nameLabel: this.t('cash_flow_articles.column.name', 'Статья'),
      totalLabel: this.t('cash_flow_articles.column.total', 'Итого'),
      periods: this.data.periods ?? [],
      showTotalColumn: this.options.showTotalColumn,
    });
  }

  /**
   * Строка матрицы: название и по ячейке на колонку в порядке колонок.
   * Значение каждой ячейки берётся по ключу строки из своей колонки.
   */
  private row(
    name: string,
    rowType: string,
    id: string,
    children: ITableRow[] = [],
  ): ITableRow {
    return {
      id,
      cells: [
        { key: NAME_COLUMN_KEY, value: name },
        ...this.values.map((column) => ({
          key: column.key,
          value: String(column.values.get(id) ?? 0),
        })),
      ],
      rowTypes: [rowType],
      children,
    };
  }

  /** Есть ли у строки ненулевое значение хоть в одной колонке. */
  private anyNonZero(id: string): boolean {
    return this.values.some((column) => (column.values.get(id) ?? 0) !== 0);
  }

  /**
   * Пустая строка: ноль во всех колонках у неё И у всех потомков.
   *
   * Потомков проверяем отдельно: у родителя плюс и минус детей могут
   * погасить друг друга, и, спрятав его, мы спрятали бы настоящие деньги.
   */
  private isEmpty(node: CashGroupNode): boolean {
    return (
      !this.anyNonZero(node.id) &&
      node.children.every((child) => this.isEmpty(child))
    );
  }

  /**
   * Строки группировки. Пустые прячутся, если не просили иначе; строки
   * «Без контрагента» / «Без направления» не прячутся никогда — по ним
   * видно, сколько денег осталось без пометки.
   */
  private nodeRows(nodes: CashGroupNode[]): ITableRow[] {
    return nodes
      .filter(
        (node) =>
          this.options.showEmpty ||
          node.isNone ||
          NEVER_HIDDEN_ROW_TYPES.includes(node.rowType) ||
          !this.isEmpty(node),
      )
      .map((node) =>
        this.row(
          node.labelKey ? this.t(node.labelKey, node.name) : node.name,
          node.rowType,
          node.id,
          this.nodeRows(node.children),
        ),
      );
  }

  public tableData(): ITableRow[] {
    const rows: ITableRow[] = [
      this.row(
        this.t('cash_flow_articles.opening_balance', 'Остаток на начало'),
        'OPENING',
        'opening',
      ),
      ...this.nodeRows(this.data.rows ?? []),
    ];

    // Строка появляется ТОЛЬКО когда есть что показать: постоянный ноль
    // «не разнесено» приучает не читать эту строку вовсе. В матрице —
    // когда ненулевая хоть одна колонка: в «Итого» суммы разных месяцев
    // могут погасить друг друга, а в самих месяцах деньги мимо строк были.
    if (this.anyNonZero('unclassified')) {
      rows.push(
        this.row(
          this.t('cash_flow_articles.unclassified', 'Не разнесено по статьям'),
          'UNCLASSIFIED',
          'unclassified',
        ),
      );
    }

    rows.push(
      this.row(
        this.t('cash_flow_articles.net_cash_flow', 'Чистый денежный поток'),
        'NET',
        'net',
      ),
      this.row(
        this.t('cash_flow_articles.closing_balance', 'Остаток на конец'),
        'CLOSING',
        'closing',
      ),
    );

    if (this.options.showTransfers) {
      rows.push(
        this.row(
          this.t(
            'cash_flow_articles.transfers',
            'Переводы между своими счетами',
          ),
          'TRANSFERS',
          'transfers',
          [
            this.row(
              this.t('cash_flow_articles.transfers_in', 'Зачисления'),
              'TRANSFER_IN',
              'transfers-in',
            ),
            this.row(
              this.t('cash_flow_articles.transfers_out', 'Списания'),
              'TRANSFER_OUT',
              'transfers-out',
            ),
          ],
        ),
      );
    }

    return rows;
  }
}
