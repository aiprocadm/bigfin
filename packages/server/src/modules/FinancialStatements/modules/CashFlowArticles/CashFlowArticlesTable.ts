// © 2026 Bigfin
import { I18nService } from 'nestjs-i18n';

import { ITableColumn, ITableRow } from '../../types/Table.types';
import {
  CashFlowArticleRow,
  CashFlowArticlesReport,
} from './buildCashFlowArticlesReport';

/**
 * Таблица отчёта «Деньги (ДДС по статьям)» — из неё же делаются CSV, XLSX и
 * PDF, поэтому она одна на все форматы: расхождение между тем, что человек
 * видит на экране, и тем, что он выгрузил, — отдельный класс жалоб.
 *
 * ЧИСЛА ОСТАЮТСЯ ЧИСЛАМИ. В XLSX сумма, записанная строкой, не складывается
 * и не сортируется — файл выглядит правильным и бесполезен (приёмка 4
 * FIN-013). Поэтому сюда попадает необработанное число, а не подпись.
 */
export class CashFlowArticlesTable {
  constructor(
    private readonly data: CashFlowArticlesReport,
    private readonly i18n: I18nService,
  ) {}

  private t(key: string, fallback: string): string {
    try {
      const translated = this.i18n.t(key) as unknown as string;
      return translated && translated !== key ? translated : fallback;
    } catch {
      return fallback;
    }
  }

  public tableColumns(): ITableColumn[] {
    return [
      { key: 'name', label: this.t('cash_flow_articles.column.name', 'Статья') },
      {
        key: 'amount',
        label: this.t('cash_flow_articles.column.amount', 'Сумма'),
      },
    ];
  }

  private row(
    name: string,
    amount: number | null,
    rowType: string,
    id?: string,
    children: ITableRow[] = [],
  ): ITableRow {
    return {
      id,
      cells: [
        { key: 'name', value: name },
        { key: 'amount', value: amount === null ? '' : String(amount) },
      ],
      rowTypes: [rowType],
      children,
    };
  }

  /** Дерево статей в строки: отступ несёт `level`, а не пробелы в тексте. */
  private articleRows(rows: CashFlowArticleRow[]): ITableRow[] {
    return rows.map((row) =>
      this.row(
        row.name,
        row.amount,
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
        this.data.openingBalance,
        'OPENING',
        'opening',
      ),
    ];

    this.data.sections.forEach((section) => {
      rows.push(
        this.row(
          sectionLabels[section.section],
          section.total,
          'SECTION',
          `section-${section.section}`,
          [
            this.row(
              this.t('cash_flow_articles.inflow', 'Поступления'),
              section.inflow.total,
              'INFLOW',
              `inflow-${section.section}`,
              this.articleRows(section.inflow.rows),
            ),
            this.row(
              this.t('cash_flow_articles.outflow', 'Выплаты'),
              section.outflow.total,
              'OUTFLOW',
              `outflow-${section.section}`,
              this.articleRows(section.outflow.rows),
            ),
          ],
        ),
      );
    });

    // Строка появляется ТОЛЬКО когда есть что показать: постоянный ноль
    // «не разнесено» приучает не читать эту строку вовсе.
    if (this.data.unclassified !== 0) {
      rows.push(
        this.row(
          this.t('cash_flow_articles.unclassified', 'Не разнесено по статьям'),
          this.data.unclassified,
          'UNCLASSIFIED',
          'unclassified',
        ),
      );
    }

    rows.push(
      this.row(
        this.t('cash_flow_articles.net_cash_flow', 'Чистый денежный поток'),
        this.data.netCashFlow,
        'NET',
        'net',
      ),
      this.row(
        this.t('cash_flow_articles.closing_balance', 'Остаток на конец'),
        this.data.closingBalance,
        'CLOSING',
        'closing',
      ),
      this.row(
        this.t(
          'cash_flow_articles.transfers',
          'Переводы между своими счетами',
        ),
        this.data.transfers.total,
        'TRANSFERS',
        'transfers',
        [
          this.row(
            this.t('cash_flow_articles.transfers_in', 'Зачисления'),
            this.data.transfers.incoming,
            'TRANSFER_IN',
            'transfers-in',
          ),
          this.row(
            this.t('cash_flow_articles.transfers_out', 'Списания'),
            this.data.transfers.outgoing,
            'TRANSFER_OUT',
            'transfers-out',
          ),
        ],
      ),
    );

    return rows;
  }
}
