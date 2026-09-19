// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { sumBy, isEmpty } from 'lodash';
import {
  IBalanceSheetAccountNode,
  IBalanceSheetCommonNode,
  IBalanceSheetDataNode,
  IBalanceSheetTotal,
} from './BalanceSheet.types';
import { FinancialPreviousYear } from '../../common/FinancialPreviousYear';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { BalanceSheetRepository } from './BalanceSheetRepository';

export const BalanceSheetComparsionPreviousYear = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class BalanceSheetComparsionPreviousYear extends R.pipe(
    FinancialPreviousYear,
  )(Base) {
    query: BalanceSheetQuery;
    repository: BalanceSheetRepository;

    // ------------------------------
    // # Account
    // ------------------------------
    /**
     * Associates the previous year to account node.
     * @param   {IBalanceSheetDataNode} node
     * @returns {IBalanceSheetDataNode}
     */
    protected assocPreviousYearAccountNode = (
      node: IBalanceSheetDataNode,
    ): IBalanceSheetDataNode => {
      const closingBalance =
        this.repository.PYTotalAccountsLedger.whereAccountId(
          node.id,
        ).getClosingBalance();

      return R.assoc('previousYear', this.getAmountMeta(closingBalance), node);
    };

    /**
     * Assoc previous year attributes to account node.
     * @param {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    protected previousYearAccountNodeComposer = (
      node: IBalanceSheetAccountNode,
    ): IBalanceSheetAccountNode => {
      let result: IBalanceSheetAccountNode = node;
      result = sameNodeShape<IBalanceSheetAccountNode>(this.assocPreviousYearAccountNode(result));
      if (this.query.isPreviousYearChangeActive()) {
        result = sameNodeShape<IBalanceSheetAccountNode>(this.assocPreviousYearChangetNode(result));
      }
      if (this.query.isPreviousYearPercentageActive()) {
        result = sameNodeShape<IBalanceSheetAccountNode>(this.assocPreviousYearPercentageNode(result));
      }
      if (this.isNodeHasHorizontalTotals(result)) {
        result = sameNodeShape<IBalanceSheetAccountNode>(this.assocPreviousYearAccountHorizNodeComposer(result));
      }
      return result;
    };

    // ------------------------------
    // # Aggregate
    // ------------------------------
    /**
     * Assoc previous year on aggregate node.
     * @param {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    protected assocPreviousYearAggregateNode = (
      node: IBalanceSheetAccountNode,
    ): IBalanceSheetAccountNode => {
      const total = sumBy(node.children, 'previousYear.amount');

      return R.assoc('previousYear', this.getTotalAmountMeta(total), node);
    };

    /**
     * Assoc previous year attributes to aggregate node.
     * @param {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    protected previousYearAggregateNodeComposer = (
      node: IBalanceSheetAggregateNode,
    ): IBalanceSheetAggregateNode => {
      let result: IBalanceSheetAggregateNode = node;
      result = sameNodeShape<IBalanceSheetAggregateNode>(this.assocPreviousYearAggregateNode(result));
      if (this.isNodeHasHorizontalTotals(result)) {
        result = sameNodeShape<IBalanceSheetAggregateNode>(this.assocPreviousYearAggregateHorizNode(result));
      }
      if (this.query.isPreviousYearChangeActive()) {
        result = sameNodeShape<IBalanceSheetAggregateNode>(this.assocPreviousYearTotalChangeNode(result));
      }
      if (this.query.isPreviousYearPercentageActive()) {
        result = sameNodeShape<IBalanceSheetAggregateNode>(this.assocPreviousYearTotalPercentageNode(result));
      }
      return result;
    };

    // ------------------------------
    // # Horizontal Nodes - Aggregate
    // ------------------------------
    /**
     * Assoc previous year total to horizontal node.
     * @param node
     * @returns
     */
    private assocPreviousYearAggregateHorizTotalNode = R.curry(
      (node, index, totalNode) => {
        const total = this.getPYHorizNodesTotalSumation(index, node);

        return R.assoc(
          'previousYear',
          this.getTotalAmountMeta(total),
          totalNode,
        );
      },
    );

    /**
     * Compose previous year to aggregate horizontal nodes.
     * @param   {IBalanceSheetTotal} node
     * @returns {IBalanceSheetTotal}
     */
    private previousYearAggregateHorizNodeComposer = R.curry(
      (
        node: IBalanceSheetCommonNode,
        horiontalTotalNode: IBalanceSheetTotal,
        index: number,
      ): IBalanceSheetTotal => {
        let result: IBalanceSheetTotal = horiontalTotalNode;
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearHorizNodeFromToDates(result));
        }
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearAggregateHorizTotalNode(node, index)(result));
        }
        if (this.query.isPreviousYearChangeActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearTotalChangeNode(result));
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearTotalPercentageNode(result));
        }
        return result;
      },
    );

    /**
     * Assoc
     * @param   {IBalanceSheetCommonNode} node
     * @returns {IBalanceSheetCommonNode}
     */
    public assocPreviousYearAggregateHorizNode = (
      node: IBalanceSheetCommonNode,
    ): IBalanceSheetCommonNode => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousYearAggregateHorizNodeComposer(node),
        node.horizontalTotals,
      ) as IBalanceSheetTotal[];

      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ------------------------------
    // # Horizontal Nodes - Account.
    // ------------------------------
    /**
     * Retrieve the given account total in the given period.
     * @param   {number} accountId - Account id.
     * @param   {Date} fromDate - From date.
     * @param   {Date} toDate - To date.
     * @returns {number}
     */
    private getAccountPYDatePeriodTotal = R.curry(
      (accountId: number, fromDate: Date, toDate: Date): number => {
        const PYPeriodsTotal =
          this.repository.PYPeriodsAccountsLedger.whereAccountId(accountId)
            .whereToDate(toDate)
            .getClosingBalance();

        const PYPeriodsOpeningTotal =
          this.repository.PYPeriodsOpeningAccountLedger.whereAccountId(
            accountId,
          ).getClosingBalance();

        return PYPeriodsOpeningTotal + PYPeriodsTotal;
      },
    );

    /**
     * Assoc preivous year to account horizontal total node.
     * @param   {IBalanceSheetAccountNode} node
     * @returns {}
     */
    private assocPreviousYearAccountHorizTotal = R.curry(
      (node: IBalanceSheetAccountNode, totalNode) => {
        const total = this.getAccountPYDatePeriodTotal(
          node.id,
          totalNode.previousYearFromDate.date,
          totalNode.previousYearToDate.date,
        );
        return R.assoc('previousYear', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * Previous year account horizontal node composer.
     * @param   {IBalanceSheetAccountNode} node -
     * @param   {IBalanceSheetTotal}
     * @returns {IBalanceSheetTotal}
     */
    private previousYearAccountHorizNodeCompose = R.curry(
      (
        node: IBalanceSheetAccountNode,
        horizontalTotalNode: IBalanceSheetTotal,
      ): IBalanceSheetTotal => {
        let result: IBalanceSheetTotal = horizontalTotalNode;
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearHorizNodeFromToDates(result));
        }
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearAccountHorizTotal(node)(result));
        }
        if (this.query.isPreviousYearChangeActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearChangetNode(result));
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = sameNodeShape<IBalanceSheetTotal>(this.assocPreviousYearPercentageNode(result));
        }
        return result;
      },
    );

    /**
     * Assoc previous year horizontal nodes to account node.
     * @param   {IBalanceSheetAccountNode} node
     * @returns {IBalanceSheetAccountNode}
     */
    private assocPreviousYearAccountHorizNodeComposer = (
      node: IBalanceSheetAccountNode,
    ) => {
      const horizontalTotals = R.map(
        this.previousYearAccountHorizNodeCompose(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ------------------------------
    // # Horizontal Nodes - Aggregate.
    // ------------------------------
    /**
     * Detarmines whether the given node has horizontal totals.
     * @param   {IBalanceSheetCommonNode} node
     * @returns {boolean}
     */
    public isNodeHasHorizontalTotals = (node: IBalanceSheetCommonNode) =>
      !isEmpty(node.horizontalTotals);
  };
