// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { sumBy } from 'lodash';
import {
  IProfitLossSheetEquationNode,
  IProfitLossSheetAccountNode,
  IProfitLossSchemaNode,
  IProfitLossSheetNode,
  IProfitLossSheetTotal,
  IProfitLossSheetQuery,
} from './ProfitLossSheet.types';
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';
import { FinancialPreviousYear } from '../../common/FinancialPreviousYear';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';

export const ProfitLossSheetPreviousYear = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends R.pipe(FinancialPreviousYear)(Base) {

    // ЧЛЕНЫ ИЗ СОСЕДНИХ ПРИМЕСЕЙ.
    //
    // Класс собирается цепочкой `R.pipe(...)`, и через безымянный базовый
    // класс проверка типов не видит того, что объявлено в соседних примесях
    // той же цепочки. `declare` ничего не создаёт — он только показывает
    // проверке то, что во время работы и так есть.
    //
    // Каждое имя сверено: оно объявлено в примеси, входящей в ту же цепочку.
    declare evaluateEquation: any;
    declare getNodesTableForEvaluating: any;
    declare isNodeHasHorizTotals: any;
    repository: ProfitLossSheetRepository;
    query: ProfitLossSheetQuery;

    // ---------------------------
    // # Account
    // ---------------------------
    /**
     * Assoc previous year total attribute to account node.
     * @param   {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    private assocPreviousYearTotalAccountNode = (
      accountNode: IProfitLossSheetAccountNode,
    ) => {
      const total = this.repository.PYTotalAccountsLedger.whereAccountId(
        accountNode.id,
      ).getClosingBalance();

      return R.assoc('previousYear', this.getAmountMeta(total), accountNode);
    };

    /**
     * Compose previous year account node.
     * @param {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    protected previousYearAccountNodeCompose = (
      accountNode: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      let result: IProfitLossSheetAccountNode = accountNode;
      result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearTotalAccountNode(result));
      if (this.query.isPreviousYearChangeActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearChangetNode(result));
      }
      if (this.query.isPreviousYearPercentageActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearPercentageNode(result));
      }
      if (this.isNodeHasHorizTotals(result)) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearAccountHorizNodeCompose(result));
      }
      return result;
    };

    // ---------------------------
    // # Aggregate
    // ---------------------------
    /**
     * Assoc previous year change attribute to aggregate node.
     * @param    {IProfitLossSheetAccountNode} accountNode
     * @returns  {IProfitLossSheetAccountNode}
     */
    private assocPreviousYearTotalAggregateNode = (
      node: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      const total = sumBy(node.children, 'previousYear.amount');

      return R.assoc('previousYear', this.getTotalAmountMeta(total), node);
    };

    /**
     * Compose previous year to aggregate node.
     * @param   {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    protected previousYearAggregateNodeCompose = (
      accountNode: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      let result: IProfitLossSheetAccountNode = accountNode;
      result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearTotalAggregateNode(result));
      if (this.query.isPreviousYearChangeActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearTotalChangeNode(result));
      }
      if (this.query.isPreviousYearPercentageActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearTotalPercentageNode(result));
      }
      if (this.isNodeHasHorizTotals(result)) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousYearAggregateHorizNode(result));
      }
      return result;
    };

    // ---------------------------
    // # Equation
    // ---------------------------
    /**
     * Assoc previous year total to equation node.
     * @param   {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes
     * @param   {string} equation
     * @param   {IProfitLossSheetNode} node
     * @returns {IProfitLossSheetEquationNode}
     */
    private assocPreviousYearTotalEquationNode = R.curry(
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
        node: IProfitLossSheetNode,
      ) => {
        const previousPeriodNodePath = 'previousYear.amount';
        const tableNodes = this.getNodesTableForEvaluating(
          previousPeriodNodePath,
          accNodes,
        );
        // Evaluate the given equation.
        const total = this.evaluateEquation(equation, tableNodes);

        return R.assoc('previousYear', this.getTotalAmountMeta(total), node);
      },
    );

    /**
     * Previous year equation node.
     * @param   {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes -
     * @param   {string} node
     * @param   {IProfitLossSheetEquationNode} node
     * @returns {IProfitLossSheetEquationNode}
     */
    protected previousYearEquationNodeCompose = R.curry(
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
        node: IProfitLossSheetEquationNode,
      ) => {
        let result = node;
        result = this.assocPreviousYearTotalEquationNode(accNodes, equation)(result);
        if (this.query.isPreviousYearChangeActive()) {
          result = this.assocPreviousYearTotalChangeNode(result);
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = this.assocPreviousYearTotalPercentageNode(result);
        }
        if (this.isNodeHasHorizTotals(result)) {
          result = this.assocPreviousYearEquationHorizNode(accNodes, equation)(result);
        }
        return result;
      },
    );

    // ----------------------------------
    // # Horizontal Nodes - Account
    // ----------------------------------
    /**
     * Assoc preivous year to account horizontal total node.
     * @param   {IProfitLossSheetAccountNode} node
     * @returns
     */
    private assocPreviousYearAccountHorizTotal = R.curry(
      (node: IProfitLossSheetAccountNode, totalNode) => {
        const total = this.repository.PYPeriodsAccountsLedger.whereAccountId(
          node.id,
        )
          .whereFromDate(totalNode.previousYearFromDate.date)
          .whereToDate(totalNode.previousYearToDate.date)
          .getClosingBalance();

        return R.assoc('previousYear', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * Previous year account horizontal node composer.
     * @param   {IProfitLossSheetAccountNode} horizontalTotalNode
     * @param   {IProfitLossSheetTotal} horizontalTotalNode -
     * @returns {IProfitLossSheetTotal}
     */
    private previousYearAccountHorizNodeCompose = R.curry(
      (
        node: IProfitLossSheetAccountNode,
        horizontalTotalNode: IProfitLossSheetTotal,
      ): IProfitLossSheetTotal => {
        let result: IProfitLossSheetTotal = horizontalTotalNode;
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IProfitLossSheetTotal>(this.assocPreviousYearHorizNodeFromToDates(result));
        }
        if (this.query.isPreviousYearActive()) {
          result = sameNodeShape<IProfitLossSheetTotal>(this.assocPreviousYearAccountHorizTotal(node)(result));
        }
        if (this.query.isPreviousYearChangeActive()) {
          result = sameNodeShape<IProfitLossSheetTotal>(this.assocPreviousYearChangetNode(result));
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = sameNodeShape<IProfitLossSheetTotal>(this.assocPreviousYearPercentageNode(result));
        }
        return result;
      },
    );

    /**
     *
     * @param   {IProfitLossSheetAccountNode} node
     * @returns {IProfitLossSheetAccountNode}
     */
    private assocPreviousYearAccountHorizNodeCompose = (
      node: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      const horizontalTotals = R.map(
        this.previousYearAccountHorizNodeCompose(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ----------------------------------
    // # Horizontal Nodes - Aggregate
    // ----------------------------------
    /**
     *
     */
    private assocPreviousYearAggregateHorizTotal = R.curry(
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
     *
     */
    private previousYearAggregateHorizNodeCompose = R.curry(
      (node, horizontalTotalNode, index: number) => {
        let result = horizontalTotalNode;
        if (this.query.isPreviousYearActive()) {
          result = this.assocPreviousYearAggregateHorizTotal(node, index)(result);
        }
        if (this.query.isPreviousYearChangeActive()) {
          result = this.assocPreviousYearTotalChangeNode(result);
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = this.assocPreviousYearTotalPercentageNode(result);
        }
        return result;
      },
    );

    /**
     *
     * @param   {IProfitLossSheetAccountNode} node
     * @returns {IProfitLossSheetAccountNode}
     */
    private assocPreviousYearAggregateHorizNode = (
      node: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousYearAggregateHorizNodeCompose(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ----------------------------------
    // # Horizontal Nodes - Equation
    // ----------------------------------
    /**
     *
     * @param {IProfitLossSheetNode[]} accNodes -
     * @param {string} equation
     * @param {number} index
     * @param {} totalNode -
     */
    private assocPreviousYearEquationHorizTotal = R.curry(
      (
        accNodes: IProfitLossSheetNode[],
        equation: string,
        index: number,
        totalNode,
      ) => {
        const scopes = this.getNodesTableForEvaluating(
          `horizontalTotals[${index}].previousYear.amount`,
          accNodes,
        );
        const total = this.evaluateEquation(equation, scopes);

        return R.assoc(
          'previousYear',
          this.getTotalAmountMeta(total),
          totalNode,
        );
      },
    );

    /**
     *
     * @param {IProfitLossSheetNode[]} accNodes -
     * @param {string} equation
     * @param {} horizontalTotalNode
     * @param {number} index
     */
    private previousYearEquationHorizNodeCompose = R.curry(
      (
        accNodes: IProfitLossSheetNode[],
        equation: string,
        horizontalTotalNode,
        index: number,
      ) => {
        const assocHorizTotal = this.assocPreviousYearEquationHorizTotal(
          accNodes,
          equation,
          index,
        );
        let result = horizontalTotalNode;
        if (this.query.isPreviousYearActive()) {
          result = assocHorizTotal(result);
        }
        if (this.query.isPreviousYearChangeActive()) {
          result = this.assocPreviousYearTotalChangeNode(result);
        }
        if (this.query.isPreviousYearPercentageActive()) {
          result = this.assocPreviousYearTotalPercentageNode(result);
        }
        return result;
      },
    );

    /**
     *
     * @param {IProfitLossSheetNode[]} accNodes
     * @param {string} equation
     * @param {IProfitLossSheetEquationNode} node
     */
    private assocPreviousYearEquationHorizNode = R.curry(
      (
        accNodes: IProfitLossSheetNode[],
        equation: string,
        node: IProfitLossSheetEquationNode,
      ) => {
        const horizontalTotals = R.addIndex(R.map)(
          this.previousYearEquationHorizNodeCompose(accNodes, equation),
          node.horizontalTotals,
        );
        return R.assoc('horizontalTotals', horizontalTotals, node);
      },
    );
  };
