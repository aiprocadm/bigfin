import * as R from 'ramda';
import {
  SalesTaxLiabilitySummaryQuery,
  SalesTaxLiabilitySummaryRate,
  SalesTaxLiabilitySummaryReportData,
  SalesTaxLiabilitySummaryTotal,
} from './SalesTaxLiability.types';
import { AgingReport } from '../AgingSummary/AgingReport';
import { IROW_TYPE } from './_constants';
import { FinancialTable } from '../../common/FinancialTable';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { ITableRow } from '../../types/Table.types';
import { ITableColumn } from '../../types/Table.types';
import { tableRowMapper } from '../../utils/Table.utils';
import { I18nService } from 'nestjs-i18n';

export class SalesTaxLiabilitySummaryTable extends R.pipe(
  FinancialTable,
  FinancialSheetStructure,
)(AgingReport) {
  /** Переводчик подписей столбцов: базовый класс объявляет поле
   * только для чтения, поэтому переобъявляем — как в JournalSheetTable. */
  i18n: any;

  private data: SalesTaxLiabilitySummaryReportData;
  private query: SalesTaxLiabilitySummaryQuery;

  /**
   * Sales tax liability summary table constructor.
   * @param {SalesTaxLiabilitySummaryReportData} data
   * @param {SalesTaxLiabilitySummaryQuery} query
   */
  constructor(
    data: SalesTaxLiabilitySummaryReportData,
    query: SalesTaxLiabilitySummaryQuery,
    i18n: I18nService,
  ) {
    super();
    // Подписи столбцов печатаются на языке организации (Л2 карты v34).
    this.i18n = i18n;

    this.data = data;
    this.query = query;
  }

  /**
   * Retrieve the tax rate row accessors.
   * @returns {ITableColumnAccessor[]}
   */
  private get taxRateRowAccessor() {
    return [
      { key: 'taxName', accessor: 'taxName' },
      { key: 'taxPercentage', accessor: 'taxPercentage.formattedAmount' },
      { key: 'taxableAmount', accessor: 'taxableAmount.formattedAmount' },
      { key: 'collectedTax', accessor: 'collectedTaxAmount.formattedAmount' },
      { key: 'taxAmount', accessor: 'taxAmount.formattedAmount' },
    ];
  }

  /**
   * Retrieve the tax rate total row accessors.
   * @returns {ITableColumnAccessor[]}
   */
  private get taxRateTotalRowAccessors() {
    return [
      { key: 'taxName', value: 'Total' },
      { key: 'taxPercentage', value: '' },
      { key: 'taxableAmount', accessor: 'taxableAmount.formattedAmount' },
      { key: 'collectedTax', accessor: 'collectedTaxAmount.formattedAmount' },
      { key: 'taxAmount', accessor: 'taxAmount.formattedAmount' },
    ];
  }

  /**
   * Maps the tax rate node to table row.
   * @param {SalesTaxLiabilitySummaryRate} node
   * @returns {ITableRow}
   */
  private taxRateTableRowMapper = (
    node: SalesTaxLiabilitySummaryRate,
  ): ITableRow => {
    const columns = this.taxRateRowAccessor;
    const meta = {
      rowTypes: [IROW_TYPE.TaxRate],
      id: node.id,
    };
    return tableRowMapper(node, columns, meta);
  };

  /**
   * Maps the tax rates nodes to table rows.
   * @param {SalesTaxLiabilitySummaryRate[]} nodes
   * @returns {ITableRow[]}
   */
  private taxRatesTableRowsMapper = (
    nodes: SalesTaxLiabilitySummaryRate[],
  ): ITableRow[] => {
    return nodes.map(this.taxRateTableRowMapper);
  };

  /**
   * Maps the tax rate total node to table row.
   * @param {SalesTaxLiabilitySummaryTotal} node
   * @returns {ITableRow}
   */
  private taxRateTotalRowMapper = (node: SalesTaxLiabilitySummaryTotal) => {
    const columns = this.taxRateTotalRowAccessors;
    const meta = {
      rowTypes: [IROW_TYPE.Total],
    };
    return tableRowMapper(node, columns, meta);
  };

  /**
   * Retrieves the tax rate total row.
   * @returns {ITableRow}
   */
  private get taxRateTotalRow(): ITableRow {
    return this.taxRateTotalRowMapper(this.data.total);
  }

  /**
   * Retrieves the tax rates rows.
   * @returns {ITableRow[]}
   */
  private get taxRatesRows(): ITableRow[] {
    return this.taxRatesTableRowsMapper(this.data.taxRates);
  }

  /**
   * Retrieves the table rows.
   * @returns {ITableRow[]}
   */
  public tableRows(): ITableRow[] {
    return R.compose(
      R.unless(R.isEmpty, R.append(this.taxRateTotalRow)),
      R.concat(this.taxRatesRows),
    )([]);
  }

  /**
   * Retrieves the table columns.
   * @returns {ITableColumn[]}
   */
  public tableColumns(): ITableColumn[] {
    return R.compose(this.tableColumnsCellIndexing)([
      {
        label: this.i18n.t('report_columns.tax_name'),
        key: 'taxName',
      },
      {
        label: this.i18n.t('report_columns.tax_percentage'),
        key: 'taxPercentage',
      },
      {
        label: this.i18n.t('report_columns.taxable_amount'),
        key: 'taxableAmount',
      },
      {
        label: this.i18n.t('report_columns.collected_tax'),
        key: 'collectedTax',
      },
      {
        label: this.i18n.t('report_columns.tax_amount'),
        key: 'taxRate',
      },
    ]);
  }
}
