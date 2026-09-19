// @ts-nocheck
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { ModelObject } from 'objection';
import { I18nService } from 'nestjs-i18n';
import {
  ProfitLossNodeType,
  IProfitLossSheetEquationNode,
  IProfitLossEquationSchemaNode,
  IProfitLossSheetAccountsNode,
  IProfitLossAccountsSchemaNode,
  IProfitLossSchemaNode,
  IProfitLossSheetNode,
  IProfitLossSheetAccountNode,
  IProfitLossSheetQuery,
} from './ProfitLossSheet.types';
import { ProfitLossShema } from './ProfitLossSchema';
import { ProfitLossSheetPercentage } from './ProfitLossSheetPercentage';
import { ProfitLossSheetQuery } from './ProfitLossSheetQuery';
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';
import { ProfitLossSheetBase } from './ProfitLossSheetBase';
import { ProfitLossSheetDatePeriods } from './ProfitLossSheetDatePeriods';
import { ProfitLossSheetPreviousYear } from './ProfitLossSheetPreviousYear';
import { ProfitLossSheetPreviousPeriod } from './ProfitLossSheetPreviousPeriod';
import { ProfitLossSheetFilter } from './ProfitLossSheetFilter';
import { FinancialDateRanges } from '../../common/FinancialDateRanges';
import { FinancialEvaluateEquation } from '../../common/FinancialEvaluateEquation';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialSheet } from '../../common/FinancialSheet';
import { Account } from '@/modules/Accounts/models/Account.model';
import { flatToNestedArray } from '@/utils/flat-to-nested-array';
import { IFinancialReportMeta, DEFAULT_REPORT_META } from '../../types/Report.types';

export default class ProfitLossSheet extends R.pipe(
  ProfitLossSheetPreviousYear,
  ProfitLossSheetPreviousPeriod,
  ProfitLossSheetPercentage,
  ProfitLossSheetDatePeriods,
  ProfitLossSheetFilter,
  ProfitLossShema,
  ProfitLossSheetBase,
  FinancialDateRanges,
  FinancialEvaluateEquation,
  FinancialSheetStructure,
)(FinancialSheet) {
  /**
   * Profit/Loss sheet query.
   * @param {ProfitLossSheetQuery}
   */
  readonly query: ProfitLossSheetQuery;
  /**
   * @param {string}
   */
  readonly comparatorDateType: string;

  /**
   * Organization's base currency.
   * @param {string}
   */
  readonly baseCurrency: string;

  /**
   * Profit/Loss repository.
   * @param {ProfitLossSheetRepository}
   */
  readonly repository: ProfitLossSheetRepository;

  /**
   * I18n service.
   * @param {I18nService}
   */
  readonly i18n: I18nService;

  /**
   * Constructor method.
   * @param {ProfitLossSheetRepository} repository -
   * @param {IProfitLossSheetQuery} query -
   * @param {I18nService} i18n -
   * @param {IFinancialReportMeta} meta -
   */
  constructor(
    repository: ProfitLossSheetRepository,
    query: IProfitLossSheetQuery,
    i18n: I18nService,
    meta: IFinancialReportMeta,
  ) {
    super();

    this.query = new ProfitLossSheetQuery(query);
    this.repository = repository;
    this.baseCurrency = meta.baseCurrency;
    this.numberFormat = this.query.query.numberFormat;
    this.dateFormat = meta.dateFormat || DEFAULT_REPORT_META.dateFormat;
    this.i18n = i18n;
  }

  /**
   * Retrieve the sheet account node from the given account.
   * @param {ModelObject<Account>} account
   * @returns {IProfitLossSheetAccountNode}
   */
  private accountNodeMapper = (
    account: ModelObject<Account>,
  ): IProfitLossSheetAccountNode => {
    // Retrieves the children account ids of the given account id.
    const childrenAccountIds = this.repository.accountsGraph.dependenciesOf(
      account.id,
    );
    // Concat the children and the given account id.
    const accountIds = R.uniq(R.append(account.id, childrenAccountIds));

    // Retrieves the closing balance of the account included children accounts.
    const total = this.repository.totalAccountsLedger
      .whereAccountsIds(accountIds)
      .getClosingBalance();

    return {
      id: account.id,
      name: account.name,
      nodeType: ProfitLossNodeType.ACCOUNT,
      total: this.getAmountMeta(total),
    };
  };

  /**
   * Compose account node.
   * @param {ModelObject<Account>} node
   * @returns {IProfitLossSheetAccountNode}
   */
  private accountNodeCompose = (
    account: ModelObject<Account>,
  ): IProfitLossSheetAccountNode => {
    let result: IProfitLossSheetAccountNode = account;
    result = sameNodeShape<IProfitLossSheetAccountNode>(this.accountNodeMapper(result));
    if (this.query.isDatePeriodsColumnsType()) {
      result = sameNodeShape<IProfitLossSheetAccountNode>(this.assocAccountNodeDatePeriod(result));
    }
    if (this.query.isPreviousYearActive()) {
      result = this.previousYearAccountNodeCompose(result);
    }
    if (this.query.isPreviousPeriodActive()) {
      result = this.previousPeriodAccountNodeCompose(result);
    }
    return result;
  };

  /**
   * Retrieves report accounts nodes by the given accounts types.
   * @param {string[]} types
   * @returns {IBalanceSheetAccountNode}
   */
  private getAccountsNodesByTypes = (
    types: string[],
  ): IProfitLossSheetAccountNode[] => {
    const accounts = this.repository.getAccountsByType(types);
    const accountsTree = flatToNestedArray(accounts, {
      id: 'id',
      parentId: 'parentAccountId',
    });
    return this.mapNodesDeep(accountsTree, this.accountNodeCompose);
  };

  /**
   * Mapps the accounts schema node to report node.
   * @param {IProfitLossSchemaNode} node
   * @returns {IProfitLossSheetNode}
   */
  private accountsSchemaNodeMapper = (
    node: IProfitLossAccountsSchemaNode,
  ): IProfitLossSheetNode => {
    // Retrieve accounts node by the given types.
    const children = this.getAccountsNodesByTypes(node.accountsTypes);

    // Retrieve the total of the given nodes.
    const total = this.getTotalOfNodes(children);

    return {
      id: node.id,
      name: this.i18n.t(node.name),
      nodeType: ProfitLossNodeType.ACCOUNTS,
      total: this.getTotalAmountMeta(total),
      children,
    };
  };

  /**
   * Accounts schema node composer.
   * @param {IProfitLossSchemaNode} node
   * @returns {IProfitLossSheetAccountsNode}
   */
  private accountsSchemaNodeCompose = (
    node: IProfitLossSchemaNode,
  ): IProfitLossSheetAccountsNode => {
    let result: IProfitLossSheetAccountsNode = node;
    result = sameNodeShape<IProfitLossSheetAccountsNode>(this.accountsSchemaNodeMapper(result));
    if (this.query.isDatePeriodsColumnsType()) {
      result = sameNodeShape<IProfitLossSheetAccountsNode>(this.assocAggregateDatePeriod(result));
    }
    if (this.query.isPreviousYearActive()) {
      result = this.previousYearAggregateNodeCompose(result);
    }
    if (this.query.isPreviousPeriodActive()) {
      result = this.previousPeriodAggregateNodeCompose(result);
    }
    return result;
  };

  /**
   * Equation schema node parser.
   * @param {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes -
   * @param {IProfitLossEquationSchemaNode} node -
   * @param {IProfitLossSheetEquationNode}
   */
  private equationSchemaNodeParser = R.curry(
    (
      accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
      node: IProfitLossEquationSchemaNode,
    ): IProfitLossSheetEquationNode => {
      const tableNodes = this.getNodesTableForEvaluating(
        'total.amount',
        accNodes,
      );
      // Evaluate the given equation.
      const total = this.evaluateEquation(node.equation, tableNodes);

      return {
        id: node.id,
        name: this.i18n.t(node.name),
        nodeType: ProfitLossNodeType.EQUATION,
        total: this.getTotalAmountMeta(total),
      };
    },
  );

  /**
   * Equation schema node composer.
   * @param {(IProfitLossSchemaNode | IProfitLossSheetNode)[]} accNodes -
   * @param {IProfitLossSchemaNode} node -
   * @returns {IProfitLossSheetEquationNode}
   */
  private equationSchemaNodeCompose = R.curry(
    (
      accNodes: (IProfitLossSchemaNode | IProfitLossSheetNode)[],
      node: IProfitLossEquationSchemaNode,
    ): IProfitLossSheetEquationNode => {
      let result: IProfitLossSheetEquationNode = node;
      result = sameNodeShape<IProfitLossSheetEquationNode>(this.equationSchemaNodeParser(accNodes)(result));
      if (this.query.isDatePeriodsColumnsType()) {
        result = sameNodeShape<IProfitLossSheetEquationNode>(this.assocEquationNodeDatePeriod(accNodes, node.equation)(result));
      }
      if (this.query.isPreviousYearActive()) {
        result = sameNodeShape<IProfitLossSheetEquationNode>(this.previousYearEquationNodeCompose(accNodes, node.equation)(result));
      }
      if (this.query.isPreviousPeriodActive()) {
        result = sameNodeShape<IProfitLossSheetEquationNode>(this.previousPeriodEquationNodeCompose(accNodes, node.equation)(result));
      }
      return result;
    },
  );

  /**
   * Parses accounts schema node to report node.
   * @param {IProfitLossSchemaNode} schemaNode
   * @returns {IProfitLossSheetNode | IProfitLossSchemaNode}
   */
  private accountsSchemaNodeMap = (
    schemaNode: IProfitLossSchemaNode,
  ): IProfitLossSheetNode | IProfitLossSchemaNode => {
    let result: IProfitLossSheetNode | IProfitLossSchemaNode = schemaNode;
    if (this.isNodeType(ProfitLossNodeType.ACCOUNTS)(result)) {
      result = sameNodeShape<IProfitLossSheetNode | IProfitLossSchemaNode>(this.accountsSchemaNodeCompose(result));
    }
    return result;
  };

  /**
   * Composes schema equation node to report node.
   * @param {IProfitLossSheetNode | IProfitLossSchemaNode} node
   * @param {number} key
   * @param {IProfitLossSheetNode | IProfitLossSchemaNode} parentValue
   * @param {(IProfitLossSheetNode | IProfitLossSchemaNode)[]} accNodes
   * @param context
   * @returns {IProfitLossSheetEquationNode}
   */
  private reportSchemaEquationNodeCompose = (
    node: IProfitLossSheetNode | IProfitLossSchemaNode,
    key: number,
    parentValue: IProfitLossSheetNode | IProfitLossSchemaNode,
    accNodes: (IProfitLossSheetNode | IProfitLossSchemaNode)[],
    context,
  ): IProfitLossSheetEquationNode => {
    let result: IProfitLossSheetEquationNode = node;
    if (this.isNodeType(ProfitLossNodeType.EQUATION)(result)) {
      result = sameNodeShape<IProfitLossSheetEquationNode>(this.equationSchemaNodeCompose(accNodes)(result));
    }
    return result;
  };

  /**
   * Parses schema accounts nodes.
   * @param {IProfitLossSchemaNode[]}
   * @returns {(IProfitLossSheetNode | IProfitLossSchemaNode)[]}
   */
  private reportSchemaAccountsNodesCompose = (
    schemaNodes: IProfitLossSchemaNode[],
  ): (IProfitLossSheetNode | IProfitLossSchemaNode)[] => {
    return this.mapNodesDeep(schemaNodes, this.accountsSchemaNodeMap);
  };

  /**
   * Parses schema equation nodes.
   * @param {(IProfitLossSheetNode | IProfitLossSchemaNode)[]} nodes
   * @returns {(IProfitLossSheetNode | IProfitLossSchemaNode)[]}
   */
  private reportSchemaEquationNodesCompose = (
    nodes: (IProfitLossSheetNode | IProfitLossSchemaNode)[],
  ): (IProfitLossSheetNode | IProfitLossSchemaNode)[] => {
    return this.mapAccNodesDeep(nodes, this.reportSchemaEquationNodeCompose);
  };

  /**
   * Retrieve profit/loss report data.
   * @return {IProfitLossSheetStatement}
   */
  public reportData = (): Array<IProfitLossSheetNode> => {
    const schema = this.getSchema();

    let result: Array<IProfitLossSheetNode> = schema;
     result = sameNodeShape<Array<IProfitLossSheetNode>>(this.reportSchemaAccountsNodesCompose(result));
     result = sameNodeShape<Array<IProfitLossSheetNode>>(this.reportSchemaEquationNodesCompose(result));
     result = sameNodeShape<Array<IProfitLossSheetNode>>(this.reportColumnsPerentageCompose(result));
     result = sameNodeShape<Array<IProfitLossSheetNode>>(this.reportRowsPercentageCompose(result));
     result = sameNodeShape<Array<IProfitLossSheetNode>>(this.reportFilterPlugin(result));
     return result;
  };
}
