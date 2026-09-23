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
import { CashFlowArticleRow } from './buildCashFlowArticlesReport';
import { reportValuesByRowKey } from './cashFlowArticlesMatrix';
import { ICashFlowArticlesData } from './CashFlowArticles.types';

/**
 * Таблица отчёта «Деньги (ДДС по статьям)» — из неё же делаются CSV, XLSX и
 * PDF, поэтому она одна на все форматы: расхождение между тем, что человек
 * видит на экране, и тем, что он выгрузил, — отдельный класс жалоб.
 *
 * ЧИСЛА ОСТАЮТСЯ ЧИСЛАМИ. В XLSX сумма, записанная строкой, не складывается
 * и не сортируется — файл выглядит правильным и бесполезен (приёмка 4
 * FIN-013). Поэтому сюда попадает необработанное число, а не подпись.
 *
 * МАТРИЦА (FT-001 ТЗ-3): колонка на каждый период и «Итого». Строки строятся
 * по «Итого» — статьи во всех колонках одни и те же, — а значение в каждой
 * колонке находится по устойчивому ключу строки (`article-7`, `net`…).
 */
export class CashFlowArticlesTable {
  /** Значения строк по колонкам: ключ колонки → ключ строки → число. */
  private readonly values: Array<{ key: string; values: Map<string, number> }>;

  constructor(
    private readonly data: ICashFlowArticlesData,
    private readonly i18n: I18nService,
    private readonly showTotalColumn: boolean = true,
  ) {
    const periods = data.periods ?? [];

    this.values = periods.map((period) => ({
      key: period.key,
      values: reportValuesByRowKey(period.report),
    }));
    if (hasTotalColumn(periods.length, showTotalColumn)) {
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
      showTotalColumn: this.showTotalColumn,
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

  /** Дерево статей в строки: отступ несёт `level`, а не пробелы в тексте. */
  private articleRows(rows: CashFlowArticleRow[]): ITableRow[] {
    return rows.map((row) =>
      this.row(
        row.name,
        'ARTICLE',
        `article-${row.id}`,
        this.articleRows(row.children),
      ),
    );
  }

  public tableData(): ITableRow[] {
    const sectionLabels: Record<string, string> = {
      operating: this.t(
        'cash_flow_articles.section.operating',
        'Операционная деятельность',
      ),
      investing: this.t(
        'cash_flow_articles.section.investing',
        'Инвестиционная деятельность',
      ),
      financing: this.t(
        'cash_flow_articles.section.financing',
        'Финансовая деятельность',
      ),
    };

    const rows: ITableRow[] = [
      this.row(
        this.t('cash_flow_articles.opening_balance', 'Остаток на начало'),
        'OPENING',
        'opening',
      ),
    ];

    this.data.sections.forEach((section) => {
      rows.push(
        this.row(
          sectionLabels[section.section],
          'SECTION',
          `section-${section.section}`,
          [
            this.row(
              this.t('cash_flow_articles.inflow', 'Поступления'),
              'INFLOW',
              `inflow-${section.section}`,
              this.articleRows(section.inflow.rows),
            ),
            this.row(
              this.t('cash_flow_articles.outflow', 'Выплаты'),
              'OUTFLOW',
              `outflow-${section.section}`,
              this.articleRows(section.outflow.rows),
            ),
          ],
        ),
      );
    });

    // Строка появляется ТОЛЬКО когда есть что показать: постоянный ноль
    // «не разнесено» приучает не читать эту строку вовсе. В матрице —
    // когда ненулевая хоть одна колонка: в «Итого» суммы разных месяцев
    // могут погасить друг друга, а в самих месяцах деньги мимо статей были.
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

    return rows;
  }
}
