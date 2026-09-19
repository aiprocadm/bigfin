import * as R from 'ramda';
import { I18nService } from 'nestjs-i18n';
import {
  BALANCE_SHEET_SCHEMA_NODE_TYPE,
  IBalanceSheetAggregateNode,
  IBalanceSheetDataNode,
  IBalanceSheetSchemaAggregateNode,
  IBalanceSheetSchemaNode,
} from './BalanceSheet.types';
import { BalanceSheetDatePeriods } from './BalanceSheetDatePeriods';
import { BalanceSheetComparsionPreviousPeriod } from './BalanceSheetComparsionPreviousPeriod';
import { BalanceSheetComparsionPreviousYear } from './BalanceSheetComparsionPreviousYear';
import { BalanceSheetPercentage } from './BalanceSheetPercentage';
import { BalanceSheetSchema } from './BalanceSheetSchema';
import { BalanceSheetBase } from './BalanceSheetBase';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { GConstructor } from '@/common/types/Constructor';
import { INumberFormatQuery } from '../../types/Report.types';
import { FinancialSheet } from '../../common/FinancialSheet';
import { sameNodeShape } from '../../utils/Table.utils';

export const BalanceSheetAggregators = <T extends GConstructor<FinancialSheet>>(
  Base: T,
) =>
  class extends
  // Вложенные вызовы вместо `R.pipe`: порядок тот же (первая примесь
  // оборачивает базу), но проверка типов ВИДИТ, что получилось.
  // Через `R.pipe` она считает, что у класса нет ни одного метода
  // примесей.
  BalanceSheetBase(
    FinancialSheetStructure(
      BalanceSheetSchema(
        BalanceSheetPercentage(
          BalanceSheetComparsionPreviousYear(
            BalanceSheetComparsionPreviousPeriod(
              BalanceSheetDatePeriods(
                Base,
              ),
            ),
          ),
        ),
      ),
    ),
  ) {
    public readonly i18n: I18nService;

    /**
     * Balance sheet query.
     * @param {BalanceSheetQuery}
     */
    public readonly query: BalanceSheetQuery;

    /**
     * Balance sheet number format query.
     * @param {INumberFormatQuery}
     */
    readonly numberFormat: INumberFormatQuery;

    /**
     * Base currency of the organization.
     * @param {string}
     */
    readonly baseCurrency: string;

    /**
     * Sets total amount that calculated from node children.
     * @param {IBalanceSheetSection} node
     * @returns {IBalanceSheetDataNode}
     */
    public aggregateNodeTotalMapper = (
      node: IBalanceSheetAggregateNode,
    ): IBalanceSheetAggregateNode => {
      // Шаги перечислены сверху вниз в том порядке, в каком выполняются.
      // Через `R.compose` их приходилось читать снизу вверх, а условия там
      // выглядели как значения, хотя это вызовы (`isPreviousYearActive()`).
      let result = node;

      if (this.query.isDatePeriodsColumnsType()) {
        result = this.assocAggregateNodeDatePeriods(result);
      }
      if (this.query.isPreviousPeriodActive()) {
        result = this.previousPeriodAggregateNodeComposer(result);
      }
      if (this.query.isPreviousYearActive()) {
        result = this.previousYearAggregateNodeComposer(result);
      }
      return result;
    };

    /**
     * Mappes the aggregate schema node type.
     * @param  {IBalanceSheetSchemaAggregateNode} node - Schema node.
     * @return {IBalanceSheetAggregateNode}
     */
    public reportSchemaAggregateNodeMapper = (
      node: IBalanceSheetSchemaAggregateNode,
    ): IBalanceSheetAggregateNode => {
      const total = this.getTotalOfNodes(node.children);

      return {
        name: this.i18n.t(node.name),
        id: node.id,
        nodeType: BALANCE_SHEET_SCHEMA_NODE_TYPE.AGGREGATE,
        type: BALANCE_SHEET_SCHEMA_NODE_TYPE.AGGREGATE,
        total: this.getTotalAmountMeta(total),
        // Потомки к этому мигу УЖЕ превращены в узлы отчёта: обход идёт
        // снизу вверх (`mapNodesDeepReverse`), сначала дети, потом родитель.
        // В перечне у узла-схемы потомки описаны как узлы схемы — здесь
        // это уже не так.
        children: sameNodeShape<IBalanceSheetDataNode[]>(node.children),
      };
    };

    /**
     * Compose shema aggregate node of balance sheet schema.
     * @param   {IBalanceSheetSchemaAggregateNode} node
     * @returns {IBalanceSheetSchemaAggregateNode}
     */
    public schemaAggregateNodeCompose = (
      node: IBalanceSheetSchemaAggregateNode,
    ) => {
      return R.compose(
        this.aggregateNodeTotalMapper,
        this.reportSchemaAggregateNodeMapper,
      )(node);
    };

    /**
     * Mappes the given report schema node.
     * @param  {IBalanceSheetSchemaNode} node - Schema node.
     * @return {IBalanceSheetDataNode}
     */
    public reportAggregateSchemaParser = (
      node: IBalanceSheetSchemaNode,
    ): IBalanceSheetDataNode => {
      // Узлы-свёртки и узлы-группы счетов собираются ОДИНАКОВО; всё
      // остальное проходит насквозь без изменений.
      const isAggregateOrAccounts =
        this.isSchemaNodeType(BALANCE_SHEET_SCHEMA_NODE_TYPE.AGGREGATE, node) ||
        this.isSchemaNodeType(BALANCE_SHEET_SCHEMA_NODE_TYPE.ACCOUNTS, node);

      return isAggregateOrAccounts
        ? this.schemaAggregateNodeCompose(
            node as IBalanceSheetSchemaAggregateNode,
          )
        : sameNodeShape<IBalanceSheetDataNode>(node);
    };

    /**
     * Mappes the report schema nodes.
     * @param  {IBalanceSheetSchemaNode[]} nodes -
     * @return {IBalanceSheetStructureSection[]}
     */
    public aggregatesSchemaParser = (
      nodes: (IBalanceSheetSchemaNode | IBalanceSheetDataNode)[],
    ): (IBalanceSheetDataNode | IBalanceSheetSchemaNode)[] => {
      return this.mapNodesDeepReverse(nodes, this.reportAggregateSchemaParser);
    };
  };
