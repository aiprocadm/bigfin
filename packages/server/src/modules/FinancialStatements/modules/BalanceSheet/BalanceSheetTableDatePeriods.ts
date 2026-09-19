// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import * as moment from 'moment';
import { ITableColumn, ITableColumnAccessor } from '../../types/Table.types';
import { FinancialDatePeriods } from '../../common/FinancialDatePeriods';
import { IDateRange } from '../CashFlow/Cashflow.types';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';

export const BalanceSheetTableDatePeriods = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends R.pipe(FinancialDatePeriods)(Base) {

    // ЧЛЕНЫ ИЗ СОСЕДНИХ ПРИМЕСЕЙ.
    //
    // Класс собирается цепочкой `R.pipe(...)`, и через безымянный базовый
    // класс проверка типов не видит того, что объявлено в соседних примесях
    // той же цепочки. `declare` ничего не создаёт — он только показывает
    // проверке то, что во время работы и так есть.
    //
    // Каждое имя сверено: оно объявлено в примеси, входящей в ту же цепочку.
    declare percetangeDatePeriodColumnsAccessor: any;
    declare getPreviousYearHorizontalColumns: any;
    declare percentageColumns: any;
    declare previousPeriodHorizColumnAccessors: any;
    declare previousPeriodHorizontalColumns: any;
    declare previousYearHorizontalColumnAccessors: any;
    declare query: any;
    public i18n: I18nService;

    /**
     * Retrieves the date periods based on the report query.
     * @returns {IDateRange[]}
     */
    get datePeriods() {
      return this.getDateRanges(
        this.query.fromDate,
        this.query.toDate,
        this.query.displayColumnsBy,
      );
    }

    /**
     * Retrieve the formatted column label from the given date range.
     * @param {ICashFlowDateRange} dateRange -
     * @return {string}
     */
    public formatColumnLabel = (dateRange: ICashFlowDateRange) => {
      const monthFormat = (range) => moment(range.toDate).format('YYYY-MM');
      const yearFormat = (range) => moment(range.toDate).format('YYYY');
      const dayFormat = (range) => moment(range.toDate).format('YYYY-MM-DD');

      const conditions = [
        ['month', monthFormat],
        ['year', yearFormat],
        ['day', dayFormat],
        ['quarter', monthFormat],
        ['week', dayFormat],
      ];
      const conditionsPairs = R.map(
        ([type, formatFn]) => [
          R.always(this.query.isDisplayColumnsBy(type)),
          formatFn,
        ],
        conditions,
      );
      let result = dateRange;
      result = R.cond(conditionsPairs)(result);
      return result;
    };

    // -------------------------
    // # Accessors.
    // -------------------------
    /**
     * Date period columns accessor.
     * @param {IDateRange} dateRange -
     * @param {number} index -
     */
    public datePeriodColumnsAccessor = R.curry(
      (dateRange: IDateRange, index: number) => {
        return R.pipe(
          R.concat(this.previousPeriodHorizColumnAccessors(index)),
          R.concat(this.previousYearHorizontalColumnAccessors(index)),
          R.concat(this.percetangeDatePeriodColumnsAccessor(index)),
          R.concat([
            {
              key: `date-range-${index}`,
              accessor: `horizontalTotals[${index}].total.formattedAmount`,
            },
          ]),
        )([]);
      },
    );

    /**
     * Retrieve the date periods columns accessors.
     * @returns {ITableColumnAccessor[]}
     */
    public datePeriodsColumnsAccessors = (): ITableColumnAccessor[] => {
      let result: ITableColumnAccessor[] = this.datePeriods;
      result = sameNodeShape<ITableColumnAccessor[]>(R.addIndex(R.map)(this.datePeriodColumnsAccessor)(result));
      result = sameNodeShape<ITableColumnAccessor[]>(R.flatten(result));
      return result;
    };

    // -------------------------
    // # Columns.
    // -------------------------
    /**
     *
     * @param {number} index
     * @param {} dateRange
     * @returns {}
     */
    public datePeriodChildrenColumns = (
      index: number,
      dateRange: IDateRange,
    ) => {
      let result = [];
      result = R.concat(this.previousPeriodHorizontalColumns(dateRange))(result);
      result = R.concat(this.getPreviousYearHorizontalColumns(dateRange))(result);
      result = R.concat(this.percentageColumns())(result);
      result = R.unless(
          R.isEmpty,
          R.concat([
            { key: `total`, label: this.i18n.t('balance_sheet.total') },
          ]),
        )(result);
      return result;
    };

    /**
     *
     * @param dateRange
     * @param index
     * @returns
     */
    public datePeriodColumn = (
      dateRange: IDateRange,
      index: number,
    ): ITableColumn => {
      return {
        key: `date-range-${index}`,
        label: this.formatColumnLabel(dateRange),
        children: this.datePeriodChildrenColumns(index, dateRange),
      };
    };

    /**
     * Date periods columns.
     * @returns {ITableColumn[]}
     */
    public datePeriodsColumns = (): ITableColumn[] => {
      return this.datePeriods.map(this.datePeriodColumn);
    };
  };
