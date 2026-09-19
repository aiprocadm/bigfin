// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import {
  IProfitLossSheetQuery,
  IProfitLossSheetAccountsNode,
  ProfitLossNodeType,
  ProfitLossSheetRowType,
  IProfitLossSheetNode,
  IProfitLossSheetEquationNode,
  IProfitLossSheetAccountNode,
} from './ProfitLossSheet.types';
import {
  ITableColumn,
  ITableColumnAccessor,
  ITableRow,
} from '../../types/Table.types';
import { ProfitLossSheetBase } from './ProfitLossSheetBase';
import { ProfitLossSheetTablePercentage } from './ProfitLossSheetTablePercentage';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';
import { ProfitLossTablePreviousPeriod } from './ProfitLossTablePreviousPeriod';
import { ProfitLossTablePreviousYear } from './ProfitLossTablePreviousYear';
import { ProfitLossSheetTableDatePeriods } from './ProfitLossSheetTableDatePeriods';
import { I18nService } from 'nestjs-i18n';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialTable } from '../../common/FinancialTable';
import { tableRowMapper } from '../../utils/Table.utils';

export class ProfitLossSheetTable extends R.pipe(
  ProfitLossTablePreviousPeriod,
  ProfitLossTablePreviousYear,
  ProfitLossSheetTablePercentage,
  ProfitLossSheetTableDatePeriods,
  ProfitLossSheetBase,
  FinancialSheetStructure,
  FinancialTable,
)(class {}) {
  readonly query: ProfitLossSheetQuery;
  readonly i18n: I18nService;

  /**
   * Constructor method.
   * @param {} date
   * @param {IProfitLossSheetQuery} query
   */
  constructor(data: any, query: IProfitLossSheetQuery, i18n: I18nService) {
    super();

    this.query = new ProfitLossSheetQuery(query);
    this.reportData = data;
    this.i18n = i18n;
  }

  // ----------------------------------
  // # Rows
  // ----------------------------------
  /**
   * Retrieve the total column accessor.
   * @return {ITableColumnAccessor[]}
   */
  private totalColumnAccessor = (): ITableColumnAccessor[] => {
    return sameNodeShape<ITableColumnAccessor[]>(
      R.pipe(
      R.when(
        this.query.isPreviousPeriodActive,
        R.concat(this.previousPeriodColumnAccessor()),
      ),
      R.when(
        this.query.isPreviousYearActive,
        R.concat(this.previousYearColumnAccessor()),
      ),
      R.concat(this.percentageColumnsAccessor()),
      R.concat([{ key: 'total', accessor: 'total.formattedAmount' }]),
    )([]),
    );
  };

  /**
   * Common columns accessors.
   * @returns {ITableColumnAccessor}
   */
  private commonColumnsAccessors = (): ITableColumnAccessor[] => {
    let result: ITableColumnAccessor[] = [];
    result = this.query.isDatePeriodsColumnsType(result)
          ? R.concat(this.datePeriodsColumnsAccessors())(result)
          : R.concat(this.totalColumnAccessor())(result);
    result = sameNodeShape<ITableColumnAccessor[]>(R.concat([{ key: 'name', accessor: 'name' }])(result));
    return result;
  };

  /**
   *
   * @param   {IProfitLossSheetAccountNode} node
   * @returns {ITableRow}
   */
  private accountNodeToTableRow = (
    node: IProfitLossSheetAccountNode,
  ): ITableRow => {
    const columns = this.commonColumnsAccessors();
    const meta = {
      rowTypes: [ProfitLossSheetRowType.ACCOUNT],
      id: node.id,
    };
    return tableRowMapper(node, columns, meta);
  };

  /**
   *
   * @param   {IProfitLossSheetAccountsNode} node
   * @returns {ITableRow}
   */
  private accountsNodeToTableRow = (
    node: IProfitLossSheetAccountsNode,
  ): ITableRow => {
    const columns = this.commonColumnsAccessors();
    const meta = {
      rowTypes: [ProfitLossSheetRowType.ACCOUNTS],
      id: node.id,
    };
    return tableRowMapper(node, columns, meta);
  };

  /**
   *
   * @param   {IProfitLossSheetEquationNode} node
   * @returns {ITableRow}
   */
  private equationNodeToTableRow = (
    node: IProfitLossSheetEquationNode,
  ): ITableRow => {
    const columns = this.commonColumnsAccessors();

    const meta = {
      rowTypes: [ProfitLossSheetRowType.TOTAL],
      id: node.id,
    };
    return tableRowMapper(node, columns, meta);
  };

  /**
   *
   * @param   {IProfitLossSheetNode} node
   * @returns {ITableRow}
   */
  private nodeToTableRowCompose = (node: IProfitLossSheetNode): ITableRow => {
    return R.cond([
      [
        this.isNodeType(ProfitLossNodeType.ACCOUNTS),
        this.accountsNodeToTableRow,
      ],
      [
        this.isNodeType(ProfitLossNodeType.EQUATION),
        this.equationNodeToTableRow,
      ],
      [this.isNodeType(ProfitLossNodeType.ACCOUNT), this.accountNodeToTableRow],
    ])(node);
  };

  /**
   *
   * @param   {IProfitLossSheetNode[]} nodes
   * @returns {ITableRow}
   */
  private nodesToTableRowsCompose = (
    nodes: IProfitLossSheetNode[],
  ): ITableRow[] => {
    return this.mapNodesDeep(nodes, this.nodeToTableRowCompose);
  };

  /**
   * Retrieves the table rows.
   * @returns {ITableRow[]}
   */
  public tableRows = (): ITableRow[] => {
    let result: ITableRow[] = this.reportData;
    result = sameNodeShape<ITableRow[]>(this.nodesToTableRowsCompose(result));
    result = sameNodeShape<ITableRow[]>(this.addTotalRows(result));
    return result;
  };

  // ----------------------------------
  // # Columns.
  // ----------------------------------
  /**
   * Retrieve total column children columns.
   * @returns {ITableColumn[]}
   */
  private tableColumnChildren = (): ITableColumn[] => {
    let result: ITableColumn[] = [];
    if (this.query.isPreviousPeriodActive()) {
      result = sameNodeShape<ITableColumn[]>(R.concat(this.getPreviousPeriodColumns())(result));
    }
    if (this.query.isPreviousYearActive()) {
      result = R.concat(this.getPreviousYearColumns())(result);
    }
    result = R.concat(this.percentageColumns())(result);
    result = R.unless(
        R.isEmpty,
        R.concat([
          { key: 'total', label: this.i18n.t('profit_loss_sheet.total') },
        ]),
      )(result);
    return result;
  };

  /**
   * Retrieves the total column.
   * @returns {ITableColumn[]}
   */
  private totalColumn = (): ITableColumn[] => {
    return [
      {
        key: 'total',
        label: this.i18n.t('profit_loss_sheet.total'),
        children: this.tableColumnChildren(),
      },
    ];
  };

  /**
   * Retrieves the table columns.
   * @returns {ITableColumn[]}
   */
  public tableColumns = (): ITableColumn[] => {
    let result: ITableColumn[] = [];
    result = this.query.isDatePeriodsColumnsType(result)
          ? R.concat(this.datePeriodsColumns())(result)
          : R.concat(this.totalColumn())(result);
    result = R.concat([
        { key: 'name', label: this.i18n.t('profit_loss_sheet.account_name') },
      ])(result);
    result = sameNodeShape<ITableColumn[]>(this.tableColumnsCellIndexing(result));
    return result;
  };
}
