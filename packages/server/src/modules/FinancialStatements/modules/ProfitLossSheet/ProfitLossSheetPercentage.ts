import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { GConstructor } from '@/common/types/Constructor';
import {
  IProfitLossSheetNode,
  ProfitLossAggregateNodeId,
} from './ProfitLossSheet.types';
import { FinancialHorizTotals } from '../../common/FinancialHorizTotals';
import { FinancialSheet } from '../../common/FinancialSheet';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';

export const ProfitLossSheetPercentage = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends R.pipe(FinancialHorizTotals)(Base) {

    // ЧЛЕНЫ ИЗ СОСЕДНИХ ПРИМЕСЕЙ.
    //
    // Класс собирается цепочкой `R.pipe(...)`, и через безымянный базовый
    // класс проверка типов не видит того, что объявлено в соседних примесях
    // той же цепочки. `declare` ничего не создаёт — он только показывает
    // проверке то, что во время работы и так есть.
    //
    // Каждое имя сверено: оно объявлено в примеси, входящей в ту же цепочку.
    declare findNodeById: any;
    declare isNodeTotal: any;
    declare mapNodesDeep: any;
    query: ProfitLossSheetQuery;

    /**
     * Assoc column of percentage attribute to the given node.
     * @param {IProfitLossSheetNode} netIncomeNode -
     * @param {IProfitLossSheetNode} node -
     * @return {IProfitLossSheetNode}
     */
    private assocColumnPercentage = R.curry(
      (
        propertyPath: string,
        parentNode: IProfitLossSheetNode,
        node: IProfitLossSheetNode,
      ) => {
        const percentage = this.getPercentageBasis(
          parentNode.total.amount,
          node.total.amount,
        );
        return R.assoc(
          propertyPath,
          this.getPercentageAmountMeta(percentage),
          node,
        );
      },
    );

    /**
     * Assoc column of percentage attribute to the given node.
     * @param {IProfitLossSheetNode} netIncomeNode -
     * @param {IProfitLossSheetNode} node -
     * @return {IProfitLossSheetNode}
     */
    private assocColumnTotalPercentage = R.curry(
      (
        propertyPath: string,
        parentNode: IProfitLossSheetNode,
        node: IProfitLossSheetNode,
      ) => {
        const percentage = this.getPercentageBasis(
          parentNode.total.amount,
          node.total.amount,
        );
        return R.assoc(
          propertyPath,
          this.getPercentageTotalAmountMeta(percentage),
          node,
        );
      },
    );

    /**
     * Compose percentage of columns.
     * @param   {IProfitLossSheetNode[]} nodes
     * @returns {IProfitLossSheetNode[]}
     */
    private columnPercentageCompose = (
      nodes: IProfitLossSheetNode[],
    ): IProfitLossSheetNode[] => {
      const netIncomeNode = this.findNodeById(
        ProfitLossAggregateNodeId.NET_INCOME,
        nodes,
      );
      return this.mapNodesDeep(
        nodes,
        this.columnPercentageMapper(netIncomeNode),
      );
    };

    /**
     * Compose percentage of income.
     * @param   {IProfitLossSheetNode[]} nodes
     * @returns {IProfitLossSheetNode[]}
     */
    private incomePercetageCompose = (
      nodes: IProfitLossSheetNode[],
    ): IProfitLossSheetNode[] => {
      const incomeNode = this.findNodeById(
        ProfitLossAggregateNodeId.INCOME,
        nodes,
      );
      return this.mapNodesDeep(nodes, this.incomePercentageMapper(incomeNode));
    };

    /**
     *
     * @param {IProfitLossSheetNode[]} nodes
     * @returns {IProfitLossSheetNode[]}
     */
    private rowPercentageCompose = (
      nodes: IProfitLossSheetNode[],
    ): IProfitLossSheetNode[] => {
      return this.mapNodesDeep(nodes, this.rowPercentageMap);
    };

    /**
     *
     * @param  {IProfitLossSheetNode} netIncomeNode -
     * @param  {IProfitLossSheetNode} node -
     * @return {IProfitLossSheetNode}
     */
    private columnPercentageMapper = R.curry(
      (netIncomeNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const path = 'percentageColumn';

        let result = node;
         result = this.isNodeTotal(result)
          ? this.assocColumnTotalPercentage(path, netIncomeNode)(result)
          : this.assocColumnPercentage(path, netIncomeNode)(result);
         if (this.isNodeHasHorizTotals(result)) {
           result = this.assocColumnPercentageHorizTotals(netIncomeNode)(result);
         }
         return result;
      },
    );

    /**
     *
     * @param   {IProfitLossSheetNode} node
     * @returns {IProfitLossSheetNode}
     */
    private rowPercentageMap = (
      node: IProfitLossSheetNode,
    ): IProfitLossSheetNode => {
      const path = 'percentageRow';

      let result: IProfitLossSheetNode = node;
       result = this.isNodeTotal(result)
          ? this.assocColumnTotalPercentage(path, node)(result)
          : this.assocColumnPercentage(path, node)(result);
       if (this.isNodeHasHorizTotals(result)) {
         result = sameNodeShape<IProfitLossSheetNode>(this.assocRowPercentageHorizTotals(result));
       }
       return result;
    };

    /**
     *
     * @param   {IProfitLossSheetNode} incomeNode -
     * @param   {IProfitLossSheetNode} node -
     * @returns {IProfitLossSheetNode}
     */
    private incomePercentageMapper = R.curry(
      (incomeNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const path = 'percentageIncome';

        let result = node;
         result = this.isNodeTotal(result)
          ? this.assocColumnTotalPercentage(path, incomeNode)(result)
          : this.assocColumnPercentage(path, incomeNode)(result);
         if (this.isNodeHasHorizTotals(result)) {
           result = this.assocIncomePercentageHorizTotals(incomeNode)(result);
         }
         return result;
      },
    );

    /**
     *
     * @param {IProfitLossSheetNode} expenseNode -
     * @param {IProfitLossSheetNode} node -
     */
    private expensePercentageMapper = R.curry(
      (expenseNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const path = 'percentageExpense';

        let result = node;
         result = this.isNodeTotal(result)
          ? this.assocColumnTotalPercentage(path, expenseNode)(result)
          : this.assocColumnPercentage(path, expenseNode)(result);
         if (this.isNodeHasHorizTotals(result)) {
           result = this.assocExpensePercentageHorizTotals(expenseNode)(result);
         }
         return result;
      },
    );

    /**
     * Compose percentage of expense.
     * @param   {IProfitLossSheetNode[]} nodes
     * @returns {IProfitLossSheetNode[]}
     */
    private expensesPercentageCompose = (
      nodes: IProfitLossSheetNode[],
    ): IProfitLossSheetNode[] => {
      const expenseNode = this.findNodeById(
        ProfitLossAggregateNodeId.EXPENSES,
        nodes,
      );
      return this.mapNodesDeep(
        nodes,
        this.expensePercentageMapper(expenseNode),
      );
    };

    /**
     * Compose percentage attributes.
     * @param   {IProfitLossSheetNode[]} nodes
     * @returns {IProfitLossSheetNode[]}
     */
    protected reportColumnsPerentageCompose = (
      nodes: IProfitLossSheetNode[],
    ): IProfitLossSheetNode[] => {
      let result: IProfitLossSheetNode[] = nodes;
      if (this.query.isRowPercentage()) {
        result = sameNodeShape<IProfitLossSheetNode[]>(this.rowPercentageCompose(result));
      }
      if (this.query.isExpensesPercentage()) {
        result = sameNodeShape<IProfitLossSheetNode[]>(this.expensesPercentageCompose(result));
      }
      if (this.query.isColumnPercentage()) {
        result = sameNodeShape<IProfitLossSheetNode[]>(this.columnPercentageCompose(result));
      }
      if (this.query.isIncomePercentage()) {
        result = sameNodeShape<IProfitLossSheetNode[]>(this.incomePercetageCompose(result));
      }
      return result;
    };

    /**
     *
     * @param   {} nodes
     * @returns {}
     */
    protected reportRowsPercentageCompose = (nodes) => {
      return nodes;
    };

    // ----------------------------------
    // # Horizontal Nodes
    // ----------------------------------
    /**
     * Assoc incomer percentage to horizontal totals nodes.
     * @param   {IProfitLossSheetNode} incomeNode -
     * @param   {IProfitLossSheetNode} node -
     * @returns {IProfitLossSheetNode}
     */
    private assocIncomePercentageHorizTotals = R.curry(
      (incomeNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const horTotalsWithIncomePerc = this.assocPercentageHorizTotals(
          'percentageIncome',
          incomeNode,
          node,
        );
        return R.assoc('horizontalTotals', horTotalsWithIncomePerc, node);
      },
    );

    /**
     * Assoc expense percentage to horizontal totals nodes.
     * @param   {IProfitLossSheetNode} expenseNode -
     * @param   {IProfitLossSheetNode} node -
     * @returns {IProfitLossSheetNode}
     */
    private assocExpensePercentageHorizTotals = R.curry(
      (expenseNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const horTotalsWithExpensePerc = this.assocPercentageHorizTotals(
          'percentageExpense',
          expenseNode,
          node,
        );
        return R.assoc('horizontalTotals', horTotalsWithExpensePerc, node);
      },
    );

    /**
     * Assoc net income percentage to horizontal totals nodes.
     * @param   {IProfitLossSheetNode} expenseNode -
     * @param   {IProfitLossSheetNode} node -
     * @returns {IProfitLossSheetNode}
     */
    private assocColumnPercentageHorizTotals = R.curry(
      (netIncomeNode: IProfitLossSheetNode, node: IProfitLossSheetNode) => {
        const horTotalsWithExpensePerc = this.assocPercentageHorizTotals(
          'percentageColumn',
          netIncomeNode,
          node,
        );
        return R.assoc('horizontalTotals', horTotalsWithExpensePerc, node);
      },
    );

    /**
     *
     */
    private assocRowPercentageHorizTotals = R.curry((node) => {
      const horTotalsWithExpensePerc = this.assocHorizontalPercentageTotals(
        'percentageRow',
        node,
      );
      return R.assoc('horizontalTotals', horTotalsWithExpensePerc, node);
    });
  };
