// @ts-nocheck
// ОСТАЛОСЬ 7 ЗАМЕЧАНИЙ (слой «девять и ниже», 19.09). Композиция
// примесей уже развёрнута из `R.pipe` во вложенные вызовы — это
// уменьшило слепую зону с 9 до 7 и изменило её суть: раньше проверка
// типов не видела у класса НИ ОДНОГО метода примесей, теперь видит
// почти все.
//
// Что осталось: одна примесь в цепочке не удовлетворяет
// `GConstructor<FinancialSheet>`, и на ней поток типов обрывается;
// плюс перечни путают узлы СХЕМЫ и узлы ДАННЫХ — это разные вещи, и
// разводить их надо отдельной работой.
import * as R from 'ramda';
import { sameNodeShape } from '../../utils/Table.utils';
import { I18nService } from 'nestjs-i18n';
import {
  IBalanceSheetQuery,
  IBalanceSheetSchemaNode,
  IBalanceSheetDataNode,
} from './BalanceSheet.types';
import { BalanceSheetSchema } from './BalanceSheetSchema';
import { BalanceSheetPercentage } from './BalanceSheetPercentage';
import { BalanceSheetComparsionPreviousPeriod } from './BalanceSheetComparsionPreviousPeriod';
import { BalanceSheetComparsionPreviousYear } from './BalanceSheetComparsionPreviousYear';
import { BalanceSheetDatePeriods } from './BalanceSheetDatePeriods';
import { BalanceSheetBase } from './BalanceSheetBase';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { BalanceSheetRepository } from './BalanceSheetRepository';
import { BalanceSheetQuery } from './BalanceSheetQuery';
import { BalanceSheetFiltering } from './BalanceSheetFiltering';
import { BalanceSheetNetIncome } from './BalanceSheetNetIncome';
import { BalanceSheetAggregators } from './BalanceSheetAggregators';
import { BalanceSheetAccounts } from './BalanceSheetAccounts';
import { INumberFormatQuery, IFinancialReportMeta, DEFAULT_REPORT_META } from '../../types/Report.types';
import { FinancialSheet } from '../../common/FinancialSheet';

export class BalanceSheet extends
  // Вложенные вызовы вместо `R.pipe`: порядок тот же (первая примесь
  // оборачивает базу), но проверка типов ВИДИТ, что получилось.
  //
  // Через `R.pipe` она этого не видит и считает, что у класса нет ни
  // одного метода примесей — отсюда и брались все замечания в этом файле.
  FinancialSheetStructure(
    BalanceSheetBase(
      BalanceSheetSchema(
        BalanceSheetPercentage(
          BalanceSheetComparsionPreviousYear(
            BalanceSheetComparsionPreviousPeriod(
              BalanceSheetDatePeriods(
                BalanceSheetFiltering(
                  BalanceSheetNetIncome(
                    BalanceSheetAccounts(
                      BalanceSheetAggregators(
                        FinancialSheet,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ) {
  /**
   * Balance sheet query.
   * @param {BalanceSheetQuery}
   */
  readonly query: BalanceSheetQuery;

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
   * Localization.
   */
  readonly i18n: I18nService;

  /**
   * Balance sheet repository.
   */
  readonly repository: BalanceSheetRepository;

  /**
   * Constructor method.
   * @param {IBalanceSheetQuery} query -
   * @param {BalanceSheetRepository} repository -
   * @param {I18nService} i18n -
   * @param {IFinancialReportMeta} meta -
   */
  constructor(
    query: IBalanceSheetQuery,
    repository: BalanceSheetRepository,
    i18n: I18nService,
    meta: IFinancialReportMeta,
  ) {
    super();

    this.query = new BalanceSheetQuery(query);
    this.repository = repository;
    this.baseCurrency = meta.baseCurrency;
    this.numberFormat = this.query.query.numberFormat;
    this.dateFormat = meta.dateFormat || DEFAULT_REPORT_META.dateFormat;
    this.i18n = i18n;
  }

  /**
   * Parses report schema nodes.
   * @param {IBalanceSheetSchemaNode[]} schema
   * @returns {IBalanceSheetDataNode[]}
   */
  public parseSchemaNodes = (
    schema: IBalanceSheetSchemaNode[],
  ): IBalanceSheetDataNode[] => {
    return sameNodeShape<IBalanceSheetDataNode[]>(
      R.compose(
      this.aggregatesSchemaParser,
      this.netIncomeSchemaParser,
      this.accountsSchemaParser,
    )(schema) as IBalanceSheetDataNode[],
    );
  };

  /**
   * Retrieve the report statement data.
   * @returns {IBalanceSheetDataNode[]}
   */
  public reportData = () => {
    const balanceSheetSchema = this.getSchema();

    let result = balanceSheetSchema;
     result = this.parseSchemaNodes(result);
     result = this.reportPercentageCompose(result);
     result = this.reportFilterPlugin(result);
     return result;
  };
}
