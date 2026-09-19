import * as R from 'ramda';
import { sumBy } from 'lodash';
import {
  IBalanceSheetAccountNode,
  IBalanceSheetDataNode,
  IBalanceSheetAggregateNode,
  IBalanceSheetTotalPeriod,
  IBalanceSheetCommonNode,
} from './BalanceSheet.types';
import { FinancialPreviousPeriod } from '../../common/FinancialPreviousPeriod';
import { FinancialHorizTotals } from '../../common/FinancialHorizTotals';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { BalanceSheetRepository } from './BalanceSheetRepository';

export const BalanceSheetComparsionPreviousPeriod = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class BalanceSheetComparsionPreviousPeriod extends R.pipe(
    FinancialHorizTotals,
    FinancialPreviousPeriod,
  )(Base) {
    query: BalanceSheetQuery;
    repository: BalanceSheetRepository;

    // ------------------------------
    // # Account
    // ------------------------------
    /**
     * Associates the previous period to account node.
     *
     * Довод сужен до узла-СЧЁТА: только у него номер счёта — число, а у
     * узла-свёртки это строка вроде «current-assets». Применяется он и так
     * только к счетам.
     * @param {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    public assocPreviousPeriodAccountNode = (
      node: IBalanceSheetAccountNode,
    ): IBalanceSheetAccountNode => {
      const total = this.repository.PPTotalAccountsLedger.whereAccountId(
        node.id,
      ).getClosingBalance();

      return R.assoc('previousPeriod', this.getAmountMeta(total), node);
    };

    /**
     * Previous period account node composer.
     * @param {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    public previousPeriodAccountNodeComposer = (
      node: IBalanceSheetAccountNode,
    ): IBalanceSheetAccountNode => {
      return R.compose(
        R.when(
          this.isNodeHasHorizTotals,
          this.assocPreivousPeriodAccountHorizNodeComposer,
        ),
        R.when(
          this.query.isPreviousPeriodPercentageActive,
          this.assocPreviousPeriodPercentageNode,
        ),
        R.when(
          this.query.isPreviousPeriodChangeActive,
          this.assocPreviousPeriodChangeNode,
        ),
        R.when(
          this.query.isPreviousPeriodActive,
          this.assocPreviousPeriodAccountNode,
        ),
      )(node);
    };

    // ------------------------------
    // # Aggregate
    // ------------------------------
    /**
     * Assoc previous period total to aggregate node.
     * @param {IBalanceSheetAggregateNode} node
     * @returns {IBalanceSheetAggregateNode}
     */
    public assocPreviousPeriodAggregateNode = (
      node: IBalanceSheetAggregateNode,
    ): IBalanceSheetAggregateNode => {
      const total = sumBy(node.children, 'previousYear.amount');

      return R.assoc('previousPeriod', this.getTotalAmountMeta(total), node);
    };

    /**
     * Previous period aggregate node composer.
     *
     * В подписи стоял узел-счёт, хотя собиратель — для узлов-СВЁРТОК, и
     * зовут его из `aggregateNodeTotalMapper`.
     * @param {IBalanceSheetAggregateNode} node
     * @returns {IBalanceSheetAggregateNode}
     */
    public previousPeriodAggregateNodeComposer = (
      node: IBalanceSheetAggregateNode,
    ): IBalanceSheetAggregateNode => {
      return R.compose(
        R.when(
          this.isNodeHasHorizTotals,
          this.assocPreviousPeriodAggregateHorizNode,
        ),
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
          this.assocPreviousPeriodAggregateNode,
        ),
      )(node);
    };

    // ------------------------------
    // # Horizontal Nodes - Account.
    // ------------------------------
    /**
     * Retrieve the given account total in the given period.
     * @param {number} accountId - Account id.
     * @param {Date} fromDate - From date.
     * @param {Date} toDate - To date.
     * @returns {number}
     */
    private getAccountPPDatePeriodTotal = (
      accountId: number,
      fromDate: Date,
      toDate: Date,
    ): number => {
      const PPPeriodsTotal =
        this.repository.PPPeriodsAccountsLedger.whereAccountId(accountId)
          .whereToDate(toDate)
          .getClosingBalance();

      const PPPeriodsOpeningTotal =
        this.repository.PPPeriodsOpeningAccountLedger.whereAccountId(
          accountId,
        ).getClosingBalance();

      return PPPeriodsOpeningTotal + PPPeriodsTotal;
    };

    /**
     * Assoc preivous period to account horizontal total node.
     * @param   {IBalanceSheetAccountNode} node
     * @returns {}
     */
    private assocPreviousPeriodAccountHorizTotal = R.curry(
      (node: IBalanceSheetAccountNode, totalNode) => {
        const total = this.getAccountPPDatePeriodTotal(
          node.id,
          totalNode.previousPeriodFromDate.date,
          totalNode.previousPeriodToDate.date,
        );
        return R.assoc('previousPeriod', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * Previous year account horizontal node composer.
     * @param {IBalanceSheetAccountNode} node -
     * @param {IBalanceSheetTotalPeriod}
     * @returns {IBalanceSheetTotalPeriod}
     */
    private previousPeriodAccountHorizNodeCompose = R.curry(
      (
        node: IBalanceSheetAccountNode,
        horizontalTotalNode: IBalanceSheetTotalPeriod,
      ): IBalanceSheetTotalPeriod => {
        return R.compose(
          R.when(
            this.query.isPreviousPeriodPercentageActive,
            this.assocPreviousPeriodPercentageNode,
          ),
          R.when(
            this.query.isPreviousPeriodChangeActive,
            this.assocPreviousPeriodChangeNode,
          ),
          R.when(
            this.query.isPreviousPeriodActive,
            this.assocPreviousPeriodAccountHorizTotal(node),
          ),
          R.when(
            this.query.isPreviousPeriodActive,
            this.assocPreviousPeriodHorizNodeFromToDates(
              this.query.displayColumnsBy,
            ),
          ),
        )(horizontalTotalNode);
      },
    );

    /**
     *
     * @param {IBalanceSheetAccountNode} node
     * @returns
     */
    private assocPreivousPeriodAccountHorizNodeComposer = (
      node: IBalanceSheetAccountNode,
    ) => {
      const horizontalTotals = R.map(
        this.previousPeriodAccountHorizNodeCompose(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ------------------------------
    // # Horizontal Nodes - Aggregate
    // ------------------------------
    /**
     * Assoc previous year total to horizontal node.
     * @param node
     * @returns
     */
    private assocPreviousPeriodAggregateHorizTotalNode = R.curry(
      (node, index: number, totalNode) => {
        const total = this.getPPHorizNodesTotalSumation(index, node);

        return R.assoc(
          'previousPeriod',
          this.getTotalAmountMeta(total),
          totalNode,
        );
      },
    );

    /**
     * Compose previous period to aggregate horizontal nodes.
     * @param   {IBalanceSheetTotalPeriod} node
     * @returns {IBalanceSheetTotalPeriod}
     */
    private previousPeriodAggregateHorizNodeComposer = R.curry(
      (
        node: IBalanceSheetCommonNode,
        horiontalTotalNode: IBalanceSheetTotalPeriod,
        index: number,
      ): IBalanceSheetTotalPeriod => {
        return R.compose(
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
            this.assocPreviousPeriodAggregateHorizTotalNode(node, index),
          ),
          R.when(
            this.query.isPreviousPeriodActive,
            this.assocPreviousPeriodHorizNodeFromToDates(
              this.query.displayColumnsBy,
            ),
          ),
        )(horiontalTotalNode);
      },
    );

    /**
     * Assoc
     * @param   {IBalanceSheetCommonNode} node
     * @returns {IBalanceSheetCommonNode}
     */
    private assocPreviousPeriodAggregateHorizNode = (
      node: IBalanceSheetCommonNode,
    ) => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousPeriodAggregateHorizNodeComposer(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };
  };
