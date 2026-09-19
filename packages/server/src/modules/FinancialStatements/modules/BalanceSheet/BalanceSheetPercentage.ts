import * as R from 'ramda';
import { get } from 'lodash';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import {
  IBalanceSheetDataNode,
  IBalanceSheetTotalPeriod,
} from './BalanceSheet.types';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { sameNodeShape } from '../../utils/Table.utils';

/**
 * Всё, чему можно дописать долю в процентах.
 *
 * Доля дописывается и узлу отчёта, и итогу колонки-периода. Общее у них
 * ровно одно — итог с суммой, от неё доля и считается. Раньше в подписях
 * везде стоял «узел отчёта», хотя половина вызовов передавала итог периода.
 */
interface IPercentageTarget {
  total: { amount: number };
}

export const BalanceSheetPercentage = <T extends GConstructor<FinancialSheet>>(
  Base: T,
) =>
  class extends Base {
    readonly query: BalanceSheetQuery;

    // Приходит из соседней примеси того же класса. Объявление ничего
    // не создаёт — оно только показывает проверке типов то, что во
    // время работы и так есть.
    declare mapNodesDeep: (nodes: any, callback: (node: any) => any) => any;

    /**
     * Дописывает долю по КОЛОНКЕ (от итога родителя).
     */
    public assocReportNodeColumnPercentage = <N extends IPercentageTarget>(
      parentTotal: number,
      node: N,
    ): N => {
      const percentage = this.getPercentageBasis(
        parentTotal,
        node.total.amount,
      );

      return sameNodeShape<N>(
        R.assoc(
          'percentageColumn',
          this.getPercentageAmountMeta(percentage),
          node,
        ),
      );
    };

    /**
     * Дописывает долю по СТРОКЕ (от собственного итога узла).
     */
    public assocReportNodeRowPercentage = <N extends IPercentageTarget>(
      parentTotal: number,
      node: N,
    ): N => {
      const percenatage = this.getPercentageBasis(
        parentTotal,
        node.total.amount,
      );
      return sameNodeShape<N>(
        R.assoc(
          'percentageRow',
          this.getPercentageAmountMeta(percenatage),
          node,
        ),
      );
    };

    /**
     * Дописывает долю по строке каждому итогу колонки-периода.
     */
    public assocRowPercentageHorizTotals = <N extends IBalanceSheetDataNode>(
      parentTotal: number,
      node: N,
    ): N => {
      const horTotals = R.map(
        (horTotal) => this.assocReportNodeRowPercentage(parentTotal, horTotal),
        node.horizontalTotals,
      );
      return sameNodeShape<N>(R.assoc('horizontalTotals', horTotals, node));
    };

    /**
     * Дописывает долю по колонке одному итогу периода.
     * Итог родителя берётся из ТОЙ ЖЕ по счёту колонки родительского узла.
     */
    private assocColumnPercentageHorizTotal = (
      parentNode: IBalanceSheetDataNode,
      horTotalNode: IBalanceSheetTotalPeriod,
      index: number,
    ): IBalanceSheetTotalPeriod => {
      const parentTotal = get(
        parentNode,
        `horizontalTotals[${index}].total.amount`,
        0,
      );
      return this.assocReportNodeColumnPercentage(parentTotal, horTotalNode);
    };

    /**
     * Дописывает долю по колонке всем итогам периодов узла.
     */
    public assocColumnPercentageHorizTotals = <N extends IBalanceSheetDataNode>(
      parentNode: IBalanceSheetDataNode,
      node: N,
    ): N => {
      const horTotals = R.addIndex(R.map)(
        (horTotal: IBalanceSheetTotalPeriod, index: number) =>
          this.assocColumnPercentageHorizTotal(parentNode, horTotal, index),
        node.horizontalTotals,
      );
      return sameNodeShape<N>(R.assoc('horizontalTotals', horTotals, node));
    };

    /**
     * Доля узла по колонке: сначала самому узлу, затем его колонкам-периодам.
     */
    public reportNodeColumnPercentageComposer = (
      parentNode: IBalanceSheetDataNode,
      node: IBalanceSheetDataNode,
    ): IBalanceSheetDataNode => {
      const parentTotal = parentNode.total.amount;

      // Шаги перечислены сверху вниз в том порядке, в каком выполняются.
      // Через `R.compose` их приходилось читать снизу вверх, да ещё и с
      // наполовину применёнными помощниками.
      const withColumn = this.assocReportNodeColumnPercentage(
        parentTotal,
        node,
      );

      return this.isNodeHasHorizoTotals(withColumn)
        ? this.assocColumnPercentageHorizTotals(parentNode, withColumn)
        : withColumn;
    };

    /**
     * Доля узла по строке: сначала самому узлу, затем его колонкам-периодам.
     */
    private reportNodeRowPercentageComposer = (
      node: IBalanceSheetDataNode,
    ): IBalanceSheetDataNode => {
      const total = node.total.amount;
      const withRow = this.assocReportNodeRowPercentage(total, node);

      return this.isNodeHasHorizoTotals(withRow)
        ? this.assocRowPercentageHorizTotals(total, withRow)
        : withRow;
    };

    /**
     * Считает долю по колонке всем потомкам узла.
     */
    private assocNodeColumnPercentageChildren = (
      node: IBalanceSheetDataNode,
    ): IBalanceSheetDataNode => {
      // Потомки читаются через `get`, а не напрямую: у узла «чистая прибыль»
      // поля с потомками нет вовсе. Поведение то же, что и раньше, — просто
      // теперь это видно и проверке типов.
      const children = this.mapNodesDeep(get(node, 'children'), (child) =>
        this.reportNodeColumnPercentageComposer(node, child),
      );
      return sameNodeShape<IBalanceSheetDataNode>(
        R.assoc('children', children, node),
      );
    };

    /**
     * Доля по колонке для узла вместе со всеми его потомками.
     */
    private reportNodeColumnPercentageDeepMap = (
      node: IBalanceSheetDataNode,
    ): IBalanceSheetDataNode => {
      // Доля считается от итога РОДИТЕЛЯ, каким он был ДО обхода потомков, —
      // поэтому `parentTotal` и `parentNode` берутся из исходного узла.
      const parentTotal = node.total.amount;
      const parentNode = node;

      const withChildren = this.assocNodeColumnPercentageChildren(node);
      const withColumn = this.assocReportNodeColumnPercentage(
        parentTotal,
        withChildren,
      );

      return this.isNodeHasHorizoTotals(withColumn)
        ? this.assocColumnPercentageHorizTotals(parentNode, withColumn)
        : withColumn;
    };

    /**
     *
     * @param   {IBalanceSheetDataNode[]} node
     * @returns {IBalanceSheetDataNode[]}
     */
    private reportColumnsPercentageMapper = (
      nodes: IBalanceSheetDataNode[],
    ): IBalanceSheetDataNode[] => {
      return R.map(this.reportNodeColumnPercentageDeepMap, nodes);
    };

    /**
     *
     * @param nodes
     * @returns
     */
    private reportRowsPercentageMapper = (nodes) => {
      return this.mapNodesDeep(nodes, this.reportNodeRowPercentageComposer);
    };

    /**
     *
     * @param nodes
     * @returns
     */
    public reportPercentageCompose = (nodes) => {
      return R.compose(
        R.when(
          this.query.isColumnsPercentageActive,
          this.reportColumnsPercentageMapper,
        ),
        R.when(
          this.query.isRowsPercentageActive,
          this.reportRowsPercentageMapper,
        ),
      )(nodes);
    };

    /**
     * Detarmines whether the given node has horizontal total.
     * @param   {IBalanceSheetDataNode} node
     * @returns {boolean}
     */
    public isNodeHasHorizoTotals = (node: IBalanceSheetDataNode): boolean => {
      return (
        !R.isEmpty(node.horizontalTotals) && !R.isNil(node.horizontalTotals)
      );
    };
  };
