import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { sumBy } from 'lodash';
import {
  IProfitLossSheetCommonNode,
  IProfitLossHorizontalDatePeriodNode,
  IProfitLossSchemaNode,
  IProfitLossSheetAccountNode,
  IProfitLossSheetAccountsNode,
  IProfitLossSheetEquationNode,
  IProfitLossSheetNode,
} from './ProfitLossSheet.types';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { FinancialPreviousPeriod } from '../../common/FinancialPreviousPeriod';
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';

export const ProfitLossSheetPreviousPeriod = <
  T extends GConstructor<FinancialSheet>,
>(
  Base: T,
) =>
  class extends R.pipe(FinancialPreviousPeriod)(Base) {

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
    query: ProfitLossSheetQuery;
    repository: ProfitLossSheetRepository;

    // ---------------------------
    // # Account
    // ---------------------------
    /**
     * Assoc previous period change attribute to account node.
     * @param {IProfitLossSheetAccountNode} accountNode
     * @returns  {IProfitLossSheetAccountNode}
     */
    protected assocPreviousPeriodTotalAccountNode = (
      node: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      const total = this.repository.PPTotalAccountsLedger.whereAccountId(
        node.id,
      ).getClosingBalance();

      return R.assoc('previousPeriod', this.getAmountMeta(total), node);
    };

    /**
     * Compose previous period account node.
     * @param {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    protected previousPeriodAccountNodeCompose = (
      accountNode: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      let result: IProfitLossSheetAccountNode = accountNode;
      result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodTotalAccountNode(result));
      if (this.query.isPreviousPeriodChangeActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodChangeNode(result));
      }
      if (this.query.isPreviousPeriodPercentageActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodPercentageNode(result));
      }
      if (this.isNodeHasHorizTotals(result)) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodAccountHorizNodeCompose(result));
      }
      return result;
    };

    // ---------------------------
    // # Aggregate
    // ---------------------------
    /**
     * Assoc previous period total attribute to aggregate node.
     * @param {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    private assocPreviousPeriodTotalAggregateNode = (
      node: IProfitLossSheetAccountNode,
    ) => {
      const total = sumBy(node.children, 'previousPeriod.amount');

      return R.assoc('previousPeriod', this.getTotalAmountMeta(total), node);
    };

    /**
     * Compose previous period to aggregate node.
     * @param {IProfitLossSheetAccountNode} accountNode
     * @returns {IProfitLossSheetAccountNode}
     */
    protected previousPeriodAggregateNodeCompose = (
      accountNode: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      let result: IProfitLossSheetAccountNode = accountNode;
      result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodTotalAggregateNode(result));
      if (this.query.isPreviousPeriodChangeActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodTotalChangeNode(result));
      }
      if (this.query.isPreviousPeriodPercentageActive()) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodTotalPercentageNode(result));
      }
      if (this.isNodeHasHorizTotals(result)) {
        result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocPreviousPeriodAggregateHorizNode(result));
      }
      return result;
    };

    // ---------------------------
    // # Equation
    // --------------------------
    /**
     *
     * @param {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes
     * @param {string} equation
     * @param {IProfitLossSheetNode} node
     * @returns {IProfitLossSheetEquationNode}
     */
    private assocPreviousPeriodTotalEquationNode = R.curry(
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
        node: IProfitLossSheetEquationNode,
      ): IProfitLossSheetEquationNode => {
        const previousPeriodNodePath = 'previousPeriod.amount';
        const tableNodes = this.getNodesTableForEvaluating(
          previousPeriodNodePath,
          accNodes,
        );
        // Evaluate the given equation.
        const total = this.evaluateEquation(equation, tableNodes);

        return R.assoc('previousPeriod', this.getTotalAmountMeta(total), node);
      },
    );

    /**
     *
     * @param {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes -
     * @param {string} node
     * @param {IProfitLossSheetEquationNode} node
     * @returns {IProfitLossSheetEquationNode}
     */
    protected previousPeriodEquationNodeCompose = R.curry(
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
        node: IProfitLossSheetEquationNode,
      ): IProfitLossSheetEquationNode => {
        let result: IProfitLossSheetEquationNode = node;
        result = sameNodeShape<IProfitLossSheetEquationNode>(this.assocPreviousPeriodTotalEquationNode(accNodes, equation)(result));
        if (this.query.isPreviousPeriodChangeActive()) {
          result = sameNodeShape<IProfitLossSheetEquationNode>(this.assocPreviousPeriodTotalChangeNode(result));
        }
        if (this.query.isPreviousPeriodPercentageActive()) {
          result = sameNodeShape<IProfitLossSheetEquationNode>(this.assocPreviousPeriodTotalPercentageNode(result));
        }
        if (this.isNodeHasHorizTotals(result)) {
          result = sameNodeShape<IProfitLossSheetEquationNode>(this.assocPreviousPeriodEquationHorizNode(accNodes, equation)(result));
        }
        return result;
      },
    );

    // ---------------------------
    // # Horizontal Nodes - Account
    // --------------------------
    /**
     * Assoc previous period to account horizontal node.
     * @param   {IProfitLossSheetAccountNode} node
     * @param   {IProfitLossHorizontalDatePeriodNode} totalNode
     * @returns {IProfitLossHorizontalDatePeriodNode}
     */
    private assocPerviousPeriodAccountHorizTotal = R.curry(
      (
        node: IProfitLossSheetAccountNode,
        totalNode: IProfitLossHorizontalDatePeriodNode,
      ): IProfitLossHorizontalDatePeriodNode => {
        const total = this.repository.PPPeriodsAccountsLedger.whereAccountId(
          node.id,
        )
          .whereFromDate(totalNode.previousPeriodFromDate.date)
          .whereToDate(totalNode.previousPeriodToDate.date)
          .getClosingBalance();

        return R.assoc('previousPeriod', this.getAmountMeta(total), totalNode);
      },
    );

    /**
     * @param {IProfitLossSheetAccountNode} node
     * @param {IProfitLossSheetTotal}
     */
    private previousPeriodAccountHorizNodeCompose = R.curry(
      (
        node: IProfitLossSheetAccountNode,
        horizontalTotalNode: IProfitLossHorizontalDatePeriodNode,
        index: number,
      ): IProfitLossHorizontalDatePeriodNode => {
        let result: IProfitLossHorizontalDatePeriodNode = horizontalTotalNode;
        // Помощник дат каррирован в общей примеси: для проверки типов его
        // результат — «что-то». Приводим к виду узла тем же способом, что и
        // соседние строки этого файла.
        result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(
          this.assocPreviousPeriodHorizNodeFromToDates(
            this.query.displayColumnsBy,
          )(result),
        );
        result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPerviousPeriodAccountHorizTotal(node)(result));
        if (this.query.isPreviousPeriodChangeActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPreviousPeriodChangeNode(result));
        }
        if (this.query.isPreviousPeriodPercentageActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPreviousPeriodPercentageNode(result));
        }
        return result;
      },
    );

    /**
     *
     * @param {IProfitLossSheetAccountNode} node
     * @returns {IProfitLossSheetAccountNode}
     */
    private assocPreviousPeriodAccountHorizNodeCompose = (
      node: IProfitLossSheetAccountNode,
    ): IProfitLossSheetAccountNode => {
      const horizontalTotals = R.addIndex(R.map)(
        this.previousPeriodAccountHorizNodeCompose(node),
        node.horizontalTotals,
      );
      return R.assoc('horizontalTotals', horizontalTotals, node);
    };

    // ----------------------------------
    // # Horizontal Nodes - Aggregate
    // ----------------------------------
    /**
     * Assoc previous period total to aggregate horizontal nodes.
     * @param  {IProfitLossSheetAccountsNode} node
     * @param  {number} index
     * @param  {any} totalNode
     * @return {}
     */
    // Частичное применение записано явно вместо каррирования.
    private assocPreviousPeriodAggregateHorizTotal =
      (node: IProfitLossSheetCommonNode, index: number) =>
      (
        totalNode: IProfitLossHorizontalDatePeriodNode,
      ): IProfitLossHorizontalDatePeriodNode => {
        const total = this.getPPHorizNodesTotalSumation(
          index,
          node as IProfitLossSheetAccountsNode,
        );

        return {
          ...totalNode,
          previousPeriod: this.getTotalAmountMeta(total),
        };
      };

    /**
     *
     * @param   {IProfitLossSheetAccountsNode} node
     * @param   {IProfitLossHorizontalDatePeriodNode} horizontalTotalNode -
     * @param   {number} index
     * @returns {IProfitLossHorizontalDatePeriodNode}
     */
    // Частичное применение записано явно вместо каррирования: смысл тот же,
    // но проверка типов видит, что получилось, и разрешает вызвать.
    private previousPeriodAggregateHorizNodeCompose =
      (node: IProfitLossSheetCommonNode) =>
      (
        horizontalTotalNode: IProfitLossHorizontalDatePeriodNode,
        index: number,
      ): IProfitLossHorizontalDatePeriodNode => {
        let result: IProfitLossHorizontalDatePeriodNode = horizontalTotalNode;
        if (this.query.isPreviousPeriodActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(
            this.assocPreviousPeriodHorizNodeFromToDates(
              this.query.displayColumnsBy,
            )(result),
          );
        }
        if (this.query.isPreviousPeriodActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPreviousPeriodAggregateHorizTotal(node, index)(result));
        }
        if (this.query.isPreviousPeriodChangeActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPreviousPeriodTotalChangeNode(result));
        }
        if (this.query.isPreviousPeriodPercentageActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(this.assocPreviousPeriodTotalPercentageNode(result));
        }
        return result;
      };

    /**
     * Assoc previous period to aggregate horizontal nodes.
     * @param {IProfitLossSheetAccountsNode} node
     * @returns
     */
    // Узел принимается ОБЩИМ: сюда приходят и разделы, и строки-счета, а
    // читаются только горизонтальные итоги — они есть у всех.
    private assocPreviousPeriodAggregateHorizNode = (
      node: IProfitLossSheetCommonNode,
    ): IProfitLossSheetCommonNode => {
      // Обычный обход списка вместо `R.addIndex(R.map)` с каррированием:
      // делает то же самое, читается сразу и не теряет типы.
      const compose = this.previousPeriodAggregateHorizNodeCompose(node);
      const horizontalTotals = (node.horizontalTotals ?? []).map(
        (horizontalTotal, index) => compose(horizontalTotal, index),
      );

      return { ...node, horizontalTotals };
    };

    // ----------------------------------
    // # Horizontal Nodes - Equation
    // ----------------------------------
    /**
     *
     * @param {IProfitLossSheetNode[]} accNodes -
     * @param {string} equation
     * @param {index} number
     * @param {} totalNode
     */
    // Частичное применение записано явно вместо каррирования.
    private assocPreviousPeriodEquationHorizTotal =
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
        index: number,
      ) =>
      (
        totalNode: IProfitLossHorizontalDatePeriodNode,
      ): IProfitLossHorizontalDatePeriodNode => {
        const scopes = this.getNodesTableForEvaluating(
          `horizontalTotals[${index}].previousPeriod.amount`,
          accNodes as IProfitLossSheetNode[],
        );
        const total = this.evaluateEquation(equation, scopes);

        return {
          ...totalNode,
          previousPeriod: this.getTotalAmountMeta(total),
        };
      };

    /**
     *
     * @param {IProfitLossSheetNode[]} accNodes -
     * @param {string} equation
     * @param {} horizontalTotalNode
     * @param {number} index
     */
    // Частичное применение записано явно вместо каррирования.
    private previousPeriodEquationHorizNodeCompose =
      (
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
      ) =>
      (
        horizontalTotalNode: IProfitLossHorizontalDatePeriodNode,
        index: number,
      ): IProfitLossHorizontalDatePeriodNode => {
        const assocHorizTotal = this.assocPreviousPeriodEquationHorizTotal(
          accNodes,
          equation,
          index,
        );
        let result = horizontalTotalNode;
        if (this.query.isPreviousPeriodActive()) {
          result = sameNodeShape<IProfitLossHorizontalDatePeriodNode>(
            this.assocPreviousPeriodHorizNodeFromToDates(
              this.query.displayColumnsBy,
            )(result),
          );
        }
        if (this.query.isPreviousPeriodActive()) {
          result = assocHorizTotal(result);
        }
        if (this.query.isPreviousPeriodChangeActive()) {
          result = this.assocPreviousPeriodTotalChangeNode(result);
        }
        if (this.query.isPreviousPeriodPercentageActive()) {
          result = this.assocPreviousPeriodTotalPercentageNode(result);
        }
        return result;
      };

    /**
     * Assoc previous period equation to horizontal nodes.
     * @parma  {IProfitLossSheetNode[]} accNodes -
     * @param  {string} equation
     * @param  {IProfitLossSheetEquationNode} node
     * @return {IProfitLossSheetEquationNode}
     */
    // Частичное применение записано явно; обход списка — обычный.
    private assocPreviousPeriodEquationHorizNode =
      (
        // Сюда приходят и узлы отчёта, и узлы схемы — так их и передаёт
        // вызывающий. Перечень, обещавший только узлы отчёта, отставал
        // от кода.
        accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
        equation: string,
      ) =>
      (node: IProfitLossSheetEquationNode): IProfitLossSheetEquationNode => {
        const compose = this.previousPeriodEquationHorizNodeCompose(
          accNodes,
          equation,
        );
        const horizontalTotals = (node.horizontalTotals ?? []).map(
          (horizontalTotal, index) => compose(horizontalTotal, index),
        );

        return { ...node, horizontalTotals };
      };
  };
