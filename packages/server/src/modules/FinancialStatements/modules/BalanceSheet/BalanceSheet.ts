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
    // Принимает И описание схемы, И уже разобранные узлы: разборщики внутри
    // идут друг за другом, и второй получает то, что отдал первый. Объявление
    // «только схема» было неправдой про собственный код.
    schema: (IBalanceSheetSchemaNode | IBalanceSheetDataNode)[],
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
  public reportData = (): IBalanceSheetDataNode[] => {
    // Отчёт строится в четыре прохода, и на каждом узлы меняют свой вид:
    // из ОПИСАНИЯ схемы (что показать) получаются УЗЛЫ ДАННЫХ (что вышло).
    // Без явного объявления проверка выводит вид из первого прохода и
    // считает ошибкой каждый следующий.
    let result = this.getSchema() as unknown as IBalanceSheetDataNode[];

    result = this.parseSchemaNodes(result);
    result = this.reportPercentageCompose(result);
    result = this.reportFilterPlugin(result);

    return result;
  };
}
