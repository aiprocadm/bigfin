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
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';
import { ProfitLossTablePreviousPeriod } from './ProfitLossTablePreviousPeriod';
import { ProfitLossTablePreviousYear } from './ProfitLossTablePreviousYear';
import { ProfitLossSheetTableDatePeriods } from './ProfitLossSheetTableDatePeriods';
import { I18nService } from 'nestjs-i18n';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialTable } from '../../common/FinancialTable';
import { tableRowMapper } from '../../utils/Table.utils';

export class ProfitLossSheetTable extends 
  // Вложенные вызовы вместо `R.pipe`: порядок тот же (первая
  // примесь оборачивает базу), но проверка типов ВИДИТ, что
  // получилось. Через `R.pipe` она считает, что у класса нет ни
  // одного метода примесей.
  FinancialTable(
    FinancialSheetStructure(
      ProfitLossSheetBase(
        ProfitLossSheetTableDatePeriods(
          ProfitLossSheetTablePercentage(
            ProfitLossTablePreviousYear(
              ProfitLossTablePreviousPeriod(
                // База — ПУСТОЙ класс: всё нужное дают примеси. Проверке это
                // надо сказать прямо, потому что примеси объявлены как
                // надстройка над общим листом отчёта. Поведение не меняется
                // ни на шаг: раньше сюда передавался тот же пустой класс,
                // просто через `R.pipe`, где проверка ничего не видела.
                class {} as unknown as GConstructor<FinancialSheet>,
              ),
            ),
          ),
        ),
      ),
    ),
  ) {
  readonly query: ProfitLossSheetQuery;
  readonly i18n: I18nService;

  /**
   * Готовые данные отчёта. Поле ЗАПОЛНЯЕТСЯ в конструкторе, но объявлено не
   * было — слепая зона типов прятала это, и любое обращение к нему считалось
   * бы ошибкой, если бы проверку включили.
   */
  readonly reportData: any;

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
    result = this.query.isDatePeriodsColumnsType()
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
    // `R.cond` выбирает превращение по виду узла. Что именно вернётся,
    // проверка вывести не может: у каждой ветки свой вид узла на входе.
    // Ответ объявлен здесь — в подписи самого превращения.
    const compose = R.cond([
      [
        this.isNodeType(ProfitLossNodeType.ACCOUNTS),
        this.accountsNodeToTableRow,
      ],
      [
        this.isNodeType(ProfitLossNodeType.EQUATION),
        this.equationNodeToTableRow,
      ],
      [this.isNodeType(ProfitLossNodeType.ACCOUNT), this.accountNodeToTableRow],
    ] as any) as (node: IProfitLossSheetNode) => ITableRow;

    return compose(node);
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
    // Таблица строится в два прохода, и на первом узлы отчёта ПРЕВРАЩАЮТСЯ
    // в строки таблицы. Значит на входе первого прохода — ещё узлы, а не
    // строки: объявление «строки с самого начала» было неправдой.
    const nodes = this.reportData as IProfitLossSheetNode[];

    let result = sameNodeShape<ITableRow[]>(
      this.nodesToTableRowsCompose(nodes),
    );
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
    result = this.query.isDatePeriodsColumnsType()
          ? R.concat(this.datePeriodsColumns())(result)
          : R.concat(this.totalColumn())(result);
    result = R.concat([
        { key: 'name', label: this.i18n.t('profit_loss_sheet.account_name') },
      ])(result);
    result = sameNodeShape<ITableColumn[]>(this.tableColumnsCellIndexing(result));
    return result;
  };
}
