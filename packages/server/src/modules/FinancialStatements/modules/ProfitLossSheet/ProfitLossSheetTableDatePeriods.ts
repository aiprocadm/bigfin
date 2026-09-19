// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import * as moment from 'moment';
import { ITableColumn, ITableColumnAccessor } from '../../types/Table.types';
import { ProfitLossSheetTablePercentage } from './ProfitLossSheetTablePercentage';
import { ProfitLossTablePreviousPeriod } from './ProfitLossTablePreviousPeriod';
import { FinancialDatePeriods } from '../../common/FinancialDatePeriods';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { IDateRange } from '../../types/Report.types';

export const ProfitLossSheetTableDatePeriods = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends R.pipe(
    ProfitLossSheetTablePercentage,
    ProfitLossTablePreviousPeriod,
    FinancialDatePeriods,
  )(Base) {

    // ЧЛЕНЫ ИЗ СОСЕДНИХ ПРИМЕСЕЙ.
    //
    // Класс собирается цепочкой `R.pipe(...)`, и через безымянный базовый
    // класс проверка типов не видит того, что объявлено в соседних примесях
    // той же цепочки. `declare` ничего не создаёт — он только показывает
    // проверке то, что во время работы и так есть.
    //
    // Каждое имя сверено: оно объявлено в примеси, входящей в ту же цепочку.
    declare getPreviousYearDatePeriodColumnPlugin: any;
    declare previousYearHorizontalColumnAccessors: any;
    /**
     * Retrieves the date periods based on the report query.
     * @returns {IDateRange[]}
     */
    get datePeriods() {
      return this.getDateRanges(
        this.query.query.fromDate,
        this.query.query.toDate,
        this.query.query.displayColumnsBy,
      );
    }

    // --------------------------------
    // # Accessors
    // --------------------------------
    /**
     * Date period columns accessor.
     * @param {IDateRange} dateRange -
     * @param {number} index -
     */
    private datePeriodColumnsAccessor = R.curry(
      (dateRange: IDateRange, index: number) => {
        return R.pipe(
          R.when(
            this.query.isPreviousPeriodActive,
            R.concat(this.previousPeriodHorizontalColumnAccessors(index)),
          ),
          R.when(
            this.query.isPreviousYearActive,
            R.concat(this.previousYearHorizontalColumnAccessors(index)),
          ),
          R.concat(this.percetangeHorizontalColumnsAccessor(index)),
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
    protected datePeriodsColumnsAccessors = (): ITableColumnAccessor[] => {
      let result: ITableColumnAccessor[] = this.datePeriods;
      result = sameNodeShape<ITableColumnAccessor[]>(R.addIndex(R.map)(this.datePeriodColumnsAccessor)(result));
      result = sameNodeShape<ITableColumnAccessor[]>(R.flatten(result));
      return result;
    };

    // --------------------------------
    // # Columns
    // --------------------------------
    /**
     * Retrieve the formatted column label from the given date range.
     * @param {ICashFlowDateRange} dateRange -
     * @return {string}
     */
    private formatColumnLabel = (dateRange) => {
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

    /**
     *
     * @param   {number} index
     * @param   {IDateRange} dateRange
     * @returns {}
     */
    private datePeriodChildrenColumns = (
      index: number,
      dateRange: IDateRange,
    ) => {
      let result = [];
      if (this.query.isPreviousPeriodActive()) {
        result = R.concat(this.getPreviousPeriodDatePeriodsPlugin(dateRange))(result);
      }
      if (this.query.isPreviousYearActive()) {
        result = R.concat(this.getPreviousYearDatePeriodColumnPlugin(dateRange))(result);
      }
      result = R.concat(this.percentageColumns())(result);
      result = R.unless(
          R.isEmpty,
          R.concat([
            { key: `total`, label: this.i18n.t('profit_loss_sheet.total') },
          ]),
        )(result);
      return result;
    };

    /**
     *
     * @param   {IDateRange} dateRange
     * @param   {number} index
     * @returns {ITableColumn}
     */
    private datePeriodColumn = (
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
    protected datePeriodsColumns = (): ITableColumn[] => {
      return this.datePeriods.map(this.datePeriodColumn);
    };
  };
