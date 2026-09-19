import * as R from 'ramda';
import { BalanceSheetComparsionPreviousPeriod } from './BalanceSheetComparsionPreviousPeriod';
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
import { IFinancialDatePeriodsUnit } from './BalanceSheet.types';

export const BalanceSheetNetIncomeDatePeriodsPP = <
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
      BalanceSheetComparsionPreviousPeriod(
        Base,
      ),
    ),
  ) {
    query: BalanceSheetQuery;
    repository: BalanceSheetRepository;

    /**
     * Retrieves the PY total income of the given date period.
     * @param {number} accountId -
     * @param {Date} toDate -
     * @return {number}
     */
    public getPPIncomeDatePeriodTotal = R.curry((toDate: Date) => {
      const PYPeriodsTotal = this.repository.incomePPPeriodsAccountsLedger
        .whereToDate(toDate)
        .getClosingBalance();

      const PYPeriodsOpeningTotal =
        this.repository.incomePPPeriodsOpeningAccountLedger.getClosingBalance();

      return PYPeriodsOpeningTotal + PYPeriodsTotal;
    });

    /**
     * Retrieves the PY total expense of the given date period.
     * @param {number} accountId -
     * @param {Date} toDate -
     * @returns {number}
     */
    public getPPExpenseDatePeriodTotal = R.curry((toDate: Date) => {
      const PYPeriodsTotal = this.repository.expensePPPeriodsAccountsLedger
        .whereToDate(toDate)
        .getClosingBalance();

      const PYPeriodsOpeningTotal =
        this.repository.expensePPPeriodsOpeningAccountLedger.getClosingBalance();

      return PYPeriodsOpeningTotal + PYPeriodsTotal;
    });

    /**
     * Retrieve the given net income total of the given period.
     * @param {number} accountId - Account id.
     * @param {Date} toDate - To date.
     * @returns {number}
     */
    public getPPNetIncomeDatePeriodTotal = R.curry((toDate: Date) => {
      const income = this.getPPIncomeDatePeriodTotal(toDate);
      const expense = this.getPPExpenseDatePeriodTotal(toDate);

      return income - expense;
    });

    /**
     * Assoc preivous period to account horizontal total node.
     * @param {IBalanceSheetAccountNode} node
     * @returns {}
     */
    public assocPreviousPeriodNetIncomeHorizTotal = R.curry(
      (node: IBalanceSheetNetIncomeNode, totalNode) => {
        // `R.curry` из ramda не умеет сказать, что при передаче всех
        // доводов вернётся число: по её типам это «то ли число, то ли ещё
        // одна функция». Здесь доводы переданы полностью.
        const total = this.getPPNetIncomeDatePeriodTotal(
          totalNode.previousPeriodToDate.date,
        ) as unknown as number;
        return R.assoc('previousPeriod', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * Compose previous period to aggregate horizontal nodes.
     * @param   {IBalanceSheetTotalPeriod} node
     * @returns {IBalanceSheetTotalPeriod}
     */
    public previousPeriodNetIncomeHorizNodeComposer = R.curry(
      (
        node: IBalanceSheetNetIncomeNode,
        horiontalTotalNode: IBalanceSheetTotalPeriod,
      ): IBalanceSheetTotalPeriod => {
        return sameNodeShape<IBalanceSheetTotalPeriod>(
          R.compose(
            R.when(
              this.query.isPreviousPeriodPercentageActive,
              this.assocPreviousPeriodTotalPercentageNode,
            ),
            R.when(
              this.query.isPreviousPeriodChangeActive,
              this.assocPreviousPeriodTotalChangeNode,
            ),
            R.when(
              this.query.isPreviousPeriodActive,
              this.assocPreviousPeriodNetIncomeHorizTotal(node),
            ),
            R.when(
              this.query.isPreviousPeriodActive,
              this.assocPreviousPeriodHorizNodeFromToDates(
                // Та же обёртка, что и в `BalanceSheetTablePreviousPeriod`:
                // единица периода лежит внутри неё, а не на ней самой.
                // Единица периода объявлена в запросе просто строкой;
                // здесь нужен её узкий вид. Значения задаёт сам отчёт.
                this.query.query.displayColumnsBy as IFinancialDatePeriodsUnit,
              ),
            ),
          )(horiontalTotalNode),
        );
      },
    );

    /**
     * Associate the PP to net income horizontal nodes.
     * @param   {IBalanceSheetCommonNode} node
     * @returns {IBalanceSheetCommonNode}
     */
    public assocPreviousPeriodNetIncomeHorizNode = (
      node: IBalanceSheetNetIncomeNode,
    ): IBalanceSheetNetIncomeNode => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousPeriodNetIncomeHorizNodeComposer(node),
        node.horizontalTotals,
      ) as IBalanceSheetTotalPeriod[];

      return R.assoc('horizontalTotals', horizontalTotals, node);
    };
  };
