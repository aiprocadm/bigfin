import * as R from 'ramda';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { FinancialTablePreviousPeriod } from '../../common/FinancialTablePreviousPeriod';
import { FinancialDateRanges } from '../../common/FinancialDateRanges';
import { IDateRange } from '../../types/Report.types';
import {
  ITableColumn,
  ITableColumnAccessor,
} from '../../types/Table.types';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { toMutableList } from '../../utils/Table.utils';
import { IFinancialDatePeriodsUnit } from './BalanceSheet.types';

export const BalanceSheetTablePreviousPeriod = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class BalanceSheetTablePreviousPeriod extends R.pipe(
    FinancialTablePreviousPeriod,
    FinancialDateRanges,
  )(Base) {
    readonly query: BalanceSheetQuery;

    // --------------------
    // # Columns
    // --------------------
    /**
     * Retrieves the previous period columns.
     * @returns {ITableColumn[]}
     */
    public previousPeriodColumns = (dateRange?: IDateRange): ITableColumn[] => {
      return toMutableList(
        R.pipe(
        // Previous period columns.
        R.when(
          this.query.isPreviousPeriodActive,
          R.append(this.getPreviousPeriodTotalColumn(dateRange)),
        ),
        R.when(
          this.query.isPreviousPeriodChangeActive,
          R.append(this.getPreviousPeriodChangeColumn()),
        ),
        R.when(
          this.query.isPreviousPeriodPercentageActive,
          R.append(this.getPreviousPeriodPercentageColumn()),
        ),
      )([]),
      );
    };

    /**
     * Previous period for date periods
     * @param   {IDateRange} dateRange
     * @returns {ITableColumn}
     */
    public previousPeriodHorizontalColumns = (
      dateRange: IDateRange,
    ): ITableColumn[] => {
      const PPDateRange = this.getPPDatePeriodDateRange(
        dateRange.fromDate,
        dateRange.toDate,
        // `this.query` — обёртка `BalanceSheetQuery`; сама единица периода
        // лежит внутри неё. Раньше сюда уходило `undefined`, и диапазон
        // прошлого периода считался без указания единицы.
        this.query.query.displayColumnsBy as IFinancialDatePeriodsUnit,
      );
      return this.previousPeriodColumns({
        fromDate: PPDateRange.fromDate,
        toDate: PPDateRange.toDate,
      });
    };

    // --------------------
    // # Accessors
    // --------------------
    /**
     * Retrieves previous period columns accessors.
     * @returns {ITableColumn[]}
     */
    public previousPeriodColumnAccessor = (): ITableColumnAccessor[] => {
      return toMutableList(
        R.pipe(
        // Previous period columns.
        R.when(
          this.query.isPreviousPeriodActive,
          R.append(this.getPreviousPeriodTotalAccessor()),
        ),
        R.when(
          this.query.isPreviousPeriodChangeActive,
          R.append(this.getPreviousPeriodChangeAccessor()),
        ),
        R.when(
          this.query.isPreviousPeriodPercentageActive,
          R.append(this.getPreviousPeriodPercentageAccessor()),
        ),
      )([]),
      );
    };

    /**
     *
     * @param   {number} index
     * @returns
     */
    public previousPeriodHorizColumnAccessors = (
      index: number,
    ): ITableColumnAccessor[] => {
      return toMutableList(
        R.pipe(
        // Previous period columns.
        R.when(
          this.query.isPreviousPeriodActive,
          R.append(this.getPreviousPeriodTotalHorizAccessor(index)),
        ),
        R.when(
          this.query.isPreviousPeriodChangeActive,
          R.append(this.getPreviousPeriodChangeHorizAccessor(index)),
        ),
        R.when(
          this.query.isPreviousPeriodPercentageActive,
          R.append(this.getPreviousPeriodPercentageHorizAccessor(index)),
        ),
      )([]),
      );
    };
  };
