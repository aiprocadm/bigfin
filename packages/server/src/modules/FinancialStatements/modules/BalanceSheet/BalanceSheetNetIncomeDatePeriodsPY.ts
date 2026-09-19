import * as R from 'ramda';
import { BalanceSheetComparsionPreviousYear } from './BalanceSheetComparsionPreviousYear';
import { FinancialPreviousPeriod } from '../../common/FinancialPreviousPeriod';
import { FinancialHorizTotals } from '../../common/FinancialHorizTotals';
import {
  IBalanceSheetNetIncomeNode,
  IBalanceSheetTotalPeriod,
} from './BalanceSheet.types';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { BalanceSheetRepository } from './BalanceSheetRepository';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { sameNodeShape } from '../../utils/Table.utils';

export const BalanceSheetNetIncomeDatePeriodsPY = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends
  // Вложенные вызовы вместо `R.pipe`: порядок тот же (первая примесь
  // оборачивает базу), но проверка типов ВИДИТ, что получилось.
  // Через `R.pipe` она считает, что у класса нет ни одного метода
  // примесей.
  FinancialHorizTotals(
    FinancialPreviousPeriod(
      BalanceSheetComparsionPreviousYear(
        Base,
      ),
    ),
  ) {
    query: BalanceSheetQuery;
    repository: BalanceSheetRepository;

    /**
     * Retrieves the PY total income of the given date period.
     * @param {Date} toDate -
     * @return {number}
     */
    public getPYIncomeDatePeriodTotal = R.curry((toDate: Date) => {
      const PYPeriodsTotal = this.repository.incomePYPeriodsAccountsLedger
        .whereToDate(toDate)
        .getClosingBalance();

      const PYPeriodsOpeningTotal =
        this.repository.incomePYPeriodsOpeningAccountLedger.getClosingBalance();

      return PYPeriodsOpeningTotal + PYPeriodsTotal;
    });

    /**
     * Retrieves the PY total expense of the given date period.
     * @param {Date} toDate -
     * @returns {number}
     */
    public getPYExpenseDatePeriodTotal = R.curry((toDate: Date) => {
      const PYPeriodsTotal = this.repository.expensePYPeriodsAccountsLedger
        .whereToDate(toDate)
        .getClosingBalance();

      const PYPeriodsOpeningTotal =
        this.repository.expensePYPeriodsOpeningAccountLedger.getClosingBalance();

      return PYPeriodsOpeningTotal + PYPeriodsTotal;
    });

    /**
     * Retrieve the given net income total of the given period.
     * @param {Date} toDate - To date.
     * @returns {number}
     */
    public getPYNetIncomeDatePeriodTotal = R.curry((toDate: Date) => {
      const income = this.getPYIncomeDatePeriodTotal(toDate);
      const expense = this.getPYExpenseDatePeriodTotal(toDate);

      return income - expense;
    });

    /**
     * Assoc preivous year to account horizontal total node.
     * @param {IBalanceSheetAccountNode} node
     * @returns {}
     */
    public assocPreviousYearNetIncomeHorizTotal = R.curry(
      (node: IBalanceSheetNetIncomeNode, totalNode) => {
        // `R.curry` из ramda не умеет сказать, что при передаче всех
        // доводов вернётся число. Здесь доводы переданы полностью.
        const total = this.getPYNetIncomeDatePeriodTotal(
          totalNode.previousYearToDate.date,
        ) as unknown as number;
        return R.assoc('previousYear', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * Compose PY to net income horizontal nodes.
     * @param {IBalanceSheetTotalPeriod} node
     * @returns {IBalanceSheetTotalPeriod}
     */
    public previousYearNetIncomeHorizNodeComposer = R.curry(
      (
        node: IBalanceSheetNetIncomeNode,
        horiontalTotalNode: IBalanceSheetTotalPeriod,
      ): IBalanceSheetTotalPeriod => {
        return sameNodeShape<IBalanceSheetTotalPeriod>(
          R.compose(
            R.when(
              this.query.isPreviousYearPercentageActive,
              this.assocPreviousYearTotalPercentageNode,
            ),
            R.when(
              this.query.isPreviousYearChangeActive,
              this.assocPreviousYearTotalChangeNode,
            ),
            R.when(
              this.query.isPreviousYearActive,
              this.assocPreviousYearNetIncomeHorizTotal(node),
            ),
            R.when(
              this.query.isPreviousYearActive,
              // Узел итога и узел с датами периода описаны разными перечнями,
              // хотя в этой цепочке это один и тот же узел: сюда он приходит
              // уже с проставленными датами прошлого года.
              this.assocPreviousYearHorizNodeFromToDates as any,
            ),
          )(horiontalTotalNode as any),
        );
      },
    );

    /**
     * Associate the PY to net income horizontal nodes.
     * @param   {IBalanceSheetCommonNode} node
     * @returns {IBalanceSheetCommonNode}
     */
    public assocPreviousYearNetIncomeHorizNode = (
      node: IBalanceSheetNetIncomeNode,
    ): IBalanceSheetNetIncomeNode => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousYearNetIncomeHorizNodeComposer(node),
        node.horizontalTotals,
      ) as IBalanceSheetTotalPeriod[];

      return R.assoc('horizontalTotals', horizontalTotals, node);
    };
  };
