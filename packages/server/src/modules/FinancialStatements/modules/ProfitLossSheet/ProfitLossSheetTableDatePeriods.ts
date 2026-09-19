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
    // Цепочка `R.pipe` + `R.when` + `R.concat` развёрнута в обычные условия.
    //
    // Смысл тот же, а читается сразу: ячейки периода собираются в том же
    // порядке — сначала сравнения, потом проценты, в конце сама сумма.
    // Каррирование снято: частичных вызовов у этой функции нет.
    private datePeriodColumnsAccessor = (
      dateRange: IDateRange,
      index: number,
    ): any[] => {
      let accessors: any[] = [];

      if (this.query.isPreviousPeriodActive()) {
        accessors = [
          ...this.previousPeriodHorizontalColumnAccessors(index),
          ...accessors,
        ];
      }
      if (this.query.isPreviousYearActive()) {
        accessors = [
          ...this.previousYearHorizontalColumnAccessors(index),
          ...accessors,
        ];
      }
      accessors = [
        ...this.percetangeHorizontalColumnsAccessor(index),
        ...accessors,
      ];

      return [
        {
          key: `date-range-${index}`,
          accessor: `horizontalTotals[${index}].total.formattedAmount`,
        },
        ...accessors,
      ];
    };

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
      // Вместо `R.cond` — обычный поиск первой подходящей единицы времени.
      // Так видно, что происходит, и типы не теряются.
      const matched = conditions.find(([type]) =>
        this.query.isDisplayColumnsBy(type as string),
      );

      // Единица времени не опознана — берём самую подробную подпись (день).
      // Прежний `R.cond` в этом случае возвращал ВООБЩЕ НИЧЕГО, и колонка
      // оставалась без подписи: человек видел столбец чисел без заголовка и
      // не мог понять, за какой он период.
      const format = (matched?.[1] ?? dayFormat) as (range: any) => string;

      return format(dateRange);
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
      // Обычные списки вместо `R.concat`: порядок тот же, типы целы.
      let result: any[] = [];

      if (this.query.isPreviousPeriodActive()) {
        result = [
          ...this.getPreviousPeriodDatePeriodsPlugin(dateRange),
          ...result,
        ];
      }
      if (this.query.isPreviousYearActive()) {
        result = [
          ...this.getPreviousYearDatePeriodColumnPlugin(dateRange),
          ...result,
        ];
      }
      result = [...this.percentageColumns(), ...result];
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
